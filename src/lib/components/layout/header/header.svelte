<script lang="ts">
	import { Gamepad2, History, House, LogOut, Users } from "@lucide/svelte";
	import { Button } from "$lib/components/ui";
	import { getClerkAuth } from "$lib/services/auth";

	const auth = getClerkAuth();
</script>

<header class="flex h-14 shrink-0 items-center justify-between gap-2 px-3 sm:h-16 sm:px-4">
	<div class="flex min-w-0 items-center gap-1 sm:gap-4">
		<a
			href="https://ko-fi.com/nikkoabucejo"
			target="_blank"
			rel="noopener noreferrer"
			aria-label="Buy me a coffee"
			class="flex items-center gap-1.5 rounded-md p-2 text-sm text-[#ff5e5b] transition-colors hover:bg-muted hover:text-[#ff8785] sm:px-2.5 sm:py-1.5"
		>
			<span
				aria-hidden="true"
				class="h-4 w-4 shrink-0 bg-[#ff5e5b]"
				style="mask: url('https://storage.ko-fi.com/cdn/cup-border.png') center / contain no-repeat; -webkit-mask: url('https://storage.ko-fi.com/cdn/cup-border.png') center / contain no-repeat;"
			></span>
			<span class="hidden sm:inline">Buy me a coffee</span>
		</a>
		<a
			href="/"
			aria-label="Home"
			class="flex items-center gap-1.5 rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:px-2.5 sm:py-1.5"
		>
			<House class="size-5 sm:size-4" />
			<span class="hidden text-sm sm:inline">Home</span>
		</a>
		{#if auth.isSignedIn}
			<nav class="flex items-center gap-1 sm:gap-2">
				<a
					href="/play"
					aria-label="Play"
					class="flex items-center gap-1.5 rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:px-2.5 sm:py-1.5"
				>
					<Gamepad2 class="size-5 sm:size-4" />
					<span class="hidden text-sm sm:inline">Play</span>
				</a>
				<a
					href="/lobby"
					aria-label="Lobby"
					class="flex items-center gap-1.5 rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:px-2.5 sm:py-1.5"
				>
					<Users class="size-5 sm:size-4" />
					<span class="hidden text-sm sm:inline">Lobby</span>
				</a>
				<a
					href="/history"
					aria-label="History"
					class="flex items-center gap-1.5 rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:px-2.5 sm:py-1.5"
				>
					<History class="size-5 sm:size-4" />
					<span class="hidden text-sm sm:inline">History</span>
				</a>
			</nav>
		{/if}
	</div>

	{#if auth.isSignedIn}
		<div class="flex shrink-0 items-center gap-1">
			<button
				type="button"
				class="flex min-w-0 items-center gap-2 rounded-full py-1 pr-2 pl-1 text-sm transition-colors hover:bg-muted sm:pr-3"
				onclick={() => auth.openUserProfile()}
			>
				{#if auth.profile?.imageUrl}
					<img src={auth.profile.imageUrl} alt="" class="size-6 shrink-0 rounded-full" />
				{:else}
					<span
						class="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold"
					>
						{(auth.profile?.name ?? "?").charAt(0).toUpperCase()}
					</span>
				{/if}
				<span class="hidden max-w-24 truncate font-medium sm:inline">{auth.profile?.name}</span>
			</button>
			<Button variant="ghost" size="icon-sm" aria-label="Sign out" onclick={() => auth.signOut()}>
				<LogOut />
			</Button>
		</div>
	{/if}
</header>
