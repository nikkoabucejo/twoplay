let context: AudioContext | null = null;

function getContext(): AudioContext | null {
	if (typeof window === "undefined") return null;
	context ??= new AudioContext();
	if (context.state === "suspended") void context.resume();
	return context;
}

export function prepareSound() {
	void getContext();
}

/** A fourth apart, so both seats sound like one instrument rather than two unrelated tones. */
const SEAT_PITCH = [261.63, 349.23] as const; // C4, F4

/**
 * A piece/mark landing: a bright chirp that overshoots and settles, echoing the liquid pop-in's
 * backOut wobble, layered over a soft sine body for warmth.
 */
export function playMoveSound(seat: number) {
	const ctx = getContext();
	if (!ctx) return;
	const now = ctx.currentTime;
	const base = SEAT_PITCH[seat % SEAT_PITCH.length];

	const chirp = ctx.createOscillator();
	const chirpGain = ctx.createGain();
	chirp.type = "triangle";
	chirp.frequency.setValueAtTime(base * 1.3, now);
	chirp.frequency.exponentialRampToValueAtTime(base * 2, now + 0.07);
	chirp.frequency.exponentialRampToValueAtTime(base * 1.5, now + 0.18);
	chirpGain.gain.setValueAtTime(0, now);
	chirpGain.gain.linearRampToValueAtTime(0.16, now + 0.012);
	chirpGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
	chirp.connect(chirpGain).connect(ctx.destination);
	chirp.start(now);
	chirp.stop(now + 0.22);

	const body = ctx.createOscillator();
	const bodyGain = ctx.createGain();
	body.type = "sine";
	body.frequency.setValueAtTime(base * 0.75, now);
	bodyGain.gain.setValueAtTime(0, now);
	bodyGain.gain.linearRampToValueAtTime(0.2, now + 0.012);
	bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
	body.connect(bodyGain).connect(ctx.destination);
	body.start(now);
	body.stop(now + 0.24);
}

/** A piece being captured/removed: a short downward slide fading out, echoing the 150ms out:fade. */
export function playCaptureSound(seat: number) {
	const ctx = getContext();
	if (!ctx) return;
	const now = ctx.currentTime;
	const base = SEAT_PITCH[seat % SEAT_PITCH.length];

	const osc = ctx.createOscillator();
	const gain = ctx.createGain();
	osc.type = "sine";
	osc.frequency.setValueAtTime(base, now);
	osc.frequency.exponentialRampToValueAtTime(base * 0.55, now + 0.14);
	gain.gain.setValueAtTime(0.18, now);
	gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
	osc.connect(gain).connect(ctx.destination);
	osc.start(now);
	osc.stop(now + 0.16);
}
