<script lang="ts">
	import { Check, FastForward, RotateCcw } from "@lucide/svelte";
	import { Button } from "$lib/components/ui";
	import { ACCENTS, cn } from "$lib/utils/style";
	import { getAboutBuild } from "./build.svelte.js";
	import { TEAM } from "./plan.js";

	const build = getAboutBuild();

	function onKeydown(event: KeyboardEvent) {
		if (event.key === "Escape" && build.isBuilding) build.skip();
	}
</script>

<svelte:window onkeydown={onKeydown} />

<!-- A status line under the hero, not a live region: progress changes many times a second and
     would flood screen readers. Its size never depends on the label, so states swap in place. -->
<div
	class="relative flex h-16 items-center gap-4 border-y sm:h-14"
	data-build="pop"
	data-phase={build.phase}
>
	<div class="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-5">
		<span data-build-item class="flex shrink-0 items-center gap-1.5" aria-hidden="true">
			{#each TEAM as agent, index (agent.name)}
				<span
					class={cn(
						"size-2 rounded-full transition-opacity duration-300",
						build.isBuilding && index >= build.joined && "opacity-20"
					)}
					style:background-color={agent.color}
					title={agent.name}
				></span>
			{/each}
		</span>
		<span data-build-item class="flex min-w-0 items-center gap-2 font-mono text-caption">
			<span class="grid size-3.5 shrink-0 place-items-center" aria-hidden="true">
				{#if build.isBuilding}
					<span class={cn("size-1.5 rounded-full motion-safe:animate-pulse", ACCENTS[0].bg)}></span>
				{:else}
					<Check class={cn("size-3.5", ACCENTS[0].text)} />
				{/if}
			</span>
			<span class="truncate whitespace-nowrap tabular-nums">{build.hudLabel}</span>
		</span>
	</div>
	<Button
		variant="outline"
		class="h-11 w-28 shrink-0 gap-2 rounded-lg"
		aria-keyshortcuts={build.isBuilding ? "Escape" : undefined}
		onclick={() => (build.isBuilding ? build.skip() : build.replay())}
	>
		{#if build.isBuilding}
			<FastForward />
			Skip
		{:else}
			<RotateCcw />
			Replay
		{/if}
	</Button>
	<span
		class="absolute inset-x-0 -bottom-px h-px origin-left bg-linear-to-r from-seat-0 to-seat-1 transition-transform duration-300"
		style:transform="scaleX({build.progress})"
		aria-hidden="true"
	></span>
</div>
