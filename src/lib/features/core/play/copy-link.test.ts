import { describe, expect, test, vi } from "vitest";
import { copyLink, shareLink } from "./copy-link.js";

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

describe("shareLink", () => {
	const url = "https://twoplay.test/tictactoe/ABCD";

	test("opens the share sheet with the URL", async () => {
		const share = vi.fn().mockResolvedValue(undefined);
		const toaster = { show: vi.fn() };

		await shareLink(url, { share, toaster });

		expect(share).toHaveBeenCalledWith({ url });
		expect(toaster.show).not.toHaveBeenCalled();
	});

	test("stays silent when the user closes the share sheet", async () => {
		const share = vi.fn().mockRejectedValue(new DOMException("Share canceled", "AbortError"));
		const toaster = { show: vi.fn() };

		await shareLink(url, { share, toaster });

		expect(toaster.show).not.toHaveBeenCalled();
	});

	test("shows an error toast when sharing fails", async () => {
		const share = vi.fn().mockRejectedValue(new DOMException("Not allowed", "NotAllowedError"));
		const toaster = { show: vi.fn() };

		await shareLink(url, { share, toaster });

		expect(toaster.show).toHaveBeenCalledWith("Couldn't share the link", { tone: "error" });
	});
});
