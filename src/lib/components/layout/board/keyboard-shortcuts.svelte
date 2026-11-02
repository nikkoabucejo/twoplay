<script lang="ts">
	import { Keyboard } from "@lucide/svelte";
	import {
		buttonVariants,
		Tooltip,
		TooltipContent,
		TooltipProvider,
		TooltipTrigger
	} from "$lib/components/ui";

	const SHORTCUTS = [
		{ keys: ["←", "→", "↑", "↓"], label: "Move on the board" },
		{ keys: ["[", "]"], label: "Step through moves" },
		{ keys: ["Esc"], label: "Close" }
	];
</script>

<TooltipProvider delayDuration={150}>
	<Tooltip>
		<TooltipTrigger
			aria-label="Keyboard shortcuts"
			class={buttonVariants({ variant: "ghost", size: "icon-sm" })}
		>
			<Keyboard />
		</TooltipTrigger>
		<TooltipContent
			side="bottom"
			sideOffset={8}
			class="block rounded-lg border bg-popover p-3 text-popover-foreground shadow-md"
			arrowClasses="bg-popover fill-popover"
		>
			<ul class="flex flex-col gap-2">
				{#each SHORTCUTS as shortcut (shortcut.label)}
					<li class="flex items-center gap-3 whitespace-nowrap">
						<span class="flex w-24 shrink-0 gap-1">
							{#each shortcut.keys as key (key)}
								<kbd
									class="inline-flex h-5 min-w-5 items-center justify-center rounded-sm border bg-muted px-1 font-mono text-caption text-muted-foreground"
								>
									{key}
								</kbd>
							{/each}
						</span>
						<span>{shortcut.label}</span>
					</li>
				{/each}
			</ul>
		</TooltipContent>
	</Tooltip>
</TooltipProvider>
