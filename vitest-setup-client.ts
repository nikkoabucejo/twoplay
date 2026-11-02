import "@testing-library/jest-dom/vitest";

// jsdom has no Web Animations API; Svelte transitions call element.animate().
if (!Element.prototype.animate) {
	Element.prototype.animate = function () {
		return {
			cancel() {},
			finish() {},
			play() {},
			pause() {},
			finished: Promise.resolve(),
			onfinish: null
		} as unknown as Animation;
	};
}

if (!Element.prototype.getAnimations) {
	Element.prototype.getAnimations = () => [];
}

// jsdom has no matchMedia; svelte/motion's prefersReducedMotion calls it on import.
if (!window.matchMedia) {
	window.matchMedia = (query: string) =>
		({
			media: query,
			matches: false,
			onchange: null,
			addEventListener() {},
			removeEventListener() {},
			addListener() {},
			removeListener() {},
			dispatchEvent: () => false
		}) as MediaQueryList;
}
