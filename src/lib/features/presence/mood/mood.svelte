<script lang="ts">
	import { cn } from "$lib/utils/style";
	import { setupMood } from "./mood.svelte.js";

	const mood = setupMood();

	// Seat 0 is always player 1's accent and seat 1 is always player 2's, the fixed
	// convention every game uses (see $lib/utils/style/accents) — so the background can key
	// off the seat number alone without knowing which game (or symbol/color scheme) is live.
	const activeSeat = $derived(mood.status?.type === "turn" ? mood.status.player : null);
	const winnerSeat = $derived(mood.status?.type === "winner" ? mood.status.player : null);
	// "waiting" (short a seat) gets the exact same treatment as "draw" — a neutral, no-one's-turn mood.
	const isDraw = $derived(mood.status?.type === "draw" || mood.status?.type === "waiting");

	function moodScale(seat: 0 | 1) {
		if (isDraw) return 1;
		if (winnerSeat !== null) return winnerSeat === seat ? 1.9 : 0.2;
		if (activeSeat === seat) return 1.3;
		if (activeSeat !== null) return 0.85;
		return 1;
	}

	function moodOpacity(seat: 0 | 1) {
		if (isDraw) return 1;
		if (winnerSeat !== null) return winnerSeat === seat ? 1 : 0;
		if (activeSeat === seat) return 1;
		if (activeSeat !== null) return 0.75;
		return 1;
	}

	function moodSpeed(seat: 0 | 1) {
		if (winnerSeat !== null) return winnerSeat === seat ? "8s" : "40s";
		if (activeSeat === seat) return "9s";
		if (activeSeat !== null) return "22s";
		return "16s";
	}
</script>

{#snippet cloud(seat: 0 | 1, color: string, position: string, anim: string)}
	<div class={cn("absolute", position, anim)}>
		<div
			class="size-full transition-[scale,opacity] duration-1400 ease-out"
			style="scale: {moodScale(seat)}; opacity: {moodOpacity(seat)}; --blob-speed: {moodSpeed(
				seat
			)}"
		>
			<div
				class={cn("blob-float absolute inset-[15%] rounded-full blur-3xl", color)}
				style="animation-delay: -2s"
			></div>
			<div
				class={cn(
					"blob-float absolute top-[-5%] left-[-5%] size-[55%] rounded-full blur-3xl",
					color
				)}
				style="animation-delay: -9s"
			></div>
			<div
				class={cn(
					"blob-float absolute top-[2%] right-[-8%] size-[50%] rounded-full blur-3xl",
					color
				)}
				style="animation-delay: -4s"
			></div>
			<div
				class={cn(
					"blob-float absolute bottom-[-6%] left-[6%] size-[48%] rounded-full blur-3xl",
					color
				)}
				style="animation-delay: -12s"
			></div>
			<div
				class={cn(
					"blob-float absolute right-[-6%] bottom-[-8%] size-[42%] rounded-full blur-3xl",
					color
				)}
				style="animation-delay: -6s"
			></div>
		</div>
	</div>
{/snippet}

<div
	class={cn(
		"pointer-events-none absolute inset-0 -z-10 overflow-hidden transition-[filter] duration-1400 ease-out",
		isDraw && "grayscale saturate-0"
	)}
>
	{@render cloud(
		0,
		"bg-cyan-500/20",
		"left-[calc(50%-10rem)] top-[calc(50%-23rem)] size-80",
		"drift-a animation-delay-[0s] animation-duration-[26s]"
	)}
	{@render cloud(
		1,
		"bg-pink-500/20",
		"left-[calc(50%-21.5rem)] top-[calc(50%-13rem)] size-72",
		"drift-b animation-delay-[-6s] animation-duration-[30s]"
	)}
	{@render cloud(
		0,
		"bg-cyan-500/15",
		"left-[calc(50%-16.5rem)] top-[calc(50%+1.5rem)] size-72",
		"drift-c animation-delay-[-13s] animation-duration-[24s]"
	)}
	{@render cloud(
		1,
		"bg-pink-500/20",
		"left-[calc(50%-4.5rem)] top-[calc(50%-1.5rem)] size-96",
		"drift-a animation-delay-[-9s] animation-duration-[28s]"
	)}
	{@render cloud(
		0,
		"bg-cyan-500/20",
		"left-[calc(50%+2.5rem)] top-[calc(50%-14rem)] size-80",
		"drift-b animation-delay-[-16s] animation-duration-[32s]"
	)}
</div>

<style>
	.drift-a {
		animation-name: drift-a;
		animation-timing-function: ease-in-out;
		animation-iteration-count: infinite;
	}

	.drift-b {
		animation-name: drift-b;
		animation-timing-function: ease-in-out;
		animation-iteration-count: infinite;
	}

	.drift-c {
		animation-name: drift-c;
		animation-timing-function: ease-in-out;
		animation-iteration-count: infinite;
	}

	.blob-float {
		animation-name: blob-float;
		animation-timing-function: ease-in-out;
		animation-iteration-count: infinite;
		animation-duration: var(--blob-speed, 16s);
		transition: animation-duration 1.4s ease-out;
	}

	@keyframes drift-a {
		0%,
		100% {
			translate: 0 0;
			rotate: 0deg;
			scale: 1;
		}
		33% {
			translate: 18% 14%;
			rotate: 25deg;
			scale: 1.14;
		}
		66% {
			translate: -14% 16%;
			rotate: -20deg;
			scale: 0.88;
		}
	}

	@keyframes drift-b {
		0%,
		100% {
			translate: 0 0;
			rotate: 0deg;
			scale: 1;
		}
		33% {
			translate: -16% 15%;
			rotate: -28deg;
			scale: 0.9;
		}
		66% {
			translate: 15% -14%;
			rotate: 22deg;
			scale: 1.16;
		}
	}

	@keyframes drift-c {
		0%,
		100% {
			translate: 0 0;
			rotate: 0deg;
			scale: 1;
		}
		50% {
			translate: 20% 20%;
			rotate: 30deg;
			scale: 1.1;
		}
	}

	@keyframes blob-float {
		0%,
		100% {
			translate: 0 0;
			scale: 1;
		}
		50% {
			translate: 8% -6%;
			scale: 1.12;
		}
	}
</style>
