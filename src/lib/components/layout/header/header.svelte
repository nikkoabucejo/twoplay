<script lang="ts" module>
	export type HeaderLiveGame = {
		href: string;
		name: string;
	};

	export type HeaderProps = {
		pathname: string;
		/** The viewer's active room, when they aren't already in it. */
		live: HeaderLiveGame | null;
		/** The page shows its own Sign in, so the header leaves its slot empty. */
		isGated?: boolean;
	};
</script>

<script lang="ts">
	import { ChartColumn, CircleUserRound, LogOut, Settings } from "@lucide/svelte";
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
	import { cn } from "$lib/utils/style";

	let { pathname, live, isGated = false }: HeaderProps = $props();

	const auth = getClerkAuth();
</script>

{#snippet avatar(size: "size-7" | "size-8")}
	{#if auth.profile?.imageUrl}
		<img src={auth.profile.imageUrl} alt="" class={cn("shrink-0 rounded-full", size)} />
	{:else}
		<span
			class={cn(
				"flex shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold",
				size
			)}
		>
			{(auth.profile?.name ?? "?").charAt(0).toUpperCase()}
		</span>
	{/if}
{/snippet}

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
		<!-- Fixed width (fits Sign in, 81px measured) so the avatar, Sign in, or an empty slot move nothing. -->
		<div data-slot="auth" class="flex w-21 shrink-0 justify-end">
			{#if auth.isSignedIn}
				<Dropdown>
					<DropdownTrigger
						variant="ghost"
						size="icon"
						class="shrink-0 rounded-full"
						aria-label={auth.profile?.name ? `${auth.profile.name}, account menu` : "Account menu"}
					>
						{@render avatar("size-7")}
					</DropdownTrigger>
					<DropdownContent align="end" class="w-56">
						<!-- Hidden from screen readers: the trigger's name already says whose menu this is. -->
						<div class="flex items-center gap-2.5 px-2.5 pt-1.5 pb-2" aria-hidden="true">
							{@render avatar("size-8")}
							<div class="flex min-w-0 flex-col">
								<span class="truncate text-sm font-semibold"
									>{auth.profile?.name ?? "Signed in"}</span
								>
								{#if auth.profile?.email}
									<span class="truncate text-caption text-muted-foreground">
										{auth.profile.email}
									</span>
								{/if}
							</div>
						</div>
						<DropdownSeparator />
						<DropdownItem>
							{#snippet child({ props })}
								<a href="/me" {...props}><ChartColumn />My stats</a>
							{/snippet}
						</DropdownItem>
						<DropdownItem>
							{#snippet child({ props })}
								<a href="/settings" {...props}><Settings />Settings</a>
							{/snippet}
						</DropdownItem>
						<DropdownItem onSelect={() => auth.openUserProfile()}>
							<CircleUserRound />
							Account
						</DropdownItem>
						<DropdownSeparator />
						<DropdownItem variant="destructive" onSelect={() => auth.signOut()}>
							<LogOut />
							Sign out
						</DropdownItem>
					</DropdownContent>
				</Dropdown>
			{:else if !isGated}
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
