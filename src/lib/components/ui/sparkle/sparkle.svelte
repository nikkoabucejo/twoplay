<script lang="ts" module>
	import { cn } from "$lib/utils/style";
	import type { AnimationItem } from "lottie-web";

	export type SparkleProps = {
		/** Two hex colors, one per sparkle group — e.g. the app's player 1/player 2 seat accents. */
		colors: [string, string];
		class?: string;
	};

	const FRAME_RATE = 30;
	const TOTAL_FRAMES = 180;
	const WIDTH = 440;
	const HEIGHT = 140;
	const HUMP_HALF_WIDTH = 12;

	type Sparkle = {
		x: number;
		y: number;
		size: number;
		shape: "circle" | "star";
		colorIndex: 0 | 1;
		/** Frames (within [0, TOTAL_FRAMES]) where this sparkle twinkles to peak opacity/scale. */
		peaks: number[];
		peakOpacity: number;
	};

	// Loosely scattered around a wide title-shaped canvas, left half keyed to colors[0], right
	// half to colors[1], each with its own peak timing so the twinkle reads as organic, not synced.
	const SPARKLES: Sparkle[] = [
		{ x: 40, y: 30, size: 8, shape: "star", colorIndex: 0, peaks: [20, 100], peakOpacity: 0.95 },
		{ x: 90, y: 105, size: 6, shape: "circle", colorIndex: 0, peaks: [55, 140], peakOpacity: 0.82 },
		{
			x: 150,
			y: 15,
			size: 5,
			shape: "circle",
			colorIndex: 0,
			peaks: [10, 90, 160],
			peakOpacity: 0.77
		},
		{
			x: 190,
			y: 118,
			size: 10,
			shape: "star",
			colorIndex: 0,
			peaks: [70, 150],
			peakOpacity: 0.92
		},
		{ x: 210, y: 55, size: 5, shape: "circle", colorIndex: 0, peaks: [35, 120], peakOpacity: 0.72 },
		{
			x: 130,
			y: 70,
			size: 5,
			shape: "circle",
			colorIndex: 0,
			peaks: [25, 110],
			peakOpacity: 0.67
		},
		{
			x: 250,
			y: 20,
			size: 6,
			shape: "circle",
			colorIndex: 1,
			peaks: [15, 95, 165],
			peakOpacity: 0.82
		},
		{ x: 290, y: 112, size: 8, shape: "star", colorIndex: 1, peaks: [45, 130], peakOpacity: 0.95 },
		{ x: 340, y: 25, size: 5, shape: "circle", colorIndex: 1, peaks: [60, 145], peakOpacity: 0.72 },
		{
			x: 370,
			y: 100,
			size: 10,
			shape: "star",
			colorIndex: 1,
			peaks: [5, 85, 155],
			peakOpacity: 0.87
		},
		{
			x: 405,
			y: 50,
			size: 6,
			shape: "circle",
			colorIndex: 1,
			peaks: [90, 170],
			peakOpacity: 0.77
		},
		{
			x: 320,
			y: 65,
			size: 5,
			shape: "circle",
			colorIndex: 1,
			peaks: [50, 135],
			peakOpacity: 0.67
		}
	];

	function hexToRgba(hex: string): [number, number, number, number] {
		const value = hex.replace("#", "");
		const r = parseInt(value.slice(0, 2), 16) / 255;
		const g = parseInt(value.slice(2, 4), 16) / 255;
		const b = parseInt(value.slice(4, 6), 16) / 255;
		return [r, g, b, 1];
	}

	// Builds a value's keyframe list from a list of peak frames. The first and last keyframes are
	// both `low`, at frames 0 and TOTAL_FRAMES, so `loop: true` restarts with no jump — everything
	// between them (the peaks) is free to vary per sparkle without breaking that seam.
	function twinkleKeyframes(peaks: number[], low: number, high: number, dimensions: 1 | 2) {
		const wrap = (value: number) => (dimensions === 1 ? [value] : [value, value]);
		const easing = { i: { x: [0.42], y: [0] }, o: { x: [0.58], y: [1] } };
		const keyframes: { t: number; s: number[] }[] = [{ t: 0, s: wrap(low), ...easing }];
		for (const peak of peaks) {
			keyframes.push({ t: Math.max(1, peak - HUMP_HALF_WIDTH), s: wrap(low), ...easing });
			keyframes.push({ t: peak, s: wrap(high), ...easing });
			keyframes.push({
				t: Math.min(TOTAL_FRAMES - 1, peak + HUMP_HALF_WIDTH),
				s: wrap(low),
				...easing
			});
		}
		keyframes.push({ t: TOTAL_FRAMES, s: wrap(low) });
		return keyframes;
	}

	function buildShapePath(sparkle: Sparkle) {
		if (sparkle.shape === "circle") {
			return {
				ty: "el",
				p: { a: 0, k: [0, 0] },
				s: { a: 0, k: [sparkle.size * 2, sparkle.size * 2] },
				nm: "circle-path"
			};
		}
		return {
			ty: "sr",
			sy: 1,
			pt: { a: 0, k: 4 },
			p: { a: 0, k: [0, 0] },
			r: { a: 0, k: 0 },
			ir: { a: 0, k: sparkle.size * 0.4 },
			is: { a: 0, k: 0 },
			or: { a: 0, k: sparkle.size },
			os: { a: 0, k: 0 },
			nm: "star-path"
		};
	}

	function buildLayer(sparkle: Sparkle, index: number, colors: [string, string]) {
		return {
			ddd: 0,
			ind: index + 1,
			ty: 4,
			nm: `sparkle-${index}`,
			sr: 1,
			ks: {
				o: { a: 1, k: twinkleKeyframes(sparkle.peaks, 0, sparkle.peakOpacity * 100, 1) },
				r: { a: 0, k: 0 },
				p: { a: 0, k: [sparkle.x, sparkle.y, 0] },
				a: { a: 0, k: [0, 0, 0] },
				s: { a: 1, k: twinkleKeyframes(sparkle.peaks, 55, 100, 2) }
			},
			ao: 0,
			shapes: [
				{
					ty: "gr",
					it: [
						buildShapePath(sparkle),
						{
							ty: "fl",
							c: { a: 0, k: hexToRgba(colors[sparkle.colorIndex]) },
							o: { a: 0, k: 100 },
							nm: "fill"
						},
						{
							ty: "tr",
							p: { a: 0, k: [0, 0] },
							a: { a: 0, k: [0, 0] },
							s: { a: 0, k: [100, 100] },
							r: { a: 0, k: 0 },
							o: { a: 0, k: 100 }
						}
					],
					nm: "sparkle-group",
					np: 2,
					cix: 2,
					bm: 0,
					ix: 1,
					mn: "ADBE Vector Group"
				}
			],
			ip: 0,
			op: TOTAL_FRAMES,
			st: 0,
			bm: 0
		};
	}

	// Hand-authored Lottie composition (no fetched asset) so the two accent colors can be baked
	// straight into each shape's fill rather than post-processing a generic sparkle file.
	function createAnimationData(colors: [string, string]) {
		return {
			v: "5.9.6",
			fr: FRAME_RATE,
			ip: 0,
			op: TOTAL_FRAMES,
			w: WIDTH,
			h: HEIGHT,
			nm: "sparkle",
			ddd: 0,
			assets: [],
			layers: SPARKLES.map((sparkle, index) => buildLayer(sparkle, index, colors))
		};
	}
</script>

<script lang="ts">
	let { colors, class: className }: SparkleProps = $props();

	let container = $state<HTMLDivElement>();
	let animation: AnimationItem | undefined;

	$effect(() => {
		const element = container;
		if (!element) return;
		let cancelled = false;

		import("lottie-web").then(({ default: lottie }) => {
			if (cancelled) return;
			animation = lottie.loadAnimation({
				container: element,
				renderer: "svg",
				loop: true,
				autoplay: true,
				animationData: createAnimationData(colors),
				rendererSettings: { preserveAspectRatio: "none" }
			});
		});

		return () => {
			cancelled = true;
			animation?.destroy();
			animation = undefined;
		};
	});
</script>

<div class={cn("pointer-events-none absolute inset-0", className)} aria-hidden="true">
	<div bind:this={container} class="absolute inset-0"></div>
</div>
