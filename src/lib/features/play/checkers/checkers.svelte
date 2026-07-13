<script lang="ts">
	import { useMutation } from "convex-svelte";
	import { backOut } from "svelte/easing";
	import { fade } from "svelte/transition";
	import { goto } from "$app/navigation";
	import { resolve } from "$app/paths";
	import { Board, type BoardStatus } from "$lib/components/layout";
	import { Button, Spinner } from "$lib/components/ui";
	import { Cursor } from "$lib/features/presence";
	import { getClerkAuth } from "$lib/services/auth";
	import { playCaptureSound, playMoveSound, prepareSound } from "$lib/utils/sound";
	import { cn, ACCENTS } from "$lib/utils/style";
	import { api } from "../../../../../convex/_generated/api.js";
	import { DEFAULT_EMOJI } from "../../../../../convex/models/players/index.js";
	import { CheckersRoom } from "./game.svelte.js";
	import { playerIndexOf, type Piece } from "./types.js";

	const PIECE_DURATION = 220;

	/** A gooey pop-in, matching the tic-tac-toe mark: an overshooting scale-up so a piece feels dropped onto the board. */
	function liquidIn(
		_node: Element,
		{ duration = PIECE_DURATION, delay = 0 }: { duration?: number; delay?: number } = {}
	) {
		return {
			delay,
			duration,
			css: (t: number) => {
				const scale = backOut(t) * 0.4 + 0.6;
				return `transform: scale(${scale}); opacity: ${Math.min(t * 2.5, 1)};`;
			}
		};
	}

	let {
		roomCode,
		round,
		class: className
	}: { roomCode: string; round?: number; class?: string } = $props();

	const auth = getClerkAuth();
	const joinRoom = useMutation(api.models.rooms.index.join);
	const room = new CheckersRoom(
		() => roomCode,
		() => round
	);
	const data = $derived(room.data);

	let joinError = $state<string | null>(null);

	$effect(() => {
		const code = roomCode;
		if (!auth.isSignedIn) return;

		joinError = null;
		joinRoom({ code }).catch((err) => {
			joinError = err instanceof Error ? err.message : "Could not join this room";
		});
	});

	$effect(() => {
		if (room.wrongGameType && data)
			goto(resolve(`/${data.type}/${roomCode}`), { replaceState: true });
	});

	$effect(() => () => room.dispose());

	function goLive() {
		goto(resolve(`/checkers/${roomCode}`));
	}

	function goToRound(round: number) {
		goto(resolve(`/checkers/${roomCode}/${round}`));
	}

	function firstName(name: string) {
		return name.split(" ")[0];
	}

	function pieceKey(index: number, p: Piece | null) {
		return p ? `${index}:${p.color}:${p.king ? "king" : "man"}` : `${index}:empty`;
	}

	function seatFor(piece: Piece | null | undefined) {
		return piece ? playerIndexOf(piece.color) : 0;
	}

	function select(index: number) {
		const from = room.effectiveSelected;
		const move = from !== null ? room.movesFrom(from).find((move) => move.to === index) : null;
		if (move) {
			prepareSound();
			playMoveSound(seatFor(room.board[move.from]));
			if (move.captured !== null) playCaptureSound(seatFor(room.board[move.captured]));
		} else if (room.canSelect(index)) {
			prepareSound();
		}
		void room.select(index);
	}

	/** Arrow keys scrub this browser's personal view of the current round's move history — local only,
	 *  never touches the real game state or other players' views. */
	function handleKeydown(event: KeyboardEvent) {
		if (!data) return;
		const target = event.target as HTMLElement | null;
		if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;

		switch (event.key) {
			case "ArrowLeft":
				event.preventDefault();
				room.stepBack();
				break;
			case "ArrowRight":
				event.preventDefault();
				room.stepForward();
				break;
			case "ArrowUp":
				event.preventDefault();
				room.jumpToLatest();
				break;
			case "ArrowDown":
				event.preventDefault();
				room.jumpToFirst();
				break;
		}
	}

	const destinations = $derived(
		room.effectiveSelected !== null ? room.movesFrom(room.effectiveSelected).map((m) => m.to) : []
	);
	const forcedMovers = $derived(
		room.effectiveSelected === null
			? new Set(room.legalMoves.map((move) => move.from))
			: new Set<number>()
	);

	const status: BoardStatus = $derived(
		room.game.endedSeat !== null
			? {
					type: "winner",
					player: room.game.endedSeat === 0 ? 1 : 0,
					reason: room.game.endReason ?? undefined
				}
			: room.winner
				? { type: "winner", player: playerIndexOf(room.winner) }
				: { type: "turn", player: playerIndexOf(room.turn) }
	);

	/** Player 1's pieces start at the bottom of the raw board; flip it so player 2 sees their own
	 *  pieces nearest them too. */
	const flip = $derived(room.myIndex === 1);
</script>

{#snippet piece(p: Piece, isSelected: boolean)}
	<div
		class={cn(
			"relative flex h-4/5 w-4/5 items-center justify-center rounded-full shadow-md",
			ACCENTS[playerIndexOf(p.color)].bg
		)}
		in:liquidIn
	>
		{#if isSelected}
			<div
				class="absolute inset-1 rounded-full ring-2 ring-white"
				in:fade={{ duration: 150 }}
			></div>
		{/if}
		{#if p.king}
			<svg viewBox="0 0 24 24" class="h-2/5 w-2/5 text-background/90" fill="currentColor">
				<path d="M3 8 L7 12 L12 5 L17 12 L21 8 L19 18 H5 Z" />
			</svg>
		{/if}
	</div>
{/snippet}

<svelte:window onkeydown={handleKeydown} />

<div class={cn("flex flex-col items-center gap-6", className)}>
	{#if !auth.isSignedIn}
		<div class="flex flex-col items-center gap-3">
			<p class="text-muted-foreground">Sign in to create or join a room.</p>
			<Button onclick={() => auth.signIn()}>Sign in</Button>
		</div>
	{:else if room.isLoading}
		<Spinner size="lg" />
	{:else if data === null}
		<div class="flex flex-col items-center gap-3">
			<p class="text-muted-foreground">Room "{roomCode}" doesn't exist.</p>
			<Button variant="outline" href="/checkers">Back to lobby</Button>
		</div>
	{:else if room.wrongGameType}
		<Spinner size="lg" />
	{:else if joinError}
		<div class="flex flex-col items-center gap-3">
			<p class="text-muted-foreground">{joinError}</p>
			<Button variant="outline" href="/checkers">Back to lobby</Button>
		</div>
	{:else if data}
		<div class="relative">
			{#if room.isViewingHistory}
				<div
					class="pointer-events-none absolute inset-x-0 top-0 z-20 flex -translate-y-[calc(100%+0.5rem)] justify-center"
					transition:fade={{ duration: 150 }}
				>
					<div
						class="pointer-events-auto flex items-center gap-2 rounded-full border bg-background/90 px-3 py-1 text-xs shadow-sm backdrop-blur-sm"
					>
						<span class="tabular-nums text-muted-foreground">
							Move {room.viewedMoveNumber} of {room.historyLength}
						</span>
						<button
							type="button"
							class="font-semibold text-primary hover:underline"
							onclick={() => room.jumpToLatest()}
						>
							Return to live
						</button>
					</div>
				</div>
			{/if}
			<Board
				players={[
					{
						label: room.players[0] ? firstName(room.players[0].name) : "Player 1",
						emoji: room.players[0]?.emoji ?? DEFAULT_EMOJI,
						accent: ACCENTS[0].text,
						score: room.players[0]?.score ?? 0
					},
					{
						label: room.players[1] ? firstName(room.players[1].name) : "Player 2",
						emoji: room.players[1]?.emoji ?? DEFAULT_EMOJI,
						accent: ACCENTS[1].text,
						score: room.players[1]?.score ?? 0
					}
				]}
				{status}
				clock={room.clock}
				myIndex={room.myIndex}
				onTrashtalk={(emoji) => room.trashtalk(emoji)}
				footer={{
					isLive: room.game.isLive,
					round: room.game.round,
					latestRound: room.game.latestRound,
					onResign: () => room.resign(),
					onRematch: () => room.rematch(),
					onGoLive: goLive,
					onGoToRound: goToRound,
					error: room.error
				}}
			>
				<Cursor
					{roomCode}
					{flip}
					class="size-full"
					colorFor={(index) => ACCENTS[index]?.text ?? "text-muted-foreground"}
				>
					<div
						class="grid size-full grid-cols-8 grid-rows-8 overflow-hidden rounded-xl border"
						role="grid"
						aria-label="Checkers board"
					>
						{#each { length: 64 } as _, slot (slot)}
							{@const index = flip ? 63 - slot : slot}
							{@const row = Math.floor(index / 8)}
							{@const col = index % 8}
							{@const dark = (row + col) % 2 === 1}
							{@const cell = room.board[index]}
							{@const isDestination = destinations.includes(index)}
							{@const isSelected = room.effectiveSelected === index}
							{@const isForcedMover = dark && cell?.color === room.turn && forcedMovers.has(index)}
							<button
								type="button"
								class={cn(
									"relative flex items-center justify-center",
									dark
										? "bg-foreground/10 hover:bg-foreground/15 dark:bg-foreground/15"
										: "bg-background",
									!dark && "cursor-default"
								)}
								disabled={!dark}
								aria-label={cell
									? `Row ${row + 1}, column ${col + 1}, player ${playerIndexOf(cell.color) + 1}${cell.king ? " king" : ""}`
									: `Row ${row + 1}, column ${col + 1}, empty`}
								onclick={() => select(index)}
							>
								{#if isForcedMover}
									<div
										class="absolute inset-[12%] rounded-full ring-2 ring-amber-400/70"
										out:fade
									></div>
								{/if}
								{#if isDestination}
									<span
										class="absolute size-1/4 rounded-full bg-emerald-400/70"
										in:fade={{ duration: 150 }}
									></span>
								{/if}
								{#key pieceKey(index, cell)}
									{#if cell}
										{@render piece(cell, isSelected)}
									{/if}
								{/key}
							</button>
						{/each}
					</div>
				</Cursor>
			</Board>
		</div>
	{/if}
</div>
