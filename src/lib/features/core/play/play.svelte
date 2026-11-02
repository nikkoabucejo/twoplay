<script lang="ts">
	import { useMutation, useQuery } from "convex-svelte";
	import { goto } from "$app/navigation";
	import { Button, Emblem, Spinner, Tabs, getToaster, type TabItem } from "$lib/components/ui";
	import { GAMES } from "$lib/features/play";
	import { getClerkAuth } from "$lib/services/auth";
	import { cn } from "$lib/utils/style";
	import { activeRoomRedirect } from "./active-room.js";
	import { copyLink } from "./copy-link.js";
	import type { GameType } from "../../../../../convex/models/games/index.js";
	import { DEFAULT_TIME_CONTROL_MS } from "../../../../../convex/models/rooms/index.js";
	import { api } from "../../../../../convex/_generated/api.js";

	type CarouselEntry = { name: string; type: GameType };

	/** Five cards from the two real games, repeated so the carousel reads as a fuller lineup — tictactoe
	 *  fixed in the middle slot. Every card is a real, playable game; there's no placeholder concept. */
	const ENTRIES: CarouselEntry[] = (
		["tictactoe", "checkers", "tictactoe", "checkers", "tictactoe"] as const
	).map((type) => ({ type, name: GAMES[type].name }));

	/** The middle card is the default selection unless `initialGame` asks for something else. */
	const DEFAULT_INDEX = Math.floor(ENTRIES.length / 2);

	/** Distance (rem) of each successive ring from the one before it — icons pack tighter the further
	 *  they sit from center, so the outer pair doesn't read as far-flung as the flat spacing would. */
	const RING_STEP_REMS = [4.5, 3];

	function iconOffsetRem(offset: number): number {
		const steps = Math.abs(offset);
		let rem = 0;
		for (let i = 0; i < steps; i++) {
			rem += RING_STEP_REMS[Math.min(i, RING_STEP_REMS.length - 1)];
		}
		return Math.sign(offset) * rem;
	}

	/** Minutes offered for each player's starting clock bank. The default is derived from the server's
	 *  `DEFAULT_TIME_CONTROL_MS` (convex/models/rooms/index.ts) so the two can't drift out of sync. */
	const TIME_CONTROL_MINUTES = [3, 5, 10] as const;
	const DEFAULT_TIME_CONTROL_MINUTES = DEFAULT_TIME_CONTROL_MS / 60_000;

	type PlayMode = "matchmaking" | "public" | "private";
	/** "Matchmaking" auto-pairs with a random opponent via the queue; "Public"/"Private" both create a
	 *  room instead — they only differ in whether it's listed in the public lobby or share-code only. */
	const MODE_OPTIONS: TabItem<PlayMode>[] = [
		{ value: "matchmaking", label: "Matchmaking" },
		{ value: "public", label: "Public" },
		{ value: "private", label: "Private" }
	];

	let { initialGame }: { initialGame?: GameType } = $props();

	const auth = getClerkAuth();
	const toaster = getToaster();
	const createRoom = useMutation(api.models.rooms.index.create);
	const enqueuePairing = useMutation(api.models.pairings.index.enqueue);
	const cancelPairing = useMutation(api.models.pairings.index.cancel);
	const activeRoom = useQuery(api.models.rooms.index.active, () => (auth.isSignedIn ? {} : "skip"));
	const queueStatus = useQuery(api.models.pairings.index.status, () =>
		auth.isSignedIn ? {} : "skip"
	);

	// Only seeds the initial card — later changes to `initialGame` shouldn't fight the user's own picks.
	// svelte-ignore state_referenced_locally
	const initialIndex = initialGame ? ENTRIES.findIndex((entry) => entry.type === initialGame) : -1;
	let centerIndex = $state(initialIndex >= 0 ? initialIndex : DEFAULT_INDEX);
	let joinCode = $state("");
	let error = $state<string | null>(null);
	let creating = $state(false);
	let queuing = $state(false);
	let timeControlMinutes = $state<number>(DEFAULT_TIME_CONTROL_MINUTES);
	let mode = $state<PlayMode>("matchmaking");
	let createdCode = $state<string | null>(null);

	const selectedGame = $derived(ENTRIES[centerIndex].type);
	const queued = $derived(queueStatus.data === true);
	const isCheckingActiveRoom = $derived(auth.isSignedIn && activeRoom.isLoading);

	const createdRoom = useQuery(api.models.rooms.index.get, () =>
		createdCode ? { code: createdCode } : "skip"
	);

	$effect(() => {
		if (createdCode && createdRoom.data?.players[1]) goto(`/${selectedGame}/${createdCode}`);
	});

	// Bounces straight into an already-active room rather than letting Create/Join be attempted —
	// a user can only ever be in one active room at a time.
	$effect(() => {
		const path = activeRoomRedirect({ room: activeRoom.data, createdCode, isCreating: creating });
		if (path) goto(path);
	});

	function selectCard(index: number) {
		if (createdCode || queued) return;
		centerIndex = index;
	}

	async function handlePlay() {
		error = null;
		queuing = true;
		try {
			const result = await enqueuePairing({
				type: selectedGame,
				timeControlMs: timeControlMinutes * 60_000
			});
			if (result.status === "matched") goto(`/${result.type}/${result.code}`);
		} catch (err) {
			error = err instanceof Error ? err.message : "Could not join the pairing queue";
		} finally {
			queuing = false;
		}
	}

	async function handleCancelQueue() {
		try {
			await cancelPairing({});
		} catch (err) {
			error = err instanceof Error ? err.message : "Could not leave the pairing queue";
		}
	}

	async function handleCreate() {
		error = null;
		creating = true;
		try {
			const result = await createRoom({
				type: selectedGame,
				timeControlMs: timeControlMinutes * 60_000,
				visibility: mode === "public" ? "public" : "private"
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

	function handleStart() {
		if (mode === "matchmaking") return handlePlay();
		return handleCreate();
	}

	function handleJoin(event: SubmitEvent) {
		event.preventDefault();
		const code = joinCode.trim().toUpperCase();
		if (code) goto(`/${selectedGame}/${code}`);
	}

	function copyInviteLink() {
		if (!createdCode) return;
		copyLink(`${location.origin}/${selectedGame}/${createdCode}`, {
			clipboard: navigator.clipboard,
			toaster
		});
	}
</script>

<!-- While checking for an already-active room the picker is laid out but invisible, so the create/join
     UI doesn't flash before the redirect and the page keeps the picker's box when it appears. -->
<div class="relative flex flex-1 flex-col items-center justify-center py-2 text-center">
	<div
		class={cn("flex w-full max-w-md flex-col items-center", isCheckingActiveRoom && "invisible")}
	>
		<div
			class="relative mb-4 flex h-36 w-full items-center justify-center overflow-hidden mask-[linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]"
		>
			{#each ENTRIES as entry, index (index)}
				{@const offset = index - centerIndex}
				{@const abs = Math.abs(offset)}
				{@const isSelected = offset === 0}
				{@const scale = Math.max(0.5, 1.35 - abs * 0.28)}
				{@const opacity = Math.max(0, 1 - abs * 0.3)}
				<button
					type="button"
					class="absolute top-1/2 left-1/2 flex cursor-default items-center justify-center rounded-xl transition-[transform,opacity] duration-300 ease-out outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed"
					style="transform: translate(-50%, -50%) translateX({iconOffsetRem(
						offset
					)}rem) scale({scale}); opacity: {opacity}; z-index: {50 - abs};"
					disabled={!!createdCode || queued}
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
						<Emblem
							icon={GAMES[entry.type].icon}
							colors={GAMES[entry.type].colors}
							class="size-full"
							selected={isSelected}
							sparkles={isSelected}
						/>
					</div>
				</button>
			{/each}

			<div
				class="absolute bottom-1 left-1/2 -translate-x-1/2 text-xs font-semibold text-foreground"
				aria-live="polite"
			>
				{ENTRIES[centerIndex].name}
			</div>
		</div>

		{#if !auth.isSignedIn}
			<div class="flex w-full max-w-xs flex-col items-center gap-3">
				<p class="text-muted-foreground">Sign in to create or join a room.</p>
				<Button disabled={auth.loadError !== null} onclick={() => auth.signIn()}>Sign in</Button>
			</div>
		{:else}
			<div
				class="flex w-full max-w-xs flex-col items-center gap-6 rounded-2xl border bg-muted/40 p-6 backdrop-blur-sm"
			>
				<Tabs
					items={MODE_OPTIONS}
					value={mode}
					onValueChange={(value) => (mode = value)}
					disabled={!!createdCode || queued}
					aria-label="Matchmaking or room visibility"
				/>

				<Tabs
					items={TIME_CONTROL_MINUTES.map((minutes) => ({
						value: minutes,
						label: `${minutes} min`
					}))}
					value={timeControlMinutes}
					onValueChange={(minutes) => (timeControlMinutes = minutes)}
					disabled={!!createdCode || queued}
					aria-label="Starting clock per player"
				/>

				<div class="flex w-full flex-col gap-2">
					{#if createdCode}
						<div class="flex w-full items-center gap-2">
							<p
								class="flex h-9 flex-1 items-center justify-center rounded-md border bg-background/60 font-mono tracking-widest"
							>
								{createdCode}
							</p>
							<Button variant="outline" onclick={copyInviteLink}>Copy link</Button>
						</div>
					{:else if queued}
						<div
							class="flex w-full flex-col items-center gap-3 rounded-md border bg-background/60 px-4 py-13.25"
						>
							<div class="flex flex-col items-center gap-0.5" aria-live="polite">
								<p class="flex items-center gap-1 text-sm font-semibold text-foreground">
									Finding a match
								</p>
								<p class="text-xs text-muted-foreground">
									{GAMES[selectedGame].name} &middot; {timeControlMinutes} min
								</p>
							</div>
						</div>
						<Button variant="outline" class="w-full" onclick={handleCancelQueue}>Cancel</Button>
					{:else}
						<Button class="w-full" onclick={handleStart} disabled={queuing || creating}>
							{mode === "matchmaking" ? "Find Match" : "Create Room"}
						</Button>
					{/if}
				</div>

				{#if !createdCode && !queued}
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
							Join room
						</Button>
					</form>
				{/if}

				{#if error}
					<p class="text-sm text-destructive">{error}</p>
				{/if}
			</div>
		{/if}
	</div>

	{#if isCheckingActiveRoom}
		<div class="absolute inset-0 flex items-center justify-center">
			<Spinner size="lg" />
		</div>
	{/if}
</div>
