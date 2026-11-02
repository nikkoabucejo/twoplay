<script lang="ts" module>
	import type { Piece, PromotionPiece } from "./types.js";

	export type PromotionProps = {
		isOpen: boolean;
		/** The destination square. Focus returns to it on close. */
		anchor: HTMLElement | null;
		color: Piece["color"];
		onPick: (piece: PromotionPiece) => void;
		onCancel: () => void;
	};

	const CHOICES: { piece: PromotionPiece; name: string }[] = [
		{ piece: "q", name: "Queen" },
		{ piece: "r", name: "Rook" },
		{ piece: "b", name: "Bishop" },
		{ piece: "n", name: "Knight" }
	];
</script>

<script lang="ts">
	import { Button, Popover, PopoverContent } from "$lib/components/ui";
	import ChessPiece from "./piece.svelte";

	let { isOpen, anchor, color, onPick, onCancel }: PromotionProps = $props();

	let content = $state<HTMLElement | null>(null);

	/** Queen is the usual choice, so it takes focus rather than the picker itself. */
	function focusQueen(event: Event) {
		event.preventDefault();
		content?.querySelector("button")?.focus();
	}

	function returnFocus(event: Event) {
		event.preventDefault();
		anchor?.focus();
	}
</script>

<Popover open={isOpen} onOpenChange={(open) => !open && onCancel()}>
	<PopoverContent
		bind:ref={content}
		customAnchor={anchor}
		side="top"
		sideOffset={8}
		collisionPadding={8}
		role="dialog"
		aria-label="Promote to"
		onOpenAutoFocus={focusQueen}
		onCloseAutoFocus={returnFocus}
		class="flex gap-1"
	>
		{#each CHOICES as { piece, name } (piece)}
			<Button variant="ghost" size="icon" aria-label={name} onclick={() => onPick(piece)}>
				<ChessPiece piece={{ color, type: piece }} class="size-6" />
			</Button>
		{/each}
	</PopoverContent>
</Popover>
