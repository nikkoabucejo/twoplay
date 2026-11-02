# Design

## Context

Square classes are built inline in four components. They differ in structure: the checkers Learn board uses a FLIP overlay and div light squares, Learn switches between button and div, and chess anchors the promotion picker to a square.

## Goals / Non-Goals

**Goals:** one source for square, focus-ring, selected-ring, and move-dot classes.

**Non-Goals:** a shared square component, Board/Cursor/flip on Learn boards, Learn board prop changes, tictactoe.

## Decisions

- **Pure TS helper over a component.** `squareClass({ dark, tint, mark, interactive })` built on `cn`, order base, tint, mark, so tailwind-merge lets later backgrounds win. `interactive` adds the focus ring; Learn picture-mode divs pass `false`. Constants: `SQUARE_FOCUS`, `SELECTED_RING` (`rounded-full ring-2 ring-white`), `MOVE_DOT` (`absolute size-1/4 rounded-full bg-emerald-400/70`). No `GameType` parameter. A component was rejected because the four boards differ in element type and overlays.
- **Placement stays per game.** Chess puts the selected ring at `inset-[12%]` on the square, checkers at `inset-1` on the disc; both append the shared ring classes.
- **Import through the barrel.** The category rule requires `$lib/components/layout`; deep imports are not allowed. `board/index.ts` and `layout/index.ts` carry uncommitted ResultCard edits from add-sandbox-page, so this change's commit stages only the squares export lines (`git add -p`).

## Risks / Trade-offs

- [tailwind-merge drops a needed class] → `squares.test.ts` pins the merged output for each mark combination.
- [Edits collide with fix-client-convex-function-imports in the live boards] → apply after that change lands; touch only class markup.
- [Learn boards are rendered by add-sandbox-page] → props unchanged; `core/rules/index.ts` and `core/sandbox/*` untouched.
