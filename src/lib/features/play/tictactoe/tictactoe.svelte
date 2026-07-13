<script lang="ts">
	import { useMutation } from "convex-svelte";
	import { backOut } from "svelte/easing";
	import { draw, fade } from "svelte/transition";
	import { goto } from "$app/navigation";
	import { Board, type BoardStatus } from "$lib/components/layout";
	import { Button, Spinner } from "$lib/components/ui";
	import { Cursor } from "$lib/features/presence";
	import { getClerkAuth } from "$lib/services/auth";
	import { cn, ACCENTS } from "$lib/utils/style";
	import { api } from "../../../../../convex/_generated/api.js";
	import { DEFAULT_EMOJI } from "../../../../../convex/models/players/index.js";
	import { TictactoeRoom } from "./game.svelte.js";
	import type { Board as CellBoard } from "./types.js";

	const MARK_DURATION = 240;

	/** A gooey pop-in: an overshooting scale-up with a brief squash/stretch wobble, so a mark feels like a droplet settling rather than snapping into place. */
	function liquidIn(
		_node: Element,
		{ duration = MARK_DURATION, delay = 0 }: { duration?: number; delay?: number } = {}
	) {
		return {
			delay,
			duration,
			css: (t: number) => {
				const scale = backOut(t) * 0.4 + 0.6;
				const wobble = Math.sin(t * Math.PI) * (1 - t) * 0.25;
				return `
					transform: scale(${scale + wobble}, ${scale - wobble});
					opacity: ${Math.min(t * 2.5, 1)};
				`;
			}
		};
	}

	let {
		roomCode,
		round,
		class: className
	}: { roomCode: string; round?: number; class?: string } = $props();

	const auth = getClerkAuth();
	const joinRoom = useMutation(api.models.rooms.index.join);
	const room = new TictactoeRoom(
		() => roomCode,
		() => round
	);
	const data = $derived(room.data);

	let joinError = $state<string | null>(null);

	$effect(() => {
		const code = roomCode;
		if (!auth.isSignedIn) return;

		joinError = null;
		joinRoom({ code }).catch((err) => {
			joinError = err instanceof Error ? err.message : "Could not join this room";
		});
	});

	$effect(() => {
		if (room.wrongGameType && data) goto(`/${data.type}/${roomCode}`, { replaceState: true });
	});

	$effect(() => () => room.dispose());

	function goLive() {
		goto(`/tictactoe/${roomCode}`);
	}

	function goToRound(round: number) {
		goto(`/tictactoe/${roomCode}/${round}`);
	}

	function firstName(name: string) {
		return name.split(" ")[0];
	}

	/** Arrow keys scrub this browser's personal view of the current round's move history — local only,
	 *  never touches the real game state or other players' views. */
	function handleKeydown(event: KeyboardEvent) {
		if (!data) return;
		const target = event.target as HTMLElement | null;
		if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;

		switch (event.key) {
			case "ArrowLeft":
				event.preventDefault();
				room.stepBack();
				break;
			case "ArrowRight":
				event.preventDefault();
				room.stepForward();
				break;
			case "ArrowUp":
				event.preventDefault();
				room.jumpToLatest();
				break;
			case "ArrowDown":
				event.preventDefault();
				room.jumpToFirst();
				break;
		}
	}

	const status: BoardStatus = $derived(
		room.game.endedSeat !== null
			? {
					type: "winner",
					player: room.game.endedSeat === 0 ? 1 : 0,
					reason: room.game.endReason ?? undefined
				}
			: room.winner
				? { type: "winner", player: room.winner === "X" ? 0 : 1 }
				: room.isOver
					? { type: "draw" }
					: { type: "turn", player: room.turn === "X" ? 0 : 1 }
	);
</script>

{#snippet mark(value: "X" | "O", size: string = "h-3/5 w-3/5")}
	<svg viewBox="0 0 24 24" class={size} in:liquidIn>
		{#if value === "X"}
			<line
				x1="7"
				y1="7"
				x2="17"
				y2="17"
				stroke="currentColor"
				stroke-width="3.5"
				stroke-linecap="round"
			/>
			<line
				x1="17"
				y1="7"
				x2="7"
				y2="17"
				stroke="currentColor"
				stroke-width="3.5"
				stroke-linecap="round"
			/>
		{:else}
			<circle
				cx="12"
				cy="12"
				r="7"
				fill="none"
				stroke="currentColor"
				stroke-width="3.5"
				stroke-linecap="round"
			/>
		{/if}
	</svg>
{/snippet}

{#snippet miniBoard(cells: CellBoard, boardIndex: number)}
	{@const status = room.statuses[boardIndex]}
	{@const forbidden = room.isForbidden(boardIndex)}
	<div class="relative h-full w-full">
		<div
			class={cn(
				"grid h-full w-full grid-cols-3 grid-rows-3 gap-1.5 rounded-xl bg-muted/50 p-1.5 backdrop-blur-2xl backdrop-saturate-150 transition-[opacity,colors] duration-200 dark:bg-muted/40",
				forbidden && "opacity-40"
			)}
			role="grid"
			aria-label="Tic-tac-toe board"
		>
			{#each cells as cell, cellIndex (cellIndex)}
				<button
					type="button"
					class={cn(
						"flex items-center justify-center rounded-md bg-background/90 shadow-sm backdrop-blur-md transition-colors",
						"hover:bg-background/95 disabled:cursor-not-allowed",
						cell === "X" && ACCENTS[0].text,
						cell === "O" && ACCENTS[1].text
					)}
					disabled={cell !== null || !room.canPlay(boardIndex)}
					aria-label={cell ? `Cell ${cellIndex + 1}, ${cell}` : `Cell ${cellIndex + 1}, empty`}
					onclick={() => room.play(boardIndex, cellIndex)}
				>
					{#if cell}
						{@render mark(cell)}
					{/if}
				</button>
			{/each}
		</div>
		{#if status.status === "won" && status.winner}
			{#if status.winningLine}
				{@const [a, , c] = status.winningLine}
				<svg
					viewBox="0 0 3 3"
					class={cn(
						"pointer-events-none absolute inset-0 h-full w-full",
						status.winner === "X" ? ACCENTS[0].text : ACCENTS[1].text
					)}
				>
					<line
						x1={(a % 3) + 0.5}
						y1={Math.floor(a / 3) + 0.5}
						x2={(c % 3) + 0.5}
						y2={Math.floor(c / 3) + 0.5}
						stroke="currentColor"
						stroke-width="0.12"
						stroke-linecap="round"
						in:draw={{ duration: 300 }}
					/>
				</svg>
			{/if}
			<div
				class={cn(
					"absolute inset-0 flex items-center justify-center rounded-xl backdrop-blur-[3px] transition-colors",
					status.winner === "X"
						? cn(ACCENTS[0].winBg, ACCENTS[0].text)
						: cn(ACCENTS[1].winBg, ACCENTS[1].text)
				)}
				in:fade={{ duration: MARK_DURATION }}
			>
				{@render mark(status.winner, "h-2/3 w-2/3")}
			</div>
		{/if}
	</div>
{/snippet}

<svelte:window onkeydown={handleKeydown} />

<div class={cn("flex flex-col items-center gap-6", className)}>
	{#if !auth.isSignedIn}
		<div class="flex flex-col items-center gap-3">
			<p class="text-muted-foreground">Sign in to create or join a room.</p>
			<Button onclick={() => auth.signIn()}>Sign in</Button>
		</div>
	{:else if room.isLoading}
		<Spinner size="lg" />
	{:else if data === null}
		<div class="flex flex-col items-center gap-3">
			<p class="text-muted-foreground">Room "{roomCode}" doesn't exist.</p>
			<Button variant="outline" href="/tictactoe">Back to lobby</Button>
		</div>
	{:else if room.wrongGameType}
		<Spinner size="lg" />
	{:else if joinError}
		<div class="flex flex-col items-center gap-3">
			<p class="text-muted-foreground">{joinError}</p>
			<Button variant="outline" href="/tictactoe">Back to lobby</Button>
		</div>
	{:else if data}
		<div class="relative">
			{#if room.isViewingHistory}
				<div
					class="pointer-events-none absolute inset-x-0 top-0 z-20 flex -translate-y-[calc(100%+0.5rem)] justify-center"
					transition:fade={{ duration: 150 }}
				>
					<div
						class="pointer-events-auto flex items-center gap-2 rounded-full border bg-background/90 px-3 py-1 text-xs shadow-sm backdrop-blur-sm"
					>
						<span class="tabular-nums text-muted-foreground">
							Move {room.viewedMoveNumber} of {room.historyLength}
						</span>
						<button
							type="button"
							class="font-semibold text-primary hover:underline"
							onclick={() => room.jumpToLatest()}
						>
							Return to live
						</button>
					</div>
				</div>
			{/if}
			<Board
				players={[
					{
						label: room.players[0] ? firstName(room.players[0].name) : "Player 1",
						emoji: room.players[0]?.emoji ?? DEFAULT_EMOJI,
						accent: ACCENTS[0].text,
						score: room.players[0]?.score ?? 0
					},
					{
						label: room.players[1] ? firstName(room.players[1].name) : "Player 2",
						emoji: room.players[1]?.emoji ?? DEFAULT_EMOJI,
						accent: ACCENTS[1].text,
						score: room.players[1]?.score ?? 0
					}
				]}
				{status}
				clock={room.clock}
				myIndex={room.myIndex}
				onTrashtalk={(emoji) => room.trashtalk(emoji)}
				footer={{
					isLive: room.game.isLive,
					round: room.game.round,
					latestRound: room.game.latestRound,
					onResign: () => room.resign(),
					onRematch: () => room.rematch(),
					onGoLive: goLive,
					onGoToRound: goToRound,
					error: room.error
				}}
			>
				<Cursor
					{roomCode}
					class="size-full"
					colorFor={(index) => ACCENTS[index]?.text ?? "text-muted-foreground"}
				>
					<div class="grid size-full grid-cols-3 grid-rows-3 gap-3">
						{#each room.boards as cells, boardIndex (boardIndex)}
							{@render miniBoard(cells, boardIndex)}
						{/each}
					</div>
					{#if room.winningLine}
						{@const [a, , c] = room.winningLine}
						<svg
							viewBox="0 0 3 3"
							class={cn(
								"pointer-events-none absolute inset-0 h-full w-full",
								room.winner === "X" ? ACCENTS[0].text : ACCENTS[1].text
							)}
						>
							<line
								x1={(a % 3) + 0.5}
								y1={Math.floor(a / 3) + 0.5}
								x2={(c % 3) + 0.5}
								y2={Math.floor(c / 3) + 0.5}
								stroke="currentColor"
								stroke-width="0.08"
								stroke-linecap="round"
								in:draw={{ duration: 400 }}
							/>
						</svg>
					{/if}
				</Cursor>
			</Board>
		</div>
	{/if}
</div>
