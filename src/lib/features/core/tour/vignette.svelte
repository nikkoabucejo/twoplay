<script lang="ts" module>
	export type VignetteKind = "cursors" | "trashtalk" | "instant" | "clocks" | "rating";
</script>

<script lang="ts">
	import { ACCENTS, cn } from "$lib/utils/style";
	import { ClocksDemo, DemoCursor, Mark, onVisibility } from "../rules/index.js";

	let { kind }: { kind: VignetteKind } = $props();

	let isVisible = $state(false);
</script>

{#snippet chip(seat: 0 | 1, face: string)}
	<div class="flex items-center gap-1.5 rounded-lg border bg-muted/40 py-1 pr-2.5 pl-1">
		<span
			class="flex size-7 items-center justify-center rounded-md border bg-background/40 text-base"
		>
			{face}
		</span>
		<span class={cn("text-xs font-semibold", ACCENTS[seat].text)}>Player {seat + 1}</span>
	</div>
{/snippet}

<!-- Loops are CSS animations, paused off screen and skipped under reduced motion; the resting
     styles are each loop's last frame, so that is what reduced motion shows. -->
<div
	class={cn(
		"vignette relative h-40 overflow-hidden rounded-xl border bg-background/30 p-4 [container-type:size]",
		!isVisible && "is-paused"
	)}
	data-frame={kind === "cursors" ? "edge" : ""}
	aria-hidden="true"
	{@attach onVisibility((visible) => (isVisible = visible))}
>
	{#if kind === "cursors"}
		<svg
			viewBox="0 0 90 60"
			class="absolute inset-0 size-full text-border"
			preserveAspectRatio="none"
		>
			<path
				d="M30 6v48M60 6v48M10 20h70M10 40h70"
				stroke="currentColor"
				stroke-width="0.6"
				vector-effect="non-scaling-stroke"
			/>
		</svg>
		<div class="drift-a absolute inset-0" data-float>
			<DemoCursor seat={0} label="Player 1" x={0.12} y={0.55} />
		</div>
		<div class="drift-b absolute inset-0" data-float>
			<DemoCursor seat={1} label="Player 2" x={0.66} y={0.18} />
		</div>
	{:else if kind === "trashtalk"}
		<!-- Each bubble keeps its slot above its chip, so it never covers the frame's edge. -->
		<div class="flex size-full items-center justify-between">
			<div class="flex flex-col items-start gap-1.5">
				<span
					class="bubble-a ml-1 rounded-xl rounded-bl-sm border bg-background/90 px-2 py-1 text-xl shadow-md"
				>
					😏
				</span>
				{@render chip(0, "😀")}
			</div>
			<div class="flex flex-col items-end gap-1.5">
				<span
					class="bubble-b mr-1 rounded-xl rounded-br-sm border bg-background/90 px-2 py-1 text-xl shadow-md"
				>
					😤
				</span>
				{@render chip(1, "😎")}
			</div>
		</div>
	{:else if kind === "instant"}
		<div class="flex size-full items-center justify-center gap-4">
			<div class="relative size-20">
				<div class="grid size-full grid-cols-3 grid-rows-3 gap-1 rounded-lg bg-muted/50 p-1">
					{#each { length: 9 } as _, cell (cell)}
						<div class="flex items-center justify-center rounded-sm bg-background/90">
							{#if cell === 0}
								<Mark mark="O" class="size-3/5" />
							{:else if cell === 4}
								<div class="instant-mark flex size-full items-center justify-center">
									<Mark mark="X" class="size-3/5" />
								</div>
							{/if}
						</div>
					{/each}
				</div>
				<div class="instant-cursor absolute inset-0 [container-type:size]">
					<DemoCursor seat={0} label="You" x={0.5} y={0.5} />
				</div>
			</div>
			<span
				class="instant-synced rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-caption font-semibold text-emerald-500"
			>
				Synced
			</span>
		</div>
	{:else if kind === "clocks"}
		<ClocksDemo isCompact isPaused={!isVisible} />
	{:else}
		<div class="flex size-full flex-col justify-center gap-2">
			{#each [0, 1] as const as seat (seat)}
				<div class="flex items-center gap-2">
					<span class={cn("size-2 rounded-full", ACCENTS[seat].bg)}></span>
					<span class="flex-1 text-sm font-semibold">Player {seat + 1}</span>
					<span class="grid font-mono text-lg font-semibold tabular-nums">
						<span class="rating-before col-start-1 row-start-1 opacity-0">
							{seat === 0 ? 404 : 396}
						</span>
						<span class="rating-after col-start-1 row-start-1">{seat === 0 ? 412 : 388}</span>
					</span>
					<span
						class={cn(
							"rating-delta w-9 text-right font-mono text-xs font-semibold tabular-nums",
							seat === 0 ? "text-emerald-500" : "text-destructive"
						)}
					>
						{seat === 0 ? "+8" : "−8"}
					</span>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.vignette.is-paused :global(*) {
		animation-play-state: paused;
	}

	@media (prefers-reduced-motion: no-preference) {
		:global(html:not(.reduce-motion)) .drift-a {
			animation: drift-a 9s ease-in-out infinite;
		}
		:global(html:not(.reduce-motion)) .drift-b {
			animation: drift-b 11s ease-in-out infinite;
		}
		:global(html:not(.reduce-motion)) .bubble-a {
			animation: bubble 6s ease-out infinite;
		}
		:global(html:not(.reduce-motion)) .bubble-b {
			animation: bubble 6s ease-out -3s infinite;
		}
		:global(html:not(.reduce-motion)) .instant-cursor {
			animation: instant-cursor 4s ease-in-out infinite;
		}
		:global(html:not(.reduce-motion)) .instant-mark {
			animation: instant-mark 4s ease-out infinite;
		}
		:global(html:not(.reduce-motion)) .instant-synced {
			animation: instant-synced 4s ease-out infinite;
		}
		:global(html:not(.reduce-motion)) .rating-before {
			animation: rating-before 5s ease-in-out infinite;
		}
		:global(html:not(.reduce-motion)) .rating-after {
			animation: rating-after 5s ease-in-out infinite;
		}
		:global(html:not(.reduce-motion)) .rating-delta {
			animation: rating-delta 5s ease-out infinite;
		}
	}

	@keyframes drift-a {
		0%,
		100% {
			translate: 0 0;
		}
		35% {
			translate: 12cqw -20cqh;
		}
		70% {
			translate: 22cqw 8cqh;
		}
	}

	@keyframes drift-b {
		0%,
		100% {
			translate: 0 0;
		}
		40% {
			translate: -12cqw 34cqh;
		}
		75% {
			translate: 6cqw 14cqh;
		}
	}

	@keyframes bubble {
		0%,
		50%,
		100% {
			opacity: 0;
			transform: translateY(6px) scale(0.6);
		}
		6% {
			opacity: 1;
			transform: translateY(0) scale(1.1);
		}
		10%,
		40% {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	@keyframes instant-cursor {
		0%,
		100% {
			translate: 30% 35%;
		}
		30%,
		80% {
			translate: 0 0;
		}
	}

	@keyframes instant-mark {
		0%,
		34% {
			opacity: 0;
			transform: scale(0.6);
		}
		40% {
			opacity: 1;
			transform: scale(1.14, 0.9);
		}
		46%,
		90% {
			opacity: 1;
			transform: scale(1);
		}
		100% {
			opacity: 0;
			transform: scale(1);
		}
	}

	@keyframes instant-synced {
		0%,
		44% {
			opacity: 0;
		}
		52%,
		88% {
			opacity: 1;
		}
		100% {
			opacity: 0;
		}
	}

	@keyframes rating-before {
		0%,
		40% {
			opacity: 1;
		}
		50%,
		95% {
			opacity: 0;
		}
		100% {
			opacity: 1;
		}
	}

	@keyframes rating-after {
		0%,
		40% {
			opacity: 0;
		}
		50%,
		95% {
			opacity: 1;
		}
		100% {
			opacity: 0;
		}
	}

	@keyframes rating-delta {
		0%,
		40% {
			opacity: 0;
			transform: translateY(8px);
		}
		50%,
		90% {
			opacity: 1;
			transform: translateY(0);
		}
		100% {
			opacity: 0;
			transform: translateY(-4px);
		}
	}
</style>
