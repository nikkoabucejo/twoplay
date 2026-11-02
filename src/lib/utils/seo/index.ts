export const SITE_URL = "https://twoplay.xyz";
export const SITE_DESCRIPTION =
	"Play Tic-Tac-Toe and Checkers in real time against a friend or a random opponent. Free, in the browser.";

/** Every other path, and every other origin, renders `noindex`. */
export const INDEXED_PATHS = [
	"/",
	"/play",
	"/how-to-play",
	"/how-to-play/tictactoe",
	"/how-to-play/checkers",
	"/tour",
	"/about",
	"/privacy",
	"/terms"
];

export function isIndexable(url: URL) {
	return url.origin === SITE_URL && INDEXED_PATHS.includes(url.pathname);
}

export function canonicalUrl(pathname: string) {
	const url = new URL(pathname, SITE_URL);
	return `${url.origin}${url.pathname}`;
}

export function robotsTxt() {
	return `User-agent: *\nDisallow:\n\nSitemap: ${SITE_URL}/sitemap.xml\n`;
}

export function sitemapXml() {
	const urls = INDEXED_PATHS.map((path) => `\t<url><loc>${canonicalUrl(path)}</loc></url>`);
	return [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
		...urls,
		"</urlset>",
		""
	].join("\n");
}

export function landingJsonLd() {
	const url = canonicalUrl("/");
	return {
		"@context": "https://schema.org",
		"@graph": [
			{ "@type": "WebSite", name: "twoplay", url },
			{
				"@type": "WebApplication",
				name: "twoplay",
				url,
				applicationCategory: "GameApplication",
				operatingSystem: "Any",
				offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
				description: SITE_DESCRIPTION
			}
		]
	};
}

/** Escaping `<` keeps a `</script>` inside a string from closing the ld+json element. */
export function serializeJsonLd(data: Record<string, unknown>) {
	return JSON.stringify(data).replaceAll("<", "\\u003c");
}
