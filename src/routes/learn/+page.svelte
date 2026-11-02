<script lang="ts">
	import { Page } from "$lib/components/layout";
	import { Meta } from "$lib/components/ui";
	import { Door } from "$lib/features/core";
	import { GAME_TYPES } from "$lib/features/play";
</script>

<Meta title="Learn" description="Rules for every game on twoplay." />

<Page
	title="Learn"
	description="Pick a game. Each lesson plays out on a board, then lets you try it."
>
	<ul class="grid gap-4 sm:grid-cols-2">
		{#each GAME_TYPES as type (type)}
			<li><Door {type} /></li>
		{/each}
	</ul>
</Page>
