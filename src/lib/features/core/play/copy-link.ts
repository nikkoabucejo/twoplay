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
