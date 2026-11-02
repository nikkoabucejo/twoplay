<script lang="ts" module>
	import { cn, tv } from "$lib/utils/style";
	import type { HTMLAttributes } from "svelte/elements";

	export type TabItem<T> = {
		value: T;
		label: string;
	};

	export type TabsProps<T> = HTMLAttributes<HTMLDivElement> & {
		items: TabItem<T>[];
		value: T;
		onValueChange: (value: T) => void;
		disabled?: boolean;
		class?: string;
	};

	const tabButtonVariants = tv({
		base: "focus-visible:border-ring focus-visible:ring-ring/50 flex-1 px-3 py-1.5 font-medium outline-none transition-colors first:rounded-l-md last:rounded-r-md focus-visible:relative focus-visible:z-10 focus-visible:ring-3",
		variants: {
			active: {
				true: "bg-primary text-primary-foreground",
				false: "text-muted-foreground hover:bg-muted"
			},
			disabled: {
				true: "",
				false: ""
			}
		},
		compoundVariants: [
			{ active: false, disabled: true, class: "text-muted-foreground/40 hover:bg-transparent" }
		],
		defaultVariants: {
			active: false,
			disabled: false
		}
	});
</script>

<script lang="ts" generics="T">
	let {
		items,
		value,
		onValueChange,
		disabled = false,
		class: className,
		...restProps
	}: TabsProps<T> = $props();

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
		onValueChange(items[target].value);
		buttons[target].focus();
	}
</script>

<div
	data-slot="tabs"
	role="radiogroup"
	class={cn("flex w-full rounded-lg border text-xs", className)}
	{...restProps}
>
	{#each items as item, i (item.value)}
		{@const isActive = item.value === value}
		<button
			type="button"
			role="radio"
			aria-checked={isActive}
			tabindex={isActive ? 0 : -1}
			{disabled}
			bind:this={buttons[i]}
			class={cn(tabButtonVariants({ active: isActive, disabled }), i > 0 && "border-l")}
			onclick={() => onValueChange(item.value)}
			onkeydown={(event) => onkeydown(event, i)}
		>
			{item.label}
		</button>
	{/each}
</div>
