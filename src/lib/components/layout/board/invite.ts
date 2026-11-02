import type { Toaster } from "$lib/components/ui";
import { roomPath } from "$lib/utils/multiplayer";
import type { GameType } from "../../../../../convex/models/games/index.js";

export function roomUrl(origin: string, type: GameType, code: string): string {
	return `${origin}${roomPath(type, code)}`;
}

type CopyDeps = {
	clipboard: Pick<Clipboard, "writeText">;
	toaster: Pick<Toaster, "show">;
};

export async function copyRoomLink(url: string, { clipboard, toaster }: CopyDeps): Promise<void> {
	try {
		await clipboard.writeText(url);
		toaster.show("Link copied");
	} catch {
		toaster.show("Couldn't copy the link", { tone: "error" });
	}
}

export function canShare(): boolean {
	return typeof navigator.share === "function";
}

type ShareDeps = {
	share: (data: ShareData) => Promise<void>;
	toaster: Pick<Toaster, "show">;
};

export async function shareRoom(url: string, { share, toaster }: ShareDeps): Promise<void> {
	try {
		await share({ url });
	} catch (err) {
		// The user closed the share sheet.
		if (err instanceof DOMException && err.name === "AbortError") return;
		toaster.show("Couldn't share the link", { tone: "error" });
	}
}
