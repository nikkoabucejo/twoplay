<script lang="ts">
	import { getAboutBuild } from "./build.svelte.js";

	const build = getAboutBuild();
	const SWATCHES = [0, 1] as const;
	/** Align left, center, and right, as 16px toolbar icons. */
	const ALIGN = ["M2 2v12M5 5h8M5 10h5", "M8 2v12M4 5h8M5.5 10h5", "M14 2v12M3 5h8M6 10h5"];
	const KEYWORDS = new Set(["const", "let", "await", "return", "import", "from"]);

	type Token = { text: string; kind: "plain" | "punct" | "string" | "name" | "rune" | "keyword" };

	/** Just enough highlighting for one-line Svelte and TypeScript snippets. */
	function tokens(line: string): Token[] {
		return (line.match(/"[^"]*"?|[A-Za-z$_][\w$.]*|\s+|./g) ?? []).map((text) => {
			if (text.startsWith('"')) return { text, kind: "string" };
			if (text.startsWith("$")) return { text, kind: "rune" };
			if (KEYWORDS.has(text)) return { text, kind: "keyword" };
			if (/^[A-Z]/.test(text)) return { text, kind: "name" };
			if (/^[<>/{}()=+[\]]$/.test(text)) return { text, kind: "punct" };
			return { text, kind: "plain" };
		});
	}

	/** How far `<main>`'s scroll area reaches past the root on each side. */
	let bleed = $state({ top: 0, right: 0, bottom: 0, left: 0 });

	function measureBleed(node: HTMLElement) {
		const root = node.parentElement;
		if (!root) return;
		const scroller = root.closest("main") ?? document.documentElement;
		const measure = () => {
			const box = root.getBoundingClientRect();
			const view = scroller.getBoundingClientRect();
			const left = view.left + scroller.clientLeft;
			const top = box.top - (view.top + scroller.clientTop) + scroller.scrollTop;
			bleed = {
				top,
				right: left + scroller.clientWidth - box.right,
				bottom: scroller.scrollHeight - top - root.offsetHeight,
				left: box.left - left
			};
		};
		measure();
		window.addEventListener("resize", measure, { passive: true });
		return () => window.removeEventListener("resize", measure);
	}
</script>

<!-- Clips at <main>'s scroll area, not the root's box, so region tags above the first section,
     labels below the last, and agents in the margins stay whole without making <main> scroll
     further. Offsets are transforms, so measuring never counts as a layout shift; the inner
     layer keeps the root's origin. -->
<div
	class="pointer-events-none absolute top-0 left-0 z-20 overflow-clip"
	style:width="calc(100% + {bleed.left + bleed.right}px)"
	style:height="calc(100% + {bleed.top + bleed.bottom}px)"
	style:transform="translate({-bleed.left}px, {-bleed.top}px)"
	aria-hidden="true"
	data-build-overlay
	data-float
	{@attach measureBleed}
>
	<div
		bind:this={build.layer}
		class="absolute top-0 left-0"
		style:width="calc(100% - {bleed.left + bleed.right}px)"
		style:height="calc(100% - {bleed.top + bleed.bottom}px)"
		style:transform="translate({bleed.left}px, {bleed.top}px)"
	>
		{#each build.effects as effect (effect.id)}
			{#if effect.kind === "ripple"}
				<span
					class="ripple"
					style:--agent={effect.color}
					style:transform="translate({effect.x}px, {effect.y}px)"
				></span>
			{:else if effect.kind === "badge"}
				<span
					class="badge"
					data-fading={effect.isFading}
					style:transform="translate({effect.x}px, {effect.y}px)"
				>
					<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
				</span>
			{:else if effect.kind === "guide"}
				<span
					class={effect.axis === "h" ? "guide guide-h" : "guide guide-v"}
					style:--agent={effect.color}
					style:--at="{effect.at}px"
				></span>
			{:else if effect.kind === "redline"}
				<span
					class="redline"
					style:height="{effect.gap}px"
					style:transform="translate({effect.x}px, {effect.y}px)"
				>
					<b>{effect.gap}</b>
				</span>
			{:else if effect.kind === "marquee" || effect.kind === "region"}
				{@const { box, t } = effect}
				<span
					class={effect.kind}
					data-effect={effect.id}
					data-fading={effect.isFading}
					data-ok={effect.kind === "region" && effect.isOk}
					style:--agent={effect.color}
					style:transform="translate({box.x}px, {box.y}px)"
				>
					<span
						class="frame"
						style:width="{box.w}px"
						style:height="{box.h}px"
						style:clip-path="inset(0 {(1 - t) * 100}% {(1 - t) * 100}% 0)"
					></span>
					{#if effect.kind === "region"}
						<b class="tag">{effect.label}</b>
					{:else}
						{#each [[0, 0], [1, 0], [0, 1], [1, 1]] as [cx, cy] (`${cx}${cy}`)}
							<i style:transform="translate({box.w * t * cx}px, {box.h * t * cy}px)"></i>
						{/each}
						<b class="size" style:transform="translate({(box.w * t) / 2}px, {box.h * t + 7}px)">
							{Math.round(box.w * t)} × {Math.round(box.h * t)}
						</b>
					{/if}
				</span>
			{:else if effect.kind === "size"}
				<span
					class="panel"
					data-effect={effect.id}
					data-fading={effect.isFading}
					style:--agent={effect.color}
					style:transform="translate({effect.x}px, {effect.y}px)"
				>
					<span class="key">font-size</span>
					<span class="track" data-part="track">
						<u style:transform="scaleX({effect.t})"></u>
						<s data-part="knob" style:transform="translateX({effect.t * 120}px)"></s>
					</span>
					<span class="value"
						>{Math.round(effect.from + (effect.to - effect.from) * effect.t)}px</span
					>
				</span>
			{:else if effect.kind === "tool"}
				<span
					class={effect.tool === "code" || effect.tool === "layers" || effect.tool === "inspect"
						? "panel panel-stack"
						: "panel"}
					data-effect={effect.id}
					data-fading={effect.isFading}
					style:--agent={effect.color}
					style:transform="translate({effect.x}px, {effect.y}px)"
				>
					{#if effect.tool === "code"}
						<span class="tab"><b>about.svelte</b><i>{effect.value}</i></span>
						<span class="editor" data-part="editor">
							{#each effect.rows as row, index (index)}
								<span class="line">
									<em>{index + 1}</em>
									<span
										>{#each tokens(row) as token, i (i)}<span class="tok-{token.kind}"
												>{token.text}</span
											>{/each}</span
									>
								</span>
							{/each}
						</span>
					{:else if effect.tool === "layers"}
						<span class="key">layers</span>
						{#each effect.rows as row, index (index)}
							<span class="row" data-part="row-{index}" data-active={index <= effect.active}>
								<svg viewBox="0 0 16 16"
									><path
										d="M1.5 8s2.5-4.5 6.5-4.5S14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8Z"
									/><circle cx="8" cy="8" r="2" /></svg
								>
								{row}
							</span>
						{/each}
					{:else if effect.tool === "inspect"}
						<span class="key">inspect</span>
						{#each effect.rows as row (row)}
							<span class="row">{row}</span>
						{/each}
					{:else}
						<span class="key">{effect.tool}</span>
						{#if effect.tool === "radius" || effect.tool === "shadow"}
							<span class="track" data-part="track">
								<u style:transform="scaleX({effect.t})"></u>
								<s data-part="knob" style:transform="translateX({effect.t * 120}px)"></s>
							</span>
							<span class="value">{effect.value}</span>
						{:else if effect.tool === "gradient"}
							<span class="track gradient" data-part="track">
								<s
									data-part="stop-0"
									style:transform="translateX({(0.5 - 0.5 * Math.min(1, effect.t * 2)) * 120}px)"
								></s>
								<s
									data-part="stop-1"
									style:transform="translateX({(0.5 + 0.5 * Math.max(0, effect.t * 2 - 1)) *
										120}px)"
								></s>
							</span>
							<span class="value">{Math.round(effect.t * 100)}%</span>
						{:else if effect.tool === "align"}
							{#each ALIGN as path, index (path)}
								<span class="icon" data-part="align-{index}" data-active={effect.active === index}>
									<svg viewBox="0 0 16 16"><path d={path} /></svg>
								</span>
							{/each}
						{:else}
							<span class="sample">Aa</span>
							<span class="value" style:opacity={effect.t}>{effect.value}</span>
							<span class="pass" style:opacity={effect.t}>{effect.rows[0]} ✓</span>
						{/if}
					{/if}
				</span>
			{:else if effect.kind === "bands"}
				{@const [top, right, bottom, left] = effect.pads}
				<span
					class="bands"
					data-fading={effect.isFading}
					style:width="{effect.box.w}px"
					style:height="{effect.box.h}px"
					style:transform="translate({effect.box.x}px, {effect.box.y}px)"
				>
					{#if top}
						<i class="band band-top" style:height="{top}px" style:transform="scaleY({effect.t})"
							><b>{top}</b></i
						>
					{/if}
					{#if bottom}
						<i
							class="band band-bottom"
							style:height="{bottom}px"
							style:transform="scaleY({effect.t})"><b>{bottom}</b></i
						>
					{/if}
					{#if left}
						<i
							class="band band-left"
							style:top="{top}px"
							style:bottom="{bottom}px"
							style:width="{left}px"
							style:transform="scaleX({effect.t})"><b>{left}</b></i
						>
					{/if}
					{#if right}
						<i
							class="band band-right"
							style:top="{top}px"
							style:bottom="{bottom}px"
							style:width="{right}px"
							style:transform="scaleX({effect.t})"><b>{right}</b></i
						>
					{/if}
				</span>
			{:else if effect.kind === "pin"}
				<span
					class="pin"
					data-resolved={effect.isResolved}
					data-fading={effect.isFading}
					style:--agent={effect.color}
					style:transform="translate({effect.x}px, {effect.y}px)"
				>
					<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
				</span>
			{:else}
				<span
					class="panel"
					data-effect={effect.id}
					data-fading={effect.isFading}
					style:--agent={effect.color}
					style:transform="translate({effect.x}px, {effect.y}px)"
				>
					<span class="key">color</span>
					{#each SWATCHES as seat (seat)}
						<span class="swatch" data-part="swatch-{seat}" style:background="var(--seat-{seat})"
						></span>
					{/each}
				</span>
			{/if}
		{/each}

		{#each build.cursors as cursor (cursor.agent.name)}
			<span
				class="cursor"
				data-leaving={cursor.isLeaving}
				style:--agent={cursor.agent.color}
				style:transform="translate3d({cursor.x}px, {cursor.y}px, 0)"
			>
				<svg viewBox="0 0 20 22">
					<path d="M2 1.5v17.2l4.8-4.4 3.4 7.2 3.1-1.4-3.3-7h6.6z" />
				</svg>
				<span class="name">
					<b>{cursor.agent.name}</b>
					{#if cursor.action}<i>{cursor.action}</i>{/if}
				</span>
				{#if cursor.bubble}
					<span class="bubble">{cursor.bubble}</span>
				{/if}
			</span>
		{/each}
	</div>
</div>

<style>
	.cursor,
	.ripple,
	.badge,
	.redline,
	.marquee,
	.region,
	.panel {
		position: absolute;
		top: 0;
		left: 0;
	}

	.cursor {
		z-index: 5;
		will-change: transform;
		transition: opacity 0.6s;
	}

	.cursor[data-leaving="true"] {
		opacity: 0;
	}

	.cursor svg {
		display: block;
		width: 20px;
		height: 22px;
		fill: var(--agent);
		stroke: white;
		stroke-width: 1.6;
		stroke-linejoin: round;
		filter: drop-shadow(0 2px 3px rgb(0 0 0 / 0.3));
	}

	.name,
	.bubble,
	.tag,
	.size,
	.redline b {
		position: absolute;
		white-space: nowrap;
		font: 600 10px/1 var(--font-mono, ui-monospace, monospace);
		color: white;
		background: var(--agent);
		border-radius: 4px;
		padding: 3px 5px;
	}

	.name {
		top: 19px;
		left: 15px;
		display: flex;
		gap: 6px;
		align-items: baseline;
		padding: 4px 7px 5px;
		font-size: 11px;
		border-radius: 6px 6px 6px 2px;
		box-shadow: 0 4px 12px -4px var(--agent);
	}

	.name i {
		font-style: normal;
		font-weight: 500;
		opacity: 0.8;
	}

	.bubble {
		bottom: 6px;
		left: 16px;
		padding: 5px 8px;
		font-size: 11px;
		font-weight: 500;
		line-height: 1.2;
		color: var(--popover-foreground);
		background: var(--popover);
		border: 1.5px solid var(--agent);
		border-radius: 9px 9px 9px 2px;
		box-shadow: 0 10px 30px -12px rgb(0 0 0 / 0.5);
	}

	.ripple {
		width: 30px;
		height: 30px;
		margin: -15px 0 0 -15px;
		border: 2px solid var(--agent);
		border-radius: 50%;
		animation: ripple 0.48s ease-out forwards;
	}

	@keyframes ripple {
		from {
			scale: 0.3;
			opacity: 1;
		}
		to {
			scale: 1.5;
			opacity: 0;
		}
	}

	.badge {
		display: grid;
		place-items: center;
		width: 22px;
		height: 22px;
		margin: -11px 0 0 -11px;
		border-radius: 50%;
		color: white;
		background: oklch(62.7% 0.194 149.214);
		transition: opacity 0.4s;
	}

	.badge svg {
		width: 13px;
		height: 13px;
		fill: none;
		stroke: currentColor;
		stroke-width: 3;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	[data-fading="true"] {
		opacity: 0;
		transition: opacity 0.4s;
	}

	.guide {
		position: absolute;
		background: var(--agent);
		animation: guide 1.2s ease-out forwards;
	}

	.guide-h {
		top: 0;
		left: 0;
		width: 100%;
		height: 1px;
		translate: 0 var(--at);
	}

	.guide-v {
		top: 0;
		left: 0;
		width: 1px;
		height: 100%;
		translate: var(--at) 0;
	}

	@keyframes guide {
		from {
			opacity: 0.7;
		}
		to {
			opacity: 0;
		}
	}

	.redline {
		--agent: oklch(64.5% 0.246 16.439);
		width: 1px;
		background: var(--agent);
		animation: guide 1.3s ease-out forwards;
	}

	.redline b {
		top: 50%;
		left: 6px;
		translate: 0 -50%;
	}

	.frame {
		position: absolute;
		top: 0;
		left: 0;
		border: 1.5px solid var(--agent);
		background: color-mix(in oklab, var(--agent) 7%, transparent);
		border-radius: 2px;
	}

	.region .frame {
		border-style: dashed;
		border-radius: 18px;
		background: color-mix(in oklab, var(--agent) 3%, transparent);
	}

	.region[data-ok="true"] {
		--agent: oklch(62.7% 0.194 149.214);
	}

	.tag {
		top: -10px;
		left: 12px;
		padding: 3px 7px;
		border-radius: 5px;
		transition: background-color 0.4s;
	}

	.region .frame {
		transition:
			border-color 0.4s,
			background-color 0.4s;
	}

	.marquee i {
		position: absolute;
		top: -4px;
		left: -4px;
		width: 8px;
		height: 8px;
		background: var(--background);
		border: 1.5px solid var(--agent);
		border-radius: 1px;
	}

	.size {
		top: 0;
		left: 0;
		translate: -50% 0;
		font-variant-numeric: tabular-nums;
	}

	.panel {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 8px 10px;
		border: 1px solid var(--border);
		border-radius: 10px;
		color: var(--popover-foreground);
		background: var(--popover);
		box-shadow: 0 10px 30px -12px rgb(0 0 0 / 0.5);
		font: 500 11px/1 var(--font-mono, ui-monospace, monospace);
		white-space: nowrap;
	}

	.key {
		color: var(--muted-foreground);
	}

	.track {
		position: relative;
		width: 120px;
		height: 4px;
		border-radius: 4px;
		background: var(--border);
	}

	.track u {
		position: absolute;
		inset: 0;
		background: var(--agent);
		border-radius: 4px;
		transform-origin: left;
	}

	.track s {
		position: absolute;
		top: 50%;
		left: 0;
		width: 13px;
		height: 13px;
		margin: -6.5px 0 0 -6.5px;
		border-radius: 50%;
		background: white;
		border: 2px solid var(--agent);
		box-shadow: 0 1px 3px rgb(0 0 0 / 0.3);
	}

	.value {
		min-width: 4.5ch;
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	.swatch {
		width: 18px;
		height: 18px;
		border-radius: 50%;
		box-shadow: inset 0 0 0 2px rgb(255 255 255 / 0.35);
	}
	.bands,
	.pin {
		position: absolute;
		top: 0;
		left: 0;
	}

	@media (max-width: 639.98px) {
		.panel {
			scale: 0.85;
			transform-origin: 0 0;
		}
	}

	.panel-stack {
		flex-direction: column;
		align-items: stretch;
		gap: 6px;
		min-width: 170px;
	}

	.tab {
		display: flex;
		justify-content: space-between;
		gap: 16px;
		padding-bottom: 6px;
		border-bottom: 1px solid var(--border);
	}

	.tab b {
		font-weight: 500;
	}

	.tab i {
		font-style: normal;
		color: oklch(72% 0.17 150);
	}

	.editor {
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-width: 240px;
		line-height: 14px;
	}

	.line {
		display: flex;
		gap: 10px;
		white-space: pre;
	}

	.line em {
		width: 1ch;
		font-style: normal;
		color: var(--muted-foreground);
		opacity: 0.6;
	}

	.tok-punct {
		color: var(--muted-foreground);
	}

	.tok-string {
		color: oklch(75% 0.15 150);
	}

	.tok-name {
		color: var(--seat-0);
	}

	.tok-rune {
		color: var(--seat-1);
	}

	.tok-keyword {
		color: oklch(70% 0.17 300);
	}

	.row {
		display: flex;
		align-items: center;
		gap: 8px;
		height: 20px;
		padding: 0 6px;
		border-radius: 5px;
		color: var(--muted-foreground);
		transition:
			background-color 0.2s,
			color 0.2s;
	}

	.row[data-active="true"] {
		color: var(--popover-foreground);
		background: color-mix(in oklab, var(--agent) 18%, transparent);
	}

	.row svg,
	.icon svg {
		width: 14px;
		height: 14px;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.4;
		stroke-linecap: round;
	}

	.icon {
		display: grid;
		place-items: center;
		width: 24px;
		height: 24px;
		border-radius: 6px;
		color: var(--muted-foreground);
		transition: background-color 0.2s;
	}

	.icon[data-active="true"] {
		color: white;
		background: var(--agent);
	}

	.gradient {
		background: linear-gradient(90deg, var(--seat-0), var(--seat-1));
	}

	.sample {
		display: grid;
		place-items: center;
		width: 26px;
		height: 22px;
		border-radius: 5px;
		font-family: var(--font-sans);
		font-weight: 700;
		color: var(--foreground);
		background: var(--background);
		border: 1px solid var(--border);
	}

	.pass {
		padding: 3px 6px;
		border-radius: 4px;
		color: white;
		background: oklch(62.7% 0.194 149.214);
	}

	/* Figma-style padding bands: hatched pink over the padding box. */
	.band {
		position: absolute;
		display: grid;
		place-items: center;
		background: repeating-linear-gradient(
			-45deg,
			oklch(65% 0.22 350 / 0.28) 0 2px,
			oklch(65% 0.22 350 / 0.12) 2px 6px
		);
		transition: transform 0.2s;
	}

	.band b {
		padding: 2px 4px;
		border-radius: 3px;
		font: 600 10px/1 var(--font-mono, ui-monospace, monospace);
		color: white;
		background: oklch(60% 0.22 350);
	}

	.band-top {
		top: 0;
		inset-inline: 0;
		transform-origin: top;
	}

	.band-bottom {
		bottom: 0;
		inset-inline: 0;
		transform-origin: bottom;
	}

	.band-left {
		left: 0;
		transform-origin: left;
	}

	.band-right {
		right: 0;
		transform-origin: right;
	}

	.pin {
		display: grid;
		place-items: center;
		width: 24px;
		height: 24px;
		margin: -24px 0 0 -2px;
		border-radius: 12px 12px 12px 2px;
		background: var(--agent);
		box-shadow: 0 4px 12px -4px var(--agent);
		transition:
			background-color 0.3s,
			opacity 0.4s;
	}

	.pin svg {
		width: 13px;
		height: 13px;
		fill: none;
		stroke: white;
		stroke-width: 3;
		stroke-linecap: round;
		stroke-linejoin: round;
		opacity: 0;
		transition: opacity 0.3s;
	}

	.pin[data-resolved="true"] {
		background: oklch(62.7% 0.194 149.214);
	}

	.pin[data-resolved="true"] svg {
		opacity: 1;
	}
</style>
