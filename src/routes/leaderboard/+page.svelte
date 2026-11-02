<script lang="ts">
	import { Page } from "$lib/components/layout";
	import { Meta } from "$lib/components/ui";
	import { Leaderboard } from "$lib/features/core";
</script>

<Meta title="Leaderboard" description="Top players ranked by rating." />

<Page
	title="Leaderboard"
	description="Top players ranked by rating."
	titleClass="w-full max-w-md shrink-0"
	class="min-h-0 items-center gap-3"
>
	<Leaderboard />
</Page>
