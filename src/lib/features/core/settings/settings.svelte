<script lang="ts">
	import { Slider, Switch, Tabs, type TabItem } from "$lib/components/ui";
	import { playClickSound } from "$lib/utils/sound";
	import {
		getPreferences,
		MOTION_OPTIONS,
		NEW_GAME_CLOCKS,
		NEW_GAME_OPPONENTS,
		type Motion,
		type NewGameClock,
		type NewGameOpponent
	} from "$lib/utils/storage";
	import { cn } from "$lib/utils/style";

	const MOTION_LABELS: Record<Motion, string> = {
		system: "Follow system",
		reduce: "Always reduce"
	};
	const OPPONENT_LABELS: Record<NewGameOpponent, string> = {
		matchmaking: "Matchmaking",
		public: "Public",
		private: "Private"
	};

	const MOTION_ITEMS: TabItem<Motion>[] = MOTION_OPTIONS.map((value) => ({
		value,
		label: MOTION_LABELS[value]
	}));
	const OPPONENT_ITEMS: TabItem<NewGameOpponent>[] = NEW_GAME_OPPONENTS.map((value) => ({
		value,
		label: OPPONENT_LABELS[value]
	}));
	const CLOCK_ITEMS: TabItem<NewGameClock>[] = NEW_GAME_CLOCKS.map((value) => ({
		value,
		label: `${value} min`
	}));

	const preferences = getPreferences();

	const volumePercent = $derived(Math.round(preferences.volume * 100));
</script>

{#snippet row(id: string, label: string, description: string)}
	<div class="flex min-w-0 flex-1 flex-col gap-0.5">
		<label for={id} class="text-sm font-medium">{label}</label>
		<p class="text-caption text-muted-foreground">{description}</p>
	</div>
{/snippet}

<div class="flex w-full flex-col gap-6">
	<section class="flex flex-col gap-2">
		<h2 class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Sound</h2>
		<div class="flex flex-col divide-y rounded-xl border bg-muted/40 backdrop-blur-sm">
			<div class="flex items-center gap-4 p-4">
				{@render row("sound", "Sound", "Game sounds and music.")}
				<Switch
					id="sound"
					checked={preferences.sound}
					onCheckedChange={(value) => preferences.setSound(value)}
				/>
			</div>
			<div class="flex flex-col gap-3 p-4">
				<div class="flex items-center gap-4">
					<div class="flex min-w-0 flex-1 flex-col gap-0.5">
						<p class="text-sm font-medium">Volume</p>
						<p class="text-caption text-muted-foreground">How loud sounds play.</p>
					</div>
					<span
						class={cn(
							"w-10 shrink-0 text-right font-mono text-sm tabular-nums",
							!preferences.sound && "text-muted-foreground"
						)}
					>
						{volumePercent}%
					</span>
				</div>
				<Slider
					type="single"
					min={0}
					max={100}
					step={5}
					value={volumePercent}
					onValueChange={(value) => preferences.setVolume(value / 100)}
					disabled={!preferences.sound}
					thumbLabel="Volume"
				/>
			</div>
			<div class="flex items-center gap-4 p-4">
				{@render row("music", "Background music", "A quiet retro loop.")}
				<Switch
					id="music"
					checked={preferences.music}
					onCheckedChange={(value) => preferences.setMusic(value)}
					disabled={!preferences.sound}
				/>
			</div>
			<div class="flex items-center gap-4 p-4">
				{@render row("ui-sounds", "Click sounds", "A soft tick when you press a button.")}
				<Switch
					id="ui-sounds"
					checked={preferences.uiSounds}
					onCheckedChange={(value) => {
						preferences.setUiSounds(value);
						if (value) playClickSound();
					}}
					disabled={!preferences.sound}
				/>
			</div>
			<div class="flex items-center gap-4 p-4">
				{@render row(
					"turn-alert",
					"Your-turn alert",
					"Flash the tab title and chime when it's your turn in a background tab."
				)}
				<Switch
					id="turn-alert"
					checked={preferences.turnAlert}
					onCheckedChange={(value) => preferences.setTurnAlert(value)}
				/>
			</div>
		</div>
	</section>

	<section class="flex flex-col gap-2">
		<h2 class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Motion</h2>
		<div class="flex flex-col gap-3 rounded-xl border bg-muted/40 p-4 backdrop-blur-sm">
			<div class="flex flex-col gap-0.5">
				<p id="motion-label" class="text-sm font-medium">Reduce motion</p>
				<p class="text-caption text-muted-foreground">
					Follow your system setting, or always turn animations off.
				</p>
			</div>
			<Tabs
				aria-labelledby="motion-label"
				items={MOTION_ITEMS}
				value={preferences.motion}
				onValueChange={(value) => preferences.setMotion(value)}
			/>
		</div>
	</section>

	<section class="flex flex-col gap-2">
		<h2 class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">New game</h2>
		<div class="flex flex-col divide-y rounded-xl border bg-muted/40 backdrop-blur-sm">
			<div class="flex flex-col gap-3 p-4">
				<p id="opponent-label" class="text-sm font-medium">Opponent</p>
				<Tabs
					aria-labelledby="opponent-label"
					items={OPPONENT_ITEMS}
					value={preferences.newGameOpponent}
					onValueChange={(value) => preferences.setNewGameOpponent(value)}
				/>
			</div>
			<div class="flex flex-col gap-3 p-4">
				<p id="clock-label" class="text-sm font-medium">Clock</p>
				<Tabs
					aria-labelledby="clock-label"
					items={CLOCK_ITEMS}
					value={preferences.newGameClock}
					onValueChange={(value) => preferences.setNewGameClock(value)}
				/>
			</div>
		</div>
	</section>
</div>
