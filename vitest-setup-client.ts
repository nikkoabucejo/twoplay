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
