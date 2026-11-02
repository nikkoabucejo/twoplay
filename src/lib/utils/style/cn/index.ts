import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";
import { createTV } from "tailwind-variants";

// Without this, tailwind-merge reads the custom `text-caption` size as a text color and drops it
// next to `text-emerald-500` and friends.
const twMergeConfig = {
	extend: { classGroups: { "font-size": [{ text: ["caption"] }] } }
};

const twMerge = extendTailwindMerge(twMergeConfig);

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

// tailwind-variants runs its own tailwind-merge, so it needs the same config.
export const tv = createTV({ twMergeConfig });
