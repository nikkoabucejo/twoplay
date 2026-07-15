<script lang="ts">
	import { useMutation, useQuery } from "convex-svelte";
	import { goto } from "$app/navigation";
	import { Button, Emblem, Spinner, Tabs, type TabItem } from "$lib/components/ui";
	import { GAMES } from "$lib/features/play";
	import { getClerkAuth } from "$lib/services/auth";
	import { cn } from "$lib/utils/style";
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
	let copied = $state(false);
	let copiedTimeout: ReturnType<typeof setTimeout> | undefined;

	const selectedGame = $derived(ENTRIES[centerIndex].type);
	const queued = $derived(queueStatus.data === true);

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
		navigator.clipboard.writeText(`${location.origin}/${selectedGame}/${createdCode}`);
		copied = true;
		clearTimeout(copiedTimeout);
		copiedTimeout = setTimeout(() => (copied = false), 1500);
	}
</script>

{#if auth.isSignedIn && activeRoom.isLoading}
	<!-- Holds off on the picker entirely while we check for an already-active room — avoids flashing
	     the create/join UI for a beat before bouncing into that room. -->
	<div class="flex flex-1 items-center justify-center">
		<Spinner size="lg" />
	</div>
{:else}
	<div class="flex flex-1 flex-col items-center justify-center px-4 py-8 text-center">
		<div class="relative w-full max-w-xs">
			<div
				class="absolute bottom-full left-1/2 mb-4 flex h-36 w-full max-w-md -translate-x-1/2 items-center justify-center overflow-hidden mask-[linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]"
			>
				{#each ENTRIES as entry, index (index)}
					{@const offset = index - centerIndex}
					{@const abs = Math.abs(offset)}
					{@const isSelected = offset === 0}
					{@const scale = Math.max(0.5, 1.35 - abs * 0.28)}
					{@const opacity = Math.max(0, 1 - abs * 0.3)}
					<button
						type="button"
						class="absolute top-1/2 left-1/2 flex cursor-default items-center justify-center rounded-xltransition-[transform,opacity] duration-300 ease-out outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed"
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
				<div class="flex flex-col items-center gap-3">
					<p class="text-muted-foreground">Sign in to create or join a room.</p>
					<Button onclick={() => auth.signIn()}>Sign in</Button>
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
								<Button variant="outline" onclick={copyInviteLink}>
									{copied ? "Copied" : "Copy link"}
								</Button>
							</div>
						{:else if queued}
							<div
								class="flex w-full flex-col items-center gap-3 rounded-md border bg-background/60 px-4 py-4.75"
							>
								<svg class="absolute size-0" aria-hidden="true">
									<filter id="search-orb-goo" x="-40%" y="-40%" width="180%" height="180%">
										<feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blurred" />
										<feColorMatrix
											in="blurred"
											mode="matrix"
											values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9"
										/>
									</filter>
								</svg>
								<div
									class="search-orb relative flex size-16 shrink-0 items-center justify-center rounded-full"
									style="--orb-a: {GAMES[selectedGame].colors[0]}; --orb-b: {GAMES[selectedGame]
										.colors[1]}"
									aria-hidden="true"
								>
									<div class="search-orb__ring absolute inset-0 rounded-full"></div>
									<div class="absolute inset-0.75 overflow-hidden rounded-full bg-background">
										<div class="search-orb__goo absolute inset-0">
											<div class="search-orb__blob search-orb__blob--a absolute rounded-full"
											></div>
											<div class="search-orb__blob search-orb__blob--b absolute rounded-full"
											></div>
											<div class="search-orb__blob search-orb__blob--c absolute rounded-full"
											></div>
											<div class="search-orb__blob search-orb__blob--d absolute rounded-full"
											></div>
										</div>
										<div class="search-orb__sheen absolute inset-0 rounded-full"></div>
									</div>
								</div>
								<div class="flex flex-col items-center gap-0.5" aria-live="polite">
									<p class="flex items-center gap-1 text-sm font-semibold text-foreground">
										Finding a match
										<span class="flex items-end gap-0.5" aria-hidden="true">
											<span class="size-1 rounded-full bg-foreground motion-safe:animate-bounce"
											></span>
											<span
												class="size-1 rounded-full bg-foreground motion-safe:animate-bounce animation-delay-[150ms]"
											></span>
											<span
												class="size-1 rounded-full bg-foreground motion-safe:animate-bounce animation-delay-[300ms]"
											></span>
										</span>
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
	</div>
{/if}

<style>
	/* A small "alive" searching visual for the queue box: colored blobs melt into and split from each
	   other (classic goo/metaball filter — blur, then snap the alpha channel back to sharp edges) while
	   a thin ring sweeps the rim, standing in for "still looking for someone". */
	.search-orb__ring {
		background: conic-gradient(
			from 0deg,
			var(--orb-a) 0deg,
			transparent 60deg,
			transparent 210deg,
			var(--orb-b) 280deg,
			transparent 340deg
		);
		filter: blur(1px);
		animation: search-orb-spin 2.4s linear infinite;
	}

	.search-orb__goo {
		filter: url(#search-orb-goo);
	}

	.search-orb__blob {
		animation-timing-function: ease-in-out;
		animation-iteration-count: infinite;
		mix-blend-mode: screen;
	}

	.search-orb__blob--a {
		top: 16%;
		left: 12%;
		width: 48%;
		height: 48%;
		background: var(--orb-a);
		animation-name: search-orb-a;
		animation-duration: 5.4s;
	}

	.search-orb__blob--b {
		top: 34%;
		left: 46%;
		width: 42%;
		height: 42%;
		background: var(--orb-b);
		animation-name: search-orb-b;
		animation-duration: 6.2s;
		animation-delay: -1.6s;
	}

	.search-orb__blob--c {
		top: 6%;
		left: 42%;
		width: 34%;
		height: 34%;
		background: var(--orb-a);
		animation-name: search-orb-c;
		animation-duration: 4.8s;
		animation-delay: -3s;
	}

	.search-orb__blob--d {
		top: 46%;
		left: 8%;
		width: 30%;
		height: 30%;
		background: var(--orb-b);
		animation-name: search-orb-d;
		animation-duration: 7s;
		animation-delay: -2.2s;
	}

	.search-orb__sheen {
		background: radial-gradient(circle at 30% 25%, oklch(1 0 0 / 40%), transparent 55%);
		mix-blend-mode: soft-light;
	}

	@keyframes search-orb-spin {
		to {
			transform: rotate(360deg);
		}
	}

	@keyframes search-orb-a {
		0%,
		100% {
			translate: 0 0;
			scale: 1;
		}
		33% {
			translate: 22% 12%;
			scale: 1.15;
		}
		66% {
			translate: -14% 18%;
			scale: 0.85;
		}
	}

	@keyframes search-orb-b {
		0%,
		100% {
			translate: 0 0;
			scale: 1;
		}
		33% {
			translate: -18% -14%;
			scale: 0.9;
		}
		66% {
			translate: 16% -10%;
			scale: 1.2;
		}
	}

	@keyframes search-orb-c {
		0%,
		100% {
			translate: 0 0;
			scale: 1;
		}
		50% {
			translate: -22% 18%;
			scale: 1.25;
		}
	}

	@keyframes search-orb-d {
		0%,
		100% {
			translate: 0 0;
			scale: 1;
		}
		50% {
			translate: 22% -16%;
			scale: 0.8;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.search-orb__ring,
		.search-orb__blob {
			animation: none;
		}
	}
</style>
