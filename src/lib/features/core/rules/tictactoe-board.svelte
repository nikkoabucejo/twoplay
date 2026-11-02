<script lang="ts">
	import { rovingStep } from "$lib/components/layout";
	import { ACCENTS, cn } from "$lib/utils/style";
	import { tictactoeEngine } from "../../../../../convex/models/games/tictactoe/index.js";
	import type { TictactoeState } from "../../../../../convex/models/games/tictactoe/index.js";
	import {
		WINNING_LINES,
		hasOtherPlayableBoard,
		isBoardFinished,
		markOf,
		playerIndexOf
	} from "../../../../../convex/models/games/tictactoe/rules.js";
	import type { Cell } from "../../../../../convex/models/games/tictactoe/rules.js";
	import Mark from "./mark.svelte";

	type Spot = { boardIndex: number; cellIndex: number };

	let {
		position,
		lastMove = null,
		rejected = null,
		onplay
	}: {
		position: TictactoeState;
		lastMove?: (Spot & { seat: 0 | 1 }) | null;
		/** A refused attempt, ringed in red. */
		rejected?: Spot | null;
		/** Makes the cells buttons. Without it the board is a picture. */
		onplay?: (boardIndex: number, cellIndex: number) => void;
	} = $props();

	const POSITIONS = [
		"top left",
		"top center",
		"top right",
		"middle left",
		"center",
		"middle right",
		"bottom left",
		"bottom center",
		"bottom right"
	];

	const status = $derived(tictactoeEngine.status(position));
	const turn = $derived(status.turnIndex === 0 ? 0 : 1);
	const lastBoard = $derived(position.lastBoardBySymbol?.[markOf(turn)] ?? null);

	function isForbidden(boardIndex: number): boolean {
		return (
			!status.isOver &&
			lastBoard === boardIndex &&
			hasOtherPlayableBoard(position.boards, boardIndex)
		);
	}

	function isPlayable(boardIndex: number): boolean {
		return (
			!status.isOver && !isBoardFinished(position.boards[boardIndex]) && !isForbidden(boardIndex)
		);
	}

	function lineOf(cells: readonly Cell[]) {
		for (const line of WINNING_LINES) {
			const mark = cells[line[0]];
			if (mark && mark === cells[line[1]] && mark === cells[line[2]]) return { line, mark };
		}
		return null;
	}

	const metaLine = $derived(lineOf(position.boards.map((cells) => lineOf(cells)?.mark ?? null)));

	let focusedSlot = $state(0);

	function moveFocus(event: KeyboardEvent & { currentTarget: HTMLElement }) {
		if (!(event.target instanceof HTMLElement) || !event.target.dataset.slotIndex) return;
		const next = rovingStep(Number(event.target.dataset.slotIndex), event.key, "tictactoe");
		if (next === null) return;
		event.preventDefault();
		focusedSlot = next;
		event.currentTarget.querySelector<HTMLElement>(`[data-slot-index="${next}"]`)?.focus();
	}
</script>

{#snippet strike(line: readonly number[], mark: "X" | "O", width: string)}
	{@const [a, , c] = line}
	<svg
		viewBox="0 0 3 3"
		class={cn("pointer-events-none absolute inset-0 size-full", ACCENTS[playerIndexOf(mark)].text)}
		aria-hidden="true"
	>
		<line
			class="strike"
			pathLength="1"
			x1={(a % 3) + 0.5}
			y1={Math.floor(a / 3) + 0.5}
			x2={(c % 3) + 0.5}
			y2={Math.floor(c / 3) + 0.5}
			stroke="currentColor"
			stroke-width={width}
			stroke-linecap="round"
		/>
	</svg>
{/snippet}

<!-- Arrow keys arrive from the focused cell; the group moves focus between cells. -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
	role={onplay ? "group" : undefined}
	aria-label={onplay ? "Practice board" : undefined}
	data-board-grid
	class="relative grid size-full grid-cols-3 grid-rows-3 gap-2 sm:gap-3"
	onkeydown={onplay ? moveFocus : undefined}
>
	{#each position.boards as cells, boardIndex (boardIndex)}
		{@const won = lineOf(cells)}
		<div class="relative size-full">
			<div
				class={cn(
					"grid size-full grid-cols-3 grid-rows-3 gap-1 rounded-lg bg-muted/40 p-1 backdrop-blur-2xl transition-opacity duration-200 motion-reduce:transition-none sm:gap-1.5 sm:rounded-xl sm:p-1.5",
					isForbidden(boardIndex) && "opacity-40"
				)}
				role={onplay ? "group" : undefined}
				aria-label={onplay ? `Board ${boardIndex + 1} (${POSITIONS[boardIndex]})` : undefined}
			>
				{#each cells as cell, cellIndex (cellIndex)}
					{@const slot = boardIndex * 9 + cellIndex}
					{@const isOpen = cell === null && isPlayable(boardIndex)}
					{@const cellClass = cn(
						"flex items-center justify-center rounded-sm bg-background/90 shadow-sm ring-2 ring-transparent outline-none sm:rounded-md",
						lastMove?.boardIndex === boardIndex &&
							lastMove.cellIndex === cellIndex &&
							ACCENTS[lastMove.seat].tintBg,
						rejected?.boardIndex === boardIndex &&
							rejected.cellIndex === cellIndex &&
							"ring-destructive"
					)}
					{#if onplay}
						<!-- aria-disabled, not disabled, so arrow keys can still focus every cell. -->
						<button
							type="button"
							data-slot-index={slot}
							tabindex={slot === focusedSlot ? 0 : -1}
							aria-disabled={!isOpen}
							aria-label="Board {boardIndex + 1}, cell {cellIndex + 1}, {cell ??
								(isOpen ? 'empty' : 'closed')}"
							class={cn(
								cellClass,
								"transition-colors hover:bg-background focus-visible:ring-ring/60 aria-disabled:cursor-not-allowed aria-disabled:hover:bg-background/90"
							)}
							onfocus={() => (focusedSlot = slot)}
							onclick={() => onplay(boardIndex, cellIndex)}
						>
							{#if cell}<Mark mark={cell} class="size-3/5" />{/if}
						</button>
					{:else}
						<div data-slot-index={slot} class={cellClass}>
							{#if cell}<Mark mark={cell} class="size-3/5" />{/if}
						</div>
					{/if}
				{/each}
			</div>
			{#if won}
				<!-- Over the cells only, inside the board's padding, so a won board reads the same size as
				     the open ones beside it. -->
				<div class="pointer-events-none absolute inset-1 sm:inset-1.5">
					{@render strike(won.line, won.mark, "0.12")}
					<div
						class={cn(
							"absolute inset-0 flex items-center justify-center rounded-sm backdrop-blur-[3px] sm:rounded-md",
							ACCENTS[playerIndexOf(won.mark)].winBg
						)}
					>
						<Mark mark={won.mark} class="size-2/3" />
					</div>
				</div>
			{/if}
		</div>
	{/each}
	{#if metaLine}
		{@render strike(metaLine.line, metaLine.mark, "0.08")}
	{/if}
</div>

<style>
	@media (prefers-reduced-motion: no-preference) {
		:global(html:not(.reduce-motion)) .strike {
			stroke-dasharray: 1;
			animation: strike 400ms ease-out;
		}
	}

	@keyframes strike {
		from {
			stroke-dashoffset: 1;
		}
		to {
			stroke-dashoffset: 0;
		}
	}
</style>
