<script lang="ts" module>
	import { Sparkle } from "$lib/components/ui";
	import { cn } from "$lib/utils/style";
	import type { GameType } from "../../../../convex/models/games/index.js";
	import { GAMES } from "./games.js";

	export type IconProps = {
		type: GameType;
		class?: string;
		iconClass?: string;
		active?: boolean;
		label?: string;
		selected?: boolean;
		sparkles?: boolean;
	};
</script>

<script lang="ts">
	let {
		type,
		class: className,
		iconClass,
		active = false,
		label,
		selected = false,
		sparkles = true
	}: IconProps = $props();

	const game = $derived(GAMES[type]);
	const GameMark = $derived(game.icon);
	const colors = $derived(game.colors);
	const isActive = $derived(active || selected);
</script>

<span
	class={cn(
		"icon relative isolate inline-flex size-14 shrink-0 items-center justify-center",
		isActive && "is-active",
		className
	)}
	style:--icon-primary={colors[0]}
	style:--icon-secondary={colors[1]}
	role={label ? "img" : undefined}
	aria-label={label}
	aria-hidden={label ? undefined : "true"}
>
	{#if sparkles && isActive}
		<Sparkle colors={colors} variant="icon" class="-inset-4 opacity-75" />
	{/if}

	{#if isActive}
		<span class="icon__halo" aria-hidden="true"></span>
	{/if}
	<span class="icon__mark relative z-10 flex size-[82%] items-center justify-center">
		<GameMark class={cn("size-full", iconClass)} />
	</span>
</span>

<style>
	.icon {
		--icon-primary: #06b6d4;
		--icon-secondary: #ec4899;
	}

	.icon__halo {
		position: absolute;
		inset: 9%;
		border-radius: 9999px;
		background:
			radial-gradient(
				circle at 35% 32%,
				color-mix(in srgb, var(--icon-primary) 42%, transparent),
				transparent 58%
			),
			radial-gradient(
				circle at 68% 72%,
				color-mix(in srgb, var(--icon-secondary) 38%, transparent),
				transparent 64%
			);
		filter: blur(9px);
		opacity: 0.58;
		animation: icon-glow 3.4s ease-in-out infinite;
	}

	.icon__mark {
		transition: filter 180ms ease;
	}

	.icon.is-active .icon__mark {
		filter:
			drop-shadow(0 0 7px color-mix(in srgb, var(--icon-primary) 62%, transparent))
			drop-shadow(0 0 12px color-mix(in srgb, var(--icon-secondary) 48%, transparent));
		animation: icon-float 4.2s ease-in-out infinite;
	}

	@keyframes icon-glow {
		0%,
		100% {
			transform: scale(0.9);
			opacity: 0.48;
		}
		50% {
			transform: scale(1.08);
			opacity: 0.78;
		}
	}

	@keyframes icon-float {
		0%,
		100% {
			transform: translateY(0) scale(1);
		}
		50% {
			transform: translateY(-2px) scale(1.03);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.icon__halo,
		.icon__mark {
			animation: none;
		}
	}
</style>
