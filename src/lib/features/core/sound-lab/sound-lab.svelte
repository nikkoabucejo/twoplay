<script lang="ts">
	import {
		Bell,
		CloudRain,
		Equal,
		Hourglass,
		MousePointer2,
		MousePointerClick,
		Music2,
		Play,
		Radar,
		Square,
		Trophy,
		Volume2,
		VolumeX
	} from "@lucide/svelte";
	import type { Component } from "svelte";
	import { linkVariants, Switch } from "$lib/components/ui";
	import { getMood, type MoodPresence } from "$lib/features/presence";
	import {
		music,
		musicSceneOf,
		playCaptureSound,
		playClickSound,
		playMoveSound,
		playTurnChime,
		type MusicScene
	} from "$lib/utils/sound";
	import { getPreferences, isMusicAudible, isMusicWanted } from "$lib/utils/storage";
	import { ACCENTS, cn } from "$lib/utils/style";

	type Moment = {
		id: string;
		label: string;
		caption: string;
		icon: Component<{ class?: string }>;
		chipClass: string;
		/** Spans two columns where the grid would otherwise leave a gap. */
		spanClass?: string;
		state: Pick<MoodPresence, "status" | "searching" | "outcome">;
	};

	// The viewer is seat 0 throughout, so "your turn" and "win" put the mood on seat 0.
	const MOMENTS: Moment[] = [
		{
			id: "idle",
			label: "Idle",
			caption: "Nothing on the board",
			icon: Music2,
			chipClass: "bg-foreground/10 text-foreground",
			spanClass: "col-span-2",
			state: { status: null, searching: false, outcome: null }
		},
		{
			id: "your-turn",
			label: "Your turn",
			caption: "Leans your way",
			icon: MousePointerClick,
			chipClass: cn(ACCENTS[0].tintBg, ACCENTS[0].text),
			state: { status: { type: "turn", player: 0 }, searching: false, outcome: null }
		},
		{
			id: "their-turn",
			label: "Their turn",
			caption: "Leans their way",
			icon: Hourglass,
			chipClass: cn(ACCENTS[1].tintBg, ACCENTS[1].text),
			state: { status: { type: "turn", player: 1 }, searching: false, outcome: null }
		},
		{
			id: "searching",
			label: "Searching",
			caption: "Faster, pulsing",
			icon: Radar,
			chipClass: "bg-amber-500/15 text-amber-500",
			state: { status: null, searching: true, outcome: null }
		},
		{
			id: "win",
			label: "Win",
			caption: "Bright, rising",
			icon: Trophy,
			chipClass: "bg-emerald-500/15 text-emerald-500",
			state: { status: { type: "winner", player: 0 }, searching: false, outcome: "win" }
		},
		{
			id: "lose",
			label: "Lose",
			caption: "Slow, low",
			icon: CloudRain,
			chipClass: "bg-destructive/15 text-destructive",
			state: { status: { type: "winner", player: 1 }, searching: false, outcome: "loss" }
		},
		{
			id: "draw",
			label: "Draw",
			caption: "Even, drained",
			icon: Equal,
			chipClass: "bg-muted text-muted-foreground",
			state: { status: { type: "draw" }, searching: false, outcome: "draw" }
		}
	];
	const SCENE_LABELS: Record<MusicScene, string> = {
		default: "Default",
		searching: "Searching",
		win: "Win",
		lose: "Lose",
		draw: "Draw"
	};
	// Rest heights stand in for motion when it is reduced, so a playing deck still reads as playing.
	const BARS = [
		0.55, 0.8, 0.4, 0.95, 0.65, 0.35, 0.85, 0.5, 0.75, 0.45, 0.9, 0.6, 0.3, 0.7, 0.5, 0.85
	];
	const CYCLE_MS = 6000;
	const PAD_CLASS =
		"flex items-center justify-center gap-2 rounded-xl border font-mono text-sm font-medium whitespace-nowrap uppercase transition-colors outline-none hover:border-foreground/20 focus-visible:ring-3 focus-visible:ring-ring/50 active:opacity-70";

	function requireMood(): MoodPresence {
		const mood = getMood();
		if (!mood) throw new Error("SoundLab needs the mood that the root layout sets up");
		return mood;
	}

	const mood = requireMood();
	const preferences = getPreferences();

	const isAudible = $derived(isMusicAudible(preferences));
	// Starts in step with the saved preference, which is what the player is already doing.
	let isPlaying = $state(isMusicWanted(preferences));
	let isCycling = $state(false);

	const scene = $derived(musicSceneOf(mood));
	const activeIndex = $derived(MOMENTS.findIndex((moment) => matches(moment.state)));
	const moodLabel = $derived.by(() => {
		const { status } = mood;
		if (status?.type === "turn") return `Seat ${status.player + 1} to move`;
		if (status?.type === "winner") return `Seat ${status.player + 1} wins`;
		if (status?.type === "draw") return "Draw";
		if (status?.type === "waiting") return "Waiting for a player";
		return mood.searching ? "Searching for a match" : "Idle";
	});

	const tiles: HTMLButtonElement[] = [];

	function matches(state: Moment["state"]) {
		const { status } = mood;
		const isSameStatus =
			status === null || state.status === null
				? status === state.status
				: status.type === state.status.type &&
					("player" in status ? status.player : null) ===
						("player" in state.status ? state.status.player : null);
		return isSameStatus && mood.searching === state.searching && mood.outcome === state.outcome;
	}

	function choose(index: number) {
		const { state } = MOMENTS[index];
		mood.status = state.status;
		mood.searching = state.searching;
		mood.outcome = state.outcome;
	}

	function targetIndex(key: string, index: number): number | null {
		const last = MOMENTS.length - 1;
		switch (key) {
			case "ArrowRight":
			case "ArrowDown":
				return index === last ? 0 : index + 1;
			case "ArrowLeft":
			case "ArrowUp":
				return index === 0 ? last : index - 1;
			case "Home":
				return 0;
			case "End":
				return last;
			default:
				return null;
		}
	}

	function onTileKeydown(event: KeyboardEvent, index: number) {
		const target = targetIndex(event.key, index);
		if (target === null) return;
		event.preventDefault();
		choose(target);
		tiles[target].focus();
	}

	function togglePlaying() {
		isPlaying = !isPlaying;
		music.setWanted(isPlaying && isAudible);
	}

	$effect(() => {
		if (!isCycling) return;
		const timer = setInterval(() => {
			choose((Math.max(activeIndex, 0) + 1) % MOMENTS.length);
		}, CYCLE_MS);
		return () => clearInterval(timer);
	});

	$effect(() => () => {
		choose(0);
		music.setWanted(isMusicWanted(preferences));
	});
</script>

<div class="flex w-full flex-col gap-6">
	<section
		aria-label="Deck"
		class="flex flex-col gap-4 rounded-2xl border bg-background/30 p-4 backdrop-blur-sm sm:p-5"
	>
		<div class="flex items-center gap-4">
			<button
				type="button"
				aria-label={isPlaying ? "Stop music" : "Play music"}
				disabled={!isAudible}
				class="grid size-16 shrink-0 place-items-center rounded-full bg-foreground text-background shadow-xs transition-opacity outline-none hover:opacity-90 focus-visible:ring-3 focus-visible:ring-ring/50 active:opacity-80 disabled:pointer-events-none disabled:opacity-50"
				onclick={togglePlaying}
			>
				{#if isPlaying}
					<Square class="size-6 fill-current" />
				{:else}
					<Play class="size-7 translate-x-0.5 fill-current" />
				{/if}
			</button>

			<div
				class="flex min-w-0 flex-1 flex-col gap-2 rounded-xl border bg-background/50 px-3 py-2.5 font-mono"
			>
				<div class="flex items-center justify-between gap-2 text-caption text-muted-foreground">
					<span class="tracking-widest uppercase">{isPlaying ? "Now playing" : "Stopped"}</span>
					<span class="flex items-end gap-0.5" aria-hidden="true">
						{#each BARS as rest, i (i)}
							<span
								class={cn("eq-bar h-6 w-1 rounded-full", ACCENTS[i % 2].bg)}
								data-playing={isPlaying}
								style="--eq-rest: {rest}; --eq-delay: {-i * 0.13}s; --eq-speed: {0.5 + rest * 0.6}s"
							></span>
						{/each}
					</span>
				</div>
				<p aria-live="polite" class="flex min-w-0 flex-col gap-0.5">
					<span class="truncate text-lg leading-tight font-semibold tracking-wider uppercase">
						<span class="sr-only">{"Music: "}</span>{SCENE_LABELS[scene]}
					</span>
					<span class="truncate text-caption text-muted-foreground">
						<span class="sr-only">{"Mood: "}</span>{moodLabel}
					</span>
				</p>
			</div>
		</div>

		<div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
			<div class="grid text-caption">
				<p
					class={cn(
						"col-start-1 row-start-1 flex items-center gap-1.5 text-muted-foreground",
						!isAudible && "invisible"
					)}
				>
					<Volume2 class="size-3.5 shrink-0" />
					Uses your Settings volume.
				</p>
				<p
					class={cn(
						"col-start-1 row-start-1 flex items-center gap-1.5 text-amber-500",
						isAudible && "invisible"
					)}
				>
					<VolumeX class="size-3.5 shrink-0" />
					<span>
						Sound is off in
						<a
							href="/settings"
							class={cn(linkVariants(), "px-0.5 py-0 text-caption text-amber-500 underline")}
							>Settings</a
						>
					</span>
				</p>
			</div>
			<div class="flex items-center gap-2">
				<Switch id="auto-cycle" bind:checked={isCycling} />
				<label for="auto-cycle" class="text-sm whitespace-nowrap">Auto-cycle</label>
			</div>
		</div>
	</section>

	<section class="flex flex-col gap-2">
		<h2
			id="moment-label"
			class="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
		>
			Moment
		</h2>
		<div
			role="radiogroup"
			aria-labelledby="moment-label"
			class="grid grid-cols-2 gap-2 sm:grid-cols-4"
		>
			{#each MOMENTS as moment, i (moment.id)}
				{@const isActive = i === activeIndex}
				<button
					type="button"
					role="radio"
					aria-checked={isActive}
					tabindex={isActive || (activeIndex === -1 && i === 0) ? 0 : -1}
					bind:this={tiles[i]}
					class={cn(
						"flex min-w-0 flex-col items-start gap-2 rounded-xl border bg-background/30 p-3 text-left backdrop-blur-sm transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
						moment.spanClass,
						isActive ? "selected-ring bg-foreground/6" : "hover-ring hover:bg-foreground/3"
					)}
					onclick={() => choose(i)}
					onkeydown={(event) => onTileKeydown(event, i)}
				>
					<span class={cn("grid size-9 shrink-0 place-items-center rounded-lg", moment.chipClass)}>
						<moment.icon class="size-4.5" />
					</span>
					<span class="flex min-w-0 flex-col">
						<span class="truncate text-sm font-medium">{moment.label}</span>
						<span class="truncate text-caption text-muted-foreground">{moment.caption}</span>
					</span>
				</button>
			{/each}
		</div>
	</section>

	<section class="flex flex-col gap-2">
		<h2 class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Sounds</h2>
		<!-- Off, so a pad plays only its own sound and not the UI tick on top. -->
		<div data-sfx="off" class="grid gap-2 sm:grid-cols-2">
			{#each [0, 1] as seat (seat)}
				<div
					role="group"
					aria-labelledby="seat-{seat}-label"
					class="flex flex-col gap-2 rounded-xl border bg-background/30 p-3 backdrop-blur-sm"
				>
					<p
						id="seat-{seat}-label"
						class="flex items-center gap-1.5 text-caption text-muted-foreground"
					>
						<span class={cn("size-2 rounded-full", ACCENTS[seat].bg)}></span>
						Seat {seat + 1}
					</p>
					<div class="grid grid-cols-2 gap-2">
						<button
							type="button"
							class={cn(PAD_CLASS, "h-14", ACCENTS[seat].tintBg, ACCENTS[seat].text)}
							onclick={() => playMoveSound(seat)}>Move</button
						>
						<button
							type="button"
							class={cn(PAD_CLASS, "h-14", ACCENTS[seat].tintBg, ACCENTS[seat].text)}
							onclick={() => playCaptureSound(seat)}>Capture</button
						>
					</div>
				</div>
			{/each}
			<div class="grid grid-cols-2 gap-2 sm:col-span-2">
				<button
					type="button"
					class={cn(PAD_CLASS, "h-12 bg-background/30 backdrop-blur-sm")}
					onclick={playClickSound}
				>
					<MousePointer2 class="size-4" />
					Click
				</button>
				<button
					type="button"
					class={cn(PAD_CLASS, "h-12 bg-background/30 backdrop-blur-sm")}
					onclick={playTurnChime}
				>
					<Bell class="size-4" />
					Turn chime
				</button>
			</div>
		</div>
	</section>
</div>

<style>
	.eq-bar {
		transform-origin: bottom;
		scale: 1 0.15;
		opacity: 0.4;
		transition:
			scale 300ms ease-out,
			opacity 300ms ease-out;
	}

	.eq-bar[data-playing="true"] {
		scale: 1 var(--eq-rest);
		opacity: 1;
	}

	@media (prefers-reduced-motion: no-preference) {
		.eq-bar[data-playing="true"]:not(:global(.reduce-motion) *) {
			animation: eq var(--eq-speed) ease-in-out var(--eq-delay) infinite alternate;
		}
	}

	@keyframes eq {
		from {
			scale: 1 0.15;
		}
		to {
			scale: 1 1;
		}
	}
</style>
