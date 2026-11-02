<script lang="ts">
	import { untrack } from "svelte";
	import { fade } from "svelte/transition";
	import { cn } from "$lib/utils/style";
	import { checkersEngine } from "../../../../../convex/models/games/checkers/index.js";
	import { computeLegalMoves } from "../../../../../convex/models/games/checkers/rules.js";
	import { tictactoeEngine } from "../../../../../convex/models/games/tictactoe/index.js";
	import CheckersBoard from "./checkers-board.svelte";
	import DemoCursor from "./demo-cursor.svelte";
	import { movePieceIds, pieceIds } from "./demo.js";
	import { Playback, isMotionReduced, onVisibility } from "./playback.svelte.js";
	import type { BoardDemo } from "./rules.js";
	import TictactoeBoard from "./tictactoe-board.svelte";

	let {
		demo,
		isPaused = false,
		class: className
	}: { demo: BoardDemo; isPaused?: boolean; class?: string } = $props();

	const SEATS = [0, 1] as const;
	const LABELS = ["Player 1", "Player 2"];
	/** Where each cursor waits before its first move: near its own side of the board. */
	const REST = [
		{ x: 0.82, y: 0.9 },
		{ x: 0.12, y: 0.06 }
	];

	const playback = new Playback(
		() => demo.actions.length,
		(action) => demo.steps[action].rejection !== null
	);

	let isVisible = $state(false);

	$effect(() => {
		if (isMotionReduced()) {
			playback.showFinal();
			return;
		}
		if (!isVisible || isPaused) return;
		return untrack(() => playback.play());
	});

	/** The square or cell the cursor picks up from, and the one it plays to. */
	function slotsOf(action: number): [number, number] {
		if (demo.kind === "tictactoe") {
			const { boardIndex, cellIndex } = demo.actions[action].move;
			return [boardIndex * 9 + cellIndex, boardIndex * 9 + cellIndex];
		}
		const { from, to } = demo.actions[action].move;
		return [from, to];
	}

	/** The refused action on screen right now, if any. */
	const rejected = $derived.by(() => {
		const target = playback.target;
		if (target === null || playback.isAiming) return null;
		const { rejection } = demo.steps[target];
		return rejection === null ? null : { action: target, rejection };
	});

	/** Each seat's cursor sits on the last slot it played, or heads to the one it is about to. */
	const cursorSlots = $derived(
		SEATS.map((seat) => {
			const target = playback.target;
			if (target === null) return null;
			for (let action = target; action >= 0; action--) {
				if (demo.steps[action].seat !== seat) continue;
				const [pickUp, playTo] = slotsOf(action);
				const isHeading = action === target && playback.isAiming;
				return isHeading || demo.steps[action].rejection !== null ? pickUp : playTo;
			}
			return null;
		})
	);

	let stage = $state<HTMLElement>();
	let positions = $state(REST);

	// Measured from the rendered cells, so the cursor lands on a cell whatever the board's gaps.
	$effect(() => {
		const slots = cursorSlots;
		if (!stage) return;
		const box = stage.getBoundingClientRect();
		if (box.width === 0) return;
		positions = SEATS.map((seat) => {
			const slot = slots[seat];
			const cell = slot === null ? null : stage?.querySelector(`[data-slot-index="${slot}"]`);
			if (!cell) return REST[seat];
			const rect = cell.getBoundingClientRect();
			return {
				x: (rect.left + rect.width / 2 - box.left) / box.width,
				y: (rect.top + rect.height / 2 - box.top) / box.height
			};
		});
	});

	/** Accepted actions so far, oldest first. */
	const accepted = $derived(
		demo.steps
			.slice(0, playback.played)
			.flatMap((step, action) => (step.rejection === null ? [{ action, seat: step.seat }] : []))
	);

	const ticTacToe = $derived.by(() => {
		if (demo.kind !== "tictactoe") return null;
		const state = playback.played === 0 ? demo.start : demo.steps[playback.played - 1].state;
		const last = accepted.at(-1);
		return {
			state,
			lastMove: last ? { ...demo.actions[last.action].move, seat: last.seat } : null,
			rejected: rejected ? demo.actions[rejected.action].move : null,
			winner: tictactoeEngine.status(state).winnerIndex
		};
	});

	const checkers = $derived.by(() => {
		if (demo.kind !== "checkers") return null;
		const state = playback.played === 0 ? demo.start : demo.steps[playback.played - 1].state;
		const { actions } = demo;
		const ids = accepted.reduce(
			(current, { action }) =>
				movePieceIds(current, actions[action].move.from, actions[action].move.to),
			pieceIds(demo.start.board)
		);
		const last = accepted.at(-1);
		const target = playback.target;
		const heading = target !== null && playback.isAiming ? actions[target].move.from : null;
		const legalMoves = computeLegalMoves(state.board, state.turn, state.mustContinueFrom);
		const isCaptureForced =
			legalMoves.length > 0 && legalMoves.every((move) => move.captured !== null);
		return {
			state,
			ids,
			lastMove: last ? { ...actions[last.action].move, seat: last.seat } : null,
			selected: heading,
			destinations: legalMoves.filter((move) => move.from === heading).map((move) => move.to),
			forced: isCaptureForced ? legalMoves.map((move) => move.from) : [],
			rejected: rejected ? actions[rejected.action].move.from : null,
			winner: checkersEngine.status(state).winnerIndex
		};
	});

	const winner = $derived(ticTacToe?.winner ?? checkers?.winner ?? null);
</script>

<div
	bind:this={stage}
	class={cn("relative size-full [container-type:size]", className)}
	aria-hidden="true"
	{@attach onVisibility((visible) => (isVisible = visible))}
>
	{#key playback.loop}
		<div class="absolute inset-0" in:fade={{ duration: 400 }} out:fade={{ duration: 400 }}>
			{#if ticTacToe}
				<TictactoeBoard
					position={ticTacToe.state}
					lastMove={ticTacToe.lastMove}
					rejected={ticTacToe.rejected}
				/>
			{:else if checkers}
				<CheckersBoard
					board={checkers.state.board}
					ids={checkers.ids}
					selected={checkers.selected}
					destinations={checkers.destinations}
					forced={checkers.forced}
					lastMove={checkers.lastMove}
					rejected={checkers.rejected}
				/>
			{/if}
		</div>
	{/key}

	{#each SEATS as seat (seat)}
		<DemoCursor
			{seat}
			label={LABELS[seat]}
			x={positions[seat].x}
			y={positions[seat].y}
			isActive={playback.target === null || demo.steps[playback.target].seat === seat}
		/>
	{/each}

	<!-- Overlaid, like the game's replay pill, so it never moves the board. -->
	<div class="pointer-events-none absolute inset-x-0 top-2 z-30 flex justify-center px-2">
		<span
			class={cn(
				"rounded-full border bg-background/90 px-3 py-1 text-center text-xs font-medium shadow-sm backdrop-blur-sm transition-opacity duration-200",
				rejected ? "border-destructive/40 text-destructive" : "text-foreground",
				!rejected && winner === null && "opacity-0"
			)}
		>
			{#if rejected}
				{rejected.rejection}
			{:else if winner !== null}
				{LABELS[winner]} wins
			{/if}
		</span>
	</div>
</div>
