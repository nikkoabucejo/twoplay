<script lang="ts" module>
	import type { Component } from "svelte";
	import type { GameType } from "../../../../../convex/models/games/index.js";

	/** Width: the room page's `px-3`. Height: the page chrome around the board, `--board-chrome`
	 *  (`BOARD_CHROME`). `BoardPlaceholder` shares both so loading takes the same box. */
	export const BOARD_SIZE =
		"min(calc(100vw - 1.5rem), calc(100dvh - var(--board-chrome, 20.75rem)), 34rem)";

	/** Below `lg`: the `sm:h-16` header (4rem), the page's `py-4` (2rem), the room bar `h-8` (2rem),
	 *  two `h-14` strips (7rem), the controls row `h-8` and notice line `h-5` (3.25rem), and five
	 *  `gap-2` gaps (2.5rem): 20.75rem, so at 360x640 the board is min(336px, 308px) = 308px.
	 *  From `lg` the room bar and controls move into the side panel, leaving the header, `py-4`, two
	 *  strips, and two gaps: 14rem, so at 1280x800 the board reaches its 34rem cap. */
	export const BOARD_CHROME = "[--board-chrome:20.75rem] lg:[--board-chrome:14rem]";

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
		/** Forfeits the round in progress in favor of the opponent, after a confirmation. Only called
		 *  while `isLive`, the round is still running, and `!roomClosed`. */
		onResign: () => void;
		/** Starts the room's next round in one click. Only called while `isLive` and the round is over. */
		onRematch: () => void;
		/** Abandons the room entirely, forfeiting the match and closing the room for good, after a
		 *  confirmation. Distinct from `onResign`, which only ends the current round. Only called
		 *  while `!roomClosed`. */
		onAbandon: () => void;
		/** Leaves this closed room for a fresh one. Replaces Resign/Rematch once `roomClosed`. */
		onPlayAgain: () => void;
		/** Leaves this room for a new opponent. Offered on the result card. */
		onNewOpponent: () => void;
		/** Opens the lobby without leaving the room. Offered on the result card. */
		onLobby: () => void;
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

	/** What room this is. The game passes its own name and icon. */
	export type BoardRoom = {
		type: GameType;
		name: string;
		code: string;
		icon: Component<{ class?: string }>;
	};

	/** This browser's position in the shown round's moves. Local only. */
	export type BoardReplay = {
		isViewingHistory: boolean;
		/** 1-based move shown, and the round's move count, for the "Move N of M" readout. */
		moveNumber: number;
		moveCount: number;
		canStepBack: boolean;
		canStepForward: boolean;
		onFirst: () => void;
		onBack: () => void;
		onForward: () => void;
		onLive: () => void;
	};

	/** One of the viewer's rounds in this room, for the side panel's list. */
	export type BoardRound = {
		round: number;
		result: "win" | "loss" | "draw" | "playing";
		/** The viewer's settled rating change, or null until it's known. */
		mmr: number | null;
	};
</script>

<script lang="ts">
	import { Emoji, getToaster, Popover, PopoverContent, PopoverTrigger } from "$lib/components/ui";
	import { ACCENTS, cn } from "$lib/utils/style";
	import { untrack, type Snippet } from "svelte";
	import { getMood } from "$lib/features/presence";
	import Controls from "./controls.svelte";
	import InviteCard from "./invite-card.svelte";
	import { copyRoomLink, roomUrl, shareRoom } from "./invite.js";
	import { resultView } from "./outcome.js";
	import ResultCard from "./result-card.svelte";
	import RoomBar from "./room-bar.svelte";
	import SidePanel from "./side-panel.svelte";
	import { stripLine, stripSeats, type StripLine } from "./strips.js";

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
		rejectionId = null,
		room,
		replay,
		rounds = [],
		rules,
		mustCapture = false,
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
		/** True while the opponent's seat has gone quiet: their strip reads "Reconnecting…" and dims. */
		opponentDisconnected?: boolean;
		/** Called with the chosen codepoint when the viewer picks a new emoji for their own seat. */
		onTrashtalk?: (emoji: string) => void;
		/** Draws a seat's mark in the strip, in `currentColor` at `size-full` of a `size-3.5` box.
		 *  Decorative; that player's `mark`, if any, is its spoken label. */
		markIcon?: Snippet<[seat: 0 | 1]>;
		/** Changes to a new value each time the viewer's move is rejected, which shakes the board. */
		rejectionId?: number | null;
		/** The room's name, code, and links. Adds the room bar and, at `lg`, the side panel. */
		room?: BoardRoom;
		/** Move-by-move replay of the shown round. Adds the replay buttons and the move readout. */
		replay?: BoardReplay;
		/** The viewer's rounds in this room, newest first, for the side panel. */
		rounds?: BoardRound[];
		/** The game's rules, shown in a popover from the room bar and the side panel. */
		rules?: Snippet;
		/** Every legal move on the viewer's live turn is a capture. */
		mustCapture?: boolean;
		/** The game itself. Fills the square board area — use `size-full`. */
		children: Snippet;
	} = $props();

	const SHAKE_KEYFRAMES: Keyframe[] = [
		{ transform: "translateX(0)" },
		{ transform: "translateX(-6px)" },
		{ transform: "translateX(6px)" },
		{ transform: "translateX(-4px)" },
		{ transform: "translateX(4px)" },
		{ transform: "translateX(0)" }
	];

	/** Clock digits turn destructive-colored at or below this remaining time. */
	const LOW_TIME_MS = 10_000;

	/** Every variant renders stacked in one cell so the line keeps its box when the status changes. */
	const STRIP_LINES: StripLine[] = [
		"reconnecting",
		"must-capture",
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
	const toaster = getToaster();

	const seats = $derived(stripSeats(myIndex));

	const result = $derived(
		footer &&
			resultView({
				status,
				myIndex,
				players: [
					{ name: players[0].label, score: players[0].score ?? 0 },
					{ name: players[1].label, score: players[1].score ?? 0 }
				],
				isLive: footer.isLive,
				isViewingHistory: replay?.isViewingHistory ?? false,
				isRoomClosed: footer.roomClosed ?? false,
				mmr: rounds.find((row) => row.round === footer.round)?.mmr ?? null
			})
	);
	/** The round whose result card the viewer hid with "View board" or Escape. */
	let dismissedRound = $state<number | null>(null);
	const isResultShown = $derived(!!result && dismissedRound !== footer?.round);
	/** From `lg` the side panel holds the round controls, so the column is just strips and board. */
	const hasSidePanel = $derived(!!room && !!footer);
	/** The seated viewer's opponent while their seat has gone quiet, else null. */
	const disconnectedSeat = $derived<0 | 1 | null>(
		myIndex !== null && opponentDisconnected ? (myIndex === 0 ? 1 : 0) : null
	);
	const isInviteShown = $derived(
		!!footer?.isLive && status?.type === "waiting" && !status.closed && !footer.roomClosed
	);
	/** Only the seated host's invite card has Copy link. */
	const isCopyLinkHidden = $derived(!isResultShown && isInviteShown && myIndex !== null);

	let pickerOpen = $state(false);
	/** Each seat's strip, by seat. The picker opens over the viewer's own. */
	let strips = $state<HTMLDivElement[]>([]);
	let boardArea = $state<HTMLDivElement>();

	function dismissResult() {
		dismissedRound = footer?.round ?? null;
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === "Escape" && isResultShown) dismissResult();
	}

	function copyLink() {
		if (!room) return;
		const url = roomUrl(location.origin, room.type, room.code);
		void copyRoomLink(url, { clipboard: navigator.clipboard, toaster });
	}

	function share() {
		if (!room) return;
		const url = roomUrl(location.origin, room.type, room.code);
		void shareRoom(url, { share: (data) => navigator.share(data), toaster });
	}

	function emojiLabel(codepoint: string): string {
		return EMOJI_OPTIONS.find((option) => option.codepoint === codepoint)?.label ?? "Player emoji";
	}

	function selectEmoji(codepoint: string) {
		onTrashtalk?.(codepoint);
		pickerOpen = false;
	}

	/** Left and Right step through the picker's emoji, wrapping at the ends. */
	function moveFocus(event: KeyboardEvent & { currentTarget: HTMLDivElement }) {
		const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
		if (step === 0) return;
		const options = [...event.currentTarget.querySelectorAll("button")];
		const current = options.indexOf(document.activeElement as HTMLButtonElement);
		options.at((current + step) % options.length)?.focus();
		event.preventDefault();
	}

	/** The status as screen readers hear it; the strip lines are hidden from them. */
	function statusText(status: BoardStatus): string {
		switch (status.type) {
			case "turn":
				if (status.player !== myIndex) return `${players[status.player].label}'s turn`;
				return mustCapture ? "Your turn. You must capture." : "Your turn";
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
			case "reconnecting":
				return "Reconnecting…";
			case "must-capture":
				return "You must capture";
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
			case "reconnecting":
				return "text-amber-500";
			case "must-capture":
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

	/** The last rejection this board shook for, seeded with the one it mounted with. */
	let shakenRejectionId = untrack(() => rejectionId);

	$effect(() => {
		if (rejectionId === null || rejectionId === shakenRejectionId) return;
		shakenRejectionId = rejectionId;
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
		boardArea?.animate(SHAKE_KEYFRAMES, { duration: 300, easing: "ease-out" });
	});

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
		<!-- Covers the viewer's own strip exactly: anchored to it, pulled up by its height, and sized to
		     its box. It never flips, so it can't land anywhere else. -->
		<PopoverContent
			customAnchor={strips[seat]}
			side="bottom"
			sideOffset={-(strips[seat]?.offsetHeight ?? 0)}
			align="start"
			avoidCollisions={false}
			class="flex h-(--bits-popover-anchor-height) w-(--bits-popover-anchor-width) items-center rounded-lg p-2"
			onkeydown={moveFocus}
		>
			<div
				role="group"
				aria-label="Trash talk"
				class="grid flex-1 grid-cols-10 items-center justify-items-center gap-1"
			>
				{#each EMOJI_OPTIONS as option (option.codepoint)}
					<button
						type="button"
						aria-label={option.label}
						class="hover-ring focus-visible:ring-ring/50 flex aspect-square w-full max-w-9 items-center justify-center rounded-md outline-none transition-colors hover:bg-muted/60 focus-visible:ring-3"
						onclick={() => selectEmoji(option.codepoint)}
					>
						<Emoji codepoint={option.codepoint} label={option.label} class="size-6" />
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

{#snippet playerStrip(seat: 0 | 1)}
	{@const line = status
		? stripLine(status, seat, myIndex, mustCapture, disconnectedSeat === seat)
		: "score"}
	{@const isQuiet = line === "reconnecting"}
	<div
		bind:this={strips[seat]}
		data-slot="strip"
		data-seat={seat}
		class="flex h-14 w-(--board-size) items-center gap-2 rounded-lg border bg-muted/40 px-2 text-left whitespace-nowrap backdrop-blur-sm"
	>
		<!-- A quiet player's strip dims, except its status line. Opacity only, so no box changes. -->
		<div class={cn("transition-opacity motion-reduce:transition-none", isQuiet && "opacity-50")}>
			{@render emojiBox(seat)}
		</div>

		<div class="flex min-w-0 flex-1 flex-col gap-0.5">
			<div
				class={cn(
					"flex min-w-0 items-center gap-1.5 text-sm font-semibold transition-opacity motion-reduce:transition-none",
					isQuiet && "opacity-50"
				)}
			>
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
						{#if variant === "reconnecting"}
							<span class="size-1.5 shrink-0 rounded-full bg-amber-500 motion-safe:animate-pulse"
							></span>
						{:else if variant === "must-capture" || variant === "your-turn" || variant === "to-move"}
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
			<div class={cn("transition-opacity motion-reduce:transition-none", isQuiet && "opacity-50")}>
				{@render clockBox(seat)}
			</div>
		{/if}
	</div>
{/snippet}

<svelte:window onkeydown={handleKeydown} />

<div
	data-loaded="board"
	class={cn(
		"mx-auto flex w-fit items-stretch gap-4",
		hasSidePanel ? BOARD_CHROME : "[--board-chrome:20.75rem]",
		className
	)}
	style:--board-size={size}
>
	<div class="flex flex-col items-center gap-2">
		{#if room && footer}
			<RoomBar {room} {footer} {rules} {isCopyLinkHidden} onCopyLink={copyLink} />
		{/if}

		{@render playerStrip(seats.top)}

		<div bind:this={boardArea} class="relative aspect-square w-(--board-size)">
			<p class="sr-only">Arrow keys move on the board. [ and ] step through moves.</p>
			{@render children()}

			{#if result && footer && isResultShown}
				<ResultCard view={result} {footer} {players} {markIcon} onDismiss={dismissResult} />
			{:else if room && isInviteShown}
				<InviteCard
					code={room.code}
					isHost={myIndex !== null}
					onCopyLink={copyLink}
					onShare={share}
				/>
			{/if}
		</div>

		{@render playerStrip(seats.bottom)}

		<span role="status" class="sr-only">{status ? statusText(status) : ""}</span>
		<span role="status" class="sr-only">
			{disconnectedSeat === null ? "" : `${players[disconnectedSeat].label} disconnected`}
		</span>

		{#if footer}
			<Controls
				{footer}
				{replay}
				{status}
				{myIndex}
				isActionHidden={isResultShown}
				class={cn(hasSidePanel && "lg:hidden")}
			/>
		{/if}
	</div>

	{#if room && footer}
		<SidePanel
			{room}
			{footer}
			{replay}
			{status}
			{myIndex}
			{rounds}
			{rules}
			{isCopyLinkHidden}
			isActionHidden={isResultShown}
			onCopyLink={copyLink}
		/>
	{/if}
</div>
