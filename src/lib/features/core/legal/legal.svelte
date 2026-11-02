<script lang="ts" module>
	import type { Component } from "svelte";

	export type LegalHighlight = { icon: Component<{ class?: string }>; label: string };
	export type LegalSection = { id: string; heading: string; paragraphs: readonly string[] };
</script>

<script lang="ts">
	import type { Attachment } from "svelte/attachments";
	import { pushState } from "$app/navigation";
	import { ACCENTS, cn } from "$lib/utils/style";
	import { isMotionReduced } from "../rules/index.js";
	import { activeSection, sectionFromHash } from "./sections.js";

	let {
		updated,
		highlights,
		sections
	}: {
		/** ISO date of the last edit. */
		updated: string;
		highlights: readonly LegalHighlight[];
		sections: readonly LegalSection[];
	} = $props();

	const updatedLabel = $derived(
		new Date(updated).toLocaleDateString("en-US", {
			year: "numeric",
			month: "long",
			day: "numeric",
			timeZone: "UTC"
		})
	);

	let activeId = $state<string | null>(null);
	/** A section jumped to; it stays marked until the reader scrolls on their own. */
	let pinnedId: string | null = null;

	function scrollParent(element: HTMLElement): HTMLElement {
		for (let node = element.parentElement; node; node = node.parentElement) {
			if (/auto|scroll/.test(getComputedStyle(node).overflowY)) return node;
		}
		return document.documentElement;
	}

	const trackSections: Attachment<HTMLElement> = (container) => {
		const scroller = scrollParent(container);
		const elements = [...container.querySelectorAll<HTMLElement>("section[id]")];

		function update() {
			if (pinnedId) return;
			const viewTop = scroller.getBoundingClientRect().top;
			activeId = activeSection(
				elements.map((element) => ({
					id: element.id,
					top: element.getBoundingClientRect().top - viewTop
				})),
				scroller.clientHeight * 0.3,
				scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2
			);
		}

		function release() {
			pinnedId = null;
		}

		pinnedId = sectionFromHash(
			location.hash,
			sections.map(({ id }) => id)
		);
		if (pinnedId) activeId = pinnedId;
		else update();

		scroller.addEventListener("scroll", update, { passive: true });
		scroller.addEventListener("scrollend", release);
		scroller.addEventListener("wheel", release, { passive: true });
		scroller.addEventListener("touchstart", release, { passive: true });
		return () => {
			scroller.removeEventListener("scroll", update);
			scroller.removeEventListener("scrollend", release);
			scroller.removeEventListener("wheel", release);
			scroller.removeEventListener("touchstart", release);
		};
	};

	/** Scrolls to the section, focuses its heading, and records the hash. */
	function jump(event: MouseEvent, id: string) {
		if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
			return;
		}
		const section = document.getElementById(id);
		if (!section) return;
		event.preventDefault();
		pinnedId = id;
		activeId = id;
		section.scrollIntoView({ behavior: isMotionReduced() ? "instant" : "smooth", block: "start" });
		document.getElementById(`${id}-heading`)?.focus({ preventScroll: true });
		pushState(`#${id}`, {});
	}

	function number(index: number): string {
		return (index + 1).toString().padStart(2, "0");
	}
</script>

<div class="flex flex-col gap-10">
	<section
		aria-labelledby="legal-summary"
		class="flex flex-col gap-4 rounded-2xl border bg-muted/30 p-4 backdrop-blur-sm sm:p-5"
	>
		<div class="flex flex-wrap items-center justify-between gap-2">
			<h2
				id="legal-summary"
				class="font-mono text-caption tracking-widest text-muted-foreground uppercase"
			>
				In short
			</h2>
			<p class="text-caption text-muted-foreground">
				Updated <time datetime={updated}>{updatedLabel}</time>
			</p>
		</div>
		<ul class="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
			{#each highlights as highlight, index (highlight.label)}
				<li
					class="flex min-w-0 items-center gap-2.5 rounded-xl border bg-background/40 p-2.5 sm:gap-3 sm:p-3"
				>
					<span
						class={cn(
							"flex size-8 shrink-0 items-center justify-center rounded-lg sm:size-9",
							ACCENTS[index % 2].tintBg,
							ACCENTS[index % 2].text
						)}
						aria-hidden="true"
					>
						<highlight.icon class="size-4" />
					</span>
					<span class="min-w-0 truncate text-sm font-medium whitespace-nowrap"
						>{highlight.label}</span
					>
				</li>
			{/each}
		</ul>
	</section>

	<div class="grid gap-10 lg:grid-cols-[12rem_minmax(0,1fr)]">
		<!-- Two columns of jump links under lg; a sticky list beside the text from lg. -->
		<nav aria-label="On this page">
			<ol class="grid grid-cols-2 gap-1.5 lg:sticky lg:top-6 lg:grid-cols-1 lg:gap-1">
				{#each sections as section, index (section.id)}
					{@const isActive = activeId === section.id}
					<li class="min-w-0">
						<a
							href="#{section.id}"
							aria-current={isActive ? "location" : undefined}
							class={cn(
								"flex min-w-0 items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm whitespace-nowrap outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
								isActive
									? "selected-ring bg-muted/60 text-foreground"
									: "hover-ring bg-muted/20 text-muted-foreground hover:text-foreground"
							)}
							onclick={(event) => jump(event, section.id)}
						>
							<span
								class={cn(
									"shrink-0 font-mono text-caption tabular-nums",
									isActive && ACCENTS[index % 2].text
								)}
							>
								{number(index)}
							</span>
							<span class="min-w-0 truncate">{section.heading}</span>
						</a>
					</li>
				{/each}
			</ol>
		</nav>

		<div class="flex flex-col gap-10" {@attach trackSections}>
			{#each sections as section, index (section.id)}
				<section
					id={section.id}
					aria-labelledby="{section.id}-heading"
					class="flex scroll-mt-6 gap-4 sm:gap-6"
				>
					<span
						class="w-8 shrink-0 font-mono text-xl font-semibold text-muted-foreground/60 tabular-nums sm:w-10 sm:text-2xl"
						aria-hidden="true"
					>
						{number(index)}
					</span>
					<div class="flex max-w-prose min-w-0 flex-col gap-3">
						<h2 id="{section.id}-heading" tabindex="-1" class="text-lg font-semibold outline-none">
							{section.heading}
						</h2>
						{#each section.paragraphs as paragraph (paragraph)}
							<p class="text-sm/7 text-muted-foreground">{paragraph}</p>
						{/each}
					</div>
				</section>
			{/each}
		</div>
	</div>
</div>
