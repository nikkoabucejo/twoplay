<script lang="ts">
	import { Page } from "$lib/components/layout";
	import { Meta } from "$lib/components/ui";
	import { History } from "$lib/features/core";
</script>

<Meta title="History" description="Your finished games and results." />

<Page
	title="History"
	description="Your finished games and results."
	titleClass="w-full max-w-2xl shrink-0"
	class="min-h-0 items-center gap-3"
>
	<History />
</Page>
