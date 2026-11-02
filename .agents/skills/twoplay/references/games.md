# Games — end-to-end recipe

A game is implemented twice on purpose. The server half (Convex) is the authority, and the client
half mirrors it so the UI responds instantly. Both share a discriminated union tagged `kind`.

## Server: `convex/models/games/<game>/`
- `schema.ts` — `v.object` validators for `State` and `Move`, each with `kind: v.literal("<game>")`.
- `rules.ts` — pure board math, with no turn order and no player index (e.g. checkers
  `computeLegalMoves`, which the client also imports). A third-party rules library is imported only
  here: chess wraps chess.js, and `chess/rules.test.ts` fails if any other file imports it.
- `engine.ts` — implements `GameEngine<State, Move>` from `convex/models/games/engine.ts`:
  `kind`, `playerCount`, `createInitialState()`, `applyMove(state, playerIndex, move)` (throws
  `"Not your turn"`; any other illegal move returns the same state, which `rooms.play` treats as a no-op), `status(state)` → `{ turnIndex, winnerIndex, isOver }`, `roundWinner(state)`.
- `index.ts` — barrel: engine, validators, inferred types.

### Registry: `convex/models/games/index.ts`
`gameEngines = { tictactoe, checkers, chess }`, `GameType = keyof typeof gameEngines`, plus
`gameTypeValidator` / `gameStateValidator` / `gameMoveValidator` unions and switch-dispatched
`applyMove` / `roundWinner` / `gameStatus` (TS can't correlate union state with union engine).
**A new game adds one entry plus one `case` to each switch, and widens the three unions.** `rooms`,
`clocks`, `results`, `moves` are game-agnostic.

## Client: `src/lib/features/play/<game>/`
- `types.ts` — re-export server-inferred types; derive client aliases locally.
- `game.svelte.ts` — `<Game>Room extends Room` (`$lib/utils/multiplayer`). It defines a
  `ClientEngine` (`applyMove`, `status`) that narrows to its `kind` and delegates to `<game>Engine`,
  and calls `super(kind, engine, getCode, getRound)`. It doesn't override `activeSeat`. Values come
  from `convex/models/games/<game>/index.js` and `rules.js`, never the registry
  `convex/models/games/index.ts` (it imports `_generated/server`). The base already owns
  the live room query (`data`, `isLoading`), seats (`players`, `myIndex`), room state
  (`wrongGameType`, `isWaitingForOpponent`, `isRoomClosed`, `opponentDisconnected`), clocks
  (`clock`, `now`), history scrubbing (`isViewingHistory`, `viewedMoveNumber`, `historyLength`,
  `protected displayState`), and actions (`protected submitMove`, `rematch`, `resign`, `abandon`,
  `trashtalk`, `timeout`). The subclass adds only `$derived` views of `displayState` narrowed to its
  `kind`, plus a `play/select` method that pre-validates locally and calls `submitMove({ kind, … })`.
- Prediction: `submitMove` runs the engine on the live state and queues the viewer's move as
  pending. `displayState`, `activeSeat`, `isMyTurn`, and `clock` include pending moves.
  `isMyTurnConfirmed` and the timeout claim use the server state only. A rejected move drops itself
  and every later pending move, and sets `rejection` (`{ id, message }`). A move the engine can't
  predict reports through `error`.
- `<game>.svelte` — UI composing `<Board players status clock footer>` with its own grid as
  `children`, usually wrapped in `Cursor` from `$lib/features/presence`. Renders `BoardPlaceholder`
  while `room.isLoading` or `room.wrongGameType`, and creates
  `new TurnAlert(() => (room.isLoading ? null : room.isMyTurnConfirmed))` next to the Room. A
  `$effect` on `room.rejection` shows a `getToaster()` error toast, and
  `<Board rejectionId={room.rejection?.id}>` shakes the board.
- `index.ts` — barrel (component under its display name, Room class, types).

## Registration
- `src/lib/assets/icons/games/<game>.svelte` + barrel line.
- `src/lib/features/play/games.ts` `GAMES` record (name + icon) drives the home picker, `/play`,
  `/lobby`, `/history`. Register once there. `colors` is `SEAT_COLORS`.
- `isSameState` in `src/lib/utils/multiplayer/room/room.svelte.ts`: one `case` per `kind`.
- `src/lib/components/layout/board/keys.ts`: a `<game>Step` and a `FIRST_AND_LAST` entry for
  `rovingStep`.
- `src/lib/components/ui/playing/playing.svelte`: one `case` in the Room `switch`.
- `src/lib/features/core/home/preview.svelte`: a static board branch for the home card.
- `STORED_GAMES` in `src/lib/utils/storage/preferences/preferences.svelte.ts`.
- Learn (`src/lib/features/core/rules/`): a `RULES` entry in `rules.ts`, a practice class in
  `practice.svelte.ts`, and a branch in `demo.svelte`, `practice-board.svelte`, and `lesson.svelte`.
- `src/lib/utils/seo/index.ts`: `/learn/<game>` in `INDEXED_PATHS`, and the name in
  `SITE_DESCRIPTION`.
- Route: `src/routes/(games)/<game>/[code]/[[round]]/+page.svelte` (copy tictactoe's, swap names).
  It renders `<Meta title={GAMES.<game>.name}>`. The `[code]` segment is what makes the root layout
  use the game-room frame (`isGameRoomRoute`).
  `/play` is the only create/join entry point. Don't add a per-game lobby.

## Recipe order
Server first (types flow client-ward): schema → rules → engine → barrel → registry.
Then client: types → `ClientEngine` + Room subclass → component → barrel → `features/play/index.ts` → icon → `GAMES` → route.
Don't invent abilities/power-ups or per-game history logic the base `Room` already provides.
