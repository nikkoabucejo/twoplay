<script lang="ts">
	import { KofiIcon } from "$lib/assets/icons/brand";
	import { linkVariants } from "$lib/components/ui";
	import { SUPPORT_URL } from "$lib/utils/navigation";
	import { cn } from "$lib/utils/style";
</script>

<footer
	class="mt-auto flex shrink-0 items-center justify-center gap-3 border-t px-4 py-6 text-xs text-muted-foreground"
>
	<a
		href={SUPPORT_URL}
		target="_blank"
		rel="noopener noreferrer"
		class={cn(linkVariants(), "px-2 py-1 text-xs")}
	>
		<KofiIcon class="size-4" />
		Support
	</a>
	<span class="whitespace-nowrap">© 2026 twoplay</span>
</footer>
