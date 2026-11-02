import type { Toaster } from "$lib/components/ui";

type CopyLinkDeps = {
	clipboard: Pick<Clipboard, "writeText">;
	toaster: Pick<Toaster, "show">;
};

export async function copyLink(url: string, { clipboard, toaster }: CopyLinkDeps): Promise<void> {
	try {
		await clipboard.writeText(url);
		toaster.show("Link copied");
	} catch {
		toaster.show("Couldn't copy the link", { tone: "error" });
	}
}

type ShareLinkDeps = {
	share: (data: ShareData) => Promise<void>;
	toaster: Pick<Toaster, "show">;
};

export async function shareLink(url: string, { share, toaster }: ShareLinkDeps): Promise<void> {
	try {
		await share({ url });
	} catch (err) {
		// The user closed the share sheet.
		if (err instanceof DOMException && err.name === "AbortError") return;
		toaster.show("Couldn't share the link", { tone: "error" });
	}
}
