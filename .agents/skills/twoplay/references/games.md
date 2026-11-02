# Games — end-to-end recipe

A game is implemented twice on purpose. The server half (Convex) is the authority, and the client
half mirrors it so the UI responds instantly. Both share a discriminated union tagged `kind`.

## Server: `convex/models/games/<game>/`
- `schema.ts` — `v.object` validators for `State` and `Move`, each with `kind: v.literal("<game>")`.
- `rules.ts` — pure board math, with no turn order and no player index (e.g. checkers
  `computeLegalMoves`, which the client also imports).
- `engine.ts` — implements `GameEngine<State, Move>` from `convex/models/games/engine.ts`:
  `kind`, `playerCount`, `createInitialState()`, `applyMove(state, playerIndex, move)` (validates,
  throws on illegal), `status(state)` → `{ turnIndex, winnerIndex, isOver }`, `roundWinner(state)`.
- `index.ts` — barrel: engine, validators, inferred types.

### Registry: `convex/models/games/index.ts`
`gameEngines = { tictactoe, checkers }`, `GameType = keyof typeof gameEngines`, plus
`gameTypeValidator` / `gameStateValidator` / `gameMoveValidator` unions and switch-dispatched
`applyMove` / `roundWinner` / `gameStatus` (TS can't correlate union state with union engine).
**A new game adds one entry plus one `case` to each switch, and widens the three unions.** `rooms`,
`clocks`, `results`, `moves` are game-agnostic.

## Client: `src/lib/features/play/<game>/`
- `types.ts` — re-export server-inferred types; derive client aliases locally.
- `game.svelte.ts` — `<Game>Room extends Room` (`$lib/utils/multiplayer`). The base already owns
  the live room query (`data`, `isLoading`), seats (`players`, `myIndex`), room state
  (`wrongGameType`, `isWaitingForOpponent`, `isRoomClosed`, `opponentDisconnected`), clocks
  (`clock`, `now`), history scrubbing (`isViewingHistory`, `viewedMoveNumber`, `historyLength`,
  `protected displayState`), and actions (`protected submitMove`, `rematch`, `resign`, `abandon`,
  `trashtalk`, `timeout`). The subclass adds only `$derived` views of `displayState` narrowed to its
  `kind`, plus a `play/select` method that pre-validates locally and calls `submitMove({ kind, … })`.
- `<game>.svelte` — UI composing `<Board players status clock footer>` with its own grid as
  `children`, usually wrapped in `Cursor` from `$lib/features/presence`.
- `index.ts` — barrel (component under its display name, Room class, types).

## Registration
- `src/lib/assets/icons/games/<game>.svelte` + barrel line.
- `src/lib/features/play/games.ts` `GAMES` record (name + icon) drives the home picker, `/play`,
  `/lobby`, `/history`. Register once there.
- Route: `src/routes/(games)/<game>/[code]/[[round]]/+page.svelte` (copy tictactoe's, swap names).
  `/play` is the only create/join entry point. Don't add a per-game lobby.

## Recipe order
Server first (types flow client-ward): schema → rules → engine → barrel → registry.
Then client: types → Room subclass → component → barrel → `features/play/index.ts` → icon → `GAMES` → route.
Don't invent abilities/power-ups or per-game history logic the base `Room` already provides.
