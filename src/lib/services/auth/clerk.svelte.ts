import { Clerk } from "@clerk/clerk-js";
import { getContext, setContext } from "svelte";
import { invalidateAll } from "$app/navigation";

type ClerkUser = InstanceType<typeof Clerk>["user"];
type ClerkSession = InstanceType<typeof Clerk>["session"];

export type ClerkProfile = {
	id: string;
	email: string | null;
	name: string | null;
	imageUrl: string | null;
} | null;

declare global {
	interface Window {
		__internal_ClerkUICtor?: unknown;
	}
}

// Clerk's npm package ships headless; the prebuilt UI (openSignIn, mountUserButton, …)
// is a separate bundle served from the Clerk Frontend API and must be loaded explicitly.
// See https://clerk.com/docs/js-frontend/getting-started/quickstart
function loadClerkUiScript(publishableKey: string) {
	if (window.__internal_ClerkUICtor) return Promise.resolve();

	const clerkDomain = atob(publishableKey.split("_")[2]).slice(0, -1);

	return new Promise<void>((resolve, reject) => {
		const script = document.createElement("script");
		script.src = `https://${clerkDomain}/npm/@clerk/ui@1/dist/ui.browser.js`;
		script.async = true;
		script.crossOrigin = "anonymous";
		script.onload = () => resolve();
		script.onerror = () => reject(new Error("Failed to load @clerk/ui bundle"));
		document.head.appendChild(script);
	});
}

function profileFromUser(user: ClerkUser): ClerkProfile {
	if (!user) return null;
	return {
		id: user.id,
		email: user.primaryEmailAddress?.emailAddress ?? null,
		name: user.fullName ?? user.username ?? null,
		imageUrl: user.hasImage ? user.imageUrl : null
	};
}

export class ClerkAuth {
	// `true` once we know the real auth state — either hydrated from the server
	// or (as a fallback, e.g. logged-out visitors on a first ever request) once
	// the client SDK finishes loading. Never show a "loading" auth UI on top of
	// an SSR-rendered page that already knows the answer.
	loaded = $state(false);
	isSignedIn = $state(false);
	profile = $state<ClerkProfile>(null);
	user = $state<ClerkUser>(null);
	session = $state<ClerkSession>(null);

	#clerk: InstanceType<typeof Clerk> | undefined;
	#resolveReady!: () => void;
	#ready = new Promise<void>((resolve) => {
		this.#resolveReady = resolve;
	});

	/** Seed state from the server-verified session so there's no auth loading flash. */
	hydrate(profile: ClerkProfile) {
		this.profile = profile;
		this.isSignedIn = profile !== null;
		this.loaded = true;
	}

	async load(publishableKey: string) {
		if (this.#clerk) return;

		await loadClerkUiScript(publishableKey);

		const clerk = new Clerk(publishableKey);
		this.#clerk = clerk;

		await clerk.load({
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			ui: { ClerkUI: window.__internal_ClerkUICtor as any }
		});
		this.#sync();
		this.#resolveReady();
		clerk.addListener(() => this.#sync());
	}

	#sync() {
		const clerk = this.#clerk;
		if (!clerk) return;

		const wasSignedIn = this.isSignedIn;

		this.loaded = true;
		this.isSignedIn = clerk.isSignedIn;
		this.user = clerk.user;
		this.session = clerk.session;
		this.profile = profileFromUser(clerk.user);

		// A fresh sign-in: rerun the root layout's server load so it pushes the
		// new user into Convex right away, instead of waiting for the next visit.
		if (this.isSignedIn && !wasSignedIn) {
			invalidateAll();
		}
	}

	signIn() {
		this.#clerk?.openSignIn();
	}

	async signOut() {
		await this.#clerk?.signOut();
	}

	/** Opens Clerk's prebuilt account management UI (profile, security, …). */
	openUserProfile() {
		this.#clerk?.openUserProfile();
	}

	fetchAccessToken = async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
		await this.#ready;
		if (!this.session) return null;
		// No named JWT template: Convex reads the `aud: "convex"` claim mapped
		// directly onto the default session token (Clerk dashboard → Sessions →
		// Customize session token → Claims, or "Activate Convex integration").
		return await this.session.getToken({ skipCache: forceRefreshToken });
	};
}

const CONTEXT_KEY = Symbol("clerk-auth");

// A module-level singleton would leak one visitor's session into another's
// page during SSR (the server process shares module scope across requests).
// Store one instance per component tree via context instead, same as
// convex-svelte's setupConvex().
export function setupClerkAuth() {
	const auth = new ClerkAuth();
	setContext(CONTEXT_KEY, auth);
	return auth;
}

export function getClerkAuth(): ClerkAuth {
	const auth = getContext<ClerkAuth | undefined>(CONTEXT_KEY);
	if (!auth) throw new Error("getClerkAuth() was called before setupClerkAuth()");
	return auth;
}
