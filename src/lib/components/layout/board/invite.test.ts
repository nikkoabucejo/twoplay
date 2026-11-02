import { afterEach, describe, expect, test, vi } from "vitest";
import { canShare, copyRoomLink, roomUrl, shareRoom } from "./invite.js";

const url = "https://twoplay.test/checkers/ABCD";

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("roomUrl", () => {
	test("is the origin plus the room's path", () => {
		expect(roomUrl("https://twoplay.test", "checkers", "ABCD")).toBe(url);
	});
});

describe("copyRoomLink", () => {
	test("writes the URL and confirms with a toast", async () => {
		const clipboard = { writeText: vi.fn().mockResolvedValue(undefined) };
		const toaster = { show: vi.fn() };

		await copyRoomLink(url, { clipboard, toaster });

		expect(clipboard.writeText).toHaveBeenCalledWith(url);
		expect(toaster.show).toHaveBeenCalledWith("Link copied");
	});

	test("shows an error toast when the clipboard write rejects", async () => {
		const clipboard = { writeText: vi.fn().mockRejectedValue(new Error("denied")) };
		const toaster = { show: vi.fn() };

		await copyRoomLink(url, { clipboard, toaster });

		expect(toaster.show).toHaveBeenCalledWith("Couldn't copy the link", { tone: "error" });
	});
});

describe("canShare", () => {
	test("is true where the browser has a share sheet", () => {
		vi.stubGlobal("navigator", { share: vi.fn() });
		expect(canShare()).toBe(true);
	});

	test("is false without navigator.share", () => {
		vi.stubGlobal("navigator", {});
		expect(canShare()).toBe(false);
	});
});

describe("shareRoom", () => {
	test("opens the share sheet with the URL", async () => {
		const share = vi.fn().mockResolvedValue(undefined);
		const toaster = { show: vi.fn() };

		await shareRoom(url, { share, toaster });

		expect(share).toHaveBeenCalledWith({ url });
	});

	test("stays silent when the user closes the share sheet", async () => {
		const share = vi.fn().mockRejectedValue(new DOMException("Share canceled", "AbortError"));
		const toaster = { show: vi.fn() };

		await shareRoom(url, { share, toaster });

		expect(toaster.show).not.toHaveBeenCalled();
	});

	test("shows an error toast when sharing fails", async () => {
		const share = vi.fn().mockRejectedValue(new DOMException("Not allowed", "NotAllowedError"));
		const toaster = { show: vi.fn() };

		await shareRoom(url, { share, toaster });

		expect(toaster.show).toHaveBeenCalledWith("Couldn't share the link", { tone: "error" });
	});
});
