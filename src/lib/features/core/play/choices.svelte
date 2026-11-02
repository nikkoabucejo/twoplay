<script lang="ts" generics="T extends string">
	import type { Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";
	import { cn } from "$lib/utils/style";

	type ChoicesProps = HTMLAttributes<HTMLDivElement> & {
		items: readonly T[];
		value: T;
		onValueChange: (value: T) => void;
		disabled?: boolean;
		class?: string;
		itemClass?: string;
		/** One item's content. The element with `labelId` names the radio, `hintId` describes it. */
		choice: Snippet<[item: T, ids: { labelId: string; hintId: string }]>;
	};

	let {
		items,
		value,
		onValueChange,
		disabled = false,
		class: className,
		itemClass,
		choice,
		...restProps
	}: ChoicesProps = $props();

	const uid = $props.id();
	const buttons: HTMLButtonElement[] = $state([]);

	function targetIndex(key: string, index: number): number | null {
		const last = items.length - 1;
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

	function onkeydown(event: KeyboardEvent, index: number) {
		if (disabled) return;
		const target = targetIndex(event.key, index);
		if (target === null) return;
		event.preventDefault();
		onValueChange(items[target]);
		buttons[target].focus();
	}
</script>

<div role="radiogroup" class={className} {...restProps}>
	{#each items as item, i (item)}
		{@const isChecked = item === value}
		<button
			type="button"
			role="radio"
			aria-checked={isChecked}
			aria-labelledby="{uid}-{i}-label"
			aria-describedby="{uid}-{i}-hint"
			tabindex={isChecked ? 0 : -1}
			{disabled}
			bind:this={buttons[i]}
			class={cn(
				"min-w-0 cursor-default rounded-xl border text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50 motion-safe:transition-colors",
				isChecked ? "selected-ring bg-background/70" : "hover-ring bg-muted/30 hover:bg-muted/50",
				disabled && !isChecked && "opacity-50",
				itemClass
			)}
			onclick={() => onValueChange(item)}
			onkeydown={(event) => onkeydown(event, i)}
		>
			{@render choice(item, { labelId: `${uid}-${i}-label`, hintId: `${uid}-${i}-hint` })}
		</button>
	{/each}
</div>
