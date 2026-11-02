<script lang="ts">
	import { playCaptureSound, playMoveSound, prepareSound } from "$lib/utils/sound";
	import {
		colorOfSeat,
		isCapture,
		squareName,
		type LegalMove,
		type PromotionPiece
	} from "../../../../../convex/models/games/chess/rules.js";
	import CheckersBoard from "./checkers-board.svelte";
	import ChessBoard from "./chess-board.svelte";
	import { CheckersPractice, ChessPractice, TictactoePractice } from "./practice.svelte.js";
	import TictactoeBoard from "./tictactoe-board.svelte";

	let { practice }: { practice: TictactoePractice | CheckersPractice | ChessPractice } = $props();

	function play(boardIndex: number, cellIndex: number) {
		if (!(practice instanceof TictactoePractice)) return;
		prepareSound();
		const seat = practice.turn;
		if (practice.play(boardIndex, cellIndex)) playMoveSound(seat);
	}

	function select(index: number) {
		if (!(practice instanceof CheckersPractice)) return;
		prepareSound();
		const seat = practice.turn;
		const move = practice.legalMoves.find(
			(legal) => legal.from === practice.activePiece && legal.to === index
		);
		if (!practice.select(index) || !move) return;
		playMoveSound(seat);
		if (move.captured !== null) playCaptureSound(seat === 0 ? 1 : 0);
	}

	function playChessSounds(seat: 0 | 1, move: LegalMove | undefined) {
		if (!move) return;
		playMoveSound(seat);
		if (isCapture(move)) playCaptureSound(seat === 0 ? 1 : 0);
	}

	function selectChess(index: number) {
		if (!(practice instanceof ChessPractice)) return;
		prepareSound();
		const seat = practice.turn;
		const to = squareName(index);
		const move = practice.legalMoves.find(
			(legal) => legal.from === practice.selected && legal.to === to
		);
		if (practice.select(index)) playChessSounds(seat, move);
	}

	function promote(piece: PromotionPiece) {
		if (!(practice instanceof ChessPractice) || !practice.pendingPromotion) return;
		const seat = practice.turn;
		const { from, to } = practice.pendingPromotion;
		const move = practice.legalMoves.find(
			(legal) => legal.from === from && legal.to === to && legal.promotion === piece
		);
		if (practice.promote(piece)) playChessSounds(seat, move);
	}
</script>

<div class="contents" data-sfx="off">
	{#if practice instanceof TictactoePractice}
		<TictactoeBoard position={practice.state} lastMove={practice.lastMove} onplay={play} />
	{:else if practice instanceof CheckersPractice}
		<CheckersBoard
			board={practice.state.board}
			ids={practice.ids}
			selected={practice.activePiece}
			destinations={practice.destinations}
			forced={practice.forcedPieces}
			lastMove={practice.lastMove}
			onselect={select}
		/>
	{:else}
		{@const chess = practice}
		<ChessBoard
			board={chess.board}
			selected={chess.selected}
			destinations={chess.destinations}
			lastMove={chess.lastMove}
			checkSquare={chess.checkSquare}
			promotion={{
				isOpen: chess.pendingPromotion !== null,
				color: colorOfSeat(chess.turn),
				onPick: promote,
				onCancel: () => chess.cancelPromotion()
			}}
			onselect={selectChess}
		/>
	{/if}
</div>
