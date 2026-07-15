<script lang="ts">
	import { useMutation, useQuery } from "convex-svelte";
	import { goto } from "$app/navigation";
	import { Button } from "$lib/components/ui";
	import { GAMES } from "$lib/features/play";
	import { getClerkAuth } from "$lib/services/auth";
	import { api } from "../../../../../convex/_generated/api.js";

	const auth = getClerkAuth();
	const rooms = useQuery(api.models.rooms.index.lobbies, () => (auth.isSignedIn ? {} : "skip"));
	const joinRoom = useMutation(api.models.rooms.index.join);

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

<div class="flex w-full flex-1 flex-col items-center gap-3 overflow-hidden px-4 pt-20 pb-6">
	{#if !auth.isSignedIn}
		<div class="flex shrink-0 flex-col items-center gap-3">
			<p class="text-sm text-muted-foreground">Sign in to browse open rooms.</p>
			<Button size="sm" onclick={() => auth.signIn()}>Sign in</Button>
		</div>
	{:else if rooms.isLoading}
		<p class="shrink-0 text-sm text-muted-foreground">Loading…</p>
	{:else if rooms.error}
		<p class="shrink-0 text-sm text-destructive">Could not load open rooms.</p>
	{:else if !rooms.data?.length}
		<p class="shrink-0 text-sm text-muted-foreground">No public rooms are waiting for a player.</p>
	{:else}
		<div class="no-scrollbar min-h-0 w-full max-w-md flex-1 overflow-y-auto">
			<ul class="flex flex-col gap-2 py-1">
				{#each rooms.data as room (room.code)}
					{@const Icon = GAMES[room.type].icon}
					<li class="flex items-center gap-3 rounded-xl border bg-muted/40 p-3 backdrop-blur-sm">
						<Icon class="size-8 shrink-0" />
						<div class="flex flex-1 flex-col">
							<span class="text-xs font-semibold">{GAMES[room.type].name}</span>
							<span class="text-[11px] text-muted-foreground">
								Hosted by {room.isOwn ? "you" : (room.hostName ?? "someone")} · {room.timeControlMs /
									60_000} min
							</span>
						</div>
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
					</li>
				{/each}
			</ul>
		</div>
	{/if}

	{#if error}
		<p class="shrink-0 text-sm text-destructive">{error}</p>
	{/if}
</div>

<style>
	.no-scrollbar {
		scrollbar-width: none;
		-ms-overflow-style: none;
	}

	.no-scrollbar::-webkit-scrollbar {
		display: none;
	}
</style>
