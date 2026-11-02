<script lang="ts" module>
	import type { Snippet } from "svelte";

	export type ConfirmProps = {
		open?: boolean;
		title: string;
		/** The consequence, in one short line. */
		description?: string;
		confirmLabel: string;
		onConfirm: () => void;
		/** The button that opens it. Spread `props` onto it. */
		trigger?: Snippet<[{ props: Record<string, unknown> }]>;
		/** Positions it without a trigger, for a confirm opened from a menu. Focus returns to the
		 *  first button inside on close. */
		anchor?: HTMLElement | null;
		side?: "top" | "bottom";
		align?: "start" | "center" | "end";
		class?: string;
	};
</script>

<script lang="ts">
	import { TriangleAlert } from "@lucide/svelte";
	import { cn } from "$lib/utils/style";
	import { Button } from "../button/index.js";
	import { Popover, PopoverContent, PopoverTrigger } from "../popover/index.js";

	let {
		open = $bindable(false),
		title,
		description,
		confirmLabel,
		onConfirm,
		trigger,
		anchor = null,
		side = "top",
		align = "center",
		class: className
	}: ConfirmProps = $props();

	const id = $props.id();
	let triggerRef = $state<HTMLElement | null>(null);

	function confirm() {
		open = false;
		onConfirm();
	}

	function returnFocus(event: Event) {
		// Safari doesn't focus a clicked button, so the default restore would land on body.
		event.preventDefault();
		(triggerRef ?? anchor?.querySelector<HTMLElement>("button"))?.focus();
	}
</script>

<Popover bind:open>
	{#if trigger}
		<PopoverTrigger bind:ref={triggerRef}>
			{#snippet child({ props })}
				{@render trigger({ props })}
			{/snippet}
		</PopoverTrigger>
	{/if}
	<PopoverContent
		customAnchor={trigger ? undefined : anchor}
		{side}
		{align}
		sideOffset={8}
		collisionPadding={8}
		role="alertdialog"
		aria-labelledby="{id}-title"
		aria-describedby={description ? `${id}-description` : undefined}
		onCloseAutoFocus={returnFocus}
		class={cn("flex w-72 flex-col gap-4 p-4", className)}
	>
		<div class="flex items-start gap-3">
			<span
				class="flex size-9 shrink-0 items-center justify-center rounded-full bg-destructive/15 text-destructive ring-1 ring-destructive/30"
				aria-hidden="true"
			>
				<TriangleAlert class="size-4" />
			</span>
			<div class="flex min-w-0 flex-col gap-1 pt-0.5">
				<h2 id="{id}-title" class="text-sm font-semibold">{title}</h2>
				{#if description}
					<p id="{id}-description" class="text-caption text-muted-foreground">{description}</p>
				{/if}
			</div>
		</div>
		<div class="flex justify-end gap-2">
			<Button variant="ghost" size="sm" onclick={() => (open = false)}>Cancel</Button>
			<Button variant="destructive" size="sm" onclick={confirm}>{confirmLabel}</Button>
		</div>
	</PopoverContent>
</Popover>
