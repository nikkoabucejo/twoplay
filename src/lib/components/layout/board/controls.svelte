<script lang="ts">
	import {
		ChevronFirst,
		ChevronLast,
		ChevronLeft,
		ChevronRight,
		CircleAlert
	} from "@lucide/svelte";
	import { Button } from "$lib/components/ui";
	import { cn } from "$lib/utils/style";
	import type { BoardFooter, BoardReplay, BoardStatus } from "./board.svelte";
	import RoundAction from "./round-action.svelte";

	let {
		footer,
		replay,
		status,
		myIndex,
		isStacked = false,
		isActionHidden = false,
		class: className
	}: {
		footer: BoardFooter;
		replay?: BoardReplay;
		status?: BoardStatus;
		myIndex: 0 | 1 | null;
		/** The side panel's layout: the error line, the replay buttons in one row, then the round
		 *  action full width at the bottom. */
		isStacked?: boolean;
		/** The result card holds the round action while it's shown; the slot keeps its box. */
		isActionHidden?: boolean;
		class?: string;
	} = $props();
</script>

{#snippet back(replay: BoardReplay)}
	<Button
		variant="ghost"
		size="icon-sm"
		aria-label="First move"
		disabled={!replay.canStepBack}
		onclick={replay.onFirst}
	>
		<ChevronFirst />
	</Button>
	<Button
		variant="ghost"
		size="icon-sm"
		aria-label="Previous move"
		disabled={!replay.canStepBack}
		onclick={replay.onBack}
	>
		<ChevronLeft />
	</Button>
{/snippet}

{#snippet forward(replay: BoardReplay)}
	<Button
		variant="ghost"
		size="icon-sm"
		aria-label="Next move"
		disabled={!replay.canStepForward}
		onclick={replay.onForward}
	>
		<ChevronRight />
	</Button>
	<Button
		variant="ghost"
		size="icon-sm"
		aria-label="Live"
		disabled={!replay.canStepForward}
		onclick={replay.onLive}
	>
		<ChevronLast />
	</Button>
{/snippet}

<!-- A fixed box, empty at the live position, so stepping back or returning live moves nothing. -->
{#snippet moveReadout(replay: BoardReplay, isHidden: boolean)}
	<span
		data-slot="move"
		aria-live="polite"
		class={cn(
			"flex h-5 w-28 items-center justify-center text-xs whitespace-nowrap text-muted-foreground tabular-nums",
			isHidden && "invisible"
		)}
	>
		{#if replay.isViewingHistory}Move {replay.moveNumber} of {replay.moveCount}{/if}
	</span>
{/snippet}

<!-- The line keeps its box while empty, so an error appearing moves nothing. -->
{#snippet noticeLine()}
	<p
		role="alert"
		data-slot="notice"
		class={cn(
			"flex h-5 max-w-full items-center gap-1.5 rounded-md bg-destructive/10 px-2 text-xs text-destructive transition-opacity motion-reduce:transition-none",
			footer.error ? "opacity-100" : "opacity-0"
		)}
	>
		{#if footer.error}
			<CircleAlert class="size-3.5 shrink-0" aria-hidden="true" />
			<span class="truncate">{footer.error}</span>
		{/if}
	</p>
{/snippet}

<div class={cn("flex w-(--board-size) flex-col items-center gap-2", className)}>
	{#if isStacked}
		{@render noticeLine()}
		{#if replay}
			<div data-slot="replay" class="flex h-8 items-center gap-1.5">
				{@render back(replay)}
				{@render moveReadout(replay, false)}
				{@render forward(replay)}
			</div>
		{/if}
		<RoundAction {footer} {status} {myIndex} class={cn("w-full", isActionHidden && "invisible")} />
	{:else}
		<div data-slot="controls" class="flex h-8 items-center gap-1.5">
			{#if replay}{@render back(replay)}{/if}
			<RoundAction
				{footer}
				{status}
				{myIndex}
				class={cn("w-28 sm:w-32", isActionHidden && "invisible")}
			/>
			{#if replay}{@render forward(replay)}{/if}
		</div>
		<!-- The move readout shares the notice line's cell; an error takes precedence. -->
		<div class="grid w-full grid-cols-1 justify-items-center *:col-start-1 *:row-start-1">
			{@render noticeLine()}
			{#if replay}{@render moveReadout(replay, !!footer.error)}{/if}
		</div>
	{/if}
</div>
