<script lang="ts">
	import type { Mark } from "../../../../../convex/models/games/tictactoe/rules.js";
	import { playerIndexOf } from "../../../../../convex/models/games/tictactoe/rules.js";
	import { ACCENTS, cn } from "$lib/utils/style";

	let { mark, class: className }: { mark: Mark; class?: string } = $props();
</script>

<!-- Same shapes as the game board's marks; the pop runs once, when the mark mounts. -->
<svg
	viewBox="0 0 24 24"
	class={cn("mark-pop", ACCENTS[playerIndexOf(mark)].text, className)}
	aria-hidden="true"
>
	{#if mark === "X"}
		<path
			d="M7 7 L17 17 M17 7 L7 17"
			fill="none"
			stroke="currentColor"
			stroke-width="3.5"
			stroke-linecap="round"
		/>
	{:else}
		<circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" stroke-width="3.5" />
	{/if}
</svg>

<style>
	@media (prefers-reduced-motion: no-preference) {
		:global(html:not(.reduce-motion)) .mark-pop {
			animation: mark-pop 280ms ease-out;
		}
	}

	@keyframes mark-pop {
		0% {
			transform: scale(0.6);
			opacity: 0;
		}
		55% {
			transform: scale(1.14, 0.9);
			opacity: 1;
		}
		80% {
			transform: scale(0.96, 1.04);
		}
		100% {
			transform: scale(1);
		}
	}
</style>
