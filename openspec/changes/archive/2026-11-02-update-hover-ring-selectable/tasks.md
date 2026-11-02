# Tasks

No server work: this change touches no file under `convex/`.

## 1. Ring utilities and usages [designer]

- [x] 1.1 [designer] Update `src/routes/layout.css.test.ts` for "Hover runs a muted ring" (hover-ring runs on hover and sets neutral ring colors) and "Selected ring keeps seat colors" first. Then make `comet-ring` read `--ring-0`/`--ring-1` (default seat colors), have `hover-ring` set them to `--muted-foreground` and run the spark on hover. Drop `hover-ring` from `game-card.svelte`, `about.svelte` (GitHub link), `door.svelte`, `board.svelte` (emoji buttons), and `sound-lab.svelte` `PAD_CLASS`, with a test for "Plain links have no ring" where a component test already exists.

## 2. Verification

- [x] 2.1 `pnpm test`
- [x] 2.2 `pnpm check`
