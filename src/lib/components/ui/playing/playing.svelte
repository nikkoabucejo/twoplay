<script lang="ts" module>
	import type { GameType } from "../../../../../convex/models/games/index.js";

	/** The viewer's one live game — shown on `/lobby` and `/history` only, wherever `rooms.index.active`
	 *  resolves to something. That query already guarantees at most one result, and only ever for a
	 *  room the caller has an unabandoned seat in, so callers just gate on `activeRoom.data` and don't
	 *  need to re-check "is this really my room" here. */
	export type PlayingProps = {
		code: string;
		type: GameType;
		class?: string;
	};
</script>

<script lang="ts">
	import { CheckersRoom, GAMES, TictactoeRoom } from "$lib/features/play";
	import { ACCENTS, cn } from "$lib/utils/style";
	import { DEFAULT_EMOJI } from "../../../../../convex/models/players/index.js";
	import { Button } from "../button/index.js";
	import { Confirm } from "../confirm/index.js";
	import { Emblem } from "../emblem/index.js";
	import { Emoji } from "../emoji/index.js";
	import { abandonMessage } from "./abandon.js";

	let { code, type, class: className }: PlayingProps = $props();

	// A room's game type can't change over its lifetime, so picking the concrete `*Room` subclass once
	// at construction is safe — only the `getCode` closure below needs to stay reactive, same as every
	// `<Tictactoe>`/`<Checkers>` page component.
	// svelte-ignore state_referenced_locally
	const room = type === "tictactoe" ? new TictactoeRoom(() => code) : new CheckersRoom(() => code);

	$effect(() => () => room.dispose());

	const opponent = $derived(room.myIndex === null ? null : room.players[1 - room.myIndex]);
	const confirmMessage = $derived(
		abandonMessage({
			round: room.game.round,
			opponentName: opponent ? firstName(opponent.name) : null,
			isRoundLive: room.activeSeat !== null
		})
	);

	function firstName(name: string) {
		return name.split(" ")[0];
	}

	function formatClock(ms: number): string {
		const totalSeconds = Math.ceil(ms / 1000);
		const minutes = Math.floor(totalSeconds / 60);
		return `${minutes}:${(totalSeconds % 60).toString().padStart(2, "0")}`;
	}
</script>

{#snippet seat(index: 0 | 1)}
	{@const player = room.players[index]}
	{@const ms = room.clock.remaining[index]}
	<div class={cn("flex flex-1 items-center gap-2", index === 1 && "flex-row-reverse text-right")}>
		<Emoji
			codepoint={player?.emoji ?? DEFAULT_EMOJI}
			label={player ? firstName(player.name) : "Waiting for an opponent"}
			class="size-7 shrink-0"
		/>
		<div class={cn("flex flex-col", index === 1 && "items-end")}>
			<span class={cn("text-xs font-semibold", ACCENTS[index].text)}>
				{player ? firstName(player.name) : "----------"}
			</span>
			<span class="font-mono text-sm tabular-nums text-muted-foreground">
				{formatClock(ms)}
			</span>
		</div>
	</div>
{/snippet}

<div
	class={cn(
		"flex w-full flex-col gap-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 backdrop-blur-sm",
		className
	)}
>
	<div class="flex items-center justify-between gap-2">
		<span class="flex items-center gap-1.5 text-xs font-semibold">
			{GAMES[type].name}
			<span class="text-muted-foreground">{code}</span>
		</span>
		<div class="flex items-center">
			<Confirm
				title="Abandon this room?"
				description={confirmMessage}
				confirmLabel="Abandon"
				onConfirm={() => room.abandon()}
				align="end"
			>
				{#snippet trigger({ props })}
					<Button {...props} variant="outline" size="xs" class="text-destructive">Abandon</Button>
				{/snippet}
			</Confirm>
		</div>
	</div>

	<div class="flex items-center justify-between gap-2">
		{@render seat(0)}
		<div class="flex shrink-0 items-center px-1">
			<Emblem
				icon={GAMES[type].icon}
				colors={GAMES[type].colors}
				class="size-10"
				active
				sparkles={false}
			/>
		</div>
		{@render seat(1)}
	</div>

	{#if room.error}
		<p class="text-xs text-destructive">{room.error}</p>
	{/if}
</div>
