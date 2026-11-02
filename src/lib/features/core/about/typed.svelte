<script module lang="ts">
	// Every Typed shares one highlight; jsdom and older browsers have no Highlight API and show the whole text.
	const untyped = typeof Highlight === "undefined" ? null : new Highlight();
	if (untyped) CSS.highlights.set("about-untyped", untyped);
</script>

<script lang="ts">
	import { getAboutBuild, TypedText } from "./build.svelte.js";

	let { text }: { text: string } = $props();

	const build = getAboutBuild();
	const part = new TypedText(() => text);

	let node = $state<HTMLElement>();
	let caret = $state<HTMLElement>();
	const range = typeof document === "undefined" ? null : document.createRange();

	// Typing never changes the DOM text, so nothing in flow moves: a highlight hides the untyped rest,
	// and the caret is out of flow, moved by transform.
	$effect(() => {
		const count = part.count;
		const content = node?.firstChild;
		if (!range || !content || count === null) return;
		const length = text.length;
		range.setStart(content, Math.min(count, length));
		range.setEnd(content, length);
		untyped?.add(range);
		return () => untyped?.delete(range);
	});

	$effect(() => {
		const count = part.count;
		const content = node?.firstChild;
		if (!caret || !content || count === null) return;
		const at = document.createRange();
		at.setStart(content, Math.min(count, text.length));
		const target = at.getBoundingClientRect();
		caret.style.translate = "";
		const origin = caret.getBoundingClientRect();
		const scale = origin.height / caret.offsetHeight;
		const x = (target.left - 1 - origin.left) / scale;
		const y = (target.top + (target.height - origin.height) / 2 - origin.top) / scale;
		caret.style.translate = `${x}px ${y}px`;
	});
</script>

<span bind:this={node} data-build-text {@attach (el) => build.registerText(el, part)}
	>{text}{#if part.caretColor}<span
			bind:this={caret}
			class="caret"
			aria-hidden="true"
			data-build-caret
			style:--agent={part.caretColor}
		></span>{/if}</span
>

<style>
	.caret {
		position: absolute;
		top: 0;
		left: 0;
		width: 2px;
		height: 1.1em;
		border-radius: 1px;
		background: var(--agent);
		pointer-events: none;
	}

	@media (prefers-reduced-motion: no-preference) {
		:global(html:not(.reduce-motion)) .caret {
			animation: blink 0.9s steps(1) infinite;
		}
	}

	@keyframes blink {
		50% {
			opacity: 0.25;
		}
	}

	span::highlight(about-untyped) {
		color: transparent;
	}
</style>
