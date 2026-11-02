<script lang="ts">
	import { ACCENTS, cn } from "$lib/utils/style";
	import { DemoCursor, Mark, isMotionReduced, onVisibility } from "../rules/index.js";

	/** Player 1 takes the diagonal: the cell each turn plays, in order. */
	const MOVES = [4, 0, 2, 8, 6];
	const HOLD = 3;
	const LOOP = MOVES.length + HOLD;
	const LABELS = ["Player 1", "Player 2"];
	/** Where each cursor waits before its first mark: off its own corner. */
	const REST = [
		{ x: 0.9, y: 0.95 },
		{ x: 0.05, y: 0.02 }
	];

	let shown = $state(MOVES.length);
	let isVisible = $state(false);

	$effect(() => {
		if (isMotionReduced()) {
			shown = MOVES.length;
			return;
		}
		if (!isVisible) return;
		const timer = setInterval(() => (shown = (shown + 1) % LOOP), 1100);
		return () => clearInterval(timer);
	});

	const played = $derived(Math.min(shown, MOVES.length));
	const isWon = $derived(played === MOVES.length);

	function center(cell: number) {
		return { x: ((cell % 3) + 0.5) / 3, y: (Math.floor(cell / 3) + 0.5) / 3 };
	}

	/** Each player's cursor rests on their latest mark. */
	const cursors = $derived(
		([0, 1] as const).map((seat) => {
			const own = MOVES.slice(0, played).filter((_, turn) => turn % 2 === seat);
			const last = own.at(-1);
			return last === undefined ? REST[seat] : center(last);
		})
	);
</script>

<div
	class="relative size-full [container-type:size]"
	aria-hidden="true"
	{@attach onVisibility((visible) => (isVisible = visible))}
>
	<div
		class="grid size-full grid-cols-3 grid-rows-3 gap-2 rounded-2xl bg-muted/50 p-2 shadow-xl ring-2 ring-foreground/10 backdrop-blur-2xl"
	>
		{#each { length: 9 } as _, cell (cell)}
			{@const turn = MOVES.indexOf(cell)}
			<div class="flex items-center justify-center rounded-lg bg-background/90 shadow-sm">
				{#if turn !== -1 && turn < played}
					<Mark mark={turn % 2 === 0 ? "X" : "O"} class="size-3/5" />
				{/if}
			</div>
		{/each}
	</div>
	{#if isWon}
		<svg viewBox="0 0 3 3" class={cn("absolute inset-0 size-full", ACCENTS[0].text)}>
			<line
				class="strike"
				pathLength="1"
				x1="2.5"
				y1="0.5"
				x2="0.5"
				y2="2.5"
				stroke="currentColor"
				stroke-width="0.1"
				stroke-linecap="round"
			/>
		</svg>
	{/if}
	{#each [0, 1] as const as seat (seat)}
		<DemoCursor
			{seat}
			label={LABELS[seat]}
			x={cursors[seat].x}
			y={cursors[seat].y}
			isActive={isWon ? seat === 0 : played % 2 === seat}
		/>
	{/each}
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
