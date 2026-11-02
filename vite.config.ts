import tailwindcss from "@tailwindcss/vite";
import adapter from "@sveltejs/adapter-auto";
import { sveltekit } from "@sveltejs/kit/vite";
import { svelteTesting } from "@testing-library/svelte/vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes("node_modules") ? undefined : true
			},

			// adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
			// If your environment is not supported, or you settled on a specific environment, switch out the adapter.
			// See https://svelte.dev/docs/kit/adapters for more information about adapters.
			adapter: adapter()
		})
	],
	test: {
		expect: { requireAssertions: true },
		coverage: {
			provider: "v8",
			include: ["src/**/*.{ts,svelte}", "convex/**/*.ts"],
			exclude: ["convex/_generated/**", "**/*.test.ts", "**/*.d.ts", "convex/test.setup.ts"]
		},
		projects: [
			{
				test: {
					name: "convex",
					environment: "edge-runtime",
					include: ["convex/**/*.test.ts"],
					server: { deps: { inline: ["convex-test"] } }
				}
			},
			{
				extends: "./vite.config.ts",
				test: {
					name: "server",
					environment: "node",
					include: ["src/**/*.test.ts"],
					exclude: ["src/**/*.svelte.test.ts"]
				}
			},
			{
				extends: "./vite.config.ts",
				plugins: [svelteTesting()],
				test: {
					name: "client",
					environment: "jsdom",
					clearMocks: true,
					include: ["src/**/*.svelte.test.ts"],
					setupFiles: ["./vitest-setup-client.ts"]
				}
			}
		]
	}
});
