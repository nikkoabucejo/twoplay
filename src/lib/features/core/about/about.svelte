<script lang="ts" module>
	export const REPO_URL = "https://github.com/nikkoabucejo/twoplay";

	/** Milestones from the git history, oldest first. */
	export const TIMELINE: readonly { date: string; hash: string; title: string; body: string }[] = [
		{
			date: "2026-07-11",
			hash: "09fda3a",
			title: "First commit",
			body: "Tic-tac-toe, then Clerk sign-in and Convex rooms the same day."
		},
		{
			date: "2026-07-12",
			hash: "e5c5c65",
			title: "Checkers",
			body: "A second game, with a flipped board and live cursors."
		},
		{
			date: "2026-07-13",
			hash: "79c5ffe",
			title: "Agents and clocks",
			body: "The first agents and skills, and a clock for each player."
		},
		{
			date: "2026-07-15",
			hash: "8ca5fd4",
			title: "Find match and ratings",
			body: "Waiting players get paired, and results move a rating."
		},
		{
			date: "2026-11-02",
			hash: "bd0b44f",
			title: "One command",
			body: "Specs, Vitest, and two-browser QA behind a single workflow."
		},
		{
			date: "2026-11-02",
			hash: "d3ac3cb",
			title: "App shell polish",
			body: "Navigation, metadata, accessibility, and zero layout shift."
		},
		{
			date: "2026-11-02",
			hash: "87903a9",
			title: "Optimistic moves",
			body: "Your own moves show at once and roll back if the server says no."
		},
		{
			date: "2026-11-02",
			hash: "96da485",
			title: "Round settlement",
			body: "Rounds settle on the server the moment they end."
		},
		{
			date: "2026-11-02",
			hash: "1d54e6a",
			title: "Sound and music",
			body: "Click sounds and music scenes that follow the game."
		},
		{
			date: "2026-11-02",
			hash: "b173293",
			title: "Chess",
			body: "A third game, on the same engine contract as the first two."
		},
		{
			date: "2026-11-03",
			hash: "bbb17c6",
			title: "This page",
			body: "Nine agents build the About page live, section by section."
		}
	];
	const STATS: readonly { value: number; suffix?: string; label: string }[] = [
		{ value: 1, label: "engineer" },
		{ value: 9, label: "agents" },
		{ value: 3, label: "games" },
		{ value: 2, suffix: "k+", label: "tests" }
	];

	const BIO =
		"I've built software for years, mostly in React. twoplay is SvelteKit, Svelte 5, and Convex, none of which I had shipped before. I picked that on purpose. With agents doing the typing, syntax stops being the bottleneck, and what I know about building software carries over.";

	const CARRIED = [
		"Trust boundaries",
		"Data modeling",
		"Shared vs. per-game code",
		"Tests that mean something",
		"Spotting slop"
	];

	/** How React mapped to Svelte 5. */
	const MAPPING: readonly { react: string; svelte: string }[] = [
		{ react: "useState", svelte: "$state" },
		{ react: "useMemo", svelte: "$derived" },
		{ react: "useEffect", svelte: "$effect, sparingly" },
		{ react: "Context + provider", svelte: "setContext" },
		{ react: "A custom hook", svelte: "A class with rune fields" },
		{ react: "React Query", svelte: "Convex live queries" }
	];

	const NOTES: readonly { label: string; title: string; body: string }[] = [
		{
			label: "the product",
			title: "Simple games on purpose",
			body: "Tic-tac-toe, checkers, and chess keep the product out of the way. What twoplay shows is the engineering underneath: real-time sync, a server that decides everything, and tests that mean something."
		},
		{
			label: "the stack",
			title: "A new stack on purpose",
			body: "The stack isn't the limit anymore. Engineering judgment is, and it moves with me to any framework. twoplay is the proof."
		},
		{
			label: "the process",
			title: "My first agentic project",
			body: "I designed the system, the rules, and the quality bar. Nine agents did the implementation, testing, review, and QA while I made the calls."
		}
	];

	/** `max` is the end of each readout's tick scale; the needle sits at `value / max`. */
	const HIGHLIGHTS: readonly {
		value: number;
		from?: number;
		decimals?: number;
		suffix?: string;
		unit: string;
		max: number;
		maxLabel: string;
		title: string;
		body: string;
	}[] = [
		{
			value: 9,
			unit: "agents",
			max: 10,
			maxLabel: "10",
			title: "A nine-agent dev team",
			body: "One command takes a request through triage, spec, build, tests, live QA, review, and commit."
		},
		{
			value: 2,
			suffix: "k+",
			unit: "tests",
			max: 2.5,
			maxLabel: "2.5k",
			title: "Tests, plus live QA",
			body: "Vitest across the backend, logic, and UI, and an agent that plays the game against itself in two browsers."
		},
		{
			value: 0,
			from: 0.1443,
			decimals: 4,
			unit: "layout shift",
			max: 0.2,
			maxLabel: "0.2",
			title: "Zero layout shift",
			body: "Measured on every route. Opening a room shifted 0.1443 on mobile. Now it's 0."
		},
		{
			value: 1,
			unit: "engine",
			max: 2,
			maxLabel: "2",
			title: "One engine, two places",
			body: "The browser predicts moves with the same engine file the server runs, so the two can't disagree."
		},
		{
			value: 122,
			unit: "scenarios",
			max: 150,
			maxLabel: "150",
			title: "Spec first",
			body: "One polish change had 122 written scenarios, each mapped to a test or code path before it shipped."
		},
		{
			value: 16,
			unit: "decisions",
			max: 20,
			maxLabel: "20",
			title: "Decisions on record",
			body: "Architecture decisions logged with the reason and what each one replaced."
		},
		{
			value: 400,
			unit: "start rating",
			max: 800,
			maxLabel: "800",
			title: "Ratings and matchmaking",
			body: "Find Match pairs waiting players, and every decisive round moves you 8 points."
		},
		{
			value: 2,
			suffix: " min",
			unit: "sweeps",
			max: 10,
			maxLabel: "10 min",
			title: "A backend that cleans up",
			body: "Crons close empty rooms, forfeit absent players, and clear the queue every 2 minutes."
		}
	];

	/** The eight `/dev:work` steps and who owns each. */
	const PIPELINE: readonly { step: string; owner: string; isEngineer: boolean }[] = [
		{ step: "Triage", owner: "triage", isEngineer: false },
		{ step: "Spec", owner: "architect", isEngineer: false },
		{ step: "Approval", owner: "Nikko", isEngineer: true },
		{ step: "Build", owner: "engineer", isEngineer: false },
		{ step: "Tests", owner: "verifier", isEngineer: false },
		{ step: "Live QA", owner: "qa", isEngineer: false },
		{ step: "Review", owner: "reviewer", isEngineer: false },
		{ step: "Commit", owner: "steward", isEngineer: false }
	];

	const QUOTE =
		"The job shifted from writing code to designing the system that writes it, and deciding what good means.";

	const LESSONS: readonly { title: string; body: string }[] = [
		{
			title: "Orchestration beats prompting",
			body: "A single prompt doesn't build a product. A pipeline of narrow agents with clear inputs and outputs does."
		},
		{
			title: "Control lives in the process",
			body: "Specs, rules, and gates keep agents on track better than correcting them message by message."
		},
		{
			title: "Spec first",
			body: "Code gets checked against written requirements, not a half-remembered request."
		},
		{
			title: 'Evidence before "done"',
			body: '"Fixed" means nothing until tests, types, and a live browser agree.'
		},
		{
			title: "Give agents a map",
			body: "CodeGraph shows every caller of a symbol before an agent edits it, instead of grepping and guessing."
		},
		{
			title: "Every correction becomes a rule",
			body: "A mistake I corrected once went into a skill or the decisions log, so no agent made it twice."
		},
		{
			title: "Visibility matters",
			body: "Background workflows hid what was happening. Now every step is a visible agent with a start and an end."
		},
		{
			title: "The process is code too",
			body: "I refactor the workflow the same way I refactor the app."
		}
	];

	/** From the README's "What's next"; the sitemap item shipped in fc2f8d8. */
	const ROADMAP: readonly { title: string; body: string; when: "next" | "later" }[] = [
		{
			title: "Rate limiting",
			body: "On moves, cursors, room creation, and matchmaking.",
			when: "next"
		},
		{
			title: "More games",
			body: "Chess was the third. The next ones use the same contract: one server engine and one client class.",
			when: "next"
		},
		{
			title: "A smaller rooms module",
			body: "Split into lifecycle, play, and history.",
			when: "later"
		},
		{
			title: "Clock-skew correction",
			body: "So the countdown matches the server on devices with a wrong clock.",
			when: "later"
		}
	];
</script>

<script lang="ts">
	import { ArrowUpRight, CodeXml } from "@lucide/svelte";
	import { untrack } from "svelte";
	import { Button } from "$lib/components/ui";
	import { ACCENTS, cn } from "$lib/utils/style";
	import { setupAboutBuild } from "./build.svelte.js";
	import HeroBoard from "./hero-board.svelte";
	import Hud from "./hud.svelte";
	import Overlay from "./overlay.svelte";
	import { TEAM } from "./plan.js";
	import Readout from "./readout.svelte";
	import Typed from "./typed.svelte";

	let root = $state<HTMLElement>();
	const build = setupAboutBuild(() => root);

	$effect(() => {
		untrack(() => {
			if (build.shouldAutoplay()) build.start();
			else document.documentElement.removeAttribute("data-about-build");
		});
		return () => build.destroy();
	});

	/** The milestone after which the history goes quiet until November. */
	const GAP_AFTER = 3;
	const CREW = `co-authored by ${TEAM.map((agent) => agent.name).join(", ")}`;
	const DIFF_ROW =
		"relative isolate grid grid-cols-[1.75rem_1.75rem_1.25rem_minmax(0,1fr)] px-2 sm:px-3";
	/** The pipeline's rail, through the node centers: vertical below `md`, horizontal from it. */
	const RAIL =
		"pointer-events-none absolute top-7 bottom-7 left-5.5 w-px [container-type:size] md:top-5.5 md:right-[6.25%] md:bottom-auto md:left-[6.25%] md:h-px md:w-auto";
	const GUTTER = "deco pr-2 text-right text-muted-foreground/50 tabular-nums select-none";

	function formatDate(date: string): string {
		return new Date(date).toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
			timeZone: "UTC"
		});
	}

	function pad(n: number): string {
		return n.toString().padStart(2, "0");
	}
</script>

{#snippet heading(id: string, title: string, note: string)}
	<header data-build="type" class="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
		<h2 {id} class="text-2xl font-bold tracking-tight sm:text-3xl"><Typed text={title} /></h2>
		<p class="font-mono text-caption text-muted-foreground"><Typed text={note} /></p>
	</header>
{/snippet}

<div
	bind:this={root}
	class="about-root relative isolate flex flex-col gap-20 sm:gap-28"
	data-phase={build.phase}
>
	<Overlay />

	<div class="flex flex-col gap-4">
		<section
			data-build-section="hero"
			data-build="fill gradient"
			class="surface surface-hero relative isolate rounded-3xl border"
		>
			<div
				class="grid items-center gap-10 px-5 py-10 sm:px-10 sm:py-14 md:grid-cols-[minmax(0,1fr)_15rem] lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-14"
			>
				<div class="flex min-w-0 flex-col gap-5">
					<p
						data-build="type"
						class="font-mono text-caption tracking-widest text-muted-foreground uppercase"
					>
						<Typed text="About" />
					</p>
					<h1
						data-build="type size paint"
						class="origin-left text-4xl/none font-bold tracking-tighter text-balance sm:text-6xl/none"
					>
						<Typed text="How" />
						<span class={ACCENTS[0].text} data-build-paint="0"><Typed text="two" /></span><span
							class={ACCENTS[1].text}
							data-build-paint="1"><Typed text="play" /></span
						>
						<Typed text="came to be" />
					</h1>
					<p data-build="type contrast" class="max-w-md text-muted-foreground sm:text-lg">
						<Typed
							text="Real-time two-player games, built by a team of nine AI agents with one engineer in charge."
						/>
					</p>
					<ul data-build="pop" class="mt-3 grid grid-cols-4">
						{#each STATS as stat (stat.label)}
							<li class="scoreboard flex min-w-0 flex-col gap-1 py-1.5 pl-2.5 sm:pl-4">
								<span class="text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
									<Readout value={stat.value} suffix={stat.suffix} />
								</span>
								<span class="font-mono text-caption text-muted-foreground">{stat.label}</span>
							</li>
						{/each}
					</ul>
				</div>
				<div class="mx-auto aspect-square w-full max-w-64 sm:max-w-72">
					<HeroBoard />
				</div>
			</div>
		</section>
		<div data-build-section="status">
			<Hud />
		</div>
	</div>

	<section
		data-build-section="who-i-am"
		aria-labelledby="about-who"
		class="relative flex flex-col gap-8"
	>
		{@render heading("about-who", "Who I am", "the engineer in charge")}
		<div class="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-12">
			<div data-build="type" class="flex min-w-0 flex-col gap-5">
				<div data-build="layers" class="flex items-center gap-4">
					<span
						data-layer="monogram"
						class="grid size-14 shrink-0 place-items-center rounded-2xl border bg-muted/40 font-mono text-lg font-bold"
						aria-hidden="true"
					>
						<span><span class={ACCENTS[0].text}>N</span><span class={ACCENTS[1].text}>A</span></span
						>
					</span>
					<div data-layer="name" class="flex min-w-0 flex-col gap-0.5">
						<h3 class="text-lg font-semibold"><Typed text="Nikko Abucejo" /></h3>
						<p class="font-mono text-caption text-muted-foreground">
							<Typed text="engineer · React by day" />
						</p>
					</div>
				</div>
				<p class="text-muted-foreground sm:text-lg/8"><Typed text={BIO} /></p>
			</div>

			<div
				data-build="fill radius"
				class="surface surface-code relative isolate min-w-0 self-start overflow-hidden rounded-2xl border font-mono text-xs/6 sm:text-sm/7"
			>
				<p data-build="type" class="rule-b relative px-4 py-2.5 text-muted-foreground">
					<Typed text="diff --git a/react b/svelte-5" />
				</p>
				<div class="flex flex-col py-3">
					<p data-build="type" class="px-4 pb-1 text-muted-foreground">
						<Typed text="@@ -1,12 +1,12 @@ how React mapped to Svelte 5" />
					</p>
					{#each MAPPING as pair, index (pair.react)}
						<div data-build="type">
							<p class={cn(DIFF_ROW, "tint tint-1")}>
								<span class={GUTTER} aria-hidden="true">{index + 1}</span>
								<span aria-hidden="true"></span>
								<span class={cn("deco", ACCENTS[1].text)} aria-hidden="true">-</span>
								<span class="min-w-0 text-foreground/75">
									<span class="sr-only">React:</span>
									<Typed text={pair.react} />
								</span>
							</p>
							<p class={cn(DIFF_ROW, "tint tint-0")}>
								<span aria-hidden="true"></span>
								<span class={GUTTER} aria-hidden="true">{index + 1}</span>
								<span class={cn("deco", ACCENTS[0].text)} aria-hidden="true">+</span>
								<span class="min-w-0">
									<span class="sr-only">Svelte 5:</span>
									<Typed text={pair.svelte} />
								</span>
							</p>
						</div>
					{/each}
					<div data-build="type" class="text-muted-foreground">
						<p class={DIFF_ROW}>
							<span class={GUTTER} aria-hidden="true">{MAPPING.length + 1}</span>
							<span class={GUTTER} aria-hidden="true">{MAPPING.length + 1}</span>
							<span aria-hidden="true"></span>
							<span class="min-w-0"><Typed text="// carried over" /></span>
						</p>
						<ul>
							{#each CARRIED as point, index (point)}
								<li class={DIFF_ROW}>
									<span class={GUTTER} aria-hidden="true">{MAPPING.length + index + 2}</span>
									<span class={GUTTER} aria-hidden="true">{MAPPING.length + index + 2}</span>
									<span aria-hidden="true"></span>
									<span class="min-w-0 text-foreground/85"><Typed text={point} /></span>
								</li>
							{/each}
						</ul>
					</div>
				</div>
			</div>
		</div>
	</section>

	<section
		data-build-section="why-this"
		aria-labelledby="about-why"
		class="relative flex flex-col gap-8"
	>
		{@render heading("about-why", "Why this?", "small product, deep engineering")}
		<div data-build="fill" class="surface relative isolate border-y">
			<span
				data-build="line"
				class="absolute inset-y-0 left-0 w-px bg-seat-1/40 sm:left-40"
				aria-hidden="true"
			></span>
			{#each NOTES as note, index (note.label)}
				<div
					data-build={index === 0 ? "type spacing" : "type"}
					class={cn(
						"relative grid gap-1.5 py-6 pl-5 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-0 sm:pl-0",
						index > 0 && "rule-t"
					)}
				>
					<p class="font-mono text-caption text-muted-foreground sm:pt-1 sm:pr-6 sm:text-right">
						<Typed text={note.label} />
					</p>
					<div class="flex max-w-prose flex-col gap-1.5 sm:pl-6">
						<h3 class="text-lg font-semibold"><Typed text={note.title} /></h3>
						<p class="text-sm/7 text-muted-foreground sm:text-base/7"><Typed text={note.body} /></p>
					</div>
				</div>
			{/each}
		</div>
	</section>

	<section
		data-build-section="highlights"
		aria-labelledby="about-highlights"
		class="relative flex flex-col gap-8"
	>
		{@render heading("about-highlights", "Highlights", "readings from the repo")}
		<ul class="grid grid-cols-2 lg:grid-cols-4">
			{#each HIGHLIGHTS as item, index (item.title)}
				<li
					data-build={index % 2 === 1 ? "type pop align" : "type pop"}
					class="instrument flex min-w-0 flex-col gap-2 px-3 pt-4 pb-7 sm:px-5 sm:pt-5 sm:pb-9"
				>
					<div data-build-item class="flex flex-col gap-1.5">
						<span class="font-mono text-caption text-muted-foreground">{item.unit}</span>
						<span class="text-3xl font-bold tracking-tight sm:text-4xl">
							<Readout
								value={item.value}
								from={item.from}
								decimals={item.decimals}
								suffix={item.suffix}
							/>
						</span>
						<span
							class="gauge relative mt-1 flex flex-col gap-1"
							style:--at={item.value / item.max}
							style:--was={item.from === undefined ? null : item.from / item.max}
							aria-hidden="true"
						>
							{#if item.from !== undefined}
								<span class={cn("was-label font-mono text-caption", ACCENTS[1].text)}>
									{item.from}
								</span>
							{/if}
							<span class="scale relative h-4">
								{#if item.from !== undefined}
									<span class="needle needle-was"></span>
								{/if}
								<span class="needle"></span>
							</span>
							<span
								class="flex justify-between font-mono text-caption text-muted-foreground/70 tabular-nums"
							>
								<span>0</span>
								<span>{item.maxLabel}</span>
							</span>
						</span>
					</div>
					<h3 class="mt-2 text-sm font-semibold"><Typed text={item.title} /></h3>
					<p class="text-sm text-muted-foreground"><Typed text={item.body} /></p>
				</li>
			{/each}
		</ul>
	</section>

	<section
		data-build-section="how-its-built"
		aria-labelledby="about-how"
		class="relative flex flex-col gap-8"
	>
		{@render heading("about-how", "How it's built", "/dev:work <request>")}
		<div class="relative">
			<div class={RAIL} aria-hidden="true">
				<span data-build="line" class="absolute inset-0 bg-foreground/20"></span>
			</div>
			<ol data-build="pop" class="relative grid md:grid-cols-8">
				{#each PIPELINE as step, index (step.step)}
					<li
						class="flex h-14 min-w-0 items-center gap-4 md:h-auto md:flex-col md:gap-2.5 md:text-center"
					>
						<span
							class={cn(
								"grid size-11 shrink-0 place-items-center rounded-full border font-mono text-xs font-medium tabular-nums",
								step.isEngineer
									? cn("border-transparent text-background", ACCENTS[1].bg)
									: "bg-background text-muted-foreground"
							)}
							aria-hidden="true"
						>
							{pad(index + 1)}
						</span>
						<span class="text-sm font-semibold whitespace-nowrap">{step.step}</span>
						<span
							class={cn(
								"ml-auto font-mono text-caption whitespace-nowrap md:ml-0",
								step.isEngineer ? ACCENTS[1].text : "text-muted-foreground"
							)}
						>
							{step.owner}
						</span>
					</li>
				{/each}
			</ol>
			<!-- Above the nodes, so it shows while it waits on Approval. -->
			<div class={RAIL} aria-hidden="true">
				<span
					class={cn(
						"token absolute top-0 left-0 -mt-1.5 -ml-1.5 size-3 rounded-full ring-2 ring-background",
						ACCENTS[0].bg
					)}
					data-float
				></span>
			</div>
		</div>
		<p
			data-build="code"
			data-build-code={'/dev:work "rework the about page"'}
			class="max-w-2xl text-sm/7 text-muted-foreground sm:text-base/7"
		>
			<Typed
				text="Every request takes the same path. I approve every plan. Reviewers can't edit, builders can't approve their own work, and agents never push or deploy."
			/>
		</p>
	</section>

	<section
		data-build-section="what-i-learned"
		aria-labelledby="about-learned"
		class="relative flex flex-col gap-8"
	>
		{@render heading("about-learned", "What I learned", "four months in")}
		<div class="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14">
			<blockquote
				data-build="type size contrast"
				class="flex origin-top-left flex-col gap-3 self-start text-2xl/snug font-semibold tracking-tight text-balance sm:text-3xl/snug"
			>
				<span class={cn("h-8 font-serif text-7xl/none", ACCENTS[0].text)} aria-hidden="true">
					<Typed text="“" />
				</span>
				<p><Typed text={QUOTE} /></p>
			</blockquote>
			<div class="relative">
				<span data-build="line" class="absolute inset-y-0 left-0 w-px bg-border" aria-hidden="true"
				></span>
				<ol class="flex flex-col">
					{#each LESSONS as lesson, index (lesson.title)}
						<li
							data-build="type"
							class="relative grid grid-cols-[2rem_minmax(0,1fr)] gap-x-2 py-3.5 pl-5 sm:pl-6"
						>
							<span class="absolute top-6 left-0 h-px w-3 bg-border" aria-hidden="true"></span>
							<span class="pt-0.5 font-mono text-caption text-muted-foreground tabular-nums">
								<Typed text={pad(index + 1)} />
							</span>
							<div class="flex min-w-0 flex-col gap-0.5">
								<h3 class="font-semibold"><Typed text={lesson.title} /></h3>
								<p class="text-sm text-muted-foreground"><Typed text={lesson.body} /></p>
							</div>
						</li>
					{/each}
				</ol>
			</div>
		</div>
	</section>

	<section
		data-build-section="timeline"
		aria-labelledby="about-timeline"
		class="relative flex flex-col gap-8"
	>
		{@render heading("about-timeline", "Timeline", "Jul 11 → Nov 3, 2026")}
		<ol class="flex flex-col">
			{#each TIMELINE as milestone, index (milestone.hash)}
				{@const isLast = index === TIMELINE.length - 1}
				{@const isGap = index === GAP_AFTER}
				<li
					data-build="type pop"
					class="grid grid-cols-[5.25rem_1.25rem_minmax(0,1fr)] gap-x-3 sm:grid-cols-[7rem_1.5rem_minmax(0,1fr)] sm:gap-x-5"
				>
					<time
						datetime={milestone.date}
						class="pt-1 text-right font-mono text-caption whitespace-nowrap text-muted-foreground tabular-nums"
					>
						<Typed text={formatDate(milestone.date)} />
					</time>
					<div class="relative flex justify-center" aria-hidden="true">
						<span
							data-build-item
							class={cn(
								"relative z-10 mt-1.5 size-3 rounded-full ring-4 ring-background",
								ACCENTS[index % 2].bg
							)}
						></span>
						{#if !isLast}
							<span
								class={cn(
									"connector absolute top-6 -bottom-1.5 left-1/2 border-l",
									isGap ? "border-dashed border-muted-foreground/60" : "border-foreground/20"
								)}
								style:--step={index}
							></span>
						{/if}
					</div>
					<div class={cn("flex min-w-0 flex-col gap-1", !isLast && "pb-8", isGap && "pb-10")}>
						<div class="flex items-baseline gap-x-2.5">
							<span class={cn("shrink-0 font-mono text-xs", ACCENTS[index % 2].text)}>
								<Typed text={milestone.hash} />
							</span>
							<h3 class="min-w-0 font-semibold"><Typed text={milestone.title} /></h3>
						</div>
						<p class="text-sm text-muted-foreground"><Typed text={milestone.body} /></p>
						{#if isGap}
							<p class="mt-6 font-mono text-caption text-muted-foreground/70">
								<Typed text="Jul 16 → Nov 1 · no commits" />
							</p>
						{/if}
					</div>
				</li>
			{/each}
		</ol>
	</section>

	<section
		data-build-section="whats-next"
		aria-labelledby="about-next"
		class="relative flex flex-col gap-8"
	>
		{@render heading("about-next", "What's next", "tasks.md")}
		<ul class="flex flex-col">
			{#each ROADMAP as task, index (task.title)}
				<li
					data-build="type pop"
					class="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3 border-t py-4 last:border-b sm:gap-x-5"
				>
					<span class="flex items-center gap-2.5 pt-1" aria-hidden="true">
						<span data-build-item class="size-4 rounded-sm border-2 border-muted-foreground/50"
						></span>
						<span class="font-mono text-caption text-muted-foreground tabular-nums">
							<Typed text="1.{index + 1}" />
						</span>
					</span>
					<div class="flex min-w-0 flex-col gap-0.5">
						<h3 class="font-semibold"><Typed text={task.title} /></h3>
						<p class="text-sm text-muted-foreground"><Typed text={task.body} /></p>
					</div>
					<span
						data-build-item
						class={cn(
							"mt-0.5 rounded-full px-2 py-0.5 font-mono text-caption whitespace-nowrap",
							task.when === "next"
								? cn(ACCENTS[0].tintBg, ACCENTS[0].text)
								: "bg-muted text-muted-foreground"
						)}
					>
						{task.when}
					</span>
				</li>
			{/each}
		</ul>
	</section>

	<section
		data-build-section="credit"
		data-build="fill"
		aria-labelledby="about-credit"
		class="surface surface-credit relative isolate flex flex-col items-center gap-6 rounded-3xl border px-5 py-12 text-center sm:py-16"
	>
		<h2
			id="about-credit"
			data-build="type size"
			class="origin-center text-3xl font-bold tracking-tight text-balance sm:text-5xl"
		>
			<Typed text="Made by Nikko Abucejo" />
		</h2>
		<div class="flex max-w-md flex-col gap-3">
			<p data-build="type" class="text-muted-foreground">
				<Typed
					text="Built with a team of AI agents. The code, specs, and agent setup are on GitHub."
				/>
			</p>
			<p
				data-build="code"
				data-build-code={'TEAM.map((agent) => agent.name).join(", ")'}
				class="font-mono text-caption text-muted-foreground/80"
			>
				<Typed text={CREW} />
			</p>
		</div>
		<div class="flex w-full flex-col items-center justify-center gap-3 sm:flex-row">
			<div
				data-build="pop shadow test secure"
				class="w-full max-w-xs rounded-xl shadow-lg shadow-black/20"
			>
				<a
					href={REPO_URL}
					target="_blank"
					rel="noopener noreferrer"
					class="flex h-15 w-full min-w-0 items-center gap-3 rounded-xl border bg-background/60 p-2.5 text-left transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
				>
					<span
						class={cn(
							"grid size-10 shrink-0 place-items-center rounded-lg",
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
			</div>
			<div data-build="pop test" class="w-full max-w-xs sm:w-auto">
				<Button href="/tour" variant="outline" class="h-15 w-full rounded-xl px-5">
					Take the tour
				</Button>
			</div>
		</div>
	</section>
</div>

<style>
	/* Set by PREPAINT_SCRIPT on a first visit. Opacity only, so layout is final from the first
	   frame; the delayed reveal shows the page if the build never starts. */
	:global(html[data-about-build="pending"]) .about-root {
		opacity: 0;
		animation: about-reveal 0s 3s forwards;
	}

	@keyframes about-reveal {
		to {
			opacity: 1;
		}
	}

	/* Blueprint paper behind the page while the agents work. */
	.about-root::before {
		content: "";
		position: absolute;
		inset: 0;
		z-index: -1;
		pointer-events: none;
		background-image:
			linear-gradient(color-mix(in oklab, var(--seat-0) 8%, transparent) 1px, transparent 1px),
			linear-gradient(
				90deg,
				color-mix(in oklab, var(--seat-0) 8%, transparent) 1px,
				transparent 1px
			);
		background-size: 24px 24px;
		opacity: 0;
		transition: opacity 0.9s ease;
	}

	.about-root[data-phase="building"]::before {
		opacity: 1;
	}

	/* Fill targets paint their surface on a layer the build wipes in with clip-path. */
	.surface::before {
		content: "";
		position: absolute;
		inset: 0;
		z-index: -1;
		border-radius: inherit;
		background: var(--surface);
		transition: clip-path 0.9s cubic-bezier(0.65, 0, 0.35, 1);
	}

	.surface-hero {
		--surface:
			radial-gradient(
				70% 90% at 0% 0%,
				color-mix(in oklab, var(--seat-0) calc(16% * var(--sweep, 1)), transparent),
				transparent
			),
			radial-gradient(
				60% 80% at 100% 100%,
				color-mix(in oklab, var(--seat-1) calc(16% * var(--sweep, 1)), transparent),
				transparent
			),
			radial-gradient(color-mix(in oklab, var(--foreground) 9%, transparent) 1px, transparent 1px) 0
				0 / 18px 18px,
			color-mix(in oklab, var(--muted) 30%, transparent);
	}

	.surface-code {
		--surface: color-mix(in oklab, var(--muted) 35%, transparent);
	}

	.surface-credit {
		--surface:
			radial-gradient(
				60% 100% at 50% 0%,
				color-mix(in oklab, var(--seat-1) 12%, transparent),
				transparent
			),
			radial-gradient(
				60% 100% at 50% 100%,
				color-mix(in oklab, var(--seat-0) 12%, transparent),
				transparent
			),
			color-mix(in oklab, var(--muted) 30%, transparent);
	}

	/* Build states, written by the controller: pending → framed → filled → done. */
	.about-root :global {
		[data-build-state] {
			transition:
				opacity 0.5s ease,
				border-color 0.5s ease;
		}

		/* Instant, so built content never fades out on the way into the wireframe. */
		[data-build-state="pending"] {
			opacity: 0;
			transition: none;
		}

		[data-build-hidden] {
			opacity: 0;
			transform: scale(0.4);
		}

		/* A coded target shows once its snippet is saved; a layered one, child by child. */
		[data-build~="code"]:is([data-build-state="pending"], [data-build-state="framed"]) > *,
		[data-build~="layers"]:is([data-build-state="pending"], [data-build-state="framed"])
			> [data-layer] {
			opacity: 0;
		}

		[data-build~="code"] > *,
		[data-layer] {
			transition: opacity 0.35s ease;
		}

		/* Skip works by keyboard from the first second, so a focused control is never invisible. */
		[data-build-state="pending"]:focus-within {
			opacity: 1;
		}

		[data-build-hidden]:focus-within {
			opacity: 1;
			transform: none;
		}

		.surface:is([data-build-state="pending"], [data-build-state="framed"]) {
			border-style: dashed;
			border-color: color-mix(in oklab, var(--muted-foreground) 55%, transparent);
		}

		.surface:is([data-build-state="pending"], [data-build-state="framed"])::before {
			clip-path: inset(0 100% 0 0);
		}

		/* Decoration inside a surface (gutters, signs, row tints, rules) arrives with its fill. */
		.surface:is([data-build-state="pending"], [data-build-state="framed"]) {
			.deco,
			.tint::before,
			.rule-t::before,
			.rule-b::after {
				opacity: 0;
			}
		}
	}

	.deco,
	.tint::before,
	.rule-t::before,
	.rule-b::after {
		transition: opacity 0.6s ease 0.3s;
	}

	.tint::before,
	.rule-t::before,
	.rule-b::after {
		content: "";
		position: absolute;
		pointer-events: none;
	}

	.tint::before {
		inset: 0;
		z-index: -1;
		background: var(--tint);
	}

	.tint-0 {
		--tint: color-mix(in oklab, var(--seat-0) 10%, transparent);
	}

	.tint-1 {
		--tint: color-mix(in oklab, var(--seat-1) 10%, transparent);
	}

	.rule-t::before,
	.rule-b::after {
		inset-inline: 0;
		height: 1px;
		background: var(--border);
	}

	.rule-t::before {
		top: 0;
	}

	.rule-b::after {
		bottom: 0;
	}

	/* The scoreboard: hairlines with a tick at each end, not boxes. */
	.scoreboard {
		background:
			linear-gradient(var(--border), var(--border)) left top / 1px 100% no-repeat,
			linear-gradient(var(--muted-foreground), var(--muted-foreground)) left top / 5px 1px no-repeat,
			linear-gradient(var(--muted-foreground), var(--muted-foreground)) left bottom / 5px 1px
				no-repeat;
	}

	/* Instrument cells share tick rules along their top and left edges. */
	.instrument {
		background:
			linear-gradient(var(--border), var(--border)) left top / 100% 1px no-repeat,
			linear-gradient(90deg, var(--border) 1px, transparent 1px) left top / 8px 4px repeat-x,
			linear-gradient(var(--border), var(--border)) left top / 1px 100% no-repeat;
	}

	.scale {
		--tick: color-mix(in oklab, var(--muted-foreground) 55%, transparent);
		background:
			linear-gradient(90deg, var(--tick) 1px, transparent 1px) left bottom / 10% 5px repeat-x,
			linear-gradient(90deg, var(--tick) 1px, transparent 1px) left bottom / 50% 10px repeat-x,
			linear-gradient(var(--tick), var(--tick)) right bottom / 1px 10px no-repeat,
			linear-gradient(var(--tick), var(--tick)) left bottom / 100% 1px no-repeat;
	}

	.needle {
		position: absolute;
		bottom: 0;
		left: calc(var(--at) * 100%);
		width: 2px;
		height: 100%;
		margin-left: -1px;
		border-radius: 1px;
		background: var(--seat-0);
	}

	.needle::before {
		content: "";
		position: absolute;
		top: -3px;
		left: -2px;
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: inherit;
	}

	.needle-was {
		left: calc(var(--was) * 100%);
		background: var(--seat-1);
		opacity: 0.6;
	}

	.was-label {
		position: absolute;
		bottom: calc(100% + 0.25rem);
		left: calc(var(--was) * 100%);
		translate: -50% 0;
		line-height: 1;
	}

	/* The approval step's share of the rail: the token waits there. */
	.token {
		--approval: calc(2 / 7);
		translate: 0 calc(var(--approval) * 100cqh);
	}

	@media (min-width: 48rem) {
		.token {
			translate: calc(var(--approval) * 100cqw) 0;
		}
	}

	@media (prefers-reduced-motion: no-preference) {
		:global(html:not(.reduce-motion)) .token {
			animation: travel-y 7s cubic-bezier(0.45, 0, 0.55, 1) infinite;
		}

		@media (min-width: 48rem) {
			:global(html:not(.reduce-motion)) .token {
				animation-name: travel-x;
			}
		}
	}

	.about-root[data-phase="building"] .token {
		opacity: 0;
		animation: none;
	}

	@keyframes travel-x {
		0% {
			translate: 0 0;
			opacity: 0;
		}
		6% {
			opacity: 1;
		}
		24%,
		52% {
			translate: calc(var(--approval) * 100cqw) 0;
		}
		90% {
			translate: 100cqw 0;
			opacity: 1;
		}
		100% {
			translate: 100cqw 0;
			opacity: 0;
		}
	}

	@keyframes travel-y {
		0% {
			translate: 0 0;
			opacity: 0;
		}
		6% {
			opacity: 1;
		}
		24%,
		52% {
			translate: 0 calc(var(--approval) * 100cqh);
		}
		90% {
			translate: 0 100cqh;
			opacity: 1;
		}
		100% {
			translate: 0 100cqh;
			opacity: 0;
		}
	}

	/* The git graph's edges draw down, one after another, once a section is reviewed. */
	.connector {
		transition: clip-path 0.5s ease-out calc(var(--step) * 90ms);
	}

	.about-root :global([data-build-state]:not([data-build-state="done"]) .connector) {
		clip-path: inset(0 0 100% 0);
	}
</style>
