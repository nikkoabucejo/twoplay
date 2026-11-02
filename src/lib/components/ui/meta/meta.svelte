<script lang="ts" module>
	export type MetaProps = {
		/** Page name; the landing page omits it and gets the bare app name. */
		title?: string;
		description: string;
		jsonLd?: Record<string, unknown>;
	};
</script>

<script lang="ts">
	import { page } from "$app/state";
	import { SITE_URL, canonicalUrl, isIndexable, serializeJsonLd } from "$lib/utils/seo";

	let { title, description, jsonLd }: MetaProps = $props();

	const fullTitle = $derived(title ? `${title} · twoplay` : "twoplay");
	const isIndexed = $derived(isIndexable(page.url));
	const canonical = $derived(canonicalUrl(page.url.pathname));
	// Previews share the production image so crawlers always get an absolute, reachable URL.
	const image = `${SITE_URL}/og.png`;
</script>

<svelte:head>
	<title>{fullTitle}</title>
	<meta name="description" content={description} />
	{#if isIndexed}
		<link rel="canonical" href={canonical} />
		<meta property="og:url" content={canonical} />
	{:else}
		<meta name="robots" content="noindex" />
	{/if}
	<meta property="og:site_name" content="twoplay" />
	<meta property="og:locale" content="en_US" />
	<meta property="og:title" content={fullTitle} />
	<meta property="og:description" content={description} />
	<meta property="og:type" content="website" />
	<meta property="og:image" content={image} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:alt" content="twoplay: real-time two-player games" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={fullTitle} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={image} />
	{#if jsonLd}
		{@html `<script type="application/ld+json">${serializeJsonLd(jsonLd)}</script>`}
	{/if}
</svelte:head>
