<script lang="ts">
	import { useMutation } from "convex-svelte";
	import { untrack } from "svelte";
	import { backOut } from "svelte/easing";
	import { fade } from "svelte/transition";
	import { goto } from "$app/navigation";
	import { resolve } from "$app/paths";
	import {
		Board,
		BoardPlaceholder,
		roomStatus,
		rovingStep,
		scrubCommand
	} from "$lib/components/layout";
	import { Button, getToaster, Gate } from "$lib/components/ui";
	import { Cursor, TurnAlert } from "$lib/features/presence";
	import { getClerkAuth } from "$lib/services/auth";
	import { roomPath } from "$lib/utils/multiplayer";
	import { playCaptureSound, playMoveSound, prepareSound } from "$lib/utils/sound";
	import { cn, ACCENTS } from "$lib/utils/style";
	import { api } from "../../../../../convex/_generated/api.js";
	import { DEFAULT_EMOJI } from "../../../../../convex/models/players/index.js";
	import { GAMES } from "../games.js";
	import { CheckersRoom } from "./game.svelte.js";
	import { squareLabel } from "./labels.js";
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
	const toaster = getToaster();
	const joinRoom = useMutation(api.models.rooms.index.join);
	const room = new CheckersRoom(
		() => roomCode,
		() => round
	);
	new TurnAlert(() => (room.isLoading ? null : room.isMyTurnConfirmed));
	const data = $derived(room.data);

	let joinError = $state<string | null>(null);

	$effect(() => {
		const code = roomCode;
		if (!auth.isSignedIn) return;

		joinError = null;
		joinRoom({ code })
			.then((result) => {
				if (result.redirected)
					goto(resolve(`/${result.type}/${result.code}`), { replaceState: true });
			})
			.catch((err) => {
				joinError = err instanceof Error ? err.message : "Could not join this room";
			});
	});

	// Another game's room, or a code typed in another case: move to the room's canonical URL.
	$effect(() => {
		if (data && (room.wrongGameType || data.code !== roomCode))
			goto(resolve(roomPath(data.type, data.code, round)), { replaceState: true });
	});

	$effect(() => {
		const rejection = room.rejection;
		// `show` reads the toast list, which would otherwise re-run this effect.
		if (rejection) untrack(() => toaster.show(rejection.message, { tone: "error" }));
	});

	$effect(() => () => room.dispose());

	function goLive() {
		goto(resolve(roomPath("checkers", roomCode)));
	}

	function goToRound(round: number) {
		goto(resolve(roomPath("checkers", roomCode, round)));
	}

	function playAgain() {
		goto(resolve("/play?game=checkers"));
	}

	async function newOpponent() {
		await room.abandon();
		if (!room.error) playAgain();
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

	/** Scrubs this browser's own view of the round's moves. Arrows inside the board move focus
	 *  instead; `[` and `]` scrub from anywhere. */
	function handleKeydown(event: KeyboardEvent) {
		if (!data || !(event.target instanceof Element)) return;
		const command = scrubCommand(event.key, {
			isInBoard: event.target.closest("[data-board-grid]") !== null,
			isTextField: event.target.matches("input, textarea, [contenteditable]")
		});
		if (command === null) return;
		event.preventDefault();
		if (command === "back") room.stepBack();
		else if (command === "forward") room.stepForward();
		else if (command === "first") room.jumpToFirst();
		else room.jumpToLatest();
	}

	/** The one dark square in the tab order, by its drawn position (0–63). */
	let focusedSlot = $state(1);

	function moveFocus(event: KeyboardEvent & { currentTarget: HTMLElement }) {
		if (!(event.target instanceof HTMLElement) || !event.target.dataset.slotIndex) return;
		const next = rovingStep(Number(event.target.dataset.slotIndex), event.key, "checkers");
		if (next === null) return;
		event.preventDefault();
		focusedSlot = next;
		event.currentTarget.querySelector<HTMLElement>(`[data-slot-index="${next}"]`)?.focus();
	}

	const destinations = $derived(
		room.effectiveSelected !== null ? room.movesFrom(room.effectiveSelected).map((m) => m.to) : []
	);
	const forcedMovers = $derived(
		room.effectiveSelected === null
			? new Set(room.legalMoves.map((move) => move.from))
			: new Set<number>()
	);

	const status = $derived(
		roomStatus({
			isWaitingForOpponent: room.isWaitingForOpponent,
			isRoomClosed: room.isRoomClosed,
			endedSeat: room.game.endedSeat,
			reason: room.game.reason,
			live: room.liveOutcome
		})
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

<!-- The board piece's disc without the drop-in, which plays the move sound. -->
{#snippet stripMark(seat: 0 | 1)}
	<div class={cn("size-full rounded-full shadow-md", ACCENTS[seat].bg)}></div>
{/snippet}

<svelte:window onkeydown={handleKeydown} />

<div class={cn("flex flex-col items-center gap-6", className)}>
	{#if !auth.isSignedIn}
		<Gate message="Sign in to join this {GAMES.checkers.name} game." />
	{:else if room.isLoading}
		<BoardPlaceholder />
	{:else if room.loadError}
		<div class="flex flex-col items-center gap-3">
			<p class="text-muted-foreground">Couldn't load this room.</p>
			<div class="flex gap-2">
				<Button onclick={() => location.reload()}>Retry</Button>
				<Button variant="outline" href="/play?game=checkers">Back to play</Button>
			</div>
		</div>
	{:else if data === null}
		<div class="flex flex-col items-center gap-3">
			<p class="text-muted-foreground">Room "{roomCode}" doesn't exist.</p>
			<Button variant="outline" href="/play?game=checkers">Back to play</Button>
		</div>
	{:else if room.wrongGameType}
		<BoardPlaceholder />
	{:else if joinError}
		<div class="flex flex-col items-center gap-3">
			<p class="text-muted-foreground">{joinError}</p>
			<Button variant="outline" href="/play?game=checkers">Back to play</Button>
		</div>
	{:else if data}
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
			room={{
				type: "checkers",
				name: GAMES.checkers.name,
				code: data.code,
				icon: GAMES.checkers.icon
			}}
			replay={{
				isViewingHistory: room.isViewingHistory,
				moveNumber: room.viewedMoveNumber,
				moveCount: room.historyLength,
				canStepBack: room.viewedMoveNumber > 1,
				canStepForward: room.isViewingHistory,
				onFirst: () => room.jumpToFirst(),
				onBack: () => room.stepBack(),
				onForward: () => room.stepForward(),
				onLive: () => room.jumpToLatest()
			}}
			rounds={room.rounds}
			mustCapture={room.mustCapture}
			clock={room.clock}
			myIndex={room.myIndex}
			opponentDisconnected={room.opponentDisconnected}
			onTrashtalk={(emoji) => room.trashtalk(emoji)}
			markIcon={stripMark}
			rejectionId={room.rejection?.id}
			footer={{
				isLive: room.game.isLive,
				round: room.game.round,
				latestRound: room.game.latestRound,
				onResign: () => room.resign(),
				onRematch: () => room.rematch(),
				onAbandon: () => room.abandon(),
				onPlayAgain: playAgain,
				onNewOpponent: newOpponent,
				onLobby: () => goto(resolve("/lobby")),
				roomClosed: room.isRoomClosed,
				waitingForOpponent: room.isWaitingForOpponent,
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
				<!-- Arrow keys arrive from the focused square; the group moves focus between them. -->
				<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
				<div
					class="grid size-full grid-cols-8 grid-rows-8 overflow-hidden rounded-xl border"
					role="group"
					aria-label="Checkers board"
					data-board-grid
					data-sfx="off"
					onkeydown={moveFocus}
				>
					{#each { length: 64 } as _, slot (slot)}
						{@const index = flip ? 63 - slot : slot}
						{@const isDark = (Math.floor(index / 8) + (index % 8)) % 2 === 1}
						{@const cell = room.board[index]}
						{@const isDestination = destinations.includes(index)}
						{@const isSelected = room.effectiveSelected === index}
						{@const isForcedMover = isDark && cell?.color === room.turn && forcedMovers.has(index)}
						{@const isLastMove = room.lastMove?.from === index || room.lastMove?.to === index}
						{#if isDark}
							<button
								type="button"
								data-slot-index={slot}
								tabindex={slot === focusedSlot ? 0 : -1}
								class={cn(
									"relative flex items-center justify-center bg-foreground/10 outline-none hover:bg-foreground/15 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset dark:bg-foreground/15",
									isLastMove && room.lastMove && ACCENTS[room.lastMove.seat].tintBg
								)}
								aria-label={squareLabel(index, cell, room.abilityOf(index))}
								onfocus={() => (focusedSlot = slot)}
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
						{:else}
							<div class="bg-background" aria-hidden="true"></div>
						{/if}
					{/each}
				</div>
			</Cursor>
		</Board>
	{/if}
</div>
