import { getContext, setContext } from "svelte";

export type ToastTone = "default" | "error";
export type ToastItem = { id: number; message: string; tone: ToastTone };

const DEFAULT_DURATION_MS = 3000;
const MAX_TOASTS = 3;
const CONTEXT_KEY = Symbol("toaster");

export class Toaster {
	items = $state<ToastItem[]>([]);

	#nextId = 1;
	#timers = new Map<number, ReturnType<typeof setTimeout>>();

	show(message: string, options: { tone?: ToastTone; durationMs?: number } = {}): number {
		const id = this.#nextId++;
		if (this.items.length === MAX_TOASTS) this.dismiss(this.items[0].id);
		this.items.push({ id, message, tone: options.tone ?? "default" });
		this.#timers.set(
			id,
			setTimeout(() => this.dismiss(id), options.durationMs ?? DEFAULT_DURATION_MS)
		);
		return id;
	}

	dismiss(id: number): void {
		clearTimeout(this.#timers.get(id));
		this.#timers.delete(id);
		this.items = this.items.filter((item) => item.id !== id);
	}
}

export function setupToaster(): Toaster {
	const toaster = new Toaster();
	setContext(CONTEXT_KEY, toaster);
	return toaster;
}

export function getToaster(): Toaster {
	const toaster = getContext<Toaster | undefined>(CONTEXT_KEY);
	if (!toaster) throw new Error("getToaster() was called before setupToaster()");
	return toaster;
}
