<script lang="ts">
	import { ACCENTS, cn } from "$lib/utils/style";
	import Mark from "./mark.svelte";
	import { isMotionReduced, onVisibility } from "./playback.svelte.js";

	let {
		isPaused = false,
		isCompact = false,
		class: className
	}: { isPaused?: boolean; isCompact?: boolean; class?: string } = $props();

	/** One loop, a second per tick: Player 1 thinks, moves, then Player 2's clock runs out. */
	const MOVE_AT = 3;
	const START = [44, 5];
	const FLAG_AT = MOVE_AT + START[1];
	const LOOP = FLAG_AT + 4;
	const LABELS = ["Player 1", "Player 2"];

	let second = $state(FLAG_AT);
	let isVisible = $state(false);

	$effect(() => {
		if (isMotionReduced()) {
			second = FLAG_AT;
			return;
		}
		if (!isVisible || isPaused) return;
		const timer = setInterval(() => (second = (second + 1) % LOOP), 1000);
		return () => clearInterval(timer);
	});

	const hasMoved = $derived(second >= MOVE_AT);
	const isFlagged = $derived(second >= FLAG_AT);
	const activeSeat = $derived(isFlagged ? null : hasMoved ? 1 : 0);
	const remaining = $derived([
		START[0] - Math.min(second, MOVE_AT),
		START[1] - Math.min(Math.max(second - MOVE_AT, 0), START[1])
	]);

	function format(seconds: number): string {
		return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, "0")}`;
	}
</script>

{#snippet strip(seat: 0 | 1)}
	{@const isLow = seat === 1 && remaining[1] <= 3}
	<!-- The side not on the clock dims; the frame never changes with the turn. -->
	<div
		class={cn(
			"flex w-full items-center gap-2 rounded-lg border bg-muted/40 px-2 backdrop-blur-sm transition-opacity duration-300",
			isCompact ? "h-10" : "h-14",
			activeSeat !== null && activeSeat !== seat && "opacity-50"
		)}
	>
		<span
			class={cn(
				"size-2 shrink-0 rounded-full",
				ACCENTS[seat].bg,
				activeSeat === seat && "motion-safe:animate-pulse"
			)}
		></span>
		<span class="min-w-0 flex-1 truncate text-sm font-semibold">{LABELS[seat]}</span>
		<span
			class={cn(
				"flex shrink-0 items-center justify-center rounded-md",
				isCompact ? "h-7 w-14" : "h-10 w-20",
				ACCENTS[seat].tintBg
			)}
		>
			<span
				class={cn(
					"font-mono font-semibold tabular-nums",
					isCompact ? "text-sm" : "text-lg",
					isLow ? "text-destructive" : ACCENTS[seat].text
				)}
			>
				{format(remaining[seat])}
			</span>
		</span>
	</div>
{/snippet}

<div
	class={cn("flex size-full flex-col justify-center", isCompact ? "gap-2" : "gap-4", className)}
	aria-hidden="true"
	{@attach onVisibility((visible) => (isVisible = visible))}
>
	{@render strip(1)}
	{#if !isCompact}
		<div class="relative mx-auto flex size-28 items-center justify-center">
			<div
				class="grid size-full grid-cols-3 grid-rows-3 gap-1.5 rounded-xl bg-muted/40 p-1.5 backdrop-blur-2xl"
			>
				{#each { length: 9 } as _, cell (cell)}
					<div class="flex items-center justify-center rounded-md bg-background/90 shadow-sm">
						{#if cell === 4 && hasMoved}
							<Mark mark="X" class="size-3/5" />
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{/if}
	{@render strip(0)}
	<!-- A fixed slot for the result, so it shows without moving the clocks. -->
	<div class={cn("flex items-center justify-center", isCompact ? "h-8" : "h-7")}>
		<span
			class={cn(
				"rounded-full border bg-background/90 px-3 py-1 text-xs font-medium shadow-sm transition-opacity duration-200",
				!isFlagged && "opacity-0"
			)}
		>
			Out of time · Player 1 wins
		</span>
	</div>
</div>
