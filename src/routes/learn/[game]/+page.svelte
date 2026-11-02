<script lang="ts">
	import { Page } from "$lib/components/layout";
	import { Button, Meta } from "$lib/components/ui";
	import { Lesson, RULES } from "$lib/features/core";
	import { GAMES } from "$lib/features/play";
	import type { PageProps } from "./$types";

	let { data }: PageProps = $props();

	const name = $derived(GAMES[data.game].name);
</script>

<Meta title="How to play {name}" description={RULES[data.game].description} />

<Page title="How to play {name}" description={RULES[data.game].summary} class="lg:min-h-0">
	{#snippet actions()}
		<Button href="/play?game={data.game}">Play</Button>
	{/snippet}

	{#key data.game}
		<Lesson type={data.game} />
	{/key}
</Page>
