import type { Ability } from "$lib/components/layout";

/**
 * Bank of abilities for tic-tac-toe. The board equips the first few; this list
 * can hold more than a player uses. Effects are not wired up yet — UI only.
 *
 * `icon` is SVG path data drawn in a uniform 24×24 viewBox (currentColor stroke).
 * Redraw a path to customize an icon — the wrapper keeps every icon uniform.
 */
export const abilities: Ability[] = [
	{
		name: "Erase",
		icon: "M7 7 L17 17 M17 7 L7 17",
		charges: 1,
		description: "Remove one of the opponent's marks."
	},
	{
		name: "Steal",
		icon: "M4 9 H16 M13 6 L16 9 L13 12 M20 15 H8 M11 12 L8 15 L11 18",
		charges: 1,
		description: "Flip one of the opponent's marks to yours."
	},
	{
		name: "Double",
		icon: "M8 8 H19 V19 H8 Z M5 16 V5 H16",
		charges: 1,
		description: "Place two marks in a single turn."
	},
	{
		name: "Counter",
		icon: "M12 3 L19 6 V11 C19 15 16 18 12 21 C8 18 5 15 5 11 V6 Z",
		charges: 1,
		description: "Cancel the opponent's next ability."
	}
];
