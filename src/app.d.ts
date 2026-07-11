// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { clerkClient } from "$lib/services/auth/clerk.server";

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			auth: ReturnType<Awaited<ReturnType<typeof clerkClient.authenticateRequest>>["toAuth"]>;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
