<script lang="ts">
	import type { Snippet } from "svelte";
	import { prefersReducedMotion } from "svelte/motion";
	import { browser } from "$app/environment";
	import { Button, Emoji, Sparkle, surfaceClass } from "$lib/components/ui";
	import { ACCENTS, cn, SEAT_COLORS } from "$lib/utils/style";
	import type { BoardFooter, BoardPlayer } from "./board.svelte";
	import type { ResultRating, ResultView } from "./outcome.js";

	let {
		view,
		footer,
		players,
		markIcon,
		headingLevel = 2,
		onDismiss
	}: {
		view: ResultView;
		footer: BoardFooter;
		/** The board's players, by seat, for the emoji and marks in the score row. */
		players?: [BoardPlayer, BoardPlayer];
		/** The board's `markIcon`, drawn after each name like the strips. */
		markIcon?: Snippet<[seat: 0 | 1]>;
		/** The headline's level, for a card placed under other headings. */
		headingLevel?: 2 | 3 | 4;
		/** Hides the card to show the final board. */
		onDismiss: () => void;
	} = $props();

	const headlineId = $props.id();

	// From sm the header nav has Lobby, so the card drops it and New opponent takes the row.
	const ACTIONS = $derived({
		rematch: { label: "Rematch", isPrimary: true, onclick: footer.onRematch, class: "" },
		"play-again": { label: "Play again", isPrimary: true, onclick: footer.onPlayAgain, class: "" },
		"new-opponent": {
			label: "New opponent",
			isPrimary: false,
			onclick: footer.onNewOpponent,
			class: "sm:col-span-2"
		},
		lobby: { label: "Lobby", isPrimary: false, onclick: footer.onLobby, class: "sm:hidden" }
	});

	const RATING_TONES: Record<ResultRating["tone"], string> = {
		gain: "bg-emerald-500/15 text-emerald-400",
		loss: "bg-destructive/15 text-destructive",
		even: "bg-muted text-muted-foreground",
		pending: "bg-muted/50 motion-safe:animate-pulse"
	};

	const mySeat = $derived(view.seats[0]);
	const hasOneSecondary = $derived(
		view.actions.filter((key) => !ACTIONS[key].isPrimary).length === 1
	);

	let isSparkleDone = $state(false);
	const isSparkleShown = $derived(
		view.tone === "win" &&
			!isSparkleDone &&
			!prefersReducedMotion.current &&
			!(browser && document.documentElement.classList.contains("reduce-motion"))
	);
</script>

{#snippet mark(seat: 0 | 1)}
	{@const player = players?.[seat]}
	<span
		class={cn(
			"flex size-3.5 shrink-0 items-center justify-center leading-none",
			ACCENTS[seat].text
		)}
	>
		{#if markIcon}
			<span aria-hidden="true" class="contents">{@render markIcon(seat)}</span>
			{#if player?.mark}
				<span class="sr-only">{player.mark}</span>
			{/if}
		{:else if player?.mark}
			{player.mark}
		{:else}
			<span aria-hidden="true">●</span>
		{/if}
	</span>
{/snippet}

{#snippet side(index: 0 | 1)}
	{@const seat = view.seats[index]}
	{@const player = players?.[seat]}
	<div class="flex min-w-0 flex-col items-center gap-1.5">
		<span
			class={cn(
				"flex size-9 items-center justify-center rounded-full ring-1 ring-border @sm:size-10",
				ACCENTS[seat].tintBg
			)}
			aria-hidden="true"
		>
			{#if player}
				<Emoji codepoint={player.emoji} label="" class="size-6" />
			{:else}
				<span class={cn("size-2.5 rounded-full", ACCENTS[seat].bg)}></span>
			{/if}
		</span>
		<span class="flex max-w-full min-w-0 items-center gap-1 text-xs font-semibold">
			<span class="min-w-0 truncate">{view.score[index].name}</span>
			{@render mark(seat)}
		</span>
	</div>
{/snippet}

<div
	class="@container absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/60 p-2 backdrop-blur-xs motion-safe:animate-in motion-safe:fade-in-0"
>
	<div class="relative w-full max-w-76">
		{#if view.tone === "win"}
			<span
				class={cn(
					"pointer-events-none absolute -inset-8 rounded-full blur-3xl motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-700",
					ACCENTS[mySeat].winBg
				)}
				aria-hidden="true"
			></span>
		{/if}

		<section
			aria-labelledby={headlineId}
			class={cn(
				surfaceClass,
				"flex w-full flex-col items-center gap-3 rounded-2xl p-4 text-center shadow-2xl motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 @sm:gap-4 @sm:p-5",
				view.tone === "loss" && "bg-popover/90 before:opacity-40"
			)}
		>
			{#if view.tone === "win"}
				<span
					class={cn(
						"pointer-events-none absolute -top-8 left-1/2 -z-10 h-28 w-52 -translate-x-1/2 rounded-full blur-2xl",
						ACCENTS[mySeat].winBg
					)}
					aria-hidden="true"
				></span>
			{/if}
			<div class="relative flex w-full flex-col items-center gap-0.5">
				{#if isSparkleShown}
					<span
						class="sparkle-once pointer-events-none absolute -inset-x-6 -inset-y-3 -z-10"
						onanimationend={(event) => {
							if (event.target === event.currentTarget) isSparkleDone = true;
						}}
					>
						<Sparkle colors={[SEAT_COLORS[mySeat], SEAT_COLORS[mySeat]]} />
					</span>
				{/if}
				<p class="text-caption text-muted-foreground">Round {footer.round}</p>
				<svelte:element
					this={`h${headingLevel}`}
					id={headlineId}
					class={cn(
						"text-xl font-bold tracking-tight @sm:text-2xl",
						view.tone === "win" && ACCENTS[mySeat].text,
						view.tone === "loss" && "text-foreground/70"
					)}
				>
					{view.headline}
				</svelte:element>
				{#if view.reason}
					<p class="text-caption text-muted-foreground">{view.reason}</p>
				{/if}
			</div>

			<div
				class={cn(
					"grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 rounded-xl border bg-background/40 px-2 py-2 @sm:py-3",
					view.tone === "loss" && "saturate-50"
				)}
			>
				{@render side(0)}
				<div class="flex flex-col items-center gap-1.5">
					<p class="flex items-baseline gap-1.5 text-xl font-bold tabular-nums @sm:text-2xl">
						<span>{view.score[0].score}</span>
						<span class="text-base text-muted-foreground">–</span>
						<span>{view.score[1].score}</span>
					</p>
					{#if view.rating}
						<span
							class={cn(
								"flex h-5 min-w-11 items-center justify-center rounded-full px-2 text-caption font-semibold tabular-nums",
								RATING_TONES[view.rating.tone]
							)}
							aria-live="polite"
						>
							<span aria-hidden="true">{view.rating.delta}</span>
							<span class="sr-only">{view.rating.text}</span>
						</span>
					{/if}
				</div>
				{@render side(1)}
			</div>

			<div class="grid w-full grid-cols-2 gap-2">
				{#each view.actions as key (key)}
					{@const action = ACTIONS[key]}
					<Button
						variant={action.isPrimary ? "default" : "outline"}
						size="sm"
						class={cn(
							action.isPrimary && "col-span-2 selected-ring",
							!action.isPrimary && hasOneSecondary && "col-span-2",
							action.class
						)}
						onclick={action.onclick}
					>
						{action.label}
					</Button>
				{/each}
			</div>

			<button
				type="button"
				class="-my-1 rounded-sm px-2 py-1 text-caption text-muted-foreground underline-offset-4 transition-colors outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring/50"
				onclick={onDismiss}
			>
				View board
			</button>
		</section>
	</div>
</div>

<style>
	/* The sparkle loops, so it fades out after one pass and then unmounts. */
	.sparkle-once {
		animation: sparkle-once 2.4s ease-out forwards;
	}

	@keyframes sparkle-once {
		0% {
			opacity: 0;
		}
		15%,
		65% {
			opacity: 1;
		}
		100% {
			opacity: 0;
		}
	}
</style>
