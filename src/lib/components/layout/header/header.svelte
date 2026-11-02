<script lang="ts" module>
	export type HeaderLiveGame = {
		href: string;
		name: string;
	};

	export type HeaderProps = {
		pathname: string;
		/** The viewer's active room, when they aren't already in it. */
		live: HeaderLiveGame | null;
	};
</script>

<script lang="ts">
	import {
		Beacon,
		Button,
		Dropdown,
		DropdownContent,
		DropdownItem,
		DropdownSeparator,
		DropdownTrigger,
		Link
	} from "$lib/components/ui";
	import { getClerkAuth } from "$lib/services/auth";
	import { NAV_ITEMS } from "$lib/utils/navigation";

	let { pathname, live }: HeaderProps = $props();

	const auth = getClerkAuth();
</script>

<header class="flex h-14 shrink-0 items-center justify-between gap-2 border-b px-3 sm:h-16 sm:px-4">
	<div class="flex min-w-0 items-center gap-2 sm:gap-4">
		<a
			href="/"
			class="rounded-md px-1.5 py-1 text-lg font-bold tracking-tight uppercase outline-none focus-visible:ring-2 focus-visible:ring-ring"
		>
			<span class="text-seat-0">two</span><span class="text-seat-1">play</span>
		</a>
		{#if auth.showsMemberNav}
			<nav aria-label="Main" class="hidden items-center gap-1 sm:flex">
				{#each NAV_ITEMS as item (item.href)}
					<Link href={item.href} {pathname}>
						<item.icon class="hidden size-4 md:block" />
						{item.label}
					</Link>
				{/each}
			</nav>
		{/if}
	</div>

	<div class="flex min-w-0 flex-1 items-center justify-end gap-2">
		{#if live}
			<a
				href={live.href}
				class="flex min-w-0 items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-500 transition-colors outline-none hover:bg-emerald-500/20 focus-visible:ring-2 focus-visible:ring-ring"
			>
				<Beacon class="shrink-0" />
				<span class="truncate"><span class="sr-only">Live game: </span>{live.name}</span>
			</a>
		{/if}
		<!-- Fixed width (fits Sign in, 81px measured) so swapping the avatar for Sign in moves nothing. -->
		<div data-slot="auth" class="flex w-21 shrink-0 justify-end">
			{#if auth.isSignedIn}
				<Dropdown>
					<DropdownTrigger
						variant="ghost"
						size="icon"
						class="shrink-0 rounded-full"
						aria-label={auth.profile?.name ? `${auth.profile.name}, account menu` : "Account menu"}
					>
						{#if auth.profile?.imageUrl}
							<img src={auth.profile.imageUrl} alt="" class="size-7 rounded-full" />
						{:else}
							<span
								class="flex size-7 items-center justify-center rounded-full bg-muted text-xs font-semibold"
							>
								{(auth.profile?.name ?? "?").charAt(0).toUpperCase()}
							</span>
						{/if}
					</DropdownTrigger>
					<DropdownContent align="end" class="w-36">
						<DropdownItem onSelect={() => auth.openUserProfile()}>Account</DropdownItem>
						<DropdownSeparator />
						<DropdownItem onSelect={() => auth.signOut()}>Sign out</DropdownItem>
					</DropdownContent>
				</Dropdown>
			{:else}
				<Button
					size="sm"
					class="max-w-full"
					disabled={auth.loadError !== null}
					onclick={() => auth.signIn()}
				>
					Sign in
				</Button>
			{/if}
		</div>
	</div>
</header>
