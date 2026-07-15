<script lang="ts" module>
	import type { Component } from "svelte";
	import { cn } from "$lib/utils/style";
	import { Sparkle } from "../sparkle/index.js";

	export type EmblemProps = {
		icon: Component<{ class?: string }>;
		colors: [string, string];
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
		icon: Mark,
		colors,
		class: className,
		iconClass,
		active = false,
		label,
		selected = false,
		sparkles = true
	}: EmblemProps = $props();

	const isActive = $derived(active || selected);
</script>

<span
	class={cn(
		"emblem relative isolate inline-flex size-14 shrink-0 items-center justify-center",
		isActive && "is-active",
		className
	)}
	style:--emblem-primary={colors[0]}
	style:--emblem-secondary={colors[1]}
	role={label ? "img" : undefined}
	aria-label={label}
	aria-hidden={label ? undefined : "true"}
>
	{#if sparkles && isActive}
		<Sparkle {colors} variant="icon" class="-inset-4 opacity-75" />
	{/if}

	{#if isActive}
		<span class="emblem__halo" aria-hidden="true"></span>
	{/if}
	<span class="emblem__mark relative z-10 flex size-[82%] items-center justify-center">
		<Mark class={cn("size-full", iconClass)} />
	</span>
</span>

<style>
	.emblem {
		--emblem-primary: #06b6d4;
		--emblem-secondary: #ec4899;
	}

	.emblem__halo {
		position: absolute;
		inset: 9%;
		border-radius: 9999px;
		background:
			radial-gradient(
				circle at 35% 32%,
				color-mix(in srgb, var(--emblem-primary) 42%, transparent),
				transparent 58%
			),
			radial-gradient(
				circle at 68% 72%,
				color-mix(in srgb, var(--emblem-secondary) 38%, transparent),
				transparent 64%
			);
		filter: blur(9px);
		opacity: 0.58;
		animation: emblem-glow 3.4s ease-in-out infinite;
	}

	.emblem__mark {
		transition: filter 180ms ease;
	}

	.emblem.is-active .emblem__mark {
		filter: drop-shadow(0 0 7px color-mix(in srgb, var(--emblem-primary) 62%, transparent))
			drop-shadow(0 0 12px color-mix(in srgb, var(--emblem-secondary) 48%, transparent));
		animation: emblem-float 4.2s ease-in-out infinite;
	}

	@keyframes emblem-glow {
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

	@keyframes emblem-float {
		0%,
		100% {
			transform: translateY(0) scale(1);
		}
		50% {
			transform: translateY(-2px) scale(1.03);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.emblem__halo,
		.emblem__mark {
			animation: none;
		}
	}
</style>
