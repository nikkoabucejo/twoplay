<script lang="ts">
	import { Check, Link, RotateCcw, Trophy } from "@lucide/svelte";
	import { useMutation } from "convex-svelte";
	import { backOut } from "svelte/easing";
	import { fade } from "svelte/transition";
	import { goto } from "$app/navigation";
	import { Board } from "$lib/components/layout";
	import { Button, Spinner } from "$lib/components/ui";
	import { CursorLayer } from "$lib/features/presence";
	import { getClerkAuth } from "$lib/services/auth";
	import { cn } from "$lib/utils/style";
	import { api } from "../../../../../convex/_generated/api.js";
	import { CheckersRoom } from "./game.svelte.js";
	import type { Piece } from "./types.js";

	const PIECE_DURATION = 220;

	/** A gooey pop-in, matching the tic-tac-toe mark: an overshooting scale-up so a piece feels dropped onto the board. */
	function liquidIn(
		_node: Element,
		{ duration = PIECE_DURATION, delay = 0 }: { duration?: number; delay?: number } = {}
	) {
		return {
			delay,
			duration,
			css: (t: number) => {
				const scale = backOut(t) * 0.4 + 0.6;
				return `transform: scale(${scale}); opacity: ${Math.min(t * 2.5, 1)};`;
			}
		};
	}

	let { roomCode, class: className }: { roomCode: string; class?: string } = $props();

	const auth = getClerkAuth();
	const joinRoom = useMutation(api.rooms.join);
	const room = new CheckersRoom(() => roomCode);
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
		navigator.clipboard.writeText(`${location.origin}/checkers/${roomCode}`);
		copied = true;
		clearTimeout(copiedTimeout);
		copiedTimeout = setTimeout(() => (copied = false), 1500);
	}

	const destinations = $derived(
		room.effectiveSelected !== null ? room.movesFrom(room.effectiveSelected).map((m) => m.to) : []
	);
	const forcedMovers = $derived(
		room.effectiveSelected === null
			? new Set(room.legalMoves.map((move) => move.from))
			: new Set<number>()
	);
</script>

{#snippet piece(p: Piece, isSelected: boolean)}
	<div
		class={cn(
			"relative flex h-4/5 w-4/5 items-center justify-center rounded-full shadow-md ring-2 ring-inset ring-white/30 transition-transform",
			p.color === "cyan" ? "bg-cyan-500" : "bg-pink-500",
			isSelected && "scale-90 ring-4 ring-offset-2 ring-offset-background"
		)}
		in:liquidIn
		out:fade={{ duration: 150 }}
	>
		{#if p.king}
			<svg viewBox="0 0 24 24" class="h-2/5 w-2/5 text-background/90" fill="currentColor">
				<path d="M3 8 L7 12 L12 5 L17 12 L21 8 L19 18 H5 Z" />
			</svg>
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
			<Button variant="outline" href="/checkers">Back to lobby</Button>
		</div>
	{:else if room.wrongGameType}
		<Spinner size="lg" />
	{:else if joinError}
		<div class="flex flex-col items-center gap-3">
			<p class="text-muted-foreground">{joinError}</p>
			<Button variant="outline" href="/checkers">Back to lobby</Button>
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
					{ label: room.playerCyan?.name ?? "Player 1", accent: "text-cyan-500" },
					{ label: room.playerPink?.name ?? "Player 2", accent: "text-pink-500" }
				]}
			>
				<div class="grid size-full grid-cols-8 grid-rows-8 overflow-hidden rounded-xl border">
					{#each { length: 64 } as _, index (index)}
						{@const row = Math.floor(index / 8)}
						{@const col = index % 8}
						{@const dark = (row + col) % 2 === 1}
						{@const cell = room.board[index]}
						{@const isDestination = destinations.includes(index)}
						{@const isSelected = room.effectiveSelected === index}
						{@const isForcedMover = dark && cell?.color === room.turn && forcedMovers.has(index)}
						<button
							type="button"
							class={cn(
								"relative flex items-center justify-center",
								dark
									? "bg-foreground/10 hover:bg-foreground/15 dark:bg-foreground/15"
									: "bg-background",
								!dark && "cursor-default"
							)}
							disabled={!dark}
							aria-label={cell
								? `Row ${row + 1}, column ${col + 1}, ${cell.color}${cell.king ? " king" : ""}`
								: `Row ${row + 1}, column ${col + 1}, empty`}
							onclick={() => room.select(index)}
						>
							{#if isForcedMover}
								<div
									class="absolute inset-[12%] rounded-full ring-2 ring-amber-400/70"
									out:fade
								></div>
							{/if}
							{#if isDestination}
								<span
									class="absolute size-1/4 rounded-full bg-emerald-400/70"
									in:fade={{ duration: 150 }}
								></span>
							{/if}
							{#if cell}
								{@render piece(cell, isSelected)}
							{/if}
						</button>
					{/each}
				</div>

				{#snippet header()}
					<div class="flex items-center gap-2">
						<span class="size-2.5 rounded-full bg-cyan-500"></span>
						<span class="font-semibold text-cyan-500">{room.playerCyan?.name ?? "Player 1"}</span>
						<span class="tabular-nums text-muted-foreground">{room.scoreCyan}</span>
					</div>

					<div class="flex items-center gap-1.5">
						{#if room.winner}
							{@const winnerColor = room.winner === "cyan" ? "text-cyan-500" : "text-pink-500"}
							<Trophy class={cn("size-4", winnerColor)} />
							<span class={cn("font-semibold", winnerColor)}>
								{room.winner === "cyan" ? "Cyan" : "Pink"} wins
							</span>
						{:else}
							<span
								class={cn(
									"animate-pulse text-base leading-none",
									room.turn === "cyan" ? "text-cyan-500" : "text-pink-500"
								)}
							>
								{room.turn === "cyan" ? "◀" : "▶"}
							</span>
						{/if}
					</div>

					<div class="flex items-center gap-2">
						<span class="tabular-nums text-muted-foreground">{room.scorePink}</span>
						<span class="font-semibold text-pink-500">{room.playerPink?.name ?? "Player 2"}</span>
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
