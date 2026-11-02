<script lang="ts">
	import { Link } from "@lucide/svelte";
	import type { Snippet } from "svelte";
	import { Button } from "$lib/components/ui";
	import { roomPath } from "$lib/utils/multiplayer";
	import { cn } from "$lib/utils/style";
	import type {
		BoardFooter,
		BoardReplay,
		BoardRoom,
		BoardRound,
		BoardStatus
	} from "./board.svelte";
	import Controls from "./controls.svelte";
	import KeyboardShortcuts from "./keyboard-shortcuts.svelte";
	import RulesPopover from "./rules-popover.svelte";

	let {
		room,
		footer,
		replay,
		status,
		myIndex,
		rounds,
		rules,
		isCopyLinkHidden,
		isActionHidden,
		onCopyLink
	}: {
		room: BoardRoom;
		footer: BoardFooter;
		replay?: BoardReplay;
		status?: BoardStatus;
		myIndex: 0 | 1 | null;
		rounds: BoardRound[];
		rules?: Snippet;
		/** The invite card holds Copy link while it's shown. */
		isCopyLinkHidden: boolean;
		/** The result card holds the round action while it's shown. */
		isActionHidden: boolean;
		onCopyLink: () => void;
	} = $props();

	const RESULT_LABELS: Record<BoardRound["result"], string> = {
		win: "Win",
		loss: "Loss",
		draw: "Draw",
		playing: "Playing"
	};

	const RESULT_CLASSES: Record<BoardRound["result"], string> = {
		win: "text-emerald-500",
		loss: "text-destructive",
		draw: "text-muted-foreground",
		playing: "text-amber-500"
	};

	function signed(mmr: number): string {
		return mmr > 0 ? `+${mmr}` : mmr < 0 ? `−${-mmr}` : "0";
	}
</script>

<!-- The outer box takes the column's height; the inner one fills it, so the round list scrolls
     instead of growing the row, and the round controls sit at the bottom beside the viewer's strip. -->
<aside aria-label="Room" class="relative hidden w-72 shrink-0 lg:block">
	<div
		class="absolute inset-0 flex flex-col gap-3 rounded-lg border bg-muted/40 p-3 text-left backdrop-blur-sm"
	>
		<div class="flex h-8 items-center gap-1.5 text-sm whitespace-nowrap">
			<room.icon class="size-4 shrink-0" />
			<span class="min-w-0 truncate font-semibold">{room.name}</span>
			<span class="font-mono text-xs text-muted-foreground">{room.code}</span>
			<div class="ml-auto flex shrink-0 items-center">
				<KeyboardShortcuts />
				{#if rules}
					<RulesPopover {rules} />
				{/if}
				<Button
					variant="ghost"
					size="icon-sm"
					aria-label="Copy link"
					class={cn(isCopyLinkHidden && "invisible")}
					onclick={onCopyLink}
				>
					<Link />
				</Button>
			</div>
		</div>

		<div class="flex min-h-0 flex-1 flex-col gap-1.5">
			{#if myIndex !== null}
				<h2 class="text-caption tracking-widest text-muted-foreground uppercase">Rounds</h2>
				<ul class="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
					{#each rounds as row (row.round)}
						<li>
							<a
								href={roomPath(room.type, room.code, row.round)}
								aria-current={row.round === footer.round ? "page" : undefined}
								class="flex h-8 items-center gap-2 rounded-md px-2 text-xs whitespace-nowrap outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 aria-[current=page]:bg-muted"
							>
								<span class="flex-1">Round {row.round}</span>
								<span class={cn("w-14 text-right font-semibold", RESULT_CLASSES[row.result])}>
									{RESULT_LABELS[row.result]}
								</span>
								<span class="w-7 text-right font-mono tabular-nums text-muted-foreground">
									{row.mmr === null ? "—" : signed(row.mmr)}
								</span>
							</a>
						</li>
					{/each}
				</ul>
			{/if}
		</div>

		<Controls {footer} {replay} {status} {myIndex} isStacked {isActionHidden} class="w-full" />
	</div>
</aside>
