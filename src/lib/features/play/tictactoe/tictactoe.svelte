<script lang="ts">
	import { Check, Link, RotateCcw } from "@lucide/svelte";
	import { useMutation } from "convex-svelte";
	import { backOut } from "svelte/easing";
	import { draw, fade } from "svelte/transition";
	import { goto } from "$app/navigation";
	import { Board } from "$lib/components/layout";
	import { Button, Spinner } from "$lib/components/ui";
	import { CursorLayer } from "$lib/features/presence";
	import { getClerkAuth } from "$lib/services/auth";
	import { cn } from "$lib/utils/style";
	import { api } from "../../../../../convex/_generated/api.js";
	import { abilities } from "./abilities.js";
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

	let { roomCode, class: className }: { roomCode: string; class?: string } = $props();

	const auth = getClerkAuth();
	const joinRoom = useMutation(api.rooms.join);
	const room = new TictactoeRoom(() => roomCode);
	const data = $derived(room.data);

	let joinError = $state<string | null>(null);
	let copied = $state(false);
	let copiedTimeout: ReturnType<typeof setTimeout> | undefined;

	$effect(() => {
		const code = roomCode;
		if (!auth.isSignedIn) return;

		joinError = null;
		joinRoom({ code }).catch((err) => {
			joinError = err instanceof Error ? err.message : "Could not join this room";
		});
	});

	$effect(() => {
		if (room.wrongGameType && data) goto(`/${data.gameType}/${roomCode}`, { replaceState: true });
	});

	function copyInviteLink() {
		navigator.clipboard.writeText(`${location.origin}/tictactoe/${roomCode}`);
		copied = true;
		clearTimeout(copiedTimeout);
		copiedTimeout = setTimeout(() => (copied = false), 1500);
	}
</script>

{#snippet mark(value: "X" | "O", size: string = "h-3/5 w-3/5")}
	<svg viewBox="0 0 24 24" class={size} in:liquidIn>
		{#if value === "X"}
			<line x1="7" y1="7" x2="17" y2="17" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" />
			<line x1="17" y1="7" x2="7" y2="17" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" />
		{:else}
			<circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" />
		{/if}
	</svg>
{/snippet}

{#snippet miniBoard(cells: CellBoard, boardIndex: number)}
	{@const status = room.statuses[boardIndex]}
	{@const forbidden = room.isForbidden(boardIndex)}
	<div class="relative h-full w-full">
		<div
			class={cn(
				"grid h-full w-full grid-cols-3 grid-rows-3 gap-1.5 rounded-xl bg-muted/50 p-1.5 backdrop-blur-2xl backdrop-saturate-150 transition-colors dark:bg-muted/40",
				forbidden && "grayscale"
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
						cell === "X" && "text-cyan-500",
						cell === "O" && "text-pink-500"
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
						status.winner === "X" ? "text-cyan-500" : "text-pink-500"
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
					status.winner === "X" ? "bg-cyan-500/25 text-cyan-500" : "bg-pink-500/25 text-pink-500"
				)}
				in:fade={{ duration: MARK_DURATION }}
			>
				{@render mark(status.winner, "h-2/3 w-2/3")}
			</div>
		{/if}
	</div>
{/snippet}

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
		<CursorLayer
			{roomCode}
			class="mx-auto w-fit"
			colorFor={(index) =>
				index === 0 ? "text-cyan-500" : index === 1 ? "text-pink-500" : "text-muted-foreground"}
		>
			<Board
				players={[
					{ label: room.playerX?.name ?? "Player 1", accent: "text-cyan-500", abilities },
					{ label: room.playerO?.name ?? "Player 2", accent: "text-pink-500", abilities }
				]}
			>
				<div class="grid size-full grid-cols-3 grid-rows-3 gap-3">
					{#each room.boards as cells, boardIndex (boardIndex)}
						{@render miniBoard(cells, boardIndex)}
					{/each}
				</div>

				{#snippet header()}
					<div class="flex items-center gap-2">
						<span class="size-2.5 rounded-full bg-cyan-500"></span>
						<span class="font-semibold text-cyan-500">{room.playerX?.name ?? "Player 1"}</span>
						<span class="tabular-nums text-muted-foreground">{room.scoreX}</span>
					</div>

					<div class="flex items-center gap-1.5">
						<span
							class={cn(
								"animate-pulse text-base leading-none",
								room.turn === "X" ? "text-cyan-500" : "text-pink-500"
							)}
						>
							{room.turn === "X" ? "◀" : "▶"}
						</span>
					</div>

					<div class="flex items-center gap-2">
						<span class="tabular-nums text-muted-foreground">{room.scoreO}</span>
						<span class="font-semibold text-pink-500">{room.playerO?.name ?? "Player 2"}</span>
						<span class="size-2.5 rounded-full bg-pink-500"></span>
					</div>
				{/snippet}

				{#snippet footer()}
					<div class="flex w-(--board-size) flex-col items-center gap-3">
						<div class="flex items-center gap-2">
							<Button variant="outline" size="sm" onclick={() => room.reset()}>
								<RotateCcw />
								Reset game
							</Button>
							<Button variant="outline" size="sm" onclick={copyInviteLink}>
								{#if copied}
									<Check />
								{:else}
									<Link />
								{/if}
								Copy invite link
							</Button>
						</div>

						{#if room.error}
							<p class="text-sm text-destructive" transition:fade>{room.error}</p>
						{/if}
					</div>
				{/snippet}
			</Board>
		</CursorLayer>
	{/if}
</div>
