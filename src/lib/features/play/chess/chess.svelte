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
		MOVE_DOT,
		roomStatus,
		rovingStep,
		scrubCommand,
		SELECTED_RING,
		squareClass
	} from "$lib/components/layout";
	import { Button, getToaster, Gate } from "$lib/components/ui";
	import { Cursor, TurnAlert } from "$lib/features/presence";
	import { getClerkAuth } from "$lib/services/auth";
	import { roomPath } from "$lib/utils/multiplayer";
	import { playCaptureSound, playMoveSound, prepareSound } from "$lib/utils/sound";
	import { cn, ACCENTS } from "$lib/utils/style";
	import { api } from "../../../../../convex/_generated/api.js";
	import {
		colorOfSeat,
		isCapture,
		seatOfColor,
		squareIndex,
		squareName
	} from "../../../../../convex/models/games/chess/rules.js";
	import { DEFAULT_EMOJI } from "../../../../../convex/models/players/constants.js";
	import { GAMES } from "../games.js";
	import { ChessRoom } from "./game.svelte.js";
	import { squareLabel } from "./labels.js";
	import ChessPiece from "./piece.svelte";
	import Promotion from "./promotion.svelte";
	import type { LegalMove, Piece, PromotionPiece } from "./types.js";

	const PIECE_DURATION = 220;

	/** A gooey pop-in, matching the checkers piece: an overshooting scale-up so a piece feels dropped onto the board. */
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
	const room = new ChessRoom(
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
		goto(resolve(roomPath("chess", roomCode)));
	}

	function goToRound(round: number) {
		goto(resolve(roomPath("chess", roomCode, round)));
	}

	function playAgain() {
		goto(resolve("/play?game=chess"));
	}

	async function newOpponent() {
		await room.abandon();
		if (!room.error) playAgain();
	}

	function firstName(name: string) {
		return name.split(" ")[0];
	}

	function pieceKey(index: number, p: Piece | null) {
		return p ? `${index}:${p.color}:${p.type}` : `${index}:empty`;
	}

	function playMoveSounds(move: LegalMove) {
		const mover = room.board[squareIndex(move.from)];
		if (!mover) return;
		const seat = seatOfColor(mover.color);
		prepareSound();
		playMoveSound(seat);
		if (isCapture(move)) playCaptureSound(seat === 0 ? 1 : 0);
	}

	/** The destination square of the last chosen move, which anchors the promotion picker. */
	let promotionAnchor = $state<HTMLElement | null>(null);

	function select(index: number, target: HTMLElement) {
		const to = squareName(index);
		const move = room.legalMoves.find(
			(move) => move.from === room.effectiveSelected && move.to === to
		);
		if (move) {
			promotionAnchor = target;
			if (move.promotion === undefined) playMoveSounds(move);
		} else if (room.canSelect(index)) {
			prepareSound();
		}
		void room.select(index);
	}

	function promote(piece: PromotionPiece) {
		const pending = room.pendingPromotion;
		const move = room.legalMoves.find(
			(move) => move.from === pending?.from && move.to === pending.to && move.promotion === piece
		);
		if (move) playMoveSounds(move);
		void room.promote(piece);
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

	/** The one square in the tab order, by its drawn position (0–63). */
	let focusedSlot = $state(0);

	function moveFocus(event: KeyboardEvent & { currentTarget: HTMLElement }) {
		if (!(event.target instanceof HTMLElement) || !event.target.dataset.slotIndex) return;
		const next = rovingStep(Number(event.target.dataset.slotIndex), event.key, "chess");
		if (next === null) return;
		event.preventDefault();
		focusedSlot = next;
		event.currentTarget.querySelector<HTMLElement>(`[data-slot-index="${next}"]`)?.focus();
	}

	const status = $derived(
		roomStatus({
			isWaitingForOpponent: room.isWaitingForOpponent,
			isRoomClosed: room.isRoomClosed,
			endedSeat: room.game.endedSeat,
			reason: room.game.reason,
			live: room.liveOutcome
		})
	);

	/** Black sees its own pieces at the bottom: the board turns 180°. */
	const flip = $derived(room.myIndex === 1);
</script>

{#snippet stripMark(seat: 0 | 1)}
	<ChessPiece piece={{ color: colorOfSeat(seat), type: "k" }} class="size-full" />
{/snippet}

<svelte:window onkeydown={handleKeydown} />

<div class={cn("flex flex-col items-center gap-6", className)}>
	{#if !auth.isSignedIn}
		<Gate message="Sign in to join this {GAMES.chess.name} game." />
	{:else if room.isLoading}
		<BoardPlaceholder />
	{:else if room.loadError}
		<div class="flex flex-col items-center gap-3">
			<p class="text-muted-foreground">Couldn't load this room.</p>
			<div class="flex gap-2">
				<Button onclick={() => location.reload()}>Retry</Button>
				<Button variant="outline" href="/play?game=chess">Back to play</Button>
			</div>
		</div>
	{:else if data === null}
		<div class="flex flex-col items-center gap-3">
			<p class="text-muted-foreground">Room "{roomCode}" doesn't exist.</p>
			<Button variant="outline" href="/play?game=chess">Back to play</Button>
		</div>
	{:else if room.wrongGameType}
		<BoardPlaceholder />
	{:else if joinError}
		<div class="flex flex-col items-center gap-3">
			<p class="text-muted-foreground">{joinError}</p>
			<Button variant="outline" href="/play?game=chess">Back to play</Button>
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
				type: "chess",
				name: GAMES.chess.name,
				code: data.code,
				icon: GAMES.chess.icon
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
					aria-label="Chess board"
					data-board-grid
					data-sfx="off"
					onkeydown={moveFocus}
				>
					{#each { length: 64 } as _, slot (slot)}
						{@const index = flip ? 63 - slot : slot}
						{@const name = squareName(index)}
						{@const isDark = (Math.floor(index / 8) + (index % 8)) % 2 === 1}
						{@const cell = room.board[index]}
						{@const isInCheck = room.checkSquare === name}
						{@const isLastMove = room.lastMove?.from === name || room.lastMove?.to === name}
						<button
							type="button"
							data-slot-index={slot}
							tabindex={slot === focusedSlot ? 0 : -1}
							class={squareClass({
								dark: isDark,
								tint: isLastMove && room.lastMove ? room.lastMove.seat : null,
								mark: isInCheck,
								interactive: true
							})}
							aria-label={squareLabel(index, cell, {
								isInCheck,
								canMove: room.canSelect(index),
								isSelected: room.effectiveSelected === name,
								isDestination: room.destinations.includes(name)
							})}
							onfocus={() => (focusedSlot = slot)}
							onclick={(event) => select(index, event.currentTarget)}
						>
							{#if room.effectiveSelected === name}
								<div
									class={cn("absolute inset-[12%]", SELECTED_RING)}
									in:fade={{ duration: 150 }}
								></div>
							{/if}
							{#key pieceKey(index, cell)}
								{#if cell}
									<div class="flex size-3/4" in:liquidIn>
										<ChessPiece piece={cell} class="size-full" />
									</div>
								{/if}
							{/key}
							{#if room.destinations.includes(name)}
								{#if cell}
									<span
										data-hint="capture"
										class="absolute inset-[6%] rounded-full ring-2 ring-emerald-400/70"
										in:fade={{ duration: 150 }}
									></span>
								{:else}
									<span data-hint="move" class={MOVE_DOT} in:fade={{ duration: 150 }}></span>
								{/if}
							{/if}
						</button>
					{/each}
					<p class="sr-only" aria-live="polite">
						{room.lastMove ? `Last move: ${room.lastMove.san}` : ""}
					</p>
				</div>
			</Cursor>
		</Board>
		{#if room.turn !== null}
			<Promotion
				isOpen={room.pendingPromotion !== null}
				anchor={promotionAnchor}
				color={room.turn}
				onPick={promote}
				onCancel={() => room.cancelPromotion()}
			/>
		{/if}
	{/if}
</div>
