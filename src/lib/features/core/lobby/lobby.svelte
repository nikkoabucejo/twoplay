<script lang="ts">
	import { useMutation, useQuery } from "convex-svelte";
	import { goto } from "$app/navigation";
	import { Beacon, Button, Emblem, EmptyState, Playing, Tile } from "$lib/components/ui";
	import { Feed, FeedSkeleton } from "$lib/components/layout";
	import { GAMES } from "$lib/features/play";
	import { getClerkAuth } from "$lib/services/auth";
	import { api } from "../../../../../convex/_generated/api.js";

	const auth = getClerkAuth();
	const rooms = useQuery(api.models.rooms.index.lobbies, () => (auth.isSignedIn ? {} : "skip"));
	const joinRoom = useMutation(api.models.rooms.index.join);
	// `lobbies` only lists public rooms still waiting for an opponent — a private room, or one that's
	// already full and mid-game, would otherwise never show up here even though it's the room the
	// viewer is actually in right now.
	const activeRoom = useQuery(api.models.rooms.index.active, () => (auth.isSignedIn ? {} : "skip"));

	let joiningCode = $state<string | null>(null);
	let error = $state<string | null>(null);

	async function handleJoin(code: string, type: string) {
		error = null;
		joiningCode = code;
		try {
			await joinRoom({ code });
			goto(`/${type}/${code}`);
		} catch (err) {
			error = err instanceof Error ? err.message : "Could not join that room";
			joiningCode = null;
		}
	}
</script>

<div class="flex min-h-0 w-full flex-1 flex-col items-center gap-3 overflow-hidden">
	{#if !auth.isSignedIn}
		<div class="flex shrink-0 flex-col items-center gap-3">
			<p class="text-sm text-muted-foreground">Sign in to browse open rooms.</p>
			<Button size="sm" disabled={auth.loadError !== null} onclick={() => auth.signIn()}>
				Sign in
			</Button>
		</div>
	{:else if rooms.isLoading || activeRoom.isLoading}
		<FeedSkeleton />
	{:else if rooms.error}
		<p class="shrink-0 text-sm text-destructive">Could not load open rooms.</p>
	{:else}
		{#if !rooms.data?.length}
			<EmptyState
				title="No open rooms"
				description="Public rooms you can join show up here."
				class="shrink-0"
			/>
		{:else}
			<Feed>
				<ul class="flex flex-col gap-2 py-1">
					{#each rooms.data as room (room.code)}
						<Tile highlighted={room.isOwn}>
							{#snippet icon()}
								<Emblem
									icon={GAMES[room.type].icon}
									colors={GAMES[room.type].colors}
									class="size-8 shrink-0"
									active={room.isOwn}
									sparkles={false}
								/>
							{/snippet}
							{#snippet title()}
								<span class="flex items-center gap-1.5 text-xs font-semibold">
									{GAMES[room.type].name}
									{#if room.isOwn}
										<Beacon />
									{/if}
								</span>
							{/snippet}
							{#snippet subtitle()}
								<span class="text-caption text-muted-foreground">
									Hosted by {room.isOwn ? "you" : (room.hostName ?? "someone")} · {room.timeControlMs /
										60_000} min
								</span>
							{/snippet}
							{#snippet trailing()}
								{#if room.isOwn}
									<Button href="/{room.type}/{room.code}" variant="outline" size="xs">View</Button>
								{:else}
									<Button
										size="xs"
										onclick={() => handleJoin(room.code, room.type)}
										disabled={joiningCode === room.code}
									>
										Join
									</Button>
								{/if}
							{/snippet}
						</Tile>
					{/each}
				</ul>
			</Feed>
		{/if}

		<!-- Below the feed, so a room started elsewhere shrinks the feed instead of pushing it down. -->
		{#if activeRoom.data}
			<Playing code={activeRoom.data.code} type={activeRoom.data.type} class="max-w-md shrink-0" />
		{/if}
	{/if}

	{#if error}
		<p class="shrink-0 text-sm text-destructive">{error}</p>
	{/if}
</div>
