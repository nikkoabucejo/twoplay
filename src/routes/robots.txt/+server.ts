import { robotsTxt } from "$lib/utils/seo";

export function GET() {
	return new Response(robotsTxt(), {
		headers: {
			"content-type": "text/plain; charset=utf-8",
			"cache-control": "public, max-age=3600"
		}
	});
}
