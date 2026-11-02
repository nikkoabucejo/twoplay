<script lang="ts">
	import { Ban, EyeOff, HardDrive, KeyRound } from "@lucide/svelte";
	import { Page } from "$lib/components/layout";
	import { Meta } from "$lib/components/ui";
	import { Legal } from "$lib/features/core";
</script>

<Meta
	title="Privacy"
	description="What twoplay stores about you: your Clerk sign-in, game history, and rating. No ads or tracking."
/>

<Page title="Privacy" description="What twoplay stores and why.">
	<Legal
		updated="2026-11-02"
		highlights={[
			{ icon: Ban, label: "No ads" },
			{ icon: EyeOff, label: "No tracking" },
			{ icon: KeyRound, label: "Clerk handles sign-in" },
			{ icon: HardDrive, label: "Settings stay local" }
		]}
		sections={[
			{
				id: "sign-in",
				heading: "Sign-in",
				paragraphs: [
					"Sign-in is handled by Clerk. twoplay gets your name, email address, and profile picture from Clerk. It never sees your password."
				]
			},
			{
				id: "stored",
				heading: "What is stored",
				paragraphs: [
					"Your rooms, their moves and results, your game history, and your rating are stored so you can look back at past games and appear on the leaderboard.",
					"Your name is shown to opponents and on the leaderboard."
				]
			},
			{
				id: "settings",
				heading: "Settings",
				paragraphs: [
					"Sound, motion, and new-game settings are saved in your browser and never sent to twoplay."
				]
			},
			{
				id: "no-ads",
				heading: "No ads or tracking",
				paragraphs: ["twoplay shows no ads and uses no analytics or tracking cookies."]
			}
		]}
	/>
</Page>
