<script lang="ts" module>
	import type { HTMLAnchorAttributes } from "svelte/elements";
	import type { VariantProps } from "tailwind-variants";
	import { tv } from "$lib/utils/style";

	export const linkVariants = tv({
		base: "inline-flex items-center rounded-md font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
		variants: {
			current: {
				true: "bg-muted text-foreground",
				false: "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
			},
			layout: {
				inline: "gap-1.5 px-2.5 py-1.5 text-sm",
				stacked: "min-w-0 flex-1 flex-col gap-0.5 px-1 py-1 text-caption"
			}
		},
		compoundVariants: [
			{ layout: "stacked", current: true, class: "bg-transparent [&_svg]:text-seat-0" },
			{ layout: "stacked", current: false, class: "hover:bg-transparent" }
		],
		defaultVariants: {
			current: false,
			layout: "inline"
		}
	});

	export type LinkLayout = VariantProps<typeof linkVariants>["layout"];

	export type LinkProps = HTMLAnchorAttributes & {
		href: string;
		pathname: string;
		layout?: LinkLayout;
	};
</script>

<script lang="ts">
	import { isCurrentPath } from "$lib/utils/navigation";
	import { cn } from "$lib/utils/style";

	let {
		href,
		pathname,
		layout = "inline",
		class: className,
		children,
		...restProps
	}: LinkProps = $props();

	const isCurrent = $derived(isCurrentPath(pathname, href));
</script>

<a
	{href}
	data-slot="link"
	aria-current={isCurrent ? "page" : undefined}
	class={cn(linkVariants({ current: isCurrent, layout }), className)}
	{...restProps}
>
	{@render children?.()}
</a>
