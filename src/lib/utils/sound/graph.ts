export type SoundGraph = { ctx: AudioContext; master: GainNode };

let audio: SoundGraph | null = null;
let settings = { isEnabled: true, volume: 1 };

export function getGraph(): SoundGraph | null {
	if (typeof window === "undefined") return null;
	if (!audio) {
		const ctx = new AudioContext();
		const master = ctx.createGain();
		master.gain.value = settings.volume;
		master.connect(ctx.destination);
		audio = { ctx, master };
	}
	if (audio.ctx.state !== "running") void audio.ctx.resume();
	return audio;
}

/** Returns null when muted, so a muted page never creates an `AudioContext`. */
export function getAudibleGraph(): SoundGraph | null {
	if (!settings.isEnabled || settings.volume <= 0) return null;
	return getGraph();
}

export function configureSound(next: { isEnabled: boolean; volume: number }) {
	settings = next;
	if (audio) audio.master.gain.setTargetAtTime(next.volume, audio.ctx.currentTime, 0.02);
}
