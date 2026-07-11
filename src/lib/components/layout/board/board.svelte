<script lang="ts" module>
	export type Ability = {
		/** Short name shown inside the slot. */
		name: string;
		/** Longer explanation, surfaced as a tooltip. */
		description: string;
		/** SVG path data (`d`), drawn in a uniform 24×24 viewBox with a currentColor stroke. */
		icon: string;
		/** How many times the ability can be used per match. */
		charges: number;
	};

	export type BoardPlayer = {
		/** Name shown above the player's ability slots. */
		label: string;
		/** Tailwind text-color class for the label, e.g. "text-primary". */
		accent?: string;
		/** Abilities this player owns, filling slots top-to-bottom. */
		abilities?: Ability[];
	};
</script>

<script lang="ts">
	import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "$lib/components/ui";
	import { cn } from "$lib/utils/style";
	import type { Snippet } from "svelte";

	let {
		players,
		abilitySlots = 3,
		size = "34rem",
		class: className,
		children,
		header,
		footer
	}: {
		/** The two players, rendered left and right of the board. */
		players: [BoardPlayer, BoardPlayer];
		/** Number of ability slots per player. */
		abilitySlots?: number;
		/** Fixed side length of the square board area (any CSS length). */
		size?: string;
		class?: string;
		/** The game itself. Fills the square board area — use `size-full`. */
		children: Snippet;
		/** Optional status bar above the board (e.g. whose turn, score). Rendered in a bordered bar spanning the board's width. */
		header?: Snippet;
		/** Optional actions beneath the board (e.g. reset, invite link). */
		footer?: Snippet;
	} = $props();
</script>

{#snippet abilityBar(player: BoardPlayer)}
	<div class="flex flex-col items-center gap-2">
		<div class="flex flex-col gap-2">
			{#each { length: abilitySlots } as _, slot (slot)}
				{@const ability = player.abilities?.[slot]}
				{#if ability}
					<Tooltip>
						<TooltipTrigger
							type="button"
							class="flex size-12 items-center justify-center rounded-md border bg-background transition-colors hover:bg-muted"
							aria-label={`${player.label} ability ${slot + 1}: ${ability.name}`}
						>
							<svg
								class="size-5"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								aria-hidden="true"
							>
								<path d={ability.icon} />
							</svg>
						</TooltipTrigger>
						<TooltipContent side={player === players[0] ? "right" : "left"}>
							<div class="flex flex-col gap-0.5 text-left">
								<span class="font-semibold">{ability.name}</span>
								<span class="text-background/70">{ability.description}</span>
							</div>
						</TooltipContent>
					</Tooltip>
				{:else}
					<div
						class="size-12 rounded-md border border-dashed"
						aria-label={`${player.label} ability slot ${slot + 1}, empty`}
					></div>
				{/if}
			{/each}
		</div>
	</div>
{/snippet}

<TooltipProvider delayDuration={200}>
	<div
		class={cn("mx-auto flex w-fit items-start justify-center gap-8", className)}
		style:--board-size={size}
	>
		{@render abilityBar(players[0])}

		<div class="flex flex-col items-center gap-6">
			{#if header}
				<div
					class="flex w-(--board-size) items-center justify-between gap-3 rounded-lg border bg-muted/40 px-4 py-2.5 text-sm backdrop-blur-sm"
				>
					{@render header()}
				</div>
			{/if}

			<div class="aspect-square w-(--board-size)">
				{@render children()}
			</div>

			{#if footer}
				{@render footer()}
			{/if}
		</div>

		{@render abilityBar(players[1])}
	</div>
</TooltipProvider>
