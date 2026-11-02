<script lang="ts" module>
	/** Width: the room page's `px-3`. Height: the `sm:h-16` header (4rem), the page's `py-4` (2rem),
	 *  two `h-14` strips (7rem), the controls row `h-8`, round line `h-4`, and error slot `h-5`
	 *  (4.25rem), and five `gap-2` gaps (2.5rem): 19.75rem. At 360x640 that's min(336px, 324px), so
	 *  the board is 324px. `BoardPlaceholder` shares it so loading takes the same box. */
	export const BOARD_SIZE = "min(calc(100vw - 1.5rem), calc(100dvh - 19.75rem), 34rem)";

	export type BoardPlayer = {
		/** Name shown in the player's strip. */
		label: string;
		/** Lowercase hex codepoint for the strip's emoji, e.g. "1f600". */
		emoji: string;
		/** Tailwind text-color class for the player's clock, e.g. "text-seat-0". */
		accent?: string;
		/** Match score shown in the strip's status line. Omit to hide. */
		score?: number;
		/** Seat mark after the name, e.g. "X". Read by screen readers when `markIcon` draws it.
		 *  Without a mark or `markIcon`, a decorative disc. */
		mark?: string;
	};

	/** Fixed set of emoji choices offered by the viewer's emoji picker. */
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

	/** Whose turn it is, or how the game ended. `"waiting"` covers the room being short a seat, and
	 *  the mood background treats it like `"draw"`. `closed` covers a room abandoned while still
	 *  waiting: the empty seat's line goes blank instead of reading "Waiting". */
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
	import { ringSeat, stripLine, stripSeats, type StripLine } from "./strips.js";

	let {
		players,
		status,
		footer,
		clock,
		size = BOARD_SIZE,
		class: className,
		myIndex = null,
		opponentDisconnected = false,
		onTrashtalk,
		markIcon,
		children
	}: {
		/** The two players, shown in the strips above and below the board. */
		players: [BoardPlayer, BoardPlayer];
		/** Whose turn it is, or how the game ended. Omit for score lines and no turn ring. */
		status?: BoardStatus;
		/** Reset/invite actions and any error message. Omit to hide the action bar. */
		footer?: BoardFooter;
		/** Per-seat clock display. Omit to hide the clocks entirely. */
		clock?: BoardClock;
		/** Fixed side length of the square board area (any CSS length). */
		size?: string;
		class?: string;
		/** Which seat the viewer occupies: that strip sits below the board and its emoji becomes
		 *  clickable. Null/omitted (e.g. spectating) keeps both emoji purely decorative. */
		myIndex?: 0 | 1 | null;
		/** True while the opponent's seat has gone quiet — shows a small indicator on their emoji. */
		opponentDisconnected?: boolean;
		/** Called with the chosen codepoint when the viewer picks a new emoji for their own seat. */
		onTrashtalk?: (emoji: string) => void;
		/** Draws a seat's mark in the strip, in `currentColor` at `size-full` of a `size-3.5` box.
		 *  Decorative; that player's `mark`, if any, is its spoken label. */
		markIcon?: Snippet<[seat: 0 | 1]>;
		/** The game itself. Fills the square board area — use `size-full`. */
		children: Snippet;
	} = $props();

	/** Clock digits turn destructive-colored at or below this remaining time. */
	const LOW_TIME_MS = 10_000;

	/** Every variant renders stacked in one cell so the line keeps its box when the status changes. */
	const STRIP_LINES: StripLine[] = [
		"your-turn",
		"to-move",
		"waiting",
		"won",
		"lost",
		"draw",
		"score",
		"blank"
	];

	const mood = getMood();

	const seats = $derived(stripSeats(myIndex));
	const ringed = $derived(status ? ringSeat(status) : null);

	let pickerOpen = $state(false);

	function emojiLabel(codepoint: string): string {
		return EMOJI_OPTIONS.find((option) => option.codepoint === codepoint)?.label ?? "Player emoji";
	}

	function selectEmoji(codepoint: string) {
		onTrashtalk?.(codepoint);
		pickerOpen = false;
	}

	/** The status as screen readers hear it; the strip lines are hidden from them. */
	function statusText(status: BoardStatus): string {
		switch (status.type) {
			case "turn":
				return status.player === myIndex ? "Your turn" : `${players[status.player].label}'s turn`;
			case "winner":
				return `${status.player === myIndex ? "You" : players[status.player].label} won`;
			case "draw":
				return "Draw";
			case "waiting":
				return status.closed ? "" : "Waiting for an opponent";
		}
	}

	function lineText(line: StripLine, seat: 0 | 1): string {
		switch (line) {
			case "your-turn":
				return "Your turn";
			case "to-move":
				return "To move";
			case "waiting":
				return "Waiting";
			case "won":
				return "Won";
			case "lost":
				return "Lost";
			case "draw":
				return "Draw";
			case "score":
				return players[seat].score === undefined ? "" : `Score ${players[seat].score}`;
			case "blank":
				return "";
		}
	}

	function lineColor(line: StripLine, seat: 0 | 1): string {
		switch (line) {
			case "your-turn":
			case "to-move":
				return cn("font-semibold", ACCENTS[seat].text);
			case "won":
				return "font-semibold text-emerald-500";
			case "lost":
				return "text-destructive";
			default:
				return "text-muted-foreground";
		}
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
			class="focus-visible:border-ring focus-visible:ring-ring/50 flex size-full items-center justify-center rounded-md outline-none transition-opacity focus-visible:ring-3 hover:opacity-80"
		>
			<Emoji
				codepoint={players[seat].emoji}
				label={emojiLabel(players[seat].emoji)}
				class="size-6"
			/>
		</PopoverTrigger>
		<PopoverContent side="top" sideOffset={8} align="start">
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
		class="relative flex size-10 shrink-0 items-center justify-center rounded-md border bg-background/40"
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
				role="img"
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
			"flex h-10 w-16 shrink-0 items-center justify-center rounded-md sm:w-20",
			ACCENTS[seat].tintBg
		)}
	>
		<span
			class={cn(
				"font-mono text-base font-semibold tabular-nums sm:text-lg",
				low ? "text-destructive" : players[seat].accent
			)}
			aria-hidden="true"
		>
			{formatClock(ms)}
		</span>
		<span class="sr-only">{players[seat].label}'s clock: {formatClock(ms)} remaining</span>
	</div>
{/snippet}

<!-- The ring is a box-shadow, so passing the turn never changes the strip's box. -->
{#snippet playerStrip(seat: 0 | 1)}
	{@const line = status ? stripLine(status, seat, myIndex) : "score"}
	<div
		data-slot="strip"
		data-seat={seat}
		class={cn(
			"flex h-14 w-(--board-size) items-center gap-2 rounded-lg border bg-muted/40 px-2 text-left whitespace-nowrap ring-2 backdrop-blur-sm",
			ringed === seat ? ACCENTS[seat].ring : "ring-transparent"
		)}
	>
		{@render emojiBox(seat)}

		<div class="flex min-w-0 flex-1 flex-col gap-0.5">
			<div class="flex min-w-0 items-center gap-1.5 text-sm font-semibold">
				<span class="min-w-0 truncate">{players[seat].label}</span>
				<span
					data-slot="mark"
					class={cn(
						"flex size-3.5 shrink-0 items-center justify-center leading-none",
						ACCENTS[seat].text
					)}
				>
					{#if markIcon}
						<span aria-hidden="true" class="contents">{@render markIcon(seat)}</span>
						{#if players[seat].mark}
							<span class="sr-only">{players[seat].mark}</span>
						{/if}
					{:else if players[seat].mark}
						{players[seat].mark}
					{:else}
						<span aria-hidden="true">●</span>
					{/if}
				</span>
				{#if myIndex === seat}
					<span
						class="shrink-0 rounded-sm border px-1 text-caption tracking-widest text-muted-foreground uppercase"
					>
						You
					</span>
				{/if}
			</div>

			<div data-slot="strip-line" class="grid text-xs" aria-hidden="true">
				{#each STRIP_LINES as variant (variant)}
					<span
						class={cn(
							"col-start-1 row-start-1 flex min-w-0 items-center gap-1.5",
							lineColor(variant, seat),
							variant !== line && "invisible"
						)}
					>
						{#if variant === "your-turn" || variant === "to-move"}
							<span
								class={cn(
									"size-1.5 shrink-0 rounded-full motion-safe:animate-pulse",
									ACCENTS[seat].bg
								)}
							></span>
						{/if}
						<span class="truncate">{lineText(variant, seat)}</span>
					</span>
				{/each}
			</div>
		</div>

		{#if clock}
			{@render clockBox(seat)}
		{/if}
	</div>
{/snippet}

<div
	class={cn("mx-auto flex w-fit flex-col items-center gap-2", className)}
	style:--board-size={size}
>
	{@render playerStrip(seats.top)}

	<div class="aspect-square w-(--board-size)">
		{@render children()}
	</div>

	{@render playerStrip(seats.bottom)}

	<span role="status" class="sr-only">{status ? statusText(status) : ""}</span>

	{#if footer}
		{@const prevDisabled = footer.round <= 1}
		{@const nextDisabled = footer.round >= footer.latestRound}
		{@const roundOver = status?.type === "winner" || status?.type === "draw"}
		{@const isSpectator = myIndex === null}
		<div class="flex w-(--board-size) flex-col items-center gap-2">
			<div data-slot="controls" class="flex h-8 items-center gap-1.5 sm:gap-2">
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
						<Button variant="outline" size="sm" class="w-28 px-3 sm:w-32" onclick={footer.onGoLive}>
							Go live
						</Button>
					{:else if footer.roomClosed}
						<Button
							variant="outline"
							size="sm"
							class="w-28 px-3 sm:w-32"
							onclick={footer.onPlayAgain}
						>
							Play again
						</Button>
					{:else if footer.waitingForOpponent}
						<Button
							variant="outline"
							size="sm"
							class="w-28 px-3 sm:w-32"
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
								class="w-28 px-3 sm:w-32"
								disabled={isSpectator}
							>
								Resign
							</DropdownTrigger>
							<DropdownContent side="bottom" sideOffset={8} class="w-28 sm:w-32">
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
								class="w-28 px-3 sm:w-32"
								disabled={isSpectator}
							>
								Rematch
							</DropdownTrigger>
							<DropdownContent side="bottom" sideOffset={8} class="w-28 sm:w-32">
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

			<p class="h-4 text-xs tabular-nums text-muted-foreground">
				Round {footer.round} of {footer.latestRound}
			</p>

			<p
				role="alert"
				class={cn(
					"h-5 w-full truncate text-sm text-destructive transition-opacity",
					footer.error ? "opacity-100" : "opacity-0"
				)}
			>
				{footer.error}
			</p>
		</div>
	{/if}
</div>
