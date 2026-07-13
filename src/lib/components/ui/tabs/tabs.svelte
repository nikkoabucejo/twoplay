<script lang="ts" module>
	import { cn } from "$lib/utils/style";
	import { tv } from "tailwind-variants";
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
		base: "focus-visible:border-ring focus-visible:ring-ring/50 flex-1 px-3 py-1.5 font-medium outline-none transition-colors focus-visible:ring-3",
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
</script>

<div
	data-slot="tabs"
	role="tablist"
	class={cn("flex w-full overflow-hidden rounded-lg border text-xs", className)}
	{...restProps}
>
	{#each items as item, i (item.value)}
		{@const isActive = item.value === value}
		<button
			type="button"
			role="tab"
			aria-selected={isActive}
			{disabled}
			class={cn(tabButtonVariants({ active: isActive, disabled }), i > 0 && "border-l")}
			onclick={() => onValueChange(item.value)}
		>
			{item.label}
		</button>
	{/each}
</div>
