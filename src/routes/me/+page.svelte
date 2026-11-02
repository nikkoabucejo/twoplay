<script lang="ts">
	import { Page } from "$lib/components/layout";
	import { Meta } from "$lib/components/ui";
	import { Stats } from "$lib/features/core";
</script>

<Meta title="My stats" description="Your rating, rank, record per game, and recent games." />

<Page title="My stats" description="Your rating, record, and recent games." class="max-w-2xl">
	<Stats />
</Page>
