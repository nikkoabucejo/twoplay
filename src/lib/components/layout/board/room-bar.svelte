<script lang="ts">
	import { ChevronLeft, ChevronRight, Link } from "@lucide/svelte";
	import type { Snippet } from "svelte";
	import { Button } from "$lib/components/ui";
	import { cn } from "$lib/utils/style";
	import type { BoardFooter, BoardRoom } from "./board.svelte";
	import RulesPopover from "./rules-popover.svelte";

	let {
		room,
		footer,
		rules,
		isCopyLinkHidden,
		onCopyLink
	}: {
		room: BoardRoom;
		footer: BoardFooter;
		rules?: Snippet;
		/** The invite card holds Copy link while it's shown; the button keeps its box. */
		isCopyLinkHidden: boolean;
		onCopyLink: () => void;
	} = $props();
</script>

<div
	data-slot="room-bar"
	class="flex h-8 w-(--board-size) items-center gap-1 whitespace-nowrap lg:hidden"
>
	<div class="flex min-w-0 flex-1 items-center gap-1.5 text-xs">
		<room.icon class="size-4 shrink-0" />
		<span class="truncate font-semibold max-sm:sr-only">{room.name}</span>
		<span class="font-mono text-muted-foreground">{room.code}</span>
	</div>

	<div class="flex shrink-0 items-center">
		<Button
			variant="ghost"
			size="icon-sm"
			aria-label="Previous round"
			disabled={footer.round <= 1}
			onclick={() => footer.onGoToRound(footer.round - 1)}
		>
			<ChevronLeft />
		</Button>
		<span class="w-24 text-center text-xs text-muted-foreground tabular-nums">
			Round {footer.round} of {footer.latestRound}
		</span>
		<Button
			variant="ghost"
			size="icon-sm"
			aria-label="Next round"
			disabled={footer.round >= footer.latestRound}
			onclick={() => footer.onGoToRound(footer.round + 1)}
		>
			<ChevronRight />
		</Button>
	</div>

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
