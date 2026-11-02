<script lang="ts">
	import { Page } from "$lib/components/layout";
	import { Meta } from "$lib/components/ui";
	import { Settings } from "$lib/features/core";
</script>

<Meta title="Settings" description="Sound, turn alerts, motion, and new-game defaults." />

<Page title="Settings" description="Saved in this browser as you change them." class="max-w-2xl">
	<Settings />
</Page>
