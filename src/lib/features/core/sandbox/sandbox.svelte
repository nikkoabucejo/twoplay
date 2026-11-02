<script lang="ts">
	import Sound from "./sound.svelte";
	import Interactions from "./interactions.svelte";

	const HEADING_CLASS = "text-lg font-semibold tracking-tight";
</script>

<div class="flex flex-col gap-10">
	<section aria-labelledby="sound" class="flex flex-col gap-4">
		<h2 id="sound" class={HEADING_CLASS}>Sound</h2>
		<Sound />
	</section>

	<section aria-labelledby="game" class="flex flex-col gap-4">
		<h2 id="game" class={HEADING_CLASS}>Game</h2>
		<Interactions />
	</section>
</div>
