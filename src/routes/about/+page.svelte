<script lang="ts">
	import { Page } from "$lib/components/layout";
	import { Meta } from "$lib/components/ui";
	import { About, PREPAINT_SCRIPT } from "$lib/features/core";
</script>

<svelte:head>
	{@html PREPAINT_SCRIPT}
</svelte:head>

<Meta
	title="About"
	description="How twoplay was built: real-time two-player games made by Nikko Abucejo with a team of AI agents."
/>

<Page>
	<About />
</Page>
