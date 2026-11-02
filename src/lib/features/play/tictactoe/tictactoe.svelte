<script lang="ts">
	import { useMutation } from "convex-svelte";
	import { untrack } from "svelte";
	import { backOut } from "svelte/easing";
	import { draw, fade } from "svelte/transition";
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
	import { playMoveSound, prepareSound } from "$lib/utils/sound";
	import { cn, ACCENTS } from "$lib/utils/style";
	import { api } from "../../../../../convex/_generated/api.js";
	import { DEFAULT_EMOJI } from "../../../../../convex/models/players/index.js";
	import { GAMES } from "../games.js";
	import { TictactoeRoom } from "./game.svelte.js";
	import { boardLabel, cellLabel } from "./labels.js";
	import { markOf, playerIndexOf } from "./types.js";
	import type { Board as CellBoard } from "./types.js";

	const MARK_DURATION = 240;

	/** A gooey pop-in: an overshooting scale-up with a brief squash/stretch wobble, so a mark feels like a droplet settling rather than snapping into place. */
	function liquidIn(
		_node: Element,
		{
			duration = MARK_DURATION,
			delay = 0,
			seat = 0
		}: { duration?: number; delay?: number; seat?: number } = {}
	) {
		playMoveSound(seat);
		return {
			delay,
			duration,
			css: (t: number) => {
				const scale = backOut(t) * 0.4 + 0.6;
				const wobble = Math.sin(t * Math.PI) * (1 - t) * 0.25;
				return `
					transform: scale(${scale + wobble}, ${scale - wobble});
					opacity: ${Math.min(t * 2.5, 1)};
				`;
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
	const room = new TictactoeRoom(
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
		goto(resolve(roomPath("tictactoe", roomCode)));
	}

	function goToRound(round: number) {
		goto(resolve(roomPath("tictactoe", roomCode, round)));
	}

	function playAgain() {
		goto(resolve("/play?game=tictactoe"));
	}

	async function newOpponent() {
		await room.abandon();
		if (!room.error) playAgain();
	}

	function firstName(name: string) {
		return name.split(" ")[0];
	}

	function play(boardIndex: number, cellIndex: number) {
		if (room.boards[boardIndex]?.[cellIndex] !== null || !room.canPlay(boardIndex)) return;
		prepareSound();
		void room.play(boardIndex, cellIndex);
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

	/** The one cell in the tab order, as `boardIndex * 9 + cellIndex`. */
	let focusedSlot = $state(0);

	function moveFocus(event: KeyboardEvent & { currentTarget: HTMLElement }) {
		if (!(event.target instanceof HTMLElement) || !event.target.dataset.slotIndex) return;
		const next = rovingStep(Number(event.target.dataset.slotIndex), event.key, "tictactoe");
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
</script>

{#snippet markShape(value: "X" | "O")}
	{#if value === "X"}
		<line
			x1="7"
			y1="7"
			x2="17"
			y2="17"
			stroke="currentColor"
			stroke-width="3.5"
			stroke-linecap="round"
		/>
		<line
			x1="17"
			y1="7"
			x2="7"
			y2="17"
			stroke="currentColor"
			stroke-width="3.5"
			stroke-linecap="round"
		/>
	{:else}
		<circle
			cx="12"
			cy="12"
			r="7"
			fill="none"
			stroke="currentColor"
			stroke-width="3.5"
			stroke-linecap="round"
		/>
	{/if}
{/snippet}

{#snippet mark(value: "X" | "O", size: string = "h-3/5 w-3/5")}
	<svg viewBox="0 0 24 24" class={size} in:liquidIn={{ seat: playerIndexOf(value) }}>
		{@render markShape(value)}
	</svg>
{/snippet}

{#snippet stripMark(seat: 0 | 1)}
	<svg viewBox="0 0 24 24" class="size-full">
		{@render markShape(markOf(seat))}
	</svg>
{/snippet}

{#snippet rules()}
	<ul class="flex list-disc flex-col gap-1.5 pl-4 text-muted-foreground">
		<li>Three in a row wins a board.</li>
		<li>Three boards in a row wins the game.</li>
		<li>You can't play the board you played last turn, unless it's the only open board.</li>
	</ul>
	<Button href="/how-to-play/tictactoe" variant="link" size="xs" class="mt-2 px-0">
		How to play
	</Button>
{/snippet}

{#snippet miniBoard(cells: CellBoard, boardIndex: number)}
	{@const status = room.statuses[boardIndex]}
	<div class="relative h-full w-full">
		<div
			class={cn(
				"grid h-full w-full grid-cols-3 grid-rows-3 gap-1.5 rounded-xl bg-muted/50 p-1.5 backdrop-blur-2xl backdrop-saturate-150 transition-opacity duration-200 motion-reduce:transition-none dark:bg-muted/40",
				room.isForbidden(boardIndex) && "opacity-40"
			)}
			role="group"
			aria-label={boardLabel(boardIndex)}
			data-sfx="off"
		>
			{#each cells as cell, cellIndex (cellIndex)}
				{@const slot = boardIndex * 9 + cellIndex}
				{@const isPlayable = cell === null && room.canPlay(boardIndex)}
				{@const lastMove = room.lastMove}
				<!-- aria-disabled, not disabled, so arrow keys can still focus every cell. -->
				<button
					type="button"
					data-slot-index={slot}
					tabindex={slot === focusedSlot ? 0 : -1}
					class={cn(
						"flex items-center justify-center rounded-md bg-background/90 shadow-sm outline-none backdrop-blur-md transition-colors focus-visible:ring-3 focus-visible:ring-ring/50",
						"hover:bg-background/95 aria-disabled:cursor-not-allowed aria-disabled:hover:bg-background/90",
						cell !== null && ACCENTS[playerIndexOf(cell)].text,
						lastMove?.boardIndex === boardIndex &&
							lastMove.cellIndex === cellIndex &&
							ACCENTS[lastMove.seat].tintBg
					)}
					aria-disabled={!isPlayable}
					aria-label={cellLabel(boardIndex, cellIndex, cell, isPlayable)}
					onfocus={() => (focusedSlot = slot)}
					onclick={() => play(boardIndex, cellIndex)}
				>
					{#if cell}
						{@render mark(cell)}
					{/if}
				</button>
			{/each}
		</div>
		{#if status.status === "won" && status.winner}
			{#if status.winningLine}
				{@const [a, , c] = status.winningLine}
				<svg
					viewBox="0 0 3 3"
					class={cn(
						"pointer-events-none absolute inset-0 h-full w-full",
						ACCENTS[playerIndexOf(status.winner)].text
					)}
				>
					<line
						x1={(a % 3) + 0.5}
						y1={Math.floor(a / 3) + 0.5}
						x2={(c % 3) + 0.5}
						y2={Math.floor(c / 3) + 0.5}
						stroke="currentColor"
						stroke-width="0.12"
						stroke-linecap="round"
						in:draw={{ duration: 300 }}
					/>
				</svg>
			{/if}
			<div
				class={cn(
					"absolute inset-0 flex items-center justify-center rounded-xl backdrop-blur-[3px] transition-colors",
					cn(
						ACCENTS[playerIndexOf(status.winner)].winBg,
						ACCENTS[playerIndexOf(status.winner)].text
					)
				)}
				in:fade={{ duration: MARK_DURATION }}
			>
				{@render mark(status.winner, "h-2/3 w-2/3")}
			</div>
		{/if}
	</div>
{/snippet}

<svelte:window onkeydown={handleKeydown} />

<div class={cn("flex flex-col items-center gap-6", className)}>
	{#if !auth.isSignedIn}
		<Gate message="Sign in to join this {GAMES.tictactoe.name} game." />
	{:else if room.isLoading}
		<BoardPlaceholder />
	{:else if room.loadError}
		<div class="flex flex-col items-center gap-3">
			<p class="text-muted-foreground">Couldn't load this room.</p>
			<div class="flex gap-2">
				<Button onclick={() => location.reload()}>Retry</Button>
				<Button variant="outline" href="/play?game=tictactoe">Back to play</Button>
			</div>
		</div>
	{:else if data === null}
		<div class="flex flex-col items-center gap-3">
			<p class="text-muted-foreground">Room "{roomCode}" doesn't exist.</p>
			<Button variant="outline" href="/play?game=tictactoe">Back to play</Button>
		</div>
	{:else if room.wrongGameType}
		<BoardPlaceholder />
	{:else if joinError}
		<div class="flex flex-col items-center gap-3">
			<p class="text-muted-foreground">{joinError}</p>
			<Button variant="outline" href="/play?game=tictactoe">Back to play</Button>
		</div>
	{:else if data}
		<Board
			players={[
				{
					label: room.players[0] ? firstName(room.players[0].name) : "Player 1",
					emoji: room.players[0]?.emoji ?? DEFAULT_EMOJI,
					accent: ACCENTS[0].text,
					score: room.players[0]?.score ?? 0,
					mark: markOf(0)
				},
				{
					label: room.players[1] ? firstName(room.players[1].name) : "Player 2",
					emoji: room.players[1]?.emoji ?? DEFAULT_EMOJI,
					accent: ACCENTS[1].text,
					score: room.players[1]?.score ?? 0,
					mark: markOf(1)
				}
			]}
			{status}
			room={{
				type: "tictactoe",
				name: GAMES.tictactoe.name,
				code: data.code,
				icon: GAMES.tictactoe.icon
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
			{rules}
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
				class="size-full"
				colorFor={(index) => ACCENTS[index]?.text ?? "text-muted-foreground"}
			>
				<!-- Arrow keys arrive from the focused square; the group moves focus between them. -->
				<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
				<div
					role="group"
					aria-label="Tic-tac-toe board"
					data-board-grid
					data-sfx="off"
					class="grid size-full grid-cols-3 grid-rows-3 gap-3"
					onkeydown={moveFocus}
				>
					{#each room.boards as cells, boardIndex (boardIndex)}
						{@render miniBoard(cells, boardIndex)}
					{/each}
				</div>
				{#if room.winningLine}
					{@const [a, , c] = room.winningLine}
					<svg
						viewBox="0 0 3 3"
						class={cn(
							"pointer-events-none absolute inset-0 h-full w-full",
							ACCENTS[playerIndexOf(room.winner ?? "O")].text
						)}
					>
						<line
							x1={(a % 3) + 0.5}
							y1={Math.floor(a / 3) + 0.5}
							x2={(c % 3) + 0.5}
							y2={Math.floor(c / 3) + 0.5}
							stroke="currentColor"
							stroke-width="0.08"
							stroke-linecap="round"
							in:draw={{ duration: 400 }}
						/>
					</svg>
				{/if}
			</Cursor>
		</Board>
	{/if}
</div>
