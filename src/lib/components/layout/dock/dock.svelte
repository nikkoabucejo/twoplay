<script lang="ts" module>
	export type DockProps = {
		pathname: string;
	};
</script>

<script lang="ts">
	import { Link } from "$lib/components/ui";
	import { NAV_ITEMS } from "$lib/utils/navigation";

	let { pathname }: DockProps = $props();
</script>

<nav
	aria-label="Main"
	class="flex shrink-0 gap-1 border-t bg-background/80 px-2 pt-1.5 pb-[calc(env(safe-area-inset-bottom)+0.375rem)] backdrop-blur-sm sm:hidden"
>
	{#each NAV_ITEMS as item (item.href)}
		<Link href={item.href} {pathname} layout="stacked">
			<item.icon class="size-5" />
			{item.label}
		</Link>
	{/each}
</nav>
