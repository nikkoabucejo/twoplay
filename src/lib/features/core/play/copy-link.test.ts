import { describe, expect, test, vi } from "vitest";
import { copyLink } from "./copy-link.js";

describe("copyLink", () => {
	const url = "https://twoplay.test/tictactoe/ABCD";

	test("writes the URL and confirms with a toast", async () => {
		const clipboard = { writeText: vi.fn().mockResolvedValue(undefined) };
		const toaster = { show: vi.fn() };

		await copyLink(url, { clipboard, toaster });

		expect(clipboard.writeText).toHaveBeenCalledWith(url);
		expect(toaster.show).toHaveBeenCalledWith("Link copied");
	});

	test("shows an error toast when the clipboard write rejects", async () => {
		const clipboard = { writeText: vi.fn().mockRejectedValue(new Error("denied")) };
		const toaster = { show: vi.fn() };

		await copyLink(url, { clipboard, toaster });

		expect(toaster.show).toHaveBeenCalledWith("Couldn't copy the link", { tone: "error" });
	});
});
