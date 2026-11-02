<script lang="ts">
	import { Page } from "$lib/components/layout";
	import { Meta } from "$lib/components/ui";
	import { Lobby } from "$lib/features/core";
</script>

<Meta title="Lobby" description="Public rooms waiting for a player." />

<Page
	title="Lobby"
	description="Public rooms waiting for a player."
	titleClass="w-full max-w-2xl shrink-0"
	class="min-h-0 items-center gap-3"
>
	<Lobby />
</Page>
