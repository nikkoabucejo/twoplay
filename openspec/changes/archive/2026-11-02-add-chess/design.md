# Design

## Context

See proposal.md for why and what, and the specs in `specs/` for required behavior.

A game is a server half in `convex/models/games/<game>/` and a client half in `src/lib/features/play/<game>/` (`.agents/skills/twoplay/references/games.md`). The registry `convex/models/games/index.ts` holds `gameEngines`, three validator unions, and the `applyMove` / `roundWinner` / `gameStatus` switches. `rooms.play` (`convex/models/rooms/index.ts`) authenticates, checks membership and seat, and calls `applyMove`. It treats a returned state that is identical (`===`) to the input as a no-op. Every `moves` row stores the full state after that move (`convex/models/moves/schema.ts`), so state size is paid on every move.

On the client, `Room` (`src/lib/utils/multiplayer/room/room.svelte.ts`) predicts the viewer's moves through a `ClientEngine`, and matches predicted states to server states with `isSameState`. That function compares board shapes and currently knows only tic-tac-toe and checkers. `rovingStep` in `src/lib/components/layout/board/keys.ts` handles focus per layout and is keyed by `GameType`.

## Constraints

1. The change follows the games.md add-a-game recipe exactly:
   - the same file layout (`schema.ts`, `rules.ts`, `engine.ts`, `index.ts` on the server, and `types.ts`, `game.svelte.ts`, `chess.svelte`, `index.ts` on the client)
   - a `GameEngine<ChessState, ChessMove>` implementation
   - a `ChessRoom extends Room` subclass
   - one registry entry and one `case` per switch
   - no new public Convex function
2. Only `convex/models/games/chess/rules.ts` imports `chess.js`. The engine, the client Room, the board, the Learn page, and the tests all use the `rules.ts` API. A Vitest guard test fails if any other file under `src/` or `convex/` imports `chess.js`.
3. The AGENTS.md rules hold:
   - The server is the authority. Play goes through the existing `rooms.play` mutation, with its `ctx.auth` and room-membership checks.
   - Every behavior ships with a Vitest test.
   - The anti-slop rules apply.
   - `codegraph impact` runs before any shared symbol is edited (registry, `Room`, `isSameState`, `rovingStep`, `GAMES`, `STORED_GAMES`).
4. Design system:
   - Reuse the shared board layout (`Board`, `BoardPlaceholder`, and `Cursor` from `$lib/features/presence`).
   - Use `ACCENTS` for seat colors, the existing design tokens, and the focus behavior in `keys.ts`.
   - Build the promotion picker from the existing shadcn-svelte `Popover` (`src/lib/components/ui/popover`) and `Button`.
   - Draw pieces with the `@lucide/svelte` chess icons (already a dependency).
   - Add no new colors, fonts, or one-off styling.

## Goals / Non-Goals

**Goals:**

- Chess fits the existing `GameEngine` contract with no changes to `rooms`, `clocks`, `results`, `ratings`, or `pairings` logic.
- The stored state stays small and holds everything the rules need, including the threefold repetition history.
- Client prediction and server validation run the same `rules.ts` code.

**Non-Goals:**

- No changes to the base `Room`, clocks, or settlement apart from the `isSameState` branch.
- No visible move list. SAN is exposed to screen readers only, per the `chess-board` spec.

## Decisions

### 1. Rules engine: chess.js behind `rules.ts`

The decision is chess.js 1.4.0, pinned to that exact version (no caret), wrapped by `rules.ts`.

- **Alternative: hand-written move generator.** Rejected, and the user confirmed this. Castling rights, en passant, pins, and insufficient material are where hand-written engines go wrong. chess.js is BSD-2, has no dependencies, and is widely tested.
- **Alternative: import chess.js wherever it's needed.** Rejected. It would leak the library's types and its throwing behavior into the engine and the UI, and break the recipe's pure-rules boundary.

`rules.ts` exports plain data only and never a `Chess` instance.

| Export                                                                                             | Meaning                                                                                                   |
| -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `Color` (`"w" \| "b"`)                                                                             | Side color                                                                                                |
| `PieceType` (`"p" \| "n" \| "b" \| "r" \| "q" \| "k"`)                                             | Piece type                                                                                                |
| `PromotionPiece` (`"q" \| "r" \| "b" \| "n"`)                                                      | Promotion choice                                                                                          |
| `Piece` (`{ color, type }`)                                                                        | A piece on the board                                                                                      |
| `Square` (`"a1"`…`"h8"`)                                                                           | A square name                                                                                             |
| `LegalMove` (`{ from, to, promotion?, san }`)                                                      | One legal move                                                                                            |
| `Outcome` (`"checkmate" \| "stalemate" \| "insufficient" \| "repetition" \| "fifty-move" \| null`) | How the position ends, or null                                                                            |
| `colorOfSeat(seat)`, `seatOfColor(color)`                                                          | Seat and color mapping, via `playerSymbols(["w", "b"])` from `../engine.js`                               |
| `INITIAL_FEN`, `initialPosition()`                                                                 | The start position, as `{ fen, positions: [key] }`                                                        |
| `boardOf(fen)`                                                                                     | `(Piece \| null)[64]`, row-major from a8 (index 0) to h1 (63), which matches the drawn order for white    |
| `squareName(index)`, `squareIndex(square)`                                                         | Board index and square name conversion                                                                    |
| `turnOf(fen)`, `isCheck(fen)`, `checkedKing(fen)`                                                  | Side to move, whether it is in check, and that king's square or null                                      |
| `legalMoves(fen)`                                                                                  | All `LegalMove`s. A promotion appears once per piece.                                                     |
| `isPromotion(fen, from, to)`                                                                       | True when a legal move from `from` to `to` needs a promotion piece. Used to open the picker.              |
| `play(position, move)`                                                                             | The next position, or `null` when the move is illegal                                                     |
| `outcome(position)`                                                                                | The `Outcome`                                                                                             |
| `positionKey(fen)`                                                                                 | The repetition key                                                                                        |
| `findMove(beforeFen, afterFen)`                                                                    | The `LegalMove` that turns one FEN into the other, or `null`. Drives the last-move mark and the SAN text. |

How the data maps to and from chess.js:

- **Loading.** Each call loads a `Chess` from the FEN. FENs only come from our own state, so a load failure is a bug, and it throws.
- **Playing a move.** `play` loads the FEN and calls `move({ from, to, promotion })` inside a `try`. chess.js 1.x throws on an illegal move, and `play` returns `null` instead. It then reads back `fen()`.
- **History.** The history is our own. If the move was a capture or a pawn move (`move.captured`, or `move.piece === "p"`), `positions` resets to `[key]`. Otherwise `key` is appended.
- **Outcome.** `outcome` checks in this order: `isCheckmate()`, `isStalemate()`, `isInsufficientMaterial()`, then whether the current key appears 3 times in `positions`, then whether the FEN halfmove clock is at least 100. Checkmate comes first, so a mate on the 100th quiet half-move wins. `isThreefoldRepetition()` and `isDraw()` are not used, because a loaded `Chess` has no history.
- **Position key.** The key is the first four FEN fields: placement, side to move, castling rights, and en passant square. The en passant field is replaced with `-` unless a legal en passant capture exists. That way, two positions that differ only by a capture that can't happen still count as the same (FIDE). The check is made in `rules.ts` and does not rely on how chess.js writes that field.

### 2. Promotion field on a non-promotion move

chess.js 1.x ignores `promotion` when it matches a move that isn't a promotion. The spec says that move is rejected. So `play` first finds the requested move in `legalMoves(fen)`, matching `from`, `to`, and `promotion` exactly. A missing piece, an extra piece, or the wrong piece all return `null`. This also makes the result independent of chess.js's default promotion behavior.

### 3. State and move validators (`chess/schema.ts`)

```ts
chessState = v.object({
	kind: v.literal("chess"),
	fen: v.string(),
	positions: v.array(v.string())
});
chessMove = v.object({
	kind: v.literal("chess"),
	from: v.string(),
	to: v.string(),
	promotion: v.optional(v.union(v.literal("q"), v.literal("r"), v.literal("b"), v.literal("n")))
});
```

- **Why FEN.** It is the smallest complete description of a position. Checkers stores a 64-entry array instead.
- **Why algebraic squares.** They match FEN, SAN, and chess.js. The board converts with `squareName` and `squareIndex`.
- **Validation.** `v.string()` is enough for the squares, because `play` matches against generated legal moves, so any other string is rejected.
- **Size.**
  - A FEN is about 60–90 bytes, and a key about 45–70.
  - `positions` is cleared on every capture or pawn move, and the fifty-move rule caps it at 101 entries. So a `moves` row is under about 8 KB in the worst case, and usually well under 1 KB.

Alternatives for repetition:

- **Store the full move list and replay it.** Rejected. It grows without limit, and replays everything on each move.
- **Store hashed keys.** Rejected for now. It adds a hash to `rules.ts` and a tiny collision risk to save a few KB in a rare worst case.

### 4. Engine and registry

`chess/engine.ts` implements `GameEngine<ChessState, ChessMove>` (`kind: "chess"`, `playerCount: 2`):

- **`createInitialState`** returns `{ kind, ...initialPosition() }`.
- **`status`** returns `turnIndex: seatOfColor(turnOf(fen))` and `isOver: outcome !== null`. The winner is the other seat on checkmate, and null otherwise.
- **`applyMove`**:
  - returns `state` if the game is over
  - throws `"Not your turn"` if the move comes from the seat not to move
  - otherwise returns `play(...)`, or `state` itself when that is null. `rooms.play` treats the latter as a no-op, as for checkers.
- **`roundWinner`** returns `status(state).winnerIndex`.

`chess/index.ts` is the barrel. In `convex/models/games/index.ts`:

- `gameEngines` gains `chess: chessEngine`.
- The validators widen to `v.literal("chess")`, `chessState`, and `chessMove`.
- `GameState` and `GameMove` add the chess types.
- Each of the three switches gets a `case "chess"` with the same kind guard. TypeScript then requires the new case, which keeps the switches exhaustive.

### 5. Client Room

`src/lib/features/play/chess/game.svelte.ts` defines `chessClientEngine`, which narrows to `kind === "chess"` and delegates to `chessEngine`. It also defines `ChessRoom extends Room`, which calls `super("chess", …)` and does not override `activeSeat`.

| Member                      | What it holds                                                                                                                                                 |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `#displayState`             | `displayState` narrowed to chess                                                                                                                              |
| `fen`, `board`              | `boardOf(fen)`                                                                                                                                                |
| `turn`                      | Side to move                                                                                                                                                  |
| `legalMoves`                | `legalMoves(fen)`                                                                                                                                             |
| `checkSquare`               | `checkedKing(fen)`                                                                                                                                            |
| `outcome`                   | The `Outcome` of the shown position                                                                                                                           |
| `canMove`                   | `isMyTurn && !isViewingHistory`                                                                                                                               |
| `selected`                  | The selected square (`$state`)                                                                                                                                |
| `effectiveSelected`         | `selected`, cleared once it no longer has a legal move                                                                                                        |
| `destinations`              | Hinted squares for the selected piece                                                                                                                         |
| `pendingPromotion`          | `{ from, to } \| null` (`$state`)                                                                                                                             |
| `lastMove`                  | `findMove(previousFen, fen)`, where `previousFen` comes from `previousDisplayState`, or `INITIAL_FEN` before the first move. Holds `{ from, to, san, seat }`. |
| `squareLabel(index)` inputs | Coordinate, piece, "in check", "can move"                                                                                                                     |

Methods:

- **`select(index)`** follows the `chess-board` "Choosing a target" rules. It opens `pendingPromotion` when `isPromotion` is true. Otherwise it calls `submitMove({ kind: "chess", from, to })`.
- **`promote(piece)`** submits the move with the chosen promotion piece.
- **`cancelPromotion()`** clears the picker.

Prediction runs through the base `submitMove`, so the pending move is computed by the same `play` the server uses.

`isSameState` gains a chess branch that compares `fen`. The halfmove and fullmove counters in the FEN make every position in a round unique, so a repeated board can't falsely confirm a pending move or confuse `previousDisplayState`. The function becomes a `switch` on `kind`.

### 6. Board composition

`chess.svelte` copies the structure of `checkers.svelte`:

- `Gate`, `BoardPlaceholder`, and the error and missing-room branches
- `Board` with players, status, replay, footer, and `rejectionId`
- `Cursor {flip}`
- `TurnAlert`
- the rejection toast `$effect`

The grid is 8×8 with 64 `<button>` squares inside `role="group" aria-label="Chess board" data-board-grid data-sfx="off"`.

- **Orientation.** `flip = room.myIndex === 1`, and each square uses `index = flip ? 63 - slot : slot`. This is the checkers rule, and it is a 180° turn, which is what `Cursor`'s `flip` already assumes. Spectators have `myIndex === null`, so they see white's side.
- **Focus.** `keys.ts` gets `chessStep`, a plain 8×8 step in slot (drawn) order that stops at the edges, and `FIRST_AND_LAST.chess = [0, 63]`. Because steps are in slot space, the arrows follow what is drawn, including for black.
- **Square colors.** Light squares use `bg-background` and dark squares use `bg-foreground/15`, the shade checkers renders in the always-dark app. Squares have no hover background.
- **Marks.**
  - The last move uses `ACCENTS[seat].tintBg`.
  - Destinations use the checkers destination dot.
  - The selected piece uses the checkers selection ring.
  - The check mark uses `bg-destructive/20`, an existing token. It changes only color, so no box moves.
- **Pieces.** Each piece is the matching `@lucide/svelte` icon (`ChessKing`, `ChessQueen`, `ChessRook`, `ChessBishop`, `ChessKnight`, `ChessPawn`), outlined in `ACCENTS[seatOfColor(color)].text` at stroke width 1.25 with a `fill-current/15` tint, so the interior lines stay visible. White is seat 0's accent and black is seat 1's, the same seat-color rule as checkers discs.
  - The alternative was Unicode glyphs. They were rejected because they depend on the font and can render as emoji on iOS.
  - The strip mark is the king icon in the seat's accent.
- **Promotion picker.** A controlled `Popover` anchored to the destination square (bits-ui `customAnchor`) holds four `Button`s named Queen, Rook, Bishop, and Knight, each showing its icon.
  - Focus starts on Queen.
  - Closing it by Escape or an outside click calls `cancelPromotion()`.
  - It renders in a portal, so the board's box doesn't change.
  - The alternative was `DropdownMenu`. It was rejected because the spec asks for buttons reachable by Tab, and menus use arrow keys.
- **SAN.** A visually hidden (`sr-only`) element inside the board group reads "Last move: {san}" from `room.lastMove`. Nothing visible is added.
- **Home preview.** `preview.svelte` gets a static chess branch, decorative and `aria-hidden`.

### 7. Learn page

Chess follows the existing per-game pattern in `src/lib/features/core/rules/`:

- `BoardDemo` gains a `chess` variant built with `demoSteps` and `chessEngine`, from a FEN and a list of moves.
- `chess-board.svelte` renders demo and practice positions with the same piece icons and tokens as the room board.
- `ChessPractice` (in `practice.svelte.ts`) plays both seats through `chessEngine` and `rules.ts`, including the promotion picker.
- `RULES.chess` holds the steps from the `learn` spec.
- `demo.svelte`, `practice-board.svelte`, and `lesson.svelte` gain chess branches. Lesson's ternary becomes a switch.

The piece-icon map lives in one module under `src/lib/features/play/chess/`. The rules board imports it through the `$lib/features/play` barrel, so the room and Learn render the same pieces.

### 8. Decision record

The steward adds an entry to `.agents/skills/twoplay/references/decisions.md` in the existing format:

> **2026-11-02 — Chess rules through chess.js, wrapper only**
>
> - **Decision:** chess.js, pinned to exactly 1.4.0, is imported only by `convex/models/games/chess/rules.ts`. State is FEN plus the position keys since the last capture or pawn move.
> - **Why:** It is mature and covers FIDE edge cases. The wrapper keeps the pure-rules API and the engine contract, and the stored keys restore the threefold check that chess.js loses on FEN load.
> - **Enforced by:** a Vitest import-guard test.

### Caller coverage

Task group names refer to tasks.md, which comes next.

| Caller                                                                                                                                          | Disposition                                                                                                                                                                                    |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `gameTypeValidator` in `pairings/schema.ts`, `pairings/index.ts` `enqueue`, `rooms/schema.ts`, `rooms/index.ts` `create`                        | Widened by the registry task. Matchmaking and room creation accept `"chess"` with no further change. Covered by a convex test that enqueues and creates a chess room.                          |
| `gameStateValidator` in `games/schema.ts`, `moves/schema.ts`                                                                                    | Widened by the registry task. Covered by the play test that stores a chess move.                                                                                                               |
| `gameMoveValidator` in `rooms/index.ts` `play`                                                                                                  | Widened by the registry task. Covered by convex tests for legal, illegal, out-of-turn, and promotion moves through `rooms.play`.                                                               |
| `history` (moves query), room `rounds`, `stats`, `statsForUsers`, `computePlayerStats`                                                          | Unaffected. They read rows and results without inspecting state shape. The `/me` per-game record iterates `GAME_TYPES`.                                                                        |
| `getEngine` in `createGame`                                                                                                                     | Uses `createInitialState`. Covered by the chess engine test and the room-creation test.                                                                                                        |
| `getEngine` in `settleRound`, `resign`, `join`, `get`, `forfeitRoom`, `sweep`, `classifyGameResult`, `lobbies`, `play`                          | Read only `playerCount` (2), so they are unaffected. The settle, resign, and timeout paths are covered by one convex test each for a chess room (checkmate win, stalemate draw, timeout loss). |
| `applyMove`, `roundWinner`, `gameStatus` switches                                                                                               | Given a new `case` by the registry task, and covered by `convex/models/games/index.test.ts` cases.                                                                                             |
| `isSameState`, used by `Room` `#confirmedCount` and `previousDisplayState`                                                                      | The client-room task adds the chess branch, covered by `room.svelte.test.ts` cases for chess confirmation and previous-state lookup.                                                           |
| `CheckersRoom.lastMove`, `TictactoeRoom.lastMove`                                                                                               | Unaffected. They read `previousDisplayState`, whose tic-tac-toe and checkers behavior doesn't change.                                                                                          |
| `GAME_TYPES` (from `GAMES`) and its consumers: `/play` choices, `stats.ts`, `/learn` index and `[game]` 404 check, root layout room route check | Get chess from the `GAMES` registration task. Covered by the existing generic tests plus new chess assertions in `games.test.ts` and the learn route tests.                                    |
| `playing.svelte`                                                                                                                                | The Room ternary becomes a switch with `ChessRoom`. Covered by a `playing.svelte.test.ts` case.                                                                                                |
| `history.svelte`, `lobby.svelte`, `game-card.svelte`, `home.svelte`                                                                             | Read `GAMES[type]` name and icon, so they are unaffected beyond the registration. `game-card.svelte` renders `preview.svelte`, which gets the chess branch, covered by a home test case.       |
| `rovingStep` (`keys.ts`)                                                                                                                        | Gets the chess layout in the board task, covered by `keys.test.ts`.                                                                                                                            |
| `STORED_GAMES` (preferences)                                                                                                                    | Gets `chess: true`, which `satisfies Record<GameType, true>` forces. Covered by the `user-preferences` scenarios.                                                                              |
| `utils/seo`, sitemap, tour, about copy                                                                                                          | Copy and list tasks, covered by the `search-indexing` and `info-pages` tests. About copy is left to `rework-about-page-agent-build`, which owns `about.svelte`.                                |

## Risks / Trade-offs

- [chess.js loads a FEN and generates moves on every `status` call: room `get`, `sweep` via `claimExpiredClock`, and `play`] → The cost is microseconds per position. `sweep` handles a few rooms. If needed, `status` can compute the outcome once per call and reuse it.
- [A future chess.js upgrade changes how FEN or exceptions behave] → The version is pinned exactly. `rules.ts` tests pin the FEN round trip, illegal-move handling, and the promotion matching rule.
- [The about-page change modifies the same "Stable page load" and "Reduced motion" requirements] → Archive the two changes one after the other. The second rebases its MODIFIED text onto the first.
- [A timeout against a lone king counts as a loss, which differs from FIDE] → This is specified and accepted as a known simplification.
- [`findMove` tries every legal move to find the last one] → At most a few hundred tries per shown position, client-side only, and memoized by `$derived`.

## Migration Plan

The change is additive: no existing document changes shape, and no backfill is needed. Run `pnpm add chess.js@1.4.0 --save-exact`. Deploy happens through the normal Convex push. This plan does not run `convex deploy`. To roll back, revert the commit. Chess rooms created in the meantime would fail schema validation after a revert, so close them first.
