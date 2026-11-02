<script lang="ts" module>
	export const REPO_URL = "https://github.com/nikkoabucejo/twoplay";

	/** Milestones from the git history, oldest first. */
	export const TIMELINE: readonly { date: string; title: string; body: string }[] = [
		{
			date: "2026-07-11",
			title: "First commit",
			body: "Tic-tac-toe, then Clerk sign-in and Convex rooms the same day."
		},
		{
			date: "2026-07-12",
			title: "Checkers",
			body: "A second game, with a flipped board and live cursors."
		},
		{
			date: "2026-07-13",
			title: "Agents and clocks",
			body: "The first agents and skills, and a clock for each player."
		},
		{
			date: "2026-07-15",
			title: "Find match and ratings",
			body: "Waiting players get paired, and results move a rating."
		},
		{
			date: "2026-11-02",
			title: "One command",
			body: "Specs, Vitest, and two-browser QA behind a single workflow."
		},
		{
			date: "2026-11-02",
			title: "App shell polish",
			body: "Navigation, metadata, accessibility, and zero layout shift."
		},
		{
			date: "2026-11-02",
			title: "Optimistic moves",
			body: "Your own moves show at once and roll back if the server says no."
		},
		{
			date: "2026-11-02",
			title: "Round settlement",
			body: "Rounds settle on the server the moment they end."
		}
	];
</script>

<script lang="ts">
	import {
		ArrowUpRight,
		CodeXml,
		FlaskConical,
		Layers,
		Radio,
		ShieldCheck,
		Timer,
		Zap
	} from "@lucide/svelte";
	import { Button } from "$lib/components/ui";
	import { ACCENTS, cn } from "$lib/utils/style";

	const STORY = [
		{
			title: "A simple product on purpose",
			body: "Tic-tac-toe and checkers keep the product out of the way. What twoplay shows is the engineering underneath: real-time sync, a server that decides everything, and tests that mean something."
		},
		{
			title: "A React developer in Svelte",
			body: "Nikko comes from React. SvelteKit, Svelte 5, and Convex were all new, chosen on purpose. With agents doing the typing, syntax stopped being the bottleneck and engineering judgment carried over."
		},
		{
			title: "One engineer, nine agents",
			body: "Every request goes through one command. Agents triage it, write the spec, build it, test it, play it live in two browsers, review it, and commit it. Nikko approves every plan, and agents never push or deploy."
		}
	];

	const PIPELINE: { label: string; isEngineer?: boolean }[] = [
		{ label: "Triage" },
		{ label: "Spec" },
		{ label: "Approval", isEngineer: true },
		{ label: "Build" },
		{ label: "Tests" },
		{ label: "Live QA" },
		{ label: "Review" },
		{ label: "Commit" }
	];

	const INTERNALS = [
		{
			icon: Radio,
			title: "Real-time, no socket code",
			body: "Moves, clocks, cursors, and the lobby sync through Convex live queries."
		},
		{
			icon: ShieldCheck,
			title: "The server decides",
			body: "Every move, clock, result, and rating is checked again on the server."
		},
		{
			icon: Zap,
			title: "Optimistic moves",
			body: "Your move shows at once and rolls back with a toast if the server rejects it."
		},
		{
			icon: Layers,
			title: "One engine, two places",
			body: "The browser predicts moves with the same engine file the server runs."
		},
		{
			icon: Timer,
			title: "Server-timed clocks",
			body: "The server stores banked time and a start time. Browsers count down locally."
		},
		{
			icon: FlaskConical,
			title: "Tests and live QA",
			body: "Vitest across the backend, logic, and UI, and an agent that plays the game against itself in two browsers."
		}
	];

	function formatDate(date: string): string {
		return new Date(date).toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
			timeZone: "UTC"
		});
	}
</script>

<div class="flex flex-col gap-14 sm:gap-20">
	<section class="relative isolate overflow-hidden rounded-3xl border">
		<div
			class="absolute inset-0 -z-10 bg-linear-to-br from-seat-0/15 via-transparent to-seat-1/15"
			aria-hidden="true"
		></div>
		<div class="flex flex-col items-center gap-3 px-5 py-12 text-center sm:py-16">
			<p class="font-mono text-caption tracking-widest text-muted-foreground uppercase">About</p>
			<h1 class="text-4xl font-bold tracking-tight sm:text-5xl">
				How <span class="text-seat-0">two</span><span class="text-seat-1">play</span> came to be
			</h1>
			<p class="max-w-md text-muted-foreground">
				Real-time two-player games, built by a team of AI agents with one engineer in charge.
			</p>
		</div>
	</section>

	<section aria-labelledby="about-story" class="flex flex-col gap-5">
		<h2 id="about-story" class="text-xl font-bold tracking-tight">Why it exists</h2>
		<div class="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
			<div class="flex max-w-prose flex-col gap-6">
				{#each STORY as part (part.title)}
					<div class="flex flex-col gap-1.5">
						<h3 class="font-semibold">{part.title}</h3>
						<p class="text-sm/7 text-muted-foreground">{part.body}</p>
					</div>
				{/each}
			</div>

			<div class="flex flex-col gap-3 self-start rounded-2xl border bg-muted/30 p-4 sm:p-5">
				<h3 class="font-mono text-caption tracking-widest text-muted-foreground uppercase">
					One request
				</h3>
				<ol class="grid grid-cols-2 gap-2">
					{#each PIPELINE as step, index (step.label)}
						<li
							class={cn(
								"flex min-w-0 items-center gap-2 rounded-xl border px-3 py-2 text-sm whitespace-nowrap",
								step.isEngineer
									? cn("selected-ring font-medium", ACCENTS[1].tintBg, ACCENTS[1].text)
									: "bg-background/40"
							)}
						>
							<span class="shrink-0 font-mono text-caption text-muted-foreground tabular-nums">
								{(index + 1).toString().padStart(2, "0")}
							</span>
							<span class="min-w-0 truncate">{step.label}</span>
						</li>
					{/each}
				</ol>
				<p class="text-caption text-muted-foreground">
					Nikko gives the approval. Agents do the rest.
				</p>
			</div>
		</div>
	</section>

	<section aria-labelledby="about-timeline" class="flex flex-col gap-5">
		<h2 id="about-timeline" class="text-xl font-bold tracking-tight">Timeline</h2>
		<ol class="flex flex-col rounded-2xl border bg-muted/30 p-4 sm:p-6">
			{#each TIMELINE as milestone, index (milestone.title)}
				{@const isLast = index === TIMELINE.length - 1}
				<li class="grid grid-cols-[5.5rem_0.625rem_minmax(0,1fr)] gap-x-3 sm:gap-x-4">
					<time
						datetime={milestone.date}
						class="pt-0.5 text-right font-mono text-caption whitespace-nowrap text-muted-foreground tabular-nums"
					>
						{formatDate(milestone.date)}
					</time>
					<div class="flex flex-col items-center" aria-hidden="true">
						<span class={cn("mt-1.5 size-2.5 shrink-0 rounded-full", ACCENTS[index % 2].bg)}></span>
						{#if !isLast}
							<span class="mt-1.5 w-px flex-1 bg-border"></span>
						{/if}
					</div>
					<div class={cn("flex min-w-0 flex-col gap-0.5", !isLast && "pb-6")}>
						<h3 class="text-sm font-semibold">{milestone.title}</h3>
						<p class="text-sm text-muted-foreground">{milestone.body}</p>
					</div>
				</li>
			{/each}
		</ol>
	</section>

	<section aria-labelledby="about-internals" class="flex flex-col gap-5">
		<h2 id="about-internals" class="text-xl font-bold tracking-tight">Under the hood</h2>
		<ul class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
			{#each INTERNALS as item, index (item.title)}
				<li class="flex gap-3 rounded-2xl border bg-muted/30 p-4">
					<span
						class={cn(
							"flex size-9 shrink-0 items-center justify-center rounded-lg",
							ACCENTS[index % 2].tintBg,
							ACCENTS[index % 2].text
						)}
						aria-hidden="true"
					>
						<item.icon class="size-4" />
					</span>
					<div class="flex min-w-0 flex-col gap-1">
						<h3 class="text-sm font-semibold">{item.title}</h3>
						<p class="text-sm text-muted-foreground">{item.body}</p>
					</div>
				</li>
			{/each}
		</ul>
		<div class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3">
			<p class="text-sm text-muted-foreground">
				This page is how it was built. The tour is how it plays.
			</p>
			<Button href="/tour" variant="outline">Take the tour</Button>
		</div>
	</section>

	<section
		aria-labelledby="about-credit"
		class="flex flex-col items-center gap-5 rounded-3xl border bg-muted/30 px-5 py-10 text-center"
	>
		<div class="flex flex-col items-center gap-2">
			<h2 id="about-credit" class="text-2xl font-bold tracking-tight">Made by Nikko Abucejo</h2>
			<p class="max-w-md text-sm text-muted-foreground">
				Built with a team of AI agents. The code, specs, and agent setup are on GitHub.
			</p>
		</div>
		<a
			href={REPO_URL}
			target="_blank"
			rel="noopener noreferrer"
			class="hover-ring flex w-full max-w-xs min-w-0 items-center gap-3 rounded-xl border bg-background/40 p-3 text-left transition-colors outline-none hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring"
		>
			<span
				class={cn(
					"flex size-10 shrink-0 items-center justify-center rounded-lg",
					ACCENTS[0].tintBg,
					ACCENTS[0].text
				)}
				aria-hidden="true"
			>
				<CodeXml class="size-5" />
			</span>
			<span class="flex min-w-0 flex-1 flex-col">
				<span class="text-sm font-medium whitespace-nowrap">Source on GitHub</span>
				<span class="truncate font-mono text-caption text-muted-foreground">
					nikkoabucejo/twoplay
				</span>
			</span>
			<span class="sr-only">(opens in a new tab)</span>
			<ArrowUpRight class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
		</a>
	</section>
</div>
