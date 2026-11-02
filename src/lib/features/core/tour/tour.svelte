<script lang="ts">
	import { Swords, Users, Zap } from "@lucide/svelte";
	import { Button } from "$lib/components/ui";
	import { GAME_TYPES } from "$lib/features/play";
	import { ACCENTS, cn } from "$lib/utils/style";
	import { Door, onVisibility } from "../rules/index.js";
	import HeroBoard from "./hero-board.svelte";
	import Vignette from "./vignette.svelte";
	import type { VignetteKind } from "./vignette.svelte";

	const FEATURES: { kind: VignetteKind; title: string; body: string; class?: string }[] = [
		{
			kind: "cursors",
			title: "Live cursors",
			body: "See where your opponent is pointing while they think.",
			class: "sm:col-span-2"
		},
		{ kind: "trashtalk", title: "Trash talk", body: "Answer a move with an emoji." },
		{ kind: "instant", title: "Instant moves", body: "Your move shows the moment you make it." },
		{ kind: "clocks", title: "Clocks", body: "Each side's clock runs only on their turn." },
		{ kind: "rating", title: "Ratings", body: "A win adds 8 and a loss takes 8." }
	];

	const STEPS = [
		{ icon: Swords, title: "Pick a game", body: "Tic-Tac-Toe or Checkers." },
		{
			icon: Users,
			title: "Find an opponent",
			body: "Get matched with anyone waiting, or send a friend a code."
		},
		{
			icon: Zap,
			title: "Play live",
			body: "Moves, cursors, and clocks update on both screens as they happen."
		}
	];

	let isTrackVisible = $state(false);
</script>

<div class="flex flex-col gap-14 sm:gap-20">
	<section class="relative isolate overflow-hidden rounded-3xl border">
		<!-- The two seats' halves, meeting at a seam down the middle. -->
		<div class="absolute inset-0 -z-10 grid grid-cols-2" aria-hidden="true">
			<div class="bg-linear-to-br from-seat-0/20 to-seat-0/5"></div>
			<div class="bg-linear-to-bl from-seat-1/20 to-seat-1/5"></div>
		</div>
		<div
			class="absolute inset-y-0 left-1/2 -z-10 w-px bg-linear-to-b from-transparent via-foreground/25 to-transparent"
			aria-hidden="true"
		></div>

		<div class="flex flex-col items-center gap-8 px-4 py-10 text-center sm:py-14">
			<div class="flex flex-col items-center gap-3">
				<p class="font-mono text-caption tracking-widest text-muted-foreground uppercase">Tour</p>
				<h1 class="text-4xl font-bold tracking-tight sm:text-6xl">
					<span class="glow block text-seat-0 sm:inline">Two players.</span>
					<span class="glow block text-seat-1 sm:inline">One board.</span>
				</h1>
			</div>
			<div class="size-48 sm:size-56">
				<HeroBoard />
			</div>
			<p class="max-w-md text-muted-foreground">
				twoplay is for quick real-time games against a friend or a stranger. Moves show up on both
				screens as they happen, and each player has a clock.
			</p>
		</div>
	</section>

	<section aria-labelledby="tour-features" class="flex flex-col gap-5">
		<h2 id="tour-features" class="text-xl font-bold tracking-tight">What a game feels like</h2>
		<ul class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
			{#each FEATURES as feature (feature.kind)}
				<li
					class={cn(
						"flex flex-col gap-3 rounded-2xl border bg-muted/30 p-3 backdrop-blur-sm",
						feature.class
					)}
				>
					<Vignette kind={feature.kind} />
					<div class="flex flex-col gap-0.5 px-1 pb-1">
						<h3 class="font-semibold">{feature.title}</h3>
						<p class="text-sm text-muted-foreground">{feature.body}</p>
					</div>
				</li>
			{/each}
		</ul>
	</section>

	<section aria-labelledby="tour-games" class="flex flex-col gap-5">
		<h2 id="tour-games" class="text-xl font-bold tracking-tight">Games</h2>
		<ul class="grid gap-4 sm:grid-cols-2">
			{#each GAME_TYPES as type (type)}
				<li><Door {type} /></li>
			{/each}
		</ul>
	</section>

	<section aria-labelledby="tour-steps" class="flex flex-col gap-6">
		<h2 id="tour-steps" class="text-xl font-bold tracking-tight">How it works</h2>
		<div class="relative">
			<!-- A token travels the line between the steps, seat 0's color to seat 1's. -->
			<div
				class={cn(
					"track absolute top-5 right-[16.67%] left-[16.67%] hidden h-px bg-border [container-type:inline-size] sm:block",
					!isTrackVisible && "is-paused"
				)}
				aria-hidden="true"
				{@attach onVisibility((visible) => (isTrackVisible = visible))}
			>
				<span
					class="token absolute -top-1 -left-1 size-2.5 rounded-full bg-linear-to-r from-seat-0 to-seat-1"
					data-float
				></span>
			</div>
			<ol class="relative grid gap-6 sm:grid-cols-3">
				{#each STEPS as step, index (step.title)}
					<li class="flex gap-4 sm:flex-col sm:items-center sm:text-center">
						<span
							class={cn(
								"flex size-10 shrink-0 items-center justify-center rounded-full border bg-background",
								ACCENTS[index % 2].text
							)}
							aria-hidden="true"
						>
							<step.icon class="size-4" />
						</span>
						<div class="flex min-w-0 flex-col gap-1">
							<h3 class="font-semibold">
								<span class="font-mono text-caption text-muted-foreground tabular-nums">
									{index + 1}.
								</span>
								{step.title}
							</h3>
							<p class="text-sm text-muted-foreground">{step.body}</p>
						</div>
					</li>
				{/each}
			</ol>
		</div>
	</section>

	<section
		class="flex flex-col items-center gap-4 rounded-3xl border bg-muted/30 px-4 py-10 text-center backdrop-blur-sm"
	>
		<h2 class="text-2xl font-bold tracking-tight">Ready to play?</h2>
		<p class="text-muted-foreground">Start a game in your browser, with a stranger or a friend.</p>
		<div class="flex flex-wrap justify-center gap-3">
			<Button size="lg" href="/play">Play now</Button>
			<Button size="lg" variant="outline" href="/learn">Learn</Button>
		</div>
	</section>
</div>

<style>
	/* The wordmark's glow, held still. */
	.glow {
		text-shadow:
			0 0 4px currentColor,
			0 0 14px currentColor;
	}

	.track.is-paused .token {
		animation-play-state: paused;
	}

	@media (prefers-reduced-motion: no-preference) {
		:global(html:not(.reduce-motion)) .token {
			animation: travel 6s ease-in-out infinite;
		}
	}

	/* Rests at the last step, which is also what reduced motion shows. */
	.token {
		transform: translateX(100cqw);
	}

	@keyframes travel {
		0% {
			transform: translateX(0);
			opacity: 0;
		}
		8%,
		85% {
			opacity: 1;
		}
		70%,
		100% {
			transform: translateX(100cqw);
		}
		100% {
			opacity: 0;
		}
	}
</style>
