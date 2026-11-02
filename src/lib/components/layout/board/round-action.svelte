<script lang="ts">
	import { DoorOpen, Flag } from "@lucide/svelte";
	import {
		Button,
		Confirm,
		Dropdown,
		DropdownContent,
		DropdownItem,
		DropdownSeparator,
		DropdownTrigger
	} from "$lib/components/ui";
	import { cn } from "$lib/utils/style";
	import type { BoardFooter, BoardStatus } from "./board.svelte";

	let {
		footer,
		status,
		myIndex,
		class: className
	}: {
		footer: BoardFooter;
		status?: BoardStatus;
		myIndex: 0 | 1 | null;
		class?: string;
	} = $props();

	const CONFIRMS = {
		resign: {
			title: "Resign this round?",
			description: "Your opponent wins the round. The room stays open.",
			action: "Resign round"
		},
		abandon: {
			title: "Leave and close this room?",
			description: "You forfeit the round in play, and the room closes for good.",
			action: "Close room"
		},
		"abandon-waiting": {
			title: "Leave and close this room?",
			description: "No one has joined yet. The room closes.",
			action: "Close room"
		}
	};

	let isConfirming = $state(false);
	/** Kept after closing, so the popover keeps its text while it fades out. */
	let confirmKind = $state<keyof typeof CONFIRMS>("resign");
	let anchor = $state<HTMLElement | null>(null);

	const isRoundOver = $derived(status?.type === "winner" || status?.type === "draw");

	function ask(kind: keyof typeof CONFIRMS) {
		confirmKind = kind;
		isConfirming = true;
	}

	function confirm() {
		if (confirmKind === "resign") footer.onResign();
		else footer.onAbandon();
	}
</script>

<div bind:this={anchor} data-slot="round-action" class={cn("shrink-0", className)}>
	{#if !footer.isLive}
		<Button variant="outline" size="sm" class="w-full" onclick={footer.onGoLive}>Go live</Button>
	{:else if footer.roomClosed}
		<Button variant="outline" size="sm" class="w-full" onclick={footer.onPlayAgain}>
			Play again
		</Button>
	{:else if myIndex === null}
		<span
			class="flex h-8 w-full items-center justify-center rounded-full border text-xs whitespace-nowrap text-muted-foreground"
		>
			Spectating
		</span>
	{:else if footer.waitingForOpponent}
		<Button variant="outline" size="sm" class="w-full" onclick={() => ask("abandon-waiting")}>
			Abandon
		</Button>
	{:else if isRoundOver}
		<Button variant="outline" size="sm" class="w-full" onclick={footer.onRematch}>Rematch</Button>
	{:else}
		<Dropdown>
			<DropdownTrigger variant="outline" size="sm" class="w-full">Resign</DropdownTrigger>
			<!-- The confirm popover takes focus instead of the trigger. -->
			<DropdownContent
				side="bottom"
				sideOffset={8}
				align="center"
				onCloseAutoFocus={(event) => isConfirming && event.preventDefault()}
			>
				<DropdownItem onSelect={() => ask("resign")}>
					<Flag />
					Resign
				</DropdownItem>
				<DropdownSeparator />
				<DropdownItem variant="destructive" onSelect={() => ask("abandon")}>
					<DoorOpen />
					Abandon
				</DropdownItem>
			</DropdownContent>
		</Dropdown>
	{/if}
</div>

<Confirm
	bind:open={isConfirming}
	{anchor}
	title={CONFIRMS[confirmKind].title}
	description={CONFIRMS[confirmKind].description}
	confirmLabel={CONFIRMS[confirmKind].action}
	onConfirm={confirm}
/>
