import { prefersReducedMotion } from "svelte/motion";
import type { Attachment } from "svelte/attachments";

export const BEAT_MS = { aim: 800, play: 1200, slowPlay: 2600, hold: 3000 } as const;

/**
 * A demo's looping timeline. Each action takes two beats, one with the cursor heading to it and one
 * with it played, and a hold beat ends the loop. It starts on the hold, so the first paint is the
 * finished position, the same still frame reduced motion keeps.
 */
export class Playback {
	#getLength: () => number;
	#isSlow: (action: number) => boolean;

	beat = $state(0);
	/** Counts restarts, so the board can cross-fade from the finished position back to the start. */
	loop = $state(0);

	constructor(getLength: () => number, isSlow: (action: number) => boolean = () => false) {
		this.#getLength = getLength;
		this.#isSlow = isSlow;
		this.beat = getLength() * 2;
	}

	get #lastBeat(): number {
		return this.#getLength() * 2;
	}

	/** Actions played so far. */
	get played(): number {
		return Math.ceil(this.beat / 2);
	}

	/** The action the cursor is heading to or just played, or null for an empty demo. */
	get target(): number | null {
		const length = this.#getLength();
		return length === 0 ? null : Math.min(Math.floor(this.beat / 2), length - 1);
	}

	get isAiming(): boolean {
		return this.beat % 2 === 0 && !this.isFinal;
	}

	get isFinal(): boolean {
		return this.beat === this.#lastBeat;
	}

	get delay(): number {
		if (this.isFinal) return BEAT_MS.hold;
		if (this.isAiming) return BEAT_MS.aim;
		return this.#isSlow(Math.floor(this.beat / 2)) ? BEAT_MS.slowPlay : BEAT_MS.play;
	}

	advance(): void {
		if (this.isFinal) {
			this.beat = 0;
			this.loop += 1;
		} else {
			this.beat += 1;
		}
	}

	showFinal(): void {
		this.beat = this.#lastBeat;
	}

	/** Advances on each beat's delay until the returned function stops it. */
	play(): () => void {
		let timer: ReturnType<typeof setTimeout>;
		const schedule = () => {
			timer = setTimeout(() => {
				this.advance();
				schedule();
			}, this.delay);
		};
		schedule();
		return () => clearTimeout(timer);
	}
}

/** The OS setting or the app's "Always reduce" setting, which puts `.reduce-motion` on `<html>`. */
export function isMotionReduced(): boolean {
	return (
		prefersReducedMotion.current || document.documentElement.classList.contains("reduce-motion")
	);
}

/** Reports whether the element is on screen, so off-screen animations can pause. */
export function onVisibility(callback: (isVisible: boolean) => void): Attachment<HTMLElement> {
	return (element) => {
		const observer = new IntersectionObserver((entries) => {
			for (const entry of entries) callback(entry.isIntersecting);
		});
		observer.observe(element);
		return () => observer.disconnect();
	};
}
