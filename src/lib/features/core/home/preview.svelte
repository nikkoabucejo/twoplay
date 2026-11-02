<script lang="ts">
	import type { GameType } from "../../../../../convex/models/games/index.js";
	import type { Piece } from "../../../../../convex/models/games/chess/rules.js";
	import { ChessPiece } from "$lib/features/play";
	import { cn } from "$lib/utils/style";

	let { type, class: className }: { type: GameType; class?: string } = $props();

	const CHECKERS_SQUARES = [0, 1, 2, 3].flatMap((row) =>
		[0, 1, 2, 3].filter((col) => (row + col) % 2 === 1).map((col) => ({ row, col }))
	);

	/** A 4×4 corner of a chess board, by square (row * 4 + col), turned 180° between the seats. */
	const CHESS_PIECES: Record<number, Piece> = {
		0: { color: "b", type: "r" },
		2: { color: "b", type: "k" },
		5: { color: "b", type: "p" },
		10: { color: "w", type: "p" },
		13: { color: "w", type: "k" },
		15: { color: "w", type: "r" }
	};
</script>

{#if type === "chess"}
	<div
		class={cn(
			"grid size-16 shrink-0 grid-cols-4 grid-rows-4 overflow-hidden rounded-sm bg-foreground/5",
			className
		)}
		aria-hidden="true"
	>
		{#each { length: 16 } as _, square (square)}
			{@const piece = CHESS_PIECES[square]}
			<span
				class={cn(
					"flex items-center justify-center",
					(Math.floor(square / 4) + (square % 4)) % 2 === 1 && "bg-foreground/15"
				)}
			>
				{#if piece}
					<ChessPiece {piece} class="size-3/4" />
				{/if}
			</span>
		{/each}
	</div>
{:else}
	<svg viewBox="0 0 48 48" class={cn("size-16 shrink-0", className)} aria-hidden="true">
		{#if type === "tictactoe"}
			<g class="stroke-border" stroke-width="1.5" stroke-linecap="round">
				<path d="M17 4v40M31 4v40M4 17h40M4 31h40" />
			</g>
			<g class="stroke-seat-0" stroke-width="2.5" stroke-linecap="round">
				<path d="M6 6l6 6M12 6l-6 6" />
				<path d="M20 20l8 8M28 20l-8 8" />
				<path d="M36 36l6 6M42 36l-6 6" />
			</g>
			<g class="stroke-seat-1" stroke-width="2.5" fill="none">
				<circle cx="38" cy="10" r="4" />
				<circle cx="10" cy="38" r="4" />
			</g>
		{:else}
			<rect width="48" height="48" rx="3" class="fill-foreground/5" />
			{#each CHECKERS_SQUARES as { row, col } (`${row}-${col}`)}
				<rect x={col * 12} y={row * 12} width="12" height="12" class="fill-foreground/15" />
			{/each}
			<g class="fill-seat-1">
				<circle cx="18" cy="6" r="4" />
				<circle cx="42" cy="6" r="4" />
				<circle cx="30" cy="18" r="4" />
			</g>
			<g class="fill-seat-0">
				<circle cx="6" cy="42" r="4" />
				<circle cx="18" cy="30" r="4" />
				<circle cx="30" cy="42" r="4" />
			</g>
		{/if}
	</svg>
{/if}
