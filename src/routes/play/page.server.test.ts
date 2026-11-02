import { isRedirect } from "@sveltejs/kit";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { load } from "./+page.server.js";

const convex = vi.hoisted(() => ({
	construct: vi.fn(),
	setAuth: vi.fn(),
	query: vi.fn()
}));

vi.mock("convex/browser", () => ({
	ConvexHttpClient: class {
		constructor(url: string) {
			convex.construct(url);
		}
		setAuth = convex.setAuth;
		query = convex.query;
	}
}));
vi.mock("$env/static/public", () => ({ PUBLIC_CONVEX_URL: "https://convex.test" }));

type LoadEvent = Parameters<typeof load>[0];

// The load reads only `locals.auth.userId` and `getToken`, so the rest of the event and auth is left out.
function withAuth(auth: { userId: string | null; getToken?: () => Promise<string | null> }) {
	return { locals: { auth } } as unknown as LoadEvent;
}

function signedIn(getToken: () => Promise<string | null> = async () => "token") {
	return withAuth({ userId: "user_ada", getToken });
}

async function redirectOf(event: LoadEvent) {
	try {
		await load(event);
	} catch (err) {
		if (isRedirect(err)) return { status: err.status, location: err.location };
		throw err;
	}
	return null;
}

beforeEach(() => {
	vi.spyOn(console, "error").mockImplementation(() => {});
	convex.construct.mockClear();
	convex.setAuth.mockClear();
	convex.query.mockReset();
});

describe("load", () => {
	test("redirects 307 to an active room", async () => {
		convex.query.mockResolvedValue({ code: "ABCD", type: "chess" });
		expect(await redirectOf(signedIn())).toEqual({ status: 307, location: "/chess/ABCD" });
		expect(convex.construct).toHaveBeenCalledWith("https://convex.test");
		expect(convex.setAuth).toHaveBeenCalledWith("token");
	});

	test("redirects to a waiting room", async () => {
		// `rooms.active` returns a one-seat room the same way as a filled one.
		convex.query.mockResolvedValue({ code: "WXYZ", type: "checkers" });
		expect(await redirectOf(signedIn())).toEqual({ status: 307, location: "/checkers/WXYZ" });
	});

	test("renders the page without an active room", async () => {
		convex.query.mockResolvedValue(null);
		expect(await redirectOf(signedIn())).toBeNull();
	});

	test("skips Convex when signed out", async () => {
		expect(await redirectOf(withAuth({ userId: null }))).toBeNull();
		expect(convex.construct).not.toHaveBeenCalled();
	});

	test("renders the page when getToken throws", async () => {
		const event = signedIn(async () => {
			throw new Error("clerk down");
		});
		expect(await redirectOf(event)).toBeNull();
		expect(convex.query).not.toHaveBeenCalled();
	});

	test("renders the page when the query throws", async () => {
		convex.query.mockRejectedValue(new Error("convex down"));
		expect(await redirectOf(signedIn())).toBeNull();
	});
});
