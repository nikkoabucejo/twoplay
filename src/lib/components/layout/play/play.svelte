<script lang="ts">
	import { Check, Link, LogIn, Plus } from "@lucide/svelte";
	import { useMutation, useQuery } from "convex-svelte";
	import type { Component } from "svelte";
	import { goto } from "$app/navigation";
	import { Button, Tabs, type TabItem } from "$lib/components/ui";
	import { GAMES } from "$lib/features/play";
	import { getClerkAuth } from "$lib/services/auth";
	import { cn } from "$lib/utils/style";
	import type { GameType } from "../../../../../convex/models/games/index.js";
	import { DEFAULT_TIME_CONTROL_MS } from "../../../../../convex/models/rooms/index.js";
	import { api } from "../../../../../convex/_generated/api.js";

	type CarouselEntry = { name: string; icon: Component<{ class?: string }>; type: GameType };

	/** Five cards from the two real games, repeated so the carousel reads as a fuller lineup — tictactoe
	 *  fixed in the middle slot. Every card is a real, playable game; there's no placeholder concept. */
	const ENTRIES: CarouselEntry[] = (
		["tictactoe", "checkers", "tictactoe", "checkers", "tictactoe"] as const
	).map((type) => ({ type, name: GAMES[type].name, icon: GAMES[type].icon }));

	/** Minutes offered for each player's starting clock bank. The default is derived from the server's
	 *  `DEFAULT_TIME_CONTROL_MS` (convex/models/rooms/index.ts) so the two can't drift out of sync. */
	const TIME_CONTROL_MINUTES = [3, 5, 10] as const;
	const DEFAULT_TIME_CONTROL_MINUTES = DEFAULT_TIME_CONTROL_MS / 60_000;
	const VISIBILITY_OPTIONS: TabItem<"private" | "public">[] = [
		{ value: "private", label: "Private" },
		{ value: "public", label: "Public" }
	];

	let { initialGame }: { initialGame?: GameType } = $props();

	const auth = getClerkAuth();
	const createRoom = useMutation(api.models.rooms.index.create);
	const activeRoom = useQuery(api.models.rooms.index.active, () => (auth.isSignedIn ? {} : "skip"));

	let centerIndex = $state(
		ENTRIES.findIndex((entry) => entry.type === (initialGame ?? "tictactoe"))
	);
	let joinCode = $state("");
	let error = $state<string | null>(null);
	let creating = $state(false);
	let timeControlMinutes = $state<number>(DEFAULT_TIME_CONTROL_MINUTES);
	let visibility = $state<"private" | "public">("private");
	let createdCode = $state<string | null>(null);
	let copied = $state(false);
	let copiedTimeout: ReturnType<typeof setTimeout> | undefined;

	const selectedGame = $derived(ENTRIES[centerIndex].type);

	const createdRoom = useQuery(api.models.rooms.index.get, () =>
		createdCode ? { code: createdCode } : "skip"
	);

	$effect(() => {
		if (createdCode && createdRoom.data?.players[1]) goto(`/${selectedGame}/${createdCode}`);
	});

	// Bounces straight into an already-active room rather than letting Create/Join be attempted —
	// a user can only ever be in one active room at a time. Skipped while `createdCode` is set so this
	// doesn't fight the "waiting for opponent" share-code screen for the room just created.
	$effect(() => {
		const room = activeRoom.data;
		if (!createdCode && room) goto(`/${room.type}/${room.code}`);
	});

	function selectCard(index: number) {
		if (createdCode) return;
		centerIndex = index;
	}

	async function handleCreate() {
		error = null;
		creating = true;
		try {
			const result = await createRoom({
				type: selectedGame,
				timeControlMs: timeControlMinutes * 60_000,
				visibility
			});
			if (result.redirected) {
				goto(`/${result.type}/${result.code}`);
			} else {
				createdCode = result.code;
			}
		} catch (err) {
			error = err instanceof Error ? err.message : "Could not create a room";
		} finally {
			creating = false;
		}
	}

	function handleJoin(event: SubmitEvent) {
		event.preventDefault();
		const code = joinCode.trim().toUpperCase();
		if (code) goto(`/${selectedGame}/${code}`);
	}

	function copyInviteLink() {
		if (!createdCode) return;
		navigator.clipboard.writeText(`${location.origin}/${selectedGame}/${createdCode}`);
		copied = true;
		clearTimeout(copiedTimeout);
		copiedTimeout = setTimeout(() => (copied = false), 1500);
	}
</script>

<div class="flex flex-1 flex-col items-center justify-center px-4 py-8 text-center">
	<div class="relative w-full max-w-xs">
		<div
			class="absolute bottom-full left-1/2 mb-3 flex h-36 w-full max-w-md -translate-x-1/2 items-center justify-center overflow-hidden mask-[linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]"
		>
			{#each ENTRIES as entry, index (index)}
				{@const Icon = entry.icon}
				{@const offset = index - centerIndex}
				{@const abs = Math.abs(offset)}
				{@const isSelected = offset === 0}
				{@const scale = Math.max(0.5, 1.35 - abs * 0.28)}
				{@const opacity = Math.max(0, 1 - abs * 0.3)}
				<button
					type="button"
					class="absolute top-1/2 left-1/2 flex cursor-default flex-col items-center gap-1 rounded-xl p-2 transition-[transform,opacity] duration-300 ease-out outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed"
					style="transform: translate(-50%, -50%) translateX({offset *
						5}rem) scale({scale}); opacity: {opacity}; z-index: {50 - abs};"
					disabled={!!createdCode}
					onclick={() => selectCard(index)}
					aria-current={isSelected}
					aria-label={entry.name}
				>
					<div
						class={cn(
							"flex size-16 items-center justify-center",
							isSelected ? "text-foreground" : "text-muted-foreground grayscale"
						)}
					>
						<Icon class="size-full" />
					</div>
					<span
						class={cn(
							"text-[9px] font-semibold",
							isSelected ? "text-foreground" : "text-muted-foreground"
						)}
					>
						{entry.name}
					</span>
				</button>
			{/each}
		</div>

		{#if !auth.isSignedIn}
			<div class="flex flex-col items-center gap-3">
				<p class="text-muted-foreground">Sign in to create or join a room.</p>
				<Button onclick={() => auth.signIn()}>Sign in</Button>
			</div>
		{:else}
			<div
				class="flex w-full max-w-xs flex-col items-center gap-6 rounded-2xl border bg-muted/40 p-6 backdrop-blur-sm"
			>
				<Tabs
					items={VISIBILITY_OPTIONS}
					value={visibility}
					onValueChange={(value) => (visibility = value)}
					disabled={!!createdCode}
					aria-label="Room visibility"
				/>

				<Tabs
					items={TIME_CONTROL_MINUTES.map((minutes) => ({
						value: minutes,
						label: `${minutes} min`
					}))}
					value={timeControlMinutes}
					onValueChange={(minutes) => (timeControlMinutes = minutes)}
					disabled={!!createdCode}
					aria-label="Starting clock per player"
				/>

				<div class="flex w-full items-center gap-2">
					{#if createdCode}
						<p
							class="flex h-9 flex-1 items-center justify-center rounded-md border bg-background/60 font-mono tracking-widest"
						>
							{createdCode}
						</p>
						<Button
							variant="outline"
							size="icon"
							onclick={copyInviteLink}
							aria-label="Copy invite link"
						>
							{#if copied}
								<Check />
							{:else}
								<Link />
							{/if}
						</Button>
					{:else}
						<Button class="w-full" onclick={handleCreate} disabled={creating}>
							<Plus />
							{creating ? "Creating room…" : "Create room"}
						</Button>
					{/if}
				</div>

				<div class="flex w-full items-center gap-3 text-xs text-muted-foreground">
					<div class="h-px flex-1 bg-border"></div>
					or
					<div class="h-px flex-1 bg-border"></div>
				</div>

				<form class="flex w-full flex-col items-center gap-3" onsubmit={handleJoin}>
					<input
						type="text"
						placeholder="Room code"
						bind:value={joinCode}
						maxlength={6}
						class="w-full rounded-md border bg-background px-3 py-2 text-center font-mono uppercase tracking-widest"
					/>
					<Button type="submit" variant="outline" class="w-full" disabled={!joinCode.trim()}>
						<LogIn />
						Join room
					</Button>
				</form>

				{#if error}
					<p class="text-sm text-destructive">{error}</p>
				{/if}
			</div>
		{/if}
	</div>
</div>
