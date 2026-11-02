<script lang="ts">
	import { EyeOff, Gift, Handshake, Info } from "@lucide/svelte";
	import { Page } from "$lib/components/layout";
	import { Meta } from "$lib/components/ui";
	import { Legal } from "$lib/features/core";
</script>

<Meta
	title="Terms"
	description="The terms for using twoplay: accounts through Clerk, fair play, and what is stored."
/>

<Page title="Terms" description="The rules for using twoplay.">
	<Legal
		updated="2026-11-02"
		highlights={[
			{ icon: Gift, label: "Free to play" },
			{ icon: Handshake, label: "Play fair" },
			{ icon: EyeOff, label: "No ads or tracking" },
			{ icon: Info, label: "Provided as is" }
		]}
		sections={[
			{
				id: "using",
				heading: "Using twoplay",
				paragraphs: [
					"twoplay is free. You need an account to play, and sign-in is handled by Clerk."
				]
			},
			{
				id: "fair-play",
				heading: "Fair play",
				paragraphs: [
					"Play your own games. Don't use bots or engines, harass other players, or try to break the service. Accounts that do may be removed."
				]
			},
			{
				id: "data",
				heading: "Your data",
				paragraphs: [
					"Your game history and rating are stored, as the Privacy page describes. There are no ads or tracking."
				]
			},
			{
				id: "no-guarantees",
				heading: "No guarantees",
				paragraphs: [
					"twoplay is provided as is. Games, ratings, and history may be reset or removed."
				]
			},
			{
				id: "changes",
				heading: "Changes",
				paragraphs: ["These terms may change. The current version is always on this page."]
			}
		]}
	/>
</Page>
