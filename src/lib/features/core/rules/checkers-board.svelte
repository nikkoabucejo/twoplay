<script lang="ts">
	import { flip } from "svelte/animate";
	import { cubicOut } from "svelte/easing";
	import { fade } from "svelte/transition";
	import { MOVE_DOT, rovingStep, SELECTED_RING, squareClass } from "$lib/components/layout";
	import { ACCENTS, cn } from "$lib/utils/style";
	import { playerIndexOf, rc } from "../../../../../convex/models/games/checkers/rules.js";
	import type { Square } from "../../../../../convex/models/games/checkers/rules.js";
	import { isMotionReduced } from "./playback.svelte.js";

	let {
		board,
		ids,
		selected = null,
		destinations = [],
		forced = [],
		lastMove = null,
		rejected = null,
		label = "Practice board",
		onselect
	}: {
		board: readonly Square[];
		/** Each square's piece id, from `pieceIds`/`movePieceIds`, so a moved piece glides. */
		ids: readonly (number | null)[];
		selected?: number | null;
		destinations?: readonly number[];
		/** Pieces that must capture, ringed in amber as in a game. */
		forced?: readonly number[];
		lastMove?: { from: number; to: number; seat: 0 | 1 } | null;
		/** A refused piece, ringed in red. */
		rejected?: number | null;
		/** The board group's name while it takes input. */
		label?: string;
		/** Makes the dark squares buttons. Without it the board is a picture. */
		onselect?: (index: number) => void;
	} = $props();

	const pieces = $derived(
		ids.flatMap((id, index) => {
			const piece = board[index];
			return id === null || !piece ? [] : [{ id, index, piece }];
		})
	);

	function nameOf(index: number): string {
		const [row, col] = rc(index);
		return `${"abcdefgh"[col]}${8 - row}`;
	}

	function labelOf(index: number): string {
		const piece = board[index];
		const name = nameOf(index);
		if (!piece)
			return destinations.includes(index) ? `${name}, empty, move here` : `${name}, empty`;
		const owner = `Player ${playerIndexOf(piece.color) + 1}`;
		return `${name}, ${owner} ${piece.king ? "king" : "man"}${selected === index ? ", selected" : ""}`;
	}

	let focusedSlot = $state(1);

	function moveFocus(event: KeyboardEvent & { currentTarget: HTMLElement }) {
		if (!(event.target instanceof HTMLElement) || !event.target.dataset.slotIndex) return;
		const next = rovingStep(Number(event.target.dataset.slotIndex), event.key, "checkers");
		if (next === null) return;
		event.preventDefault();
		focusedSlot = next;
		event.currentTarget.querySelector<HTMLElement>(`[data-slot-index="${next}"]`)?.focus();
	}
</script>

{#snippet marks(index: number)}
	{#if forced.includes(index)}
		<span class="absolute inset-[12%] rounded-full ring-2 ring-amber-400/70"></span>
	{/if}
	{#if rejected === index}
		<span class="absolute inset-[6%] rounded-full ring-2 ring-destructive"></span>
	{/if}
	{#if destinations.includes(index)}
		<span data-hint="move" class={MOVE_DOT} in:fade={{ duration: 150 }}></span>
	{/if}
{/snippet}

<div class="relative size-full overflow-hidden rounded-xl border">
	<!-- Arrow keys arrive from the focused square; the group moves focus between them. -->
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		role={onselect ? "group" : undefined}
		aria-label={onselect ? label : undefined}
		data-board-grid
		class="grid size-full grid-cols-8 grid-rows-8"
		onkeydown={onselect ? moveFocus : undefined}
	>
		{#each board as _, index (index)}
			{@const [row, col] = rc(index)}
			{#if (row + col) % 2 === 1}
				{@const square = {
					dark: true,
					tint:
						lastMove && (lastMove.from === index || lastMove.to === index) ? lastMove.seat : null
				}}
				{#if onselect}
					<button
						type="button"
						data-slot-index={index}
						tabindex={index === focusedSlot ? 0 : -1}
						aria-label={labelOf(index)}
						class={squareClass({ ...square, interactive: true })}
						onfocus={() => (focusedSlot = index)}
						onclick={() => onselect(index)}
					>
						{@render marks(index)}
					</button>
				{:else}
					<div data-slot-index={index} class={squareClass(square)}>
						{@render marks(index)}
					</div>
				{/if}
			{:else}
				<div class="bg-background" aria-hidden="true"></div>
			{/if}
		{/each}
	</div>

	<!-- The same 8×8 grid as the squares, so a piece sits on its square at any size. FLIP glides a
	     moved piece; a resize places pieces at once instead of animating them across. -->
	<div class="pointer-events-none absolute inset-0 grid grid-cols-8 grid-rows-8" aria-hidden="true">
		{#each pieces as { id, index, piece } (id)}
			{@const [row, col] = rc(index)}
			<div
				data-piece={index}
				class="flex min-h-0 min-w-0 items-center justify-center"
				style:grid-area="{row + 1} / {col + 1}"
				animate:flip={{ duration: isMotionReduced() ? 0 : 300, easing: cubicOut }}
				out:fade={{ duration: 250 }}
			>
				<div
					class={cn(
						"relative flex size-4/5 items-center justify-center rounded-full shadow-md",
						ACCENTS[playerIndexOf(piece.color)].bg
					)}
				>
					{#if selected === index}
						<div class={cn("absolute inset-1", SELECTED_RING)} in:fade={{ duration: 150 }}></div>
					{/if}
					{#if piece.king}
						<svg viewBox="0 0 24 24" class="crown size-2/5 text-background/90" fill="currentColor">
							<path d="M3 8 L7 12 L12 5 L17 12 L21 8 L19 18 H5 Z" />
						</svg>
					{/if}
				</div>
			</div>
		{/each}
	</div>
</div>

<style>
	@media (prefers-reduced-motion: no-preference) {
		:global(html:not(.reduce-motion)) .crown {
			animation: crown 320ms ease-out;
		}
	}

	@keyframes crown {
		0% {
			transform: scale(0.4);
			opacity: 0;
		}
		60% {
			transform: scale(1.2);
			opacity: 1;
		}
		100% {
			transform: scale(1);
		}
	}
</style>
