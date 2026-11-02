<script lang="ts">
	import { ResultCard } from "$lib/components/layout";
	import { Tabs, type TabItem } from "$lib/components/ui";
	import { GAMES } from "$lib/features/play";
	import { squareIndex, type Color } from "../../../../../convex/models/games/chess/rules.js";
	import { CheckersBoard, ChessBoard, TictactoeBoard } from "../rules/index.js";
	import {
		CHECKERS,
		CHESS,
		PROMOTIONS,
		RESULT_FOOTER,
		RESULT_PLAYERS,
		RESULTS,
		TICTACTOE
	} from "./fixtures.js";
	import Preview from "./preview.svelte";

	const GROUP_CLASS = "flex flex-col gap-2";
	const HEADING_CLASS = "text-xs font-semibold tracking-wide text-muted-foreground uppercase";
	const GRID_CLASS = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3";
	const COLOR_ITEMS: TabItem<Color>[] = [
		{ value: "w", label: "White" },
		{ value: "b", label: "Black" }
	];

	/** Squares become labeled buttons, so a screen reader can read the position. Selecting does
	 *  nothing. */
	function inspect() {}

	let promotionColor = $state<Color>("w");
	let isPromotionOpen = $state(false);
	const promotion = $derived(PROMOTIONS[promotionColor]);

	function closePromotion() {
		isPromotionOpen = false;
	}
</script>

<div class="flex flex-col gap-6">
	<p class="text-sm text-muted-foreground">
		Drawn with the Learn boards from fixed positions. In-game cursors, timers, and piece animations
		are not shown.
	</p>

	<section aria-labelledby="sandbox-tictactoe" class={GROUP_CLASS}>
		<h3 id="sandbox-tictactoe" class={HEADING_CLASS}>{GAMES.tictactoe.name}</h3>
		<div class={GRID_CLASS}>
			{#each Object.values(TICTACTOE) as preview (preview.label)}
				<Preview label={preview.label}>
					<TictactoeBoard
						position={preview.position}
						lastMove={preview.lastMove}
						label={preview.label}
						onplay={inspect}
					/>
				</Preview>
			{/each}
		</div>
	</section>

	<section aria-labelledby="sandbox-checkers" class={GROUP_CLASS}>
		<h3 id="sandbox-checkers" class={HEADING_CLASS}>{GAMES.checkers.name}</h3>
		<div class={GRID_CLASS}>
			{#each Object.values(CHECKERS) as preview (preview.label)}
				<Preview label={preview.label}>
					<CheckersBoard
						board={preview.state.board}
						ids={preview.ids}
						selected={preview.selected}
						destinations={preview.destinations}
						forced={preview.forced}
						lastMove={preview.lastMove}
						label={preview.label}
						onselect={inspect}
					/>
				</Preview>
			{/each}
		</div>
	</section>

	<section aria-labelledby="sandbox-chess" class={GROUP_CLASS}>
		<h3 id="sandbox-chess" class={HEADING_CLASS}>{GAMES.chess.name}</h3>
		<div class={GRID_CLASS}>
			{#each Object.values(CHESS) as preview (preview.label)}
				<Preview label={preview.label}>
					<ChessBoard
						board={preview.board}
						selected={preview.selected}
						destinations={preview.destinations}
						lastMove={preview.lastMove}
						checkSquare={preview.checkSquare}
						label={preview.label}
						onselect={inspect}
					/>
				</Preview>
			{/each}
			<Preview label="Promotion (select the pawn)">
				<ChessBoard
					label="Promotion"
					board={promotion.board}
					lastMove={promotion.lastMove}
					promotion={{
						isOpen: isPromotionOpen,
						color: promotionColor,
						onPick: closePromotion,
						onCancel: closePromotion
					}}
					onselect={(index) => {
						if (index === squareIndex(promotion.to)) isPromotionOpen = true;
					}}
				/>
				{#snippet actions()}
					<Tabs
						aria-label="Pawn color"
						items={COLOR_ITEMS}
						value={promotionColor}
						onValueChange={(color) => (promotionColor = color)}
						class="w-32"
					/>
				{/snippet}
			</Preview>
		</div>
	</section>

	<section aria-labelledby="sandbox-results" class={GROUP_CLASS}>
		<h3 id="sandbox-results" class={HEADING_CLASS}>Result cards</h3>
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
			{#each RESULTS as { label, view } (label)}
				<Preview {label} isOverlay class="aspect-auto h-96">
					<ResultCard
						{view}
						footer={RESULT_FOOTER}
						players={RESULT_PLAYERS}
						headingLevel={4}
						onDismiss={() => {}}
					/>
				</Preview>
			{/each}
		</div>
	</section>
</div>
