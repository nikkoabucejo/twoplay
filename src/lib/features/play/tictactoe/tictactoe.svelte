<script lang="ts">
  import { Board } from "$lib/components/layout";
  import { Button } from "$lib/components/ui";
  import { cn } from "$lib/utils/style";
  import { abilities } from "./abilities.js";
  import { TictactoeGame } from "./game.svelte.js";

  let { class: className }: { class?: string } = $props();

  // Nine independent boards laid out 3x3. UI only for now — no meta-game rules
  // (which board is active, winning the overall grid) yet.
  const games = Array.from({ length: 9 }, () => new TictactoeGame());

  function resetAll() {
    for (const game of games) game.reset();
  }
</script>

{#snippet miniBoard(game: TictactoeGame)}
  <div
    class={cn(
      "grid grid-cols-3 grid-rows-3 gap-1.5 rounded-xl bg-muted/40 p-1.5 transition-colors",
      game.status === "won" && "bg-primary/10 ring-2 ring-primary",
    )}
    role="grid"
    aria-label="Tic-tac-toe board"
  >
    {#each game.board as cell, index (index)}
      <button
        type="button"
        class={cn(
          "flex items-center justify-center rounded-md border bg-background text-xl font-bold transition-colors",
          "hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60",
          cell === "X" && "text-cyan-500",
          cell === "O" && "text-pink-500",
          game.isWinningCell(index) && "border-primary bg-primary/10",
        )}
        disabled={cell !== null || game.status !== "playing"}
        aria-label={cell ? `Cell ${index + 1}, ${cell}` : `Cell ${index + 1}, empty`}
        onclick={() => game.play(index)}
      >
        {cell ?? ""}
      </button>
    {/each}
  </div>
{/snippet}

<Board
  class={className}
  players={[
    { label: "Player 1", accent: "text-cyan-500", abilities },
    { label: "Player 2", accent: "text-pink-500", abilities },
  ]}
>
  <div class="grid size-full grid-cols-3 grid-rows-3 gap-3">
    {#each games as game, boardIndex (boardIndex)}
      {@render miniBoard(game)}
    {/each}
  </div>

  {#snippet controls()}
    <Button variant="outline" onclick={resetAll}>Reset game</Button>
  {/snippet}
</Board>
