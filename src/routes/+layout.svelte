<script lang="ts">
	import "./layout.css";
	import favicon from "$lib/assets/favicon.svg";
	import interLatin from "@fontsource-variable/inter/files/inter-latin-wght-normal.woff2?url";
	import { browser } from "$app/environment";
	import { afterNavigate } from "$app/navigation";
	import { page } from "$app/state";
	import { setupConvex, setupAuth, useQuery } from "convex-svelte";
	import { PUBLIC_CONVEX_URL, PUBLIC_CLERK_PUBLISHABLE_KEY } from "$env/static/public";
	import { Dock, Footer, Header } from "$lib/components/layout";
	import { Banner, Button, setupToaster, ToastRegion } from "$lib/components/ui";
	import { GAMES } from "$lib/features/play";
	import { Mood, setupMood } from "$lib/features/presence";
	import { setupClerkAuth } from "$lib/services/auth";
	import { isGameRoomRoute, isGatedRoute, liveGameHref, showsDock } from "$lib/utils/navigation";
	import { bindClickSounds, bindMusicLifecycle, music, musicSceneOf } from "$lib/utils/sound";
	import { setupPreferences } from "$lib/utils/storage";
	import { cn } from "$lib/utils/style";
	import { api } from "../../convex/_generated/api.js";
	import type { LayoutProps } from "./$types";

	let { data, children }: LayoutProps = $props();

	const mood = setupMood();
	const auth = setupClerkAuth();
	// Seeded synchronously (not in an $effect, which never runs during SSR) so
	// the server-verified auth state is already present in the SSR-rendered
	// HTML — no loading flash. This intentionally does not react to later
	// changes to `data.user`; the live clerkAuth store takes over from here.
	// svelte-ignore state_referenced_locally
	auth.hydrate(data.user);

	setupConvex(PUBLIC_CONVEX_URL);
	setupAuth(() => ({
		isLoading: !auth.loaded,
		isAuthenticated: auth.isSignedIn,
		fetchAccessToken: auth.fetchAccessToken
	}));

	if (browser) {
		auth.load(PUBLIC_CLERK_PUBLISHABLE_KEY);
	}

	const preferences = setupPreferences();
	const toaster = setupToaster();
	$effect(() => bindMusicLifecycle(document, music));
	$effect(() => music.setScene(musicSceneOf(mood)));
	$effect(() => bindClickSounds(document, () => preferences.uiSounds));

	const active = useQuery(api.models.rooms.index.active, () => (auth.isSignedIn ? {} : "skip"));
	const live = $derived.by(() => {
		const href = liveGameHref(active.data, page.url.pathname);
		return href && active.data ? { href, name: GAMES[active.data.type].name } : null;
	});

	const isRoom = $derived(isGameRoomRoute(page.route.id));
	const showDock = $derived(showsDock(page.route.id, auth.showsMemberNav));

	let main = $state<HTMLElement>();

	// `main` is the scroll container, so SvelteKit's window scroll restoration doesn't reach it.
	// A URL with a hash keeps the spot the browser scrolled to.
	afterNavigate(({ type, to }) => {
		if (type !== "popstate" && !to?.url.hash && main) main.scrollTop = 0;
	});
</script>

<svelte:head>
	<link rel="icon" type="image/svg+xml" href={favicon} />
	<link rel="preload" as="font" type="font/woff2" crossorigin="anonymous" href={interLatin} />
</svelte:head>

<div class="relative flex h-dvh flex-col overflow-hidden overscroll-none">
	<Mood {mood} />

	<div class="relative z-40 shrink-0">
		<Header pathname={page.url.pathname} {live} isGated={isGatedRoute(page.route.id)} />

		{#if auth.loadError}
			<Banner message="Sign-in is unavailable right now." tone="error">
				{#snippet action()}
					<Button variant="outline" size="xs" onclick={() => location.reload()}>Reload</Button>
				{/snippet}
			</Banner>
		{/if}
	</div>

	<main
		bind:this={main}
		class={cn(
			"flex min-h-0 flex-1 flex-col",
			isRoom ? "overflow-hidden" : "overflow-y-auto overscroll-contain"
		)}
	>
		{@render children()}
	</main>

	{#if !isRoom}
		<Footer />
	{/if}

	{#if showDock}
		<Dock pathname={page.url.pathname} />
	{/if}

	<ToastRegion {toaster} aboveDock={showDock} />
</div>
