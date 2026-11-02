<script lang="ts">
	import { playCaptureSound, playMoveSound, prepareSound } from "$lib/utils/sound";
	import CheckersBoard from "./checkers-board.svelte";
	import { CheckersPractice, TictactoePractice } from "./practice.svelte.js";
	import TictactoeBoard from "./tictactoe-board.svelte";

	let { practice }: { practice: TictactoePractice | CheckersPractice } = $props();

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
</script>

<div class="contents" data-sfx="off">
	{#if practice instanceof TictactoePractice}
		<TictactoeBoard position={practice.state} lastMove={practice.lastMove} onplay={play} />
	{:else}
		<CheckersBoard
			board={practice.state.board}
			ids={practice.ids}
			selected={practice.activePiece}
			destinations={practice.destinations}
			forced={practice.forcedPieces}
			lastMove={practice.lastMove}
			onselect={select}
		/>
	{/if}
</div>
