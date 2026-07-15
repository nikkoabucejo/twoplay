<script lang="ts">
	import "./layout.css";
	import { LogOut } from "@lucide/svelte";
	import favicon from "$lib/assets/favicon.svg";
	import { browser } from "$app/environment";
	import { setupConvex, setupAuth } from "convex-svelte";
	import { PUBLIC_CONVEX_URL, PUBLIC_CLERK_PUBLISHABLE_KEY } from "$env/static/public";
	import { Button } from "$lib/components/ui";
	import { Mood } from "$lib/features/presence";
	import { setupClerkAuth } from "$lib/services/auth";
	import type { LayoutProps } from "./$types";

	let { data, children }: LayoutProps = $props();

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
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<div class="relative flex h-svh flex-col overflow-hidden">
	<Mood />

	<nav class="absolute inset-x-4 top-4 z-10 flex items-center justify-between">
		<div class="flex items-center gap-4">
			<a
				href="https://ko-fi.com/nikkoabucejo"
				target="_blank"
				rel="noopener noreferrer"
				class="flex items-center gap-1.5 text-sm text-[#ff5e5b] transition-colors hover:text-[#ff8785]"
			>
				<span
					aria-hidden="true"
					class="h-4 w-4 bg-[#ff5e5b]"
					style="mask: url('https://storage.ko-fi.com/cdn/cup-border.png') center / contain no-repeat; -webkit-mask: url('https://storage.ko-fi.com/cdn/cup-border.png') center / contain no-repeat;"
				></span>
				Buy me a coffee
			</a>
			<a href="/" class="text-sm text-muted-foreground transition-colors hover:text-foreground">
				Home
			</a>
			{#if auth.isSignedIn}
				<a
					href="/play"
					class="text-sm text-muted-foreground transition-colors hover:text-foreground"
				>
					Play
				</a>
				<a
					href="/lobby"
					class="text-sm text-muted-foreground transition-colors hover:text-foreground"
				>
					Lobby
				</a>
				<a
					href="/history"
					class="text-sm text-muted-foreground transition-colors hover:text-foreground"
				>
					History
				</a>
			{/if}
		</div>

		{#if auth.isSignedIn}
			<div class="flex items-center gap-1">
				<button
					type="button"
					class="flex items-center gap-2 rounded-full py-1 pr-3 pl-1 text-sm transition-colors hover:bg-muted"
					onclick={() => auth.openUserProfile()}
				>
					{#if auth.profile?.imageUrl}
						<img src={auth.profile.imageUrl} alt="" class="size-6 rounded-full" />
					{:else}
						<span
							class="flex size-6 items-center justify-center rounded-full bg-muted text-xs font-semibold"
						>
							{(auth.profile?.name ?? "?").charAt(0).toUpperCase()}
						</span>
					{/if}
					<span class="font-medium">{auth.profile?.name}</span>
				</button>
				<Button variant="ghost" size="icon-sm" aria-label="Sign out" onclick={() => auth.signOut()}>
					<LogOut />
				</Button>
			</div>
		{/if}
	</nav>

	{@render children()}
</div>
