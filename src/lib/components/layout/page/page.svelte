<script lang="ts" module>
	import type { Snippet } from "svelte";

	export type PageProps = {
		children: Snippet;
		/** Renders the page's single `h1`. */
		title?: string;
		description?: string;
		actions?: Snippet;
		/** Classes for the title block, e.g. `sr-only` to keep the `h1` for screen readers only. */
		titleClass?: string;
		/** Beside the content from `lg`, below it under `lg`. */
		sidebar?: Snippet;
		class?: string;
	};
</script>

<script lang="ts">
	import { cn } from "$lib/utils/style";

	let {
		children,
		title,
		description,
		actions,
		titleClass,
		sidebar,
		class: className
	}: PageProps = $props();
</script>

<div class={cn("mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6", className)}>
	{#if title}
		<div class={cn("flex flex-wrap items-end justify-between gap-3", titleClass)}>
			<div class="flex min-w-0 flex-col gap-1">
				<h1 class="text-2xl font-bold tracking-tight">{title}</h1>
				{#if description}
					<p class="text-sm text-muted-foreground">{description}</p>
				{/if}
			</div>
			{#if actions}
				<div class="flex shrink-0 items-center gap-2">{@render actions()}</div>
			{/if}
		</div>
	{/if}
	{#if sidebar}
		<div class="grid flex-1 gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
			<div class="flex min-w-0 flex-col gap-6">{@render children()}</div>
			<aside class="flex min-w-0 flex-col gap-6">{@render sidebar()}</aside>
		</div>
	{:else}
		{@render children()}
	{/if}
</div>
