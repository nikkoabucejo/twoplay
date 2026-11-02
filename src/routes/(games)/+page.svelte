<script lang="ts">
	import { Page } from "$lib/components/layout";
	import { Meta } from "$lib/components/ui";
	import { Home } from "$lib/features/core";
	import { SITE_DESCRIPTION, landingJsonLd } from "$lib/utils/seo";
</script>

<Meta description={SITE_DESCRIPTION} jsonLd={landingJsonLd()} />

<Page class="justify-center">
	<Home />
</Page>
