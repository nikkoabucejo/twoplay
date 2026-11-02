<script lang="ts">
	import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from "@lucide/svelte";
	import { untrack } from "svelte";
	import { Feed } from "$lib/components/layout";
	import { Button } from "$lib/components/ui";
	import { GAMES } from "$lib/features/play";
	import { ACCENTS, cn } from "$lib/utils/style";
	import type { GameType } from "../../../../../convex/models/games/index.js";
	import ClocksDemo from "./clocks-demo.svelte";
	import Demo from "./demo.svelte";
	import PracticeBoard from "./practice-board.svelte";
	import { CheckersPractice, ChessPractice, TictactoePractice } from "./practice.svelte.js";
	import { isMotionReduced } from "./playback.svelte.js";
	import { RULES } from "./rules.js";
	import { Stepper } from "./stepper.svelte.js";

	let { type }: { type: GameType } = $props();

	const PRACTICE = {
		heading: "Try it",
		body: "Play both sides on a practice board. Every move is checked by the same rules as a real game."
	};

	const rules = $derived(RULES[type]);
	const steps = $derived([...rules.steps, PRACTICE]);
	const stepper = $derived(new Stepper(rules.steps.length + 1));
	const practice = $derived.by(() => {
		switch (type) {
			case "tictactoe":
				return new TictactoePractice();
			case "checkers":
				return new CheckersPractice();
			case "chess":
				return new ChessPractice();
		}
	});
	/** The rule on screen, or undefined on the practice step. */
	const rule = $derived(rules.steps.at(stepper.index));

	let isPaused = $state(false);
	let canAnimate = $state(false);

	$effect(() => {
		canAnimate = !isMotionReduced();
	});

	const practiceStatus = $derived.by(() => {
		if (practice.notice) return { text: practice.notice, className: "text-destructive" };
		const result = practice.result;
		if (result) {
			return {
				text: result.winner === null ? "Draw" : `Player ${result.winner + 1} wins`,
				className: "text-foreground"
			};
		}
		const mustCapture = practice instanceof CheckersPractice && practice.isCaptureForced;
		return {
			text: `Player ${practice.turn + 1} ${mustCapture ? "must capture" : "to move"}`,
			className: ACCENTS[practice.turn].text
		};
	});

	let items = $state<HTMLElement[]>([]);

	// From lg the steps scroll in their own column; keep the current one in view there. Under lg
	// the column doesn't scroll, so the page is left alone.
	$effect(() => {
		const item = items[stepper.index];
		if (item) untrack(() => revealStep(item));
	});

	function revealStep(item: HTMLElement) {
		const scroller = item.closest("ol")?.parentElement;
		if (!scroller || scroller.scrollHeight <= scroller.clientHeight) return;
		// Clear of the column's 1.5rem fade.
		const margin = 24;
		const top = item.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
		const bottom = top + item.offsetHeight - scroller.clientHeight;
		const by = top < margin ? top - margin : bottom > -margin ? bottom + margin : 0;
		if (by === 0) return;
		scroller.scrollBy({ top: by, behavior: isMotionReduced() ? "instant" : "smooth" });
	}

	/** Left and right arrows step through the lesson unless a board or text field has focus. */
	function handleKeydown(event: KeyboardEvent) {
		if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
		if (
			event.target instanceof Element &&
			event.target.closest("[data-board-grid], input, textarea, [contenteditable]")
		) {
			return;
		}
		if (stepper.press(event.key)) event.preventDefault();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- From lg the lesson fills the page's height: the board stays put at the top and the steps scroll. -->
<section
	aria-label="{GAMES[type].name} lesson"
	class="grid gap-6 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_22rem] lg:grid-rows-1 lg:gap-10"
>
	<div class="flex flex-col items-center gap-3 lg:min-h-0 lg:[container-type:size]">
		<!-- 3.25rem leaves room for the caption row and its gap. -->
		<div
			data-frame
			class="aspect-square w-full max-w-md rounded-2xl border bg-background/30 p-3 shadow-lg backdrop-blur-sm sm:p-4 lg:max-w-[min(100cqw,calc(100cqh-3.25rem))]"
		>
			{#if rule === undefined}
				<PracticeBoard {practice} />
			{:else if rule.demo.kind === "clocks"}
				<ClocksDemo {isPaused} />
			{:else}
				{#key stepper.index}
					<Demo demo={rule.demo} {isPaused} />
				{/key}
			{/if}
		</div>

		<!-- One fixed-height row for either the demo's caption or the practice status. -->
		<div
			class="flex h-10 w-full max-w-md items-center gap-3 lg:max-w-[min(100cqw,calc(100cqh-3.25rem))]"
		>
			{#if rule}
				<Button
					variant="outline"
					size="icon-sm"
					class={cn(!canAnimate && "invisible")}
					aria-label={isPaused ? "Play demo" : "Pause demo"}
					onclick={() => (isPaused = !isPaused)}
				>
					{#if isPaused}<Play />{:else}<Pause />{/if}
				</Button>
				<p class="line-clamp-2 min-w-0 flex-1 text-caption text-muted-foreground">
					{rule.demo.caption}
				</p>
			{:else}
				<Button variant="outline" size="sm" onclick={() => practice.reset()}>
					<RotateCcw />
					Reset
				</Button>
				<p
					class={cn("line-clamp-2 min-w-0 flex-1 text-sm font-medium", practiceStatus.className)}
					aria-live="polite"
				>
					{practiceStatus.text}
				</p>
			{/if}
		</div>
	</div>

	<div class="flex min-w-0 flex-col gap-4 lg:min-h-0">
		<div class="flex flex-col gap-3">
			<div class="flex items-center gap-2">
				<Button
					variant="outline"
					size="icon-sm"
					aria-label="Previous step"
					disabled={stepper.isFirst}
					onclick={() => stepper.back()}
				>
					<ChevronLeft />
				</Button>
				<p
					class="flex-1 text-center font-mono text-caption tracking-widest text-muted-foreground uppercase tabular-nums"
					aria-live="polite"
				>
					<span aria-hidden="true">Step {stepper.index + 1} / {stepper.count}</span>
					<span class="sr-only">
						Step {stepper.index + 1} of {stepper.count}: {steps[stepper.index].heading}
					</span>
				</p>
				<Button
					variant="outline"
					size="sm"
					disabled={stepper.isLast}
					onclick={() => stepper.next()}
				>
					Next
					<ChevronRight />
				</Button>
			</div>
			<div class="flex gap-1" aria-hidden="true">
				{#each steps as step, index (step.heading)}
					<span
						class={cn(
							"h-1 flex-1 rounded-full transition-colors",
							index <= stepper.index ? ACCENTS[index % 2].bg : "bg-foreground/15"
						)}
					></span>
				{/each}
			</div>
		</div>

		<!-- Under lg every step shares one grid cell, so the box keeps the tallest step's height. -->
		<Feed class="max-w-none max-lg:overflow-visible">
			<ol class="grid lg:flex lg:flex-col lg:gap-2 lg:p-1">
				{#each steps as step, index (step.heading)}
					{@const isCurrent = index === stepper.index}
					<li
						bind:this={items[index]}
						class={cn(
							"relative col-start-1 row-start-1 flex flex-col gap-1.5 rounded-xl border p-4 backdrop-blur-sm transition-[opacity,background-color] has-[button:focus-visible]:ring-2 has-[button:focus-visible]:ring-ring",
							isCurrent
								? "selected-ring bg-muted/60"
								: "hover-ring bg-muted/20 max-lg:invisible lg:opacity-60 lg:hover:opacity-100"
						)}
						aria-current={isCurrent ? "step" : undefined}
					>
						<h2 class="flex items-center gap-3 font-semibold">
							<span
								class={cn(
									"flex size-7 shrink-0 items-center justify-center rounded-full border font-mono text-caption tabular-nums",
									isCurrent && ACCENTS[index % 2].text
								)}
								aria-hidden="true"
							>
								{index + 1}
							</span>
							<button
								type="button"
								class="min-w-0 text-left outline-none after:absolute after:inset-0 after:rounded-xl"
								onclick={() => stepper.go(index)}
							>
								{step.heading}
							</button>
						</h2>
						<p class="pl-10 text-sm text-muted-foreground">{step.body}</p>
					</li>
				{/each}
			</ol>
		</Feed>
	</div>
</section>
