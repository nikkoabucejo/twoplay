import { getAudibleGraph } from "./graph.js";

const CLICKABLE =
	"button, a[href], [role=switch], [role=tab], [role=menuitem], [role=menuitemradio], [role=radio], [role=checkbox], [role=option]";

/**
 * Bits-ui menu triggers open on pointerdown, so the click that follows lands elsewhere; popup
 * triggers tick on the pointerdown instead.
 */
const POPUP_TRIGGER = '[aria-haspopup]:not([aria-haspopup="false"])';

/**
 * Bits-ui switches and popup triggers act on Enter/Space keydown without a click, and menu items
 * forward an untrusted `click()`, so these tick on the keydown instead.
 */
const KEY_ACTIVATED = `[role=switch], [role=menuitem], [role=menuitemradio], [role=menuitemcheckbox], ${POPUP_TRIGGER}`;

/** Bits-ui menu and select triggers also open on ArrowDown; on a submenu item it only moves focus. */
const ARROW_OPENED =
	":is([aria-haspopup=menu], [aria-haspopup=listbox])[aria-expanded=false]:not([role^=menuitem])";

/** G5, the fifth of the C-major music, so ticks sit inside the harmony. */
const TICK_PITCH = 783.99;

/** Ticks closer than this on the audio clock are dropped, so fast clicking doesn't rattle. */
const MIN_TICK_GAP = 0.03;

const DETUNE_CENTS = 20;

let lastTickAt = -Infinity;

/**
 * A soft tick: a triangle blip with a 3ms attack (no DC click) and an exponential fade by 35ms,
 * detuned at random by up to ±20 cents so repeats don't sound identical.
 */
export function playClickSound() {
	const audible = getAudibleGraph();
	if (!audible) return;
	const { ctx, master } = audible;
	const now = ctx.currentTime;
	if (now - lastTickAt < MIN_TICK_GAP) return;
	lastTickAt = now;

	const osc = ctx.createOscillator();
	const gain = ctx.createGain();
	osc.type = "triangle";
	osc.frequency.setValueAtTime(TICK_PITCH, now);
	osc.detune.setValueAtTime((Math.random() * 2 - 1) * DETUNE_CENTS, now);
	gain.gain.setValueAtTime(0, now);
	gain.gain.linearRampToValueAtTime(0.038, now + 0.003);
	gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);
	osc.connect(gain).connect(master);
	osc.start(now);
	osc.stop(now + 0.04);
}

/** The user-activated, enabled, audible control `event` landed on, or null. */
function tickTarget(event: Pick<Event, "isTrusted" | "target">, selector: string): Element | null {
	if (!event.isTrusted || !(event.target instanceof Element)) return null;
	const control = event.target.closest(selector);
	if (!control) return null;
	if (control.matches(":disabled") || control.getAttribute("aria-disabled") === "true") {
		return null;
	}
	return control.closest("[inert], [data-sfx=off]") ? null : control;
}

/**
 * Ticks on every user-activated control under `target`. Capture phase, so a handler that stops
 * propagation can't swallow the tick. Keyboard Enter/Space on buttons and links dispatch `click`;
 * switches, menu items, and popup triggers tick on the keydown, and a keyboard click (`detail` 0)
 * that follows on the same control is skipped. Popup triggers tick on a mouse or pen pointerdown,
 * and a pointer click (`detail` above 0) that then lands on the same trigger is skipped.
 */
export function bindClickSounds(
	target: Pick<Document, "addEventListener" | "removeEventListener">,
	isEnabled: () => boolean,
	play = playClickSound
): () => void {
	let keyTicked: Element | null = null;
	let pointerTicked: Element | null = null;

	const onClick = (event: Pick<MouseEvent, "isTrusted" | "target" | "detail">) => {
		const control = tickTarget(event, CLICKABLE);
		const ticked = event.detail === 0 ? keyTicked : pointerTicked;
		keyTicked = null;
		pointerTicked = null;
		if (control && control !== ticked && isEnabled()) play();
	};
	const onKeydown = (event: Pick<KeyboardEvent, "isTrusted" | "target" | "key" | "repeat">) => {
		if (event.repeat) return;
		const selector =
			event.key === "Enter" || event.key === " "
				? KEY_ACTIVATED
				: event.key === "ArrowDown"
					? ARROW_OPENED
					: null;
		if (!selector) return;
		const control = tickTarget(event, selector);
		if (!control || !isEnabled()) return;
		keyTicked = control;
		play();
	};
	const onPointerdown = (
		event: Pick<PointerEvent, "isTrusted" | "target" | "button" | "ctrlKey" | "pointerType">
	) => {
		if (event.button !== 0 || event.ctrlKey || event.pointerType === "touch") return;
		const control = tickTarget(event, POPUP_TRIGGER);
		if (!control || !isEnabled()) return;
		pointerTicked = control;
		play();
	};
	target.addEventListener("click", onClick, true);
	target.addEventListener("keydown", onKeydown, true);
	target.addEventListener("pointerdown", onPointerdown, true);
	return () => {
		target.removeEventListener("click", onClick, true);
		target.removeEventListener("keydown", onKeydown, true);
		target.removeEventListener("pointerdown", onPointerdown, true);
	};
}
