<script lang="ts" module>
	export type Ability = {
		/** Short name shown inside the slot. */
		name: string;
		/** Longer explanation, surfaced as a tooltip. */
		description: string;
		/** SVG path data (`d`), drawn in a uniform 24×24 viewBox with a currentColor stroke. */
		icon: string;
		/** How many times the ability can be used per match. Not consumed anywhere yet — the ability
		 *  bar is currently a display-only affordance with no click handler. */
		charges: number;
	};

	export type BoardPlayer = {
		/** Name shown above the player's ability slots and in the status bar. */
		label: string;
		/** Tailwind text-color class for the label, e.g. "text-primary". */
		accent?: string;
		/** Score shown next to the player's label in the status bar. Omit to hide. */
		score?: number;
		/** Abilities this player owns, filling slots top-to-bottom. */
		abilities?: Ability[];
	};

	/** Drives the status bar's center content — whose turn it is, or how the game ended. */
	export type BoardStatus =
		{ type: "turn"; player: 0 | 1 } | { type: "winner"; player: 0 | 1 } | { type: "draw" };

	export type BoardFooter = {
		/** False when viewing a past round rather than the room's current one. */
		isLive: boolean;
		/** The round currently displayed, and the room's most recent round — 1-indexed. */
		game: number;
		round: number;
		/** Starts a new round. Only called while `isLive` and the round is over. */
		onNewGame: () => void;
		/** Navigates to the room's current live round. Only called while `!isLive`. */
		onGoLive: () => void;
		/** Navigates to a specific past or present round. */
		onGoToRound: (round: number) => void;
		error?: string | null;
	};
</script>

<script lang="ts">
	import { ChevronLeft, ChevronRight } from "@lucide/svelte";
	import { fade } from "svelte/transition";
	import {
		Button,
		Tooltip,
		TooltipContent,
		TooltipProvider,
		TooltipTrigger
	} from "$lib/components/ui";
	import { cn } from "$lib/utils/style";
	import type { Snippet } from "svelte";
	import { getMood } from "./mood.svelte.js";

	let {
		players,
		status,
		footer,
		abilitySlots = 5,
		size = "34rem",
		class: className,
		children
	}: {
		/** The two players, rendered left and right of the board. */
		players: [BoardPlayer, BoardPlayer];
		/** Whose turn it is, or how the game ended. Omit to hide the status bar. */
		status?: BoardStatus;
		/** Reset/invite actions and any error message. Omit to hide the action bar. */
		footer?: BoardFooter;
		/** Number of ability slots per player. Same across every game by default — don't override
		 * per game, or slot count will drift out of sync between them. */
		abilitySlots?: number;
		/** Fixed side length of the square board area (any CSS length). */
		size?: string;
		class?: string;
		/** The game itself. Fills the square board area — use `size-full`. */
		children: Snippet;
	} = $props();

	function dotClass(player: BoardPlayer) {
		return player.accent?.replaceAll("text-", "bg-");
	}

	const mood = getMood();

	$effect(() => {
		if (!mood) return;
		mood.status = status ?? null;
		return () => {
			mood.status = null;
		};
	});
</script>

{#snippet turnIndicator(player: 0 | 1, word: string, pulse: boolean)}
	{@const color = players[player].accent}
	{@const arrowClass = cn("text-base leading-none", pulse && "animate-pulse", color)}
	{@const wordClass = cn("text-[10px] font-semibold tracking-widest uppercase", color)}
	{#if player === 0}
		<span class={arrowClass}>◀</span>
		<span class={wordClass}>{word}</span>
	{:else}
		<span class={wordClass}>{word}</span>
		<span class={arrowClass}>▶</span>
	{/if}
{/snippet}

{#snippet abilityBar(player: BoardPlayer)}
	<div class="flex flex-col items-center gap-2">
		<div class="flex flex-col gap-2">
			{#each { length: abilitySlots } as _, slot (slot)}
				{@const ability = player.abilities?.[slot]}
				{#if ability}
					<Tooltip>
						<TooltipTrigger
							type="button"
							class="flex size-12 items-center justify-center rounded-md bg-muted/40 backdrop-blur-sm transition-colors hover:bg-muted/70"
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
						class="size-12 rounded-md bg-muted/20 backdrop-blur-sm"
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
			{#if status}
				<div
					class="grid w-(--board-size) grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-lg border bg-muted/40 px-4 py-2.5 text-sm backdrop-blur-sm"
				>
					<div class="flex items-center gap-2">
						<span class={cn("size-2.5 rounded-full", dotClass(players[0]))}></span>
						<span class={cn("font-semibold", players[0].accent)}>{players[0].label}</span>
						{#if players[0].score !== undefined}
							<span class="tabular-nums text-muted-foreground">{players[0].score}</span>
						{/if}
					</div>

					<div class="flex items-center gap-1.5">
						{#if status.type === "winner"}
							{@render turnIndicator(status.player, "Winner", false)}
						{:else if status.type === "draw"}
							<span class="font-semibold text-muted-foreground">Draw</span>
						{:else}
							{@render turnIndicator(status.player, "Turn", true)}
						{/if}
					</div>

					<div class="flex items-center justify-end gap-2">
						{#if players[1].score !== undefined}
							<span class="tabular-nums text-muted-foreground">{players[1].score}</span>
						{/if}
						<span class={cn("font-semibold", players[1].accent)}>{players[1].label}</span>
						<span class={cn("size-2.5 rounded-full", dotClass(players[1]))}></span>
					</div>
				</div>
			{/if}

			<div class="aspect-square w-(--board-size)">
				{@render children()}
			</div>

			{#if footer}
				{@const prevDisabled = footer.game <= 1}
				{@const nextDisabled = footer.game >= footer.round}
				{@const newGameDisabled = status?.type !== "winner" && status?.type !== "draw"}
				<div class="flex w-(--board-size) flex-col items-center gap-3">
					<div class="flex items-center gap-2">
						<span class={cn(prevDisabled && "cursor-not-allowed")}>
							<Button
								variant="outline"
								size="icon-sm"
								aria-label="Previous round"
								disabled={prevDisabled}
								onclick={() => footer.onGoToRound(footer.game - 1)}
							>
								<ChevronLeft />
							</Button>
						</span>

						<span class={cn(footer.isLive && newGameDisabled && "cursor-not-allowed")}>
							{#if footer.isLive}
								<Button
									variant="outline"
									size="sm"
									class="w-32 uppercase"
									onclick={footer.onNewGame}
									disabled={newGameDisabled}
								>
									New game
								</Button>
							{:else}
								<Button
									variant="outline"
									size="sm"
									class="w-32 uppercase"
									onclick={footer.onGoLive}
								>
									Go live
								</Button>
							{/if}
						</span>

						<span class={cn(nextDisabled && "cursor-not-allowed")}>
							<Button
								variant="outline"
								size="icon-sm"
								aria-label="Next round"
								disabled={nextDisabled}
								onclick={() => footer.onGoToRound(footer.game + 1)}
							>
								<ChevronRight />
							</Button>
						</span>
					</div>

					<p class="text-xs text-muted-foreground">
						Round {footer.game} of {footer.round}
					</p>

					{#if footer.error}
						<p class="text-sm text-destructive" transition:fade>{footer.error}</p>
					{/if}
				</div>
			{/if}
		</div>

		{@render abilityBar(players[1])}
	</div>
</TooltipProvider>
