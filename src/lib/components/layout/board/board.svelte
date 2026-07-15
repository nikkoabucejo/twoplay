<script lang="ts" module>
	export type BoardPlayer = {
		/** Name shown in the status bar. */
		label: string;
		/** Lowercase hex codepoint for the status-bar emoji, e.g. "1f600". */
		emoji: string;
		/** Tailwind text-color class for the label, e.g. "text-primary". */
		accent?: string;
		/** Score shown next to the player's label in the status bar. Omit to hide. */
		score?: number;
	};

	/** Fixed set of emoji choices offered by the status-bar picker. */
	const EMOJI_OPTIONS = [
		{ codepoint: "1f602", label: "Face with tears of joy" },
		{ codepoint: "1f60f", label: "Smirking face" },
		{ codepoint: "1f440", label: "Eyes" },
		{ codepoint: "1f525", label: "Fire" },
		{ codepoint: "1f480", label: "Skull" },
		{ codepoint: "1f921", label: "Clown face" },
		{ codepoint: "1f60e", label: "Smiling face with sunglasses" },
		{ codepoint: "1f4aa", label: "Flexed biceps" },
		{ codepoint: "1f4af", label: "Hundred points" },
		{ codepoint: "1f37f", label: "Popcorn" }
	];

	/** Drives the status bar's center content — whose turn it is, or how the game ended. `"waiting"`
	 *  covers the room being short a seat — styled and moodboarded identically to `"draw"`. `closed`
	 *  covers the room having been abandoned while still waiting — same empty seat, but there's no
	 *  longer anything to wait for, so the center text goes blank rather than still reading "Waiting". */
	export type BoardStatus =
		| { type: "turn"; player: 0 | 1 }
		| { type: "winner"; player: 0 | 1; reason?: "timeout" | "resign" | "abandon" }
		| { type: "draw" }
		| { type: "waiting"; closed?: boolean };

	/** Server-derived clock display — `board.svelte` only renders these numbers, it never ticks its own. */
	export type BoardClock = {
		/** Remaining time per seat, in ms. */
		remaining: [number, number];
		/** The seat currently burning clock, or null while frozen (not live, waiting for an opponent, or
		 *  the round is over). */
		activeSeat: 0 | 1 | null;
	};

	export type BoardFooter = {
		/** False when viewing a past round rather than the room's current one. */
		isLive: boolean;
		/** The round currently displayed — 1-indexed. */
		round: number;
		/** The room's most recent round — 1-indexed. */
		latestRound: number;
		/** Forfeits the round in progress in favor of the opponent. Offered as one of two choices in the
		 *  Resign button's dropdown, alongside `onAbandon`. Only called while `isLive`, the round is
		 *  still running, and `!roomClosed`. */
		onResign: () => void;
		/** Starts the room's next round. Only called while `isLive` and the round is over. Offered as
		 *  one of two choices in the Rematch button's dropdown, alongside `onAbandon`. */
		onRematch: () => void;
		/** Abandons the room entirely, forfeiting the match and closing the room for good — distinct
		 *  from `onResign`, which only ends the current round. The other choice in both the Resign and
		 *  Rematch buttons' dropdowns. Only called while `!roomClosed`. */
		onAbandon: () => void;
		/** Leaves this closed room for a fresh one. Replaces Resign/Rematch once `roomClosed`. */
		onPlayAgain: () => void;
		/** Navigates to the room's current live round. Only called while `!isLive`. */
		onGoLive: () => void;
		/** Navigates to a specific past or present round. */
		onGoToRound: (round: number) => void;
		/** True once the room has closed for good — the action button becomes Play Again instead of
		 *  Resign/Rematch. */
		roomClosed?: boolean;
		/** True while the room is short a seat — the action button becomes a plain Abandon (no Resign
		 *  choice, no dropdown), since there's no opponent yet to resign a round against. */
		waitingForOpponent?: boolean;
		error?: string | null;
	};
</script>

<script lang="ts">
	import { ChevronLeft, ChevronRight } from "@lucide/svelte";
	import { fade } from "svelte/transition";
	import {
		Button,
		Dropdown,
		DropdownContent,
		DropdownItem,
		DropdownSeparator,
		DropdownTrigger,
		Emoji,
		Popover,
		PopoverContent,
		PopoverTrigger
	} from "$lib/components/ui";
	import { ACCENTS, cn } from "$lib/utils/style";
	import type { Snippet } from "svelte";
	import { getMood } from "$lib/features/presence";

	let {
		players,
		status,
		footer,
		clock,
		size = "min(calc(100vw - 9rem), calc(100dvh - 16.5rem), 34rem)",
		class: className,
		myIndex = null,
		opponentDisconnected = false,
		onTrashtalk,
		children
	}: {
		/** The two players, rendered left and right of the board. */
		players: [BoardPlayer, BoardPlayer];
		/** Whose turn it is, or how the game ended. Omit to hide the status bar. */
		status?: BoardStatus;
		/** Reset/invite actions and any error message. Omit to hide the action bar. */
		footer?: BoardFooter;
		/** Per-seat clock display. Omit to hide the clocks entirely. */
		clock?: BoardClock;
		/** Fixed side length of the square board area (any CSS length). */
		size?: string;
		class?: string;
		/** Which seat the viewer occupies — that seat's emoji becomes clickable. Null/omitted (e.g.
		 *  spectating) keeps both emoji purely decorative. */
		myIndex?: 0 | 1 | null;
		/** True while the opponent's seat has gone quiet — shows a small indicator on their emoji. */
		opponentDisconnected?: boolean;
		/** Called with the chosen codepoint when the viewer picks a new emoji for their own seat. */
		onTrashtalk?: (emoji: string) => void;
		/** The game itself. Fills the square board area — use `size-full`. */
		children: Snippet;
	} = $props();

	/** Clock digits turn destructive-colored at or below this remaining time. */
	const LOW_TIME_MS = 10_000;

	const mood = getMood();

	let pickerOpen = $state(false);

	function emojiLabel(codepoint: string): string {
		return EMOJI_OPTIONS.find((option) => option.codepoint === codepoint)?.label ?? "Player emoji";
	}

	function selectEmoji(codepoint: string) {
		onTrashtalk?.(codepoint);
		pickerOpen = false;
	}

	function formatClock(ms: number): string {
		const totalSeconds = Math.ceil(ms / 1000);
		const minutes = Math.floor(totalSeconds / 60);
		return `${minutes}:${(totalSeconds % 60).toString().padStart(2, "0")}`;
	}

	$effect(() => {
		if (!mood) return;
		mood.status = status ?? null;
		return () => {
			mood.status = null;
		};
	});
</script>

{#snippet emojiPicker(seat: 0 | 1)}
	<Popover bind:open={pickerOpen}>
		<PopoverTrigger
			aria-label="Change your emoji"
			class="focus-visible:border-ring focus-visible:ring-ring/50 flex size-full items-center justify-center rounded-lg outline-none transition-opacity focus-visible:ring-3 hover:opacity-80"
		>
			<Emoji
				codepoint={players[seat].emoji}
				label={emojiLabel(players[seat].emoji)}
				class="size-6"
			/>
		</PopoverTrigger>
		<PopoverContent side="top" sideOffset={8} align={seat === 0 ? "start" : "end"}>
			<div class="flex flex-nowrap items-center gap-1">
				{#each EMOJI_OPTIONS as option (option.codepoint)}
					<button
						type="button"
						aria-label={option.label}
						class="focus-visible:border-ring focus-visible:ring-ring/50 flex items-center justify-center rounded-md p-1.5 outline-none focus-visible:ring-3 hover:bg-muted"
						onclick={() => selectEmoji(option.codepoint)}
					>
						<Emoji codepoint={option.codepoint} label={option.label} class="size-5" />
					</button>
				{/each}
			</div>
		</PopoverContent>
	</Popover>
{/snippet}

{#snippet emojiBox(seat: 0 | 1)}
	<div
		class="relative flex size-10 shrink-0 items-center justify-center rounded-lg border bg-muted/40 backdrop-blur-sm sm:size-12"
	>
		{#if myIndex === seat}
			{@render emojiPicker(seat)}
		{:else}
			<Emoji
				codepoint={players[seat].emoji}
				label={emojiLabel(players[seat].emoji)}
				class="size-6"
			/>
		{/if}
		{#if myIndex !== null && myIndex !== seat && opponentDisconnected}
			<span
				class="absolute -top-1 -right-1 size-3 rounded-full bg-destructive ring-2 ring-background"
				aria-label="Opponent disconnected"
				title="Opponent disconnected"
			></span>
		{/if}
	</div>
{/snippet}

{#snippet clockBox(seat: 0 | 1)}
	{@const ms = clock?.remaining[seat] ?? 0}
	{@const active = clock?.activeSeat === seat && ms > 0}
	{@const low = active && ms <= LOW_TIME_MS}
	<div
		class={cn(
			"flex h-12 w-14 shrink-0 items-center justify-center rounded-lg sm:w-20",
			ACCENTS[seat].tintBg
		)}
	>
		<span
			class={cn(
				"text-lg font-semibold tabular-nums",
				low ? "text-destructive" : players[seat].accent
			)}
			aria-label={`${players[seat].label}'s clock: ${formatClock(ms)} remaining`}
		>
			{formatClock(ms)}
		</span>
	</div>
{/snippet}

{#snippet turnIndicator(player: 0 | 1, word: string, pulse: boolean, color?: string)}
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

<div
	class={cn("mx-auto flex w-fit items-start justify-center gap-8", className)}
	style:--board-size={size}
>
	<div class="flex flex-col items-center gap-6">
		{#if status}
			<div class="flex items-center gap-1.5 sm:gap-2">
				{@render emojiBox(0)}

				<div
					class="grid h-12 w-(--board-size) grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-lg border bg-muted/40 px-2.5 text-sm backdrop-blur-sm sm:px-4"
				>
					<div class="flex items-center gap-2">
						<span class={cn("font-semibold", players[0].accent)}>{players[0].label}</span>
						{#if players[0].score !== undefined}
							<span class="tabular-nums text-muted-foreground">{players[0].score}</span>
						{/if}
					</div>

					<div class="flex items-center gap-1.5">
						{#if status.type === "winner"}
							{@const winColor = (seat: 0 | 1) =>
								seat === status.player ? "text-emerald-500" : "text-destructive"}
							{@render turnIndicator(0, status.player === 0 ? "Win" : "Loss", false, winColor(0))}
							<span class="text-muted-foreground">·</span>
							{@render turnIndicator(1, status.player === 1 ? "Win" : "Loss", false, winColor(1))}
						{:else if status.type === "draw"}
							<span
								class="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase"
							>
								Draw
							</span>
						{:else if status.type === "waiting"}
							{#if !status.closed}
								<span
									class="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase"
								>
									Waiting
								</span>
							{/if}
						{:else}
							{@render turnIndicator(status.player, "Turn", true, players[status.player].accent)}
						{/if}
					</div>

					<div class="flex items-center justify-end gap-2">
						{#if players[1].score !== undefined}
							<span class="tabular-nums text-muted-foreground">{players[1].score}</span>
						{/if}
						<span class={cn("font-semibold", players[1].accent)}>{players[1].label}</span>
					</div>
				</div>

				{@render emojiBox(1)}
			</div>
		{/if}

		<div class="aspect-square w-(--board-size)">
			{@render children()}
		</div>

		{#if footer}
			{@const prevDisabled = footer.round <= 1}
			{@const nextDisabled = footer.round >= footer.latestRound}
			{@const roundOver = status?.type === "winner" || status?.type === "draw"}
			{@const isSpectator = myIndex === null}
			<div class="flex w-(--board-size) flex-col items-center gap-3">
				<div class="flex w-(--board-size) items-center justify-between">
					{#if clock}
						{@render clockBox(0)}
					{/if}

					<div class="flex items-center gap-1.5 sm:gap-2">
						<span class={cn(prevDisabled && "cursor-not-allowed")}>
							<Button
								variant="outline"
								size="icon-sm"
								aria-label="Previous round"
								disabled={prevDisabled}
								onclick={() => footer.onGoToRound(footer.round - 1)}
							>
								<ChevronLeft />
							</Button>
						</span>

						<span class={cn(footer.isLive && isSpectator && "cursor-not-allowed")}>
							{#if !footer.isLive}
								<Button
									variant="outline"
									size="sm"
									class="px-3 uppercase sm:w-32"
									onclick={footer.onGoLive}
								>
									Go live
								</Button>
							{:else if footer.roomClosed}
								<Button
									variant="outline"
									size="sm"
									class="px-3 uppercase sm:w-32"
									onclick={footer.onPlayAgain}
								>
									Play again
								</Button>
							{:else if footer.waitingForOpponent}
								<Button
									variant="outline"
									size="sm"
									class="px-3 uppercase sm:w-32"
									onclick={footer.onAbandon}
									disabled={isSpectator}
								>
									Abandon
								</Button>
							{:else if !roundOver}
								<Dropdown>
									<DropdownTrigger
										variant="outline"
										size="sm"
										class="px-3 uppercase sm:w-32"
										disabled={isSpectator}
									>
										Resign
									</DropdownTrigger>
									<DropdownContent side="bottom" sideOffset={8} class="w-24 sm:w-32">
										<DropdownItem onSelect={footer.onResign}>Resign</DropdownItem>
										<DropdownSeparator />
										<DropdownItem variant="destructive" onSelect={footer.onAbandon}>
											Abandon
										</DropdownItem>
									</DropdownContent>
								</Dropdown>
							{:else}
								<Dropdown>
									<DropdownTrigger
										variant="outline"
										size="sm"
										class="px-3 uppercase sm:w-32"
										disabled={isSpectator}
									>
										Rematch
									</DropdownTrigger>
									<DropdownContent side="bottom" sideOffset={8} class="w-24 sm:w-32">
										<DropdownItem onSelect={footer.onRematch}>Rematch</DropdownItem>
										<DropdownSeparator />
										<DropdownItem variant="destructive" onSelect={footer.onAbandon}>
											Abandon
										</DropdownItem>
									</DropdownContent>
								</Dropdown>
							{/if}
						</span>

						<span class={cn(nextDisabled && "cursor-not-allowed")}>
							<Button
								variant="outline"
								size="icon-sm"
								aria-label="Next round"
								disabled={nextDisabled}
								onclick={() => footer.onGoToRound(footer.round + 1)}
							>
								<ChevronRight />
							</Button>
						</span>
					</div>

					{#if clock}
						{@render clockBox(1)}
					{/if}
				</div>

				<p class="text-xs tabular-nums text-muted-foreground">
					Round {footer.round} of {footer.latestRound}
				</p>

				{#if footer.error}
					<p class="text-sm text-destructive" transition:fade>{footer.error}</p>
				{/if}
			</div>
		{/if}
	</div>
</div>
