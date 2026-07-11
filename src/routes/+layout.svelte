<script lang="ts">
	import "./layout.css";
	import favicon from "$lib/assets/favicon.svg";
	import { browser } from "$app/environment";
	import { setupConvex, setupAuth } from "convex-svelte";
	import { PUBLIC_CONVEX_URL, PUBLIC_CLERK_PUBLISHABLE_KEY } from "$env/static/public";
	import { setupClerkAuth } from "$lib/services/auth";
	import type { LayoutProps } from "./$types";

	let { data, children }: LayoutProps = $props();

	const clerkAuth = setupClerkAuth();
	// Seeded synchronously (not in an $effect, which never runs during SSR) so
	// the server-verified auth state is already present in the SSR-rendered
	// HTML — no loading flash. This intentionally does not react to later
	// changes to `data.user`; the live clerkAuth store takes over from here.
	// svelte-ignore state_referenced_locally
	clerkAuth.hydrate(data.user);

	setupConvex(PUBLIC_CONVEX_URL);
	setupAuth(() => ({
		isLoading: !clerkAuth.loaded,
		isAuthenticated: clerkAuth.isSignedIn,
		fetchAccessToken: clerkAuth.fetchAccessToken
	}));

	if (browser) {
		clerkAuth.load(PUBLIC_CLERK_PUBLISHABLE_KEY);
	}
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
{@render children()}
