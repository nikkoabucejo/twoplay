import { sitemapXml } from "$lib/utils/seo";

export function GET() {
	return new Response(sitemapXml(), {
		headers: {
			"content-type": "application/xml; charset=utf-8",
			"cache-control": "public, max-age=3600"
		}
	});
}
