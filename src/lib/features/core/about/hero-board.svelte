<script lang="ts">
	const gradientId = $props.id();
</script>

<!-- Paths in play order (X center, O, X, O, X), so the build draws the game as it was played. -->
<svg viewBox="0 0 300 300" class="board block size-full" aria-hidden="true">
	<defs>
		<linearGradient
			id={gradientId}
			gradientUnits="userSpaceOnUse"
			x1="30"
			y1="30"
			x2="270"
			y2="270"
		>
			<stop offset="0" class="stop-0" />
			<stop offset="1" class="stop-1" />
		</linearGradient>
	</defs>
	<g class="grid-lines" data-build="draw">
		<path d="M100 24V276" />
		<path d="M200 24V276" />
		<path d="M24 100H276" />
		<path d="M24 200H276" />
	</g>
	<g data-build="draw">
		<path class="x" d="M128 128L172 172" />
		<path class="x" d="M172 128L128 172" />
		<path class="o" d="M224 50a26 26 0 1 0 52 0a26 26 0 1 0 -52 0" />
		<path class="x" d="M28 28L72 72" />
		<path class="x" d="M72 28L28 72" />
		<path class="o" d="M24 250a26 26 0 1 0 52 0a26 26 0 1 0 -52 0" />
		<path class="x" d="M228 228L272 272" />
		<path class="x" d="M272 228L228 272" />
		<path class="win" stroke="url(#{gradientId})" d="M30 30L270 270" />
	</g>
</svg>

<style>
	.board path {
		fill: none;
		stroke-linecap: round;
	}

	.grid-lines path {
		stroke: color-mix(in oklab, var(--muted-foreground) 45%, transparent);
		stroke-width: 3;
	}

	.x {
		stroke: var(--seat-0);
		stroke-width: 11;
	}

	.o {
		stroke: var(--seat-1);
		stroke-width: 11;
	}

	.win {
		stroke-width: 7;
	}

	.stop-0 {
		stop-color: var(--seat-0);
	}

	.stop-1 {
		stop-color: var(--seat-1);
	}

	@media (prefers-reduced-motion: no-preference) {
		:global(html:not(.reduce-motion)) .win {
			animation: breathe 3.6s ease-in-out infinite;
		}
	}

	@keyframes breathe {
		50% {
			opacity: 0.55;
		}
	}
</style>
