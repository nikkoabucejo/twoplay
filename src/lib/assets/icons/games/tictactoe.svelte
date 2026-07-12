<script lang="ts" module>
	import { cn } from "$lib/utils/style";

	export type TicTacToeProps = {
		class?: string;
	};
</script>

<script lang="ts">
	let { class: className }: TicTacToeProps = $props();
</script>

<svg
	viewBox="0 0 24 24"
	fill="none"
	stroke-width="2"
	stroke-linecap="round"
	stroke-linejoin="round"
	class={cn("lucide", className)}
	aria-hidden="true"
>
	<circle cx="9" cy="9" r="5.5" stroke="#ff0080" />
	<g class="tictactoe-x-wobble" style="transform-origin: 12.89px 12.89px" stroke="#00e5ff">
		<line x1="8.39" y1="8.39" x2="17.39" y2="17.39" />
		<line x1="17.39" y1="8.39" x2="8.39" y2="17.39" />
	</g>
</svg>

<style>
	.tictactoe-x-wobble {
		animation: tictactoe-wobble 5s ease-in-out infinite;
	}

	@keyframes tictactoe-wobble {
		0%,
		100% {
			transform: rotate(-10deg);
		}
		50% {
			transform: rotate(10deg);
		}
	}
</style>
