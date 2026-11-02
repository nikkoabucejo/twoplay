<script lang="ts">
	import { fade } from "svelte/transition";
	import { MOVE_DOT, rovingStep, SELECTED_RING, squareClass } from "$lib/components/layout";
	import { ChessPiece, ChessPromotion, pieceName } from "$lib/features/play";
	import { cn } from "$lib/utils/style";
	import { seatOfColor, squareName } from "../../../../../convex/models/games/chess/rules.js";
	import type {
		Piece,
		PromotionPiece,
		Square
	} from "../../../../../convex/models/games/chess/rules.js";

	let {
		board,
		selected = null,
		destinations = [],
		lastMove = null,
		checkSquare = null,
		rejected = null,
		promotion,
		label = "Practice board",
		onselect
	}: {
		board: readonly (Piece | null)[];
		selected?: Square | null;
		destinations?: readonly Square[];
		lastMove?: { from: Square; to: Square; seat: 0 | 1 } | null;
		/** The king in check, tinted red. */
		checkSquare?: Square | null;
		/** A refused piece, ringed in red. */
		rejected?: Square | null;
		/** The picker for a pawn reaching the last rank. It opens on the last square chosen. */
		promotion?: {
			isOpen: boolean;
			color: Piece["color"];
			onPick: (piece: PromotionPiece) => void;
			onCancel: () => void;
		};
		/** The board group's name while it takes input. */
		label?: string;
		/** Makes the squares buttons. Without it the board is a picture. */
		onselect?: (index: number) => void;
	} = $props();

	function labelOf(index: number): string {
		const piece = board[index];
		const name = squareName(index);
		return [
			piece
				? `${name}, Player ${seatOfColor(piece.color) + 1} ${pieceName(piece.type)}`
				: `${name}, empty`,
			...(checkSquare === name ? ["in check"] : []),
			...(selected === name ? ["selected"] : []),
			...(destinations.includes(name) ? ["move here"] : [])
		].join(", ");
	}

	let focusedSlot = $state(0);
	/** The square chosen last, which anchors the promotion picker. */
	let anchor = $state<HTMLElement | null>(null);

	function moveFocus(event: KeyboardEvent & { currentTarget: HTMLElement }) {
		if (!(event.target instanceof HTMLElement) || !event.target.dataset.slotIndex) return;
		const next = rovingStep(Number(event.target.dataset.slotIndex), event.key, "chess");
		if (next === null) return;
		event.preventDefault();
		focusedSlot = next;
		event.currentTarget.querySelector<HTMLElement>(`[data-slot-index="${next}"]`)?.focus();
	}
</script>

{#snippet contents(index: number, name: Square)}
	{@const piece = board[index]}
	{#if selected === name}
		<span class={cn("absolute inset-[12%]", SELECTED_RING)} in:fade={{ duration: 150 }}></span>
	{/if}
	{#if rejected === name}
		<span class="absolute inset-[6%] rounded-full ring-2 ring-destructive"></span>
	{/if}
	{#if piece}
		<span data-piece={index} class="flex size-3/4">
			<ChessPiece {piece} class="size-full" />
		</span>
	{/if}
	{#if destinations.includes(name)}
		{#if piece}
			<span
				data-hint="capture"
				class="absolute inset-[6%] rounded-full ring-2 ring-emerald-400/70"
				in:fade={{ duration: 150 }}
			></span>
		{:else}
			<span data-hint="move" class={MOVE_DOT} in:fade={{ duration: 150 }}></span>
		{/if}
	{/if}
{/snippet}

<div class="relative size-full overflow-hidden rounded-xl border">
	<!-- Arrow keys arrive from the focused square; the group moves focus between them. -->
	<div
		role={onselect ? "group" : undefined}
		aria-label={onselect ? label : undefined}
		data-board-grid
		class="grid size-full grid-cols-8 grid-rows-8"
		onkeydown={onselect ? moveFocus : undefined}
	>
		{#each board as _, index (index)}
			{@const name = squareName(index)}
			{@const square = {
				dark: (Math.floor(index / 8) + (index % 8)) % 2 === 1,
				tint: lastMove && (lastMove.from === name || lastMove.to === name) ? lastMove.seat : null,
				mark: checkSquare === name
			}}
			{#if onselect}
				<button
					type="button"
					data-slot-index={index}
					tabindex={index === focusedSlot ? 0 : -1}
					aria-label={labelOf(index)}
					class={squareClass({ ...square, interactive: true })}
					onfocus={() => (focusedSlot = index)}
					onclick={(event) => {
						anchor = event.currentTarget;
						onselect(index);
					}}
				>
					{@render contents(index, name)}
				</button>
			{:else}
				<div data-slot-index={index} class={squareClass(square)}>
					{@render contents(index, name)}
				</div>
			{/if}
		{/each}
	</div>
</div>

{#if promotion}
	<ChessPromotion {...promotion} {anchor} />
{/if}
