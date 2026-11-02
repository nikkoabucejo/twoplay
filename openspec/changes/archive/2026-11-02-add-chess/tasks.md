# Tasks

Run `codegraph impact <symbol>` before editing any shared symbol named below: `gameEngines`, the validators, the `applyMove`/`roundWinner`/`gameStatus` switches, `isSameState`, `rovingStep`, `GAMES`, `RULES`, `STORED_GAMES`, and the seo lists.

Once group 3 widens `GameType`, `pnpm check` reports the `Record<GameType, …>` maps that don't have a `chess` key yet: `FIRST_AND_LAST` (group 5), `GAMES` (group 6), `RULES` (group 7), and `STORED_GAMES` (group 8). Until group 8, verify each group with Vitest on the files it touches. `pnpm check` must pass from the end of group 8 on.

## 1. Dependency and import guard [engineer]

- [x] 1.1 [engineer] Run `pnpm add chess.js@1.4.0 --save-exact`. Verify that `package.json` lists `"chess.js": "1.4.0"` with no caret and that `pnpm install --frozen-lockfile` succeeds.
- [x] 1.2 [engineer] Create `convex/models/games/chess/rules.test.ts` with a `describe("chess.js import boundary")` test. The test globs every `.ts`, `.svelte.ts`, and `.svelte` file under `src/` and `convex/`, excluding `convex/_generated`. It fails if any file other than `convex/models/games/chess/rules.ts` contains an `import`, `export … from`, or dynamic `import()` of `"chess.js"`. Verify it with `pnpm vitest run convex/models/games/chess/rules.test.ts`. It passes now, and fails after a temporary import is added to another file.

## 2. Chess rules [engineer]

- [x] 2.1 [engineer] In `convex/models/games/chess/rules.test.ts`, add failing tests for move legality, using the FENs and move sequences from `specs/chess-rules/spec.md`:
  - "Only legal moves are accepted": wrong way, pinned piece, ignoring check, moving the opponent's piece
  - "Castling": all 5 scenarios
  - "En passant": both scenarios
  - "Promotion": each piece, missing piece, promotion on an ordinary move
  - `colorOfSeat` and `seatOfColor`

  Verify with `pnpm vitest run convex/models/games/chess/rules.test.ts` (red).

- [x] 2.2 [engineer] Add failing tests for outcomes:
  - "Checkmate ends the round" (fool's mate)
  - "Stalemate is a draw"
  - "Insufficient material is a draw" (all 4 scenarios)
  - "Threefold repetition is a draw" (both)
  - "Fifty-move rule is a draw" (both)
  - checkmate taking priority over the fifty-move rule

  Verify the tests are red.

- [x] 2.3 [engineer] Add failing tests for:
  - "Repetition history stays bounded": both scenarios, asserting `positions.length`
  - `positionKey`: the en passant square is normalized to `-` when no en passant capture is legal
  - `boardOf` indexing: a8 is index 0 and h1 is 63
  - `squareName` and `squareIndex` round trip
  - `checkedKing`
  - `isPromotion`
  - `findMove`: returns `from`, `to`, and SAN for `Nf3`, `O-O`, an en passant capture, `e8=Q#`, and `Nxe5+`, and returns `null` for unrelated FENs

  Verify the tests are red.

- [x] 2.4 [engineer] Create `convex/models/games/chess/schema.ts` with `chessState` and `chessMove` as in design §3. Verify with `pnpm vitest run convex/models/games/chess` (it compiles).
- [x] 2.5 [engineer] Create `convex/models/games/chess/rules.ts` as in design §1–2:
  - the types
  - `colorOfSeat` and `seatOfColor` via `playerSymbols`
  - `INITIAL_FEN` and `initialPosition`
  - `boardOf`, `squareName`, `squareIndex`, `turnOf`, `isCheck`, `checkedKing`
  - `legalMoves` and `isPromotion`
  - `play`, which matches `from`, `to`, and `promotion` exactly, returns `null` when the move is illegal, and resets or appends `positions`
  - `outcome`, in the design's order
  - `positionKey` and `findMove`

  Verify that all of `rules.test.ts` passes.

## 3. Engine and registry [engineer]

- [x] 3.1 [engineer] Create `convex/models/games/chess/engine.test.ts`, one `describe` per export, with these tests:
  - "White moves first": the initial state is the standard start and seat 0 is to move
  - "Move out of turn": throws `"Not your turn"`
  - an illegal move returns the same state object (`===`)
  - after the game is over, `applyMove` returns the state
  - `status` and `roundWinner` give seat 1 on fool's mate and `null` on stalemate

  Verify the tests are red.

- [x] 3.2 [engineer] Create `convex/models/games/chess/engine.ts` (`chessEngine` as in design §4) and `convex/models/games/chess/index.ts` (barrel). Verify `pnpm vitest run convex/models/games/chess` passes.
- [x] 3.3 [engineer] In `convex/models/games/index.test.ts`, add failing tests:
  - "registry": includes `chess`
  - "applyMove dispatch": a chess move, and a kind mismatch throws
  - "status and roundWinner dispatch": chess
  - "settleRound": fool's mate credits seat 1's score and MMR; stalemate settles as a draw with no score change
  - "claimExpiredClock": "Flag against a lone king", where white's clock expires with black on a lone king and seat 1 wins
  - `resign` in a chess room credits the opponent
- [x] 3.4 [engineer] In `convex/models/rooms/index.test.ts`, add failing tests:
  - `create` makes a chess room
  - `pairings.enqueue({ type: "chess" })` is accepted
  - `play` stores a legal chess move as a `moves` row
  - an illegal chess move leaves the state, the moves count, and the clocks unchanged
  - a promotion move with no piece is not applied
  - a move out of turn is rejected with "Not your turn"
- [x] 3.5 [engineer] Run `codegraph impact gameEngines`. Then edit `convex/models/games/index.ts`:
  - add `chess: chessEngine` to `gameEngines`
  - widen `GameState` and `GameMove`
  - add `v.literal("chess")`, `chessState`, and `chessMove` to `gameTypeValidator`, `gameStateValidator`, and `gameMoveValidator`
  - add a `case "chess"` with a kind guard to `applyMove`, `roundWinner`, and `gameStatus`

  Verify with `pnpm vitest run convex/models/games convex/models/rooms convex/models/pairings`: 3.3 and 3.4 pass and the existing tests stay green. Callers in `pairings/schema.ts`, `rooms/schema.ts`, `games/schema.ts`, and `moves/schema.ts` need no edit (see design "Caller coverage").

## 4. Client room [engineer]

- [x] 4.1 [engineer] Create `src/lib/features/play/chess/types.ts`. It re-exports `ChessState`, `ChessMove`, `Piece`, `Square`, `PromotionPiece`, and `LegalMove` from the server modules. Verify that `pnpm vitest run src/lib/features/play/chess` compiles.
- [x] 4.2 [engineer] In `src/lib/utils/multiplayer/room/room.svelte.test.ts`, add failing tests for chess rooms (using `fake-convex.svelte.ts`):
  - a pending `e2e4` is confirmed by a server state with the same FEN, without a replay
  - `previousDisplayState` finds the right entry after `Nf3 Nf6 Ng1 Ng8`, where the board repeats but the FEN differs
- [x] 4.3 [engineer] Run `codegraph impact isSameState`. Then turn `isSameState` in `src/lib/utils/multiplayer/room/room.svelte.ts` into a `switch` on `kind`, comparing `fen` for chess. Verify that `room.svelte.test.ts` passes and the existing tic-tac-toe and checkers cases stay green.
- [x] 4.4 [engineer] Create `src/lib/features/play/chess/game.svelte.test.ts` with failing tests for `ChessRoom`:
  - "Knight at the start": g1 hints exactly f3 and h3
  - "Pinned piece": nothing is selected
  - "Not the viewer's turn"
  - "Hinted square": sends `{ kind: "chess", from: "g1", to: "f3" }`
  - "Reselect"
  - "Square that is not hinted"
  - promotion:
    - a pawn reaching b8 sets `pendingPromotion` and sends nothing
    - `promote("n")` sends the move with `promotion: "n"`
    - `cancelPromotion()` sends nothing and the pawn stays on b7
  - "Chess move before the server answers" and "Chess promotion before the server answers" (`optimistic-moves`)
  - `lastMove`: "Castling marked" gives e1 and g1, and the SAN cases `Nxe5+`, `O-O`, and `e8=Q#`
  - `checkSquare`: "King in check" and "Check while scrubbing"
- [x] 4.5 [engineer] Create `src/lib/features/play/chess/game.svelte.ts` with `chessClientEngine` and `ChessRoom` as in design §5. Verify `game.svelte.test.ts` passes.
- [x] 4.6 [engineer] Create `src/lib/features/play/chess/labels.test.ts` with failing tests for "Chess square labels":
  - `"g1, white knight, can move"` and `"a1, white rook"`
  - `"e8, black king, in check, can move"`
  - `"e4, empty"`
- [x] 4.7 [engineer] Create `src/lib/features/play/chess/labels.ts` with `squareLabel`. Verify `labels.test.ts` passes.

## 5. Chess board [designer]

- [x] 5.1 [engineer] In `src/lib/components/layout/board/keys.test.ts`, add failing `rovingStep(…, "chess")` tests:
  - plain 8×8 steps in slot order that stop at the edges
  - Home is 0 and End is 63
  - for "Chess as drawn for black", slot steps map to e2 → d2 → d1 under `index = 63 - slot`
- [x] 5.2 [engineer] Run `codegraph impact rovingStep`. Then add `chessStep` and `FIRST_AND_LAST.chess = [0, 63]` to `src/lib/components/layout/board/keys.ts`. Verify `keys.test.ts` passes.
- [x] 5.3 [designer] Create `src/lib/features/play/chess/chess.svelte.test.ts` with failing tests:
  - "Chess roles": one group named "Chess board" with exactly 64 buttons and no `grid` role
  - board orientation: the "White seat", "Black seat", and "Spectator" bottom-left square labels
  - the board has `data-sfx="off"` ("Board cell" in `ui-click-sounds`)
  - last-move squares carry `ACCENTS[seat].tintBg`
  - the checked king's square carries the check mark class
  - an `sr-only` element reads "Last move: Nf3"
  - the promotion picker:
    - shows Queen, Rook, Bishop, and Knight buttons
    - focus starts on Queen and Tab reaches the others
    - Escape closes it and sends no move
  - a rejection shows a toast and shakes the board
  - one tab stop, and arrow keys move focus
- [x] 5.4 [designer] Create `src/lib/features/play/chess/piece.svelte`. It is the piece-icon map from `@lucide/svelte` (`ChessKing`, `ChessQueen`, `ChessRook`, `ChessBishop`, `ChessKnight`, `ChessPawn`), drawn in `ACCENTS[seatOfColor(color)].text`, with no new tokens. Verify by rendering it in `chess.svelte.test.ts`.
- [x] 5.5 [designer] Create `src/lib/features/play/chess/promotion.svelte`. It is a controlled `Popover` from `$lib/components/ui/popover`, using `customAnchor` on the destination square, holding four `Button`s with piece icons. It calls `onPick` or `onCancel`. Verify the picker cases in `chess.svelte.test.ts`.
- [x] 5.6 [designer] Create `src/lib/features/play/chess/chess.svelte`, following the structure of `checkers.svelte` (design §6):
  - `Gate`, `BoardPlaceholder`, and the error branches
  - `Board` with `footer`, `replay`, and `rejectionId`
  - `Cursor {flip}`, with `flip = room.myIndex === 1` and `index = flip ? 63 - slot : slot`
  - `TurnAlert` and the rejection toast `$effect`
  - squares in `bg-background` and `bg-foreground/10`
  - the checkers destination dot and selection ring
  - `bg-destructive/20` for the check mark
  - the `sr-only` last-move SAN
  - `squareLabel`, and `rovingStep(…, "chess")`

  Verify that `chess.svelte.test.ts` passes.

- [x] 5.7 [engineer] Create the barrel `src/lib/features/play/chess/index.ts` (`Chess`, `ChessRoom`, `ChessPiece`, types) and add the chess exports to `src/lib/features/play/index.ts`. Verify that `pnpm vitest run src/lib/features/play` passes.

## 6. Registration, route, icon, and preview [engineer, designer]

- [x] 6.1 [designer] Create `src/lib/assets/icons/games/chess.svelte.test.ts` with a failing "Chess icon holds still" test: under reduced motion there is no `<animate>` element and the icon is visible. Without reduced motion, the icon animates.
- [x] 6.2 [designer] Create `src/lib/assets/icons/games/chess.svelte`, a knight split diagonally into seat 0 and seat 1 colors, with a slow nod. Follow `checkers.svelte`'s `prefersReducedMotion` pattern and use `SEAT_COLORS`/accent tokens only. Add `ChessIcon` to `src/lib/assets/icons/games/index.ts`. Verify that 6.1 passes.
- [x] 6.3 [engineer] Add failing tests:
  - `src/lib/features/play/games.test.ts`: `GAMES.chess` has the name `Chess` and a description
  - `src/lib/components/ui/playing/playing.svelte.test.ts`: `type="chess"` builds a `ChessRoom`
  - `src/routes/(games)/page.svelte.test.ts`: "Cards link with the game preselected" includes a Chess card linking to `/play?game=chess`, and "Signed-out landing lists the games" includes `Chess`
- [x] 6.4 [engineer] Run `codegraph impact GAMES`. Then add `chess: { name: "Chess", description, icon: ChessIcon, colors: SEAT_COLORS }` to `src/lib/features/play/games.ts`. Verify that `games.test.ts` passes. `GAME_TYPES`, `history.svelte`, `lobby.svelte`, `game-card.svelte`, `home.svelte`, `play.svelte`, `stats.ts`, and `isGameRoomRoute` need no edit (see design "Caller coverage").
- [x] 6.5 [engineer] Change the Room ternary in `src/lib/components/ui/playing/playing.svelte` to a `switch` on `type` that includes `ChessRoom`. Verify that `playing.svelte.test.ts` passes.
- [x] 6.6 [engineer] Create `src/routes/(games)/chess/[code]/[[round]]/+page.svelte` by copying the tic-tac-toe route and swapping in `Chess` and `GAMES.chess`. Verify with `pnpm vitest run "src/routes/(games)"` and with `pnpm build` in group 11.
- [x] 6.7 [designer] Add a static, `aria-hidden` chess branch to `src/lib/features/core/home/preview.svelte`, built from `ChessPiece` and the board tokens. Verify that `src/routes/(games)/page.svelte.test.ts` passes.
- [x] 6.8 [engineer] Run `pnpm vitest run src/lib/features/core` and update any assertion that hard-codes exactly two games, such as End or wraparound in `play.svelte.test.ts`, `stats`, or `lobby`. Leave the `play-setup` scenarios as they are, because they still hold. Verify the suite is green.

## 7. Learn [engineer, designer]

- [x] 7.1 [engineer] In `src/routes/learn/[game]/page.test.ts`, change "Unknown game slug" from `/learn/chess` to `/learn/backgammon`. Do this before `RULES.chess` exists, because `/learn/chess` stops returning 404. Verify that the test passes.
- [x] 7.2 [engineer] Add failing tests:
  - `src/lib/features/core/rules/rules.test.ts`: `RULES.chess` steps cover each topic in "Chess rules" (piece moves, check and checkmate, castling, en passant, promotion, the four automatic draws, timeout), end with practice, and the demo positions come from `chessEngine`
  - `demo.test.ts`: chess `demoSteps`
  - `practice.svelte.test.ts`: in `ChessPractice`, an illegal move is refused with a notice, promotion goes through the picker, and both seats alternate
  - `src/routes/learn/page.svelte.test.ts`: "Index lists both games" includes `/learn/chess`
  - `src/routes/learn/[game]/page.svelte.test.ts`: the heading is `Learn Chess` and the title is `Learn Chess · twoplay`
- [x] 7.3 [engineer] In `src/lib/features/core/rules/rules.ts`, add the `chess` `BoardDemo` variant (start FEN plus moves, through `demoSteps` with `chessEngine`) and `RULES.chess` (summary, description, steps, preview). Verify that `rules.test.ts` and `demo.test.ts` pass.
- [x] 7.4 [engineer] Add `ChessPractice` to `src/lib/features/core/rules/practice.svelte.ts`. It goes through `rules.ts` and `chessEngine` only. Verify that `practice.svelte.test.ts` passes.
- [x] 7.5 [designer] Create `src/lib/features/core/rules/chess-board.svelte` for demo and practice boards. It reuses `ChessPiece`, the room's square tokens, and the promotion picker, with no turn-colored borders. Verify by rendering it in `lesson.svelte.test.ts`.
- [x] 7.6 [designer] Add chess branches to `demo.svelte`, `practice-board.svelte`, and `lesson.svelte`, turning lesson's ternary into a `switch`. Verify that `pnpm vitest run src/lib/features/core/rules src/routes/learn` passes, including "Practice moves are engine-checked".

## 8. SEO, sitemap, and preferences [engineer] (parallel-safe with 9 and 10)

- [x] 8.1 [engineer] Add failing tests:
  - `src/lib/utils/seo/index.test.ts`: "Rules and info pages are indexed" includes `/learn/chess`, and "Chess room is not indexed" covers `/chess/ABCD`
  - `src/routes/sitemap.xml/server.test.ts`: "Sitemap lists indexed pages only" includes `/learn/chess`
- [x] 8.2 [engineer] Run `codegraph impact` on the seo exports. Then add `/learn/chess` and the chess description to `src/lib/utils/seo/index.ts`. Verify that `seo/index.test.ts` and `sitemap.xml/server.test.ts` pass.
- [x] 8.3 [engineer] In `src/lib/utils/storage/preferences/preferences.svelte.test.ts`, change "Invalid setup ignored" to game `backgammon`, and add "Chess setup survives reload" (chess, anyone, 5). The new test is red.
- [x] 8.4 [engineer] Add `chess: true` to `STORED_GAMES` in `src/lib/utils/storage/preferences/preferences.svelte.ts`. Verify that the preferences tests pass and that `pnpm check` reports 0 errors and 0 warnings.

## 9. Tour copy [designer] (parallel-safe with 8 and 10)

- [x] 9.1 [designer] In `src/routes/tour/page.svelte.test.ts`, extend "Tour renders" so it requires Chess with a link to `/learn/chess`. The test is red.
- [x] 9.2 [designer] Name Chess and link `/learn/chess` in `src/lib/features/core/tour/tour.svelte`. About is left to the in-flight `rework-about-page-agent-build` change, which owns `about.svelte`. Verify with `pnpm vitest run src/routes/tour`.

## 10. Project docs [engineer] (parallel-safe with 8 and 9)

- [x] 10.1 [engineer] Add the "Chess rules through chess.js, wrapper only" entry from design §8 to `.agents/skills/twoplay/references/decisions.md`, in the file's format. Verify that the entry names chess.js 1.4.0, the import boundary, and the guard test.
- [x] 10.2 [engineer] Update `.agents/skills/twoplay/references/games.md`:
  - `gameEngines` now has three entries
  - the registration list gains the points chess touched: `isSameState`, the `keys.ts` layout, the `playing.svelte` Room switch, `preview.svelte`, `STORED_GAMES`, `RULES` and Learn, and the seo lists
  - a rules library goes only behind `rules.ts`

  Verify that every file named in it exists.

- [x] 10.3 [engineer] Add FEN, SAN, and "position key" to `GLOSSARY.md`. Verify they match the wording in design.md.

## 11. Verification

- [x] 11.1 Run `pnpm test`: all of the convex, server, and client projects pass.
- [x] 11.2 Run `pnpm check`: 0 errors and 0 warnings.
- [x] 11.3 Run `pnpm format:check`: clean.
- [x] 11.4 Run `pnpm build`: succeeds.
- [x] 11.5 Live QA in `browser-a` (seat 0) and `browser-b` (seat 1) on one chess room:
  - orientation for each seat, and for a spectator
  - selection hints, reselect, and deselect
  - castling, en passant, and promotion with the picker opened, cancelled, and then used
  - the check mark, and the last-move highlight in both browsers
  - scrubbing
  - "Throttled network in two browsers" with a chess move
  - fool's mate settling the round
  - a stalemate or insufficient-material draw from play
  - resign and rematch
- [x] 11.6 Run `.agents/scripts/layout-shift.mjs` on `/chess/<code>` at 360x640 and 1280x800, signed in and signed out. Also run it during three turn changes and while the promotion picker opens and closes. Each run records no layout-shift entry, or a CLS of at most 0.01 for page loads.
- [x] 11.7 Live check of the user-visible routes:
  - the `/` Chess card, and `/play?game=chess` preselecting it
  - `/learn` and `/learn/chess` lesson and practice
  - `/tour`
  - `/sitemap.xml`
  - the chess icon holding still under emulated reduced motion
  - no click tick on chess board squares

## Workflow follow-up

- At archive, update the Purpose lines of `openspec/specs/board-accessibility/spec.md` and `openspec/specs/optimistic-moves/spec.md` so they name chess.
- Archive `add-chess` and `rework-about-page-agent-build` one after the other. The second rebases its MODIFIED "Stable page load" and "Reduced motion" text onto the first.
