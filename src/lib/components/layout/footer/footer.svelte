<script lang="ts">
	import { KofiIcon } from "$lib/assets/icons/brand";
	import { linkVariants } from "$lib/components/ui";
	import { SUPPORT_URL } from "$lib/utils/navigation";
	import { cn } from "$lib/utils/style";

	const LINKS = [
		{ href: "/how-to-play", label: "How to play" },
		{ href: "/tour", label: "Tour" },
		{ href: "/about", label: "About" },
		{ href: "/privacy", label: "Privacy" },
		{ href: "/terms", label: "Terms" }
	];
</script>

<footer
	class="flex shrink-0 items-center justify-between gap-2 border-t px-3 py-2 text-caption text-muted-foreground sm:px-4"
>
	<nav aria-label="Footer" class="flex min-w-0 items-center sm:gap-2">
		{#each LINKS as link (link.href)}
			<a
				href={link.href}
				class={cn(linkVariants(), "px-1 py-1 text-caption whitespace-nowrap sm:px-1.5")}
				>{link.label}</a
			>
		{/each}
	</nav>
	<!-- Below sm only the icon shows, so the footer stays one row; the label stays for screen readers. -->
	<a
		href={SUPPORT_URL}
		target="_blank"
		rel="noopener noreferrer"
		class={cn(linkVariants(), "shrink-0 gap-1 px-1.5 py-1 text-caption whitespace-nowrap")}
	>
		<KofiIcon class="size-3.5" />
		<span class="max-sm:sr-only">Support</span>
	</a>
</footer>
