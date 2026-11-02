<script lang="ts">
	import { Emblem } from "$lib/components/ui";
	import { GAMES } from "$lib/features/play";
	import { cn } from "$lib/utils/style";
	import type { GameType } from "../../../../../convex/models/games/index.js";
	import Demo from "./demo.svelte";
	import { RULES } from "./rules.js";

	let { type, class: className }: { type: GameType; class?: string } = $props();
</script>

<!-- A game's way into its lesson: its looping preview above, its name below. -->
<a
	href="/how-to-play/{type}"
	class={cn(
		"hover-ring flex h-full flex-col overflow-hidden rounded-2xl border bg-muted/30 outline-none backdrop-blur-sm transition-colors hover:border-foreground/20 hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring",
		className
	)}
>
	<div
		data-frame
		class="flex aspect-[4/3] items-center justify-center border-b bg-background/30 p-4 sm:p-6"
	>
		<div class="aspect-square h-full">
			<Demo demo={RULES[type].preview} />
		</div>
	</div>
	<div class="flex items-center gap-3 p-4">
		<Emblem
			icon={GAMES[type].icon}
			colors={GAMES[type].colors}
			class="size-10 shrink-0"
			sparkles={false}
		/>
		<span class="flex min-w-0 flex-1 flex-col gap-0.5">
			<span class="font-semibold whitespace-nowrap">{GAMES[type].name}</span>
			<!-- Two lines reserved, so sibling cards keep the same height however the text wraps. -->
			<span class="line-clamp-2 h-10 text-sm text-muted-foreground">{GAMES[type].description}</span>
		</span>
	</div>
</a>
