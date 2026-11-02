<script lang="ts">
	import { ChevronRight } from "@lucide/svelte";
	import { GAMES } from "$lib/features/play";
	import type { GameType } from "../../../../../convex/models/games/index.js";
	import Preview from "./preview.svelte";

	let { type }: { type: GameType } = $props();
</script>

<li>
	<a
		href="/play?game={type}"
		class="group hover-ring flex items-center gap-4 rounded-xl border bg-muted/40 p-4 outline-none focus-visible:ring-2 focus-visible:ring-ring hover:border-foreground/20 hover:bg-muted/60"
	>
		<Preview {type} />
		<span class="flex min-w-0 flex-1 flex-col gap-1">
			<span class="font-semibold whitespace-nowrap">{GAMES[type].name}</span>
			<span class="text-sm text-muted-foreground">{GAMES[type].description}</span>
		</span>
		<ChevronRight
			class="size-4 shrink-0 text-muted-foreground opacity-60 group-hover:opacity-100"
			aria-hidden="true"
		/>
	</a>
</li>
