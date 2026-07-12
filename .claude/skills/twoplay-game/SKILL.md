---
name: twoplay-game
description:
  Recipe and reference for how a playable game is implemented end-to-end in
  twoplay (client + server), and the exact steps to add a new one. Use when
  adding a new game type, implementing game logic, or understanding how
  tictactoe/checkers plug into Room/Board/GameEngine.
---

# twoplay Game Feature

A game in twoplay is implemented **twice, deliberately**: once server-side in Convex (the
authority) and once client-side (a responsive mirror). Both halves agree on a discriminated-union
shape tagged with `kind`. This skill is the concrete recipe; for folder-placement rules see
`twoplay-architecture`, for coding style see `twoplay-convention`, for the underlying `games`/`moves`
table shapes see `twoplay-database`.

## Server half: `convex/models/games/<game>/`

Three files, strict split of concerns:

- **`schema.ts`** — Convex `v.object` validators for this game's `State` and `Move`, each carrying
  a `kind: v.literal("<game>")` discriminant tag used for runtime narrowing.
- **`rules.ts`** — pure, stateless board math. No "whose turn," no player index, no mutating a full
  `State`. Just: given a board, what are the legal moves / is there a winner / is a cell playable.
  Tictactoe: `WINNING_LINES`, `winnerOf`, `isBoardFinished`, `hasOtherPlayableBoard`,
  `metaWinnerOf`. Checkers: `idx`, `rc`, `directionsFor`, `simpleMovesFrom`, `captureMovesFrom`,
  `computeLegalMoves` (this is also imported client-side to mirror legal-move computation for UX).
- **`engine.ts`** — stateful orchestration implementing the shared interface from
  `convex/models/games/engine.ts`:
  ```ts
  export interface GameEngine<State, Move> {
    kind: string; playerCount: number;
    createInitialState(): State;
    applyMove(state: State, playerIndex: number, move: Move): State;
    status(state: State): GameStatus;      // { turnIndex, winnerIndex, isOver }
    roundWinner(state: State): number | null;
  }
  ```
  `applyMove` re-derives turn order and throws on illegal moves (`"Not your turn"`) rather than
  trusting the caller — see `twoplay-database`'s trust-boundary notes for why. Exports the concrete
  `<game>Engine: GameEngine<State, Move>` object.
- **`index.ts`** — barrel re-exporting the engine, schema validators, and inferred TS types
  (`Infer<typeof stateValidator>`).

### The registry (`convex/models/games/index.ts`) — edit this for every new game

```ts
gameEngines = { tictactoe: tictactoeEngine, checkers: checkersEngine } as const
type GameType = keyof typeof gameEngines
```
All game-agnostic callers (`rooms`' `create`, `join`, `get`, `newGame`) call `getEngine(name)` and
use `playerCount`/`createInitialState`/`status`/`roundWinner` without knowing the concrete game.
Because TypeScript can't correlate a union `state`/`move` with a union-typed engine, this file also
hand-writes switch-dispatched wrappers — `applyMove`, `roundWinner`, `gameStatus` — that narrow on
the literal `gameType` before delegating. **Adding a game means adding one `case` to each of these
three switches**, plus adding the entry to `gameEngines` and extending the three `v.union`
validators (`gameTypeValidator`, `gameStateValidator`, `gameMoveValidator`). No other server file
needs to change — `rooms`, `moves`, `cursors` are all written generically against `GameType`.

## Client half: `src/lib/features/play/<game>/`

- **`types.ts`** — thin re-exports of the server's inferred types (never redefine a shape the server
  owns) — e.g. re-export `Cell` from `convex/models/games/<game>/rules.js`, derive `Board = Cell[]`
  locally.
- **`game.svelte.ts`** — a `*Room` class (`TictactoeRoom`, `CheckersRoom`) **extending the shared
  `Room` base** from `$lib/utils/multiplayer` (`room.svelte.ts`). The base class owns:
  - the Convex subscription (`useQuery(api.models.rooms.index.get, ...)`) → `data`, `isLoading`
  - `wrongGameType`, `isLive`, `game`, `round`, `players`, `scores` (all `$derived` off `data`)
  - `protected submitMove(move: GameMove)` → calls the `play` mutation, catches into `error`
  - `async newGame()` → calls the `newGame` mutation

  The subclass constructor calls `super(kind, getCode, getRound)` and adds only:
  - `$derived`/`$derived.by` getters narrowing `this.data.state` to this game's `kind`, exposing
    UI-ready shape (board, turn, legal moves, winner, my-seat convenience getters like `isMyTurn`).
  - A `play(...)`/`select(...)` method that validates locally for instant UX feedback (using the
    same `rules.ts` helpers as the server where useful — checkers imports `computeLegalMoves`
    client-side), then calls `this.submitMove({ kind: "<game>", ...fields })`.
  - Anything genuinely game-specific beyond that — tictactoe additionally owns local-only history
    scrubbing (`#cursor`, `stepBack/stepForward/jumpToLatest/jumpToFirst`) that checkers has no
    equivalent of; don't add history scrubbing to a new game unless it needs it.
- **`<game>.svelte`** — the UI, `{ roomCode, round?, class? }` props. Handles auth + join-room
  wiring, a `wrongGameType` redirect effect, computes `players`/`status`/`footer` from the room and
  renders `<Board players={...} status={...} footer={...}>` wrapping its own grid markup as
  `children`.
- **`index.ts`** — barrel: the `.svelte` component (aliased to the game's display name, e.g.
  `Tictactoe`), the `*Room` class, and the re-exported types.

No `abilities.ts` and no ability/power-up concept exists anywhere in this codebase — don't scaffold
one speculatively for a new game.

## The `Board` contract (`$lib/components/layout`)

`Board` takes `{ players: [BoardPlayer, BoardPlayer], status?: BoardStatus, footer?: BoardFooter,
size?, class?, children: Snippet }`:
- `BoardPlayer = { label, accent?, score? }`
- `BoardStatus = { type: "turn", player: 0|1 } | { type: "winner", player: 0|1 } | { type: "draw" }`
- `BoardFooter = { isLive, game, round, onNewGame, onGoLive, onGoToRound, error? }`

There is **no cells/slots prop and no ability-list prop** — `Board` only renders the status bar, a
square `children` slot, and the round-nav footer. The game draws its own grid inside `children`,
typically wrapping it in `Cursor` (from `$lib/features/presence`) for peer-cursor presence.

## Icon registration (`src/lib/assets/icons/games/`)

Flat barrel, one file per game: `export { default as <Game>Icon } from "./<game>.svelte"` in
`index.ts`, alongside a standalone inline-SVG component (`{ class? }` prop only). Consumed by the
home page's game-picker list and passed into `<Lobby gameType="<game>" icon={<Game>Icon} />` on the
per-game lobby route.

## Full recipe: adding a new game (example: "connectfour")

Server first (types flow client-ward from here):

1. `convex/models/games/connectfour/schema.ts` — state/move `v.object` validators, `kind:
   v.literal("connectfour")`.
2. `convex/models/games/connectfour/rules.ts` — pure board-math helpers.
3. `convex/models/games/connectfour/engine.ts` — `createInitialState`/`status`/`roundWinner`/
   `applyMove` (turn validation, throws on illegal moves), exports `connectFourEngine:
   GameEngine<ConnectFourState, ConnectFourMove>`.
4. `convex/models/games/connectfour/index.ts` — barrel.
5. Edit `convex/models/games/index.ts` — add to `gameEngines`, widen the three `v.union`
   validators, add a `case "connectfour"` to `applyMove`/`roundWinner`/`gameStatus`.

Then client:

6. `src/lib/features/play/connectfour/types.ts` — re-export inferred types.
7. `src/lib/features/play/connectfour/game.svelte.ts` — `ConnectFourRoom extends Room`, `super(
   "connectfour", getCode, getRound)`, derived board/turn/winner state, `play`/`select` calling
   `submitMove`.
8. `src/lib/features/play/connectfour/connectfour.svelte` — UI, mirroring tictactoe/checkers'
   auth + join-room + `wrongGameType` redirect + `<Board>` composition.
9. `src/lib/features/play/connectfour/index.ts` — barrel.
10. Edit `src/lib/features/play/index.ts` — add the re-export line.
11. `src/lib/assets/icons/games/connectfour.svelte` + edit its `index.ts` barrel.
12. Routes: `src/routes/(games)/connectfour/+page.svelte` (uses `<Lobby>`) and
    `src/routes/(games)/connectfour/[code]/[[round]]/+page.svelte` (renders `<Connectfour
    roomCode={params.code} {round} />`) — copy the tictactoe route files, swap names.
13. Edit `src/routes/(games)/+page.svelte` — add the new game to the picker's `games` array.

Nothing else needs editing — `convex/models/rooms/*`, the shared `Room`, and `Board` are fully
game-agnostic, written against `GameType`/`gameEngines`.
