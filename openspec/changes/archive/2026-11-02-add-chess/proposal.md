# Proposal

## Why

twoplay has two games, tic-tac-toe and checkers. Chess is the most widely known two-player board game, and it fits the existing room, clock, rematch, and rating model without changes to those systems.

## What Changes

- Add standard chess as a third game, `chess`, with full FIDE movement: castling, en passant, promotion to queen, rook, bishop, or knight, and check legality.
- Seat 0 plays white and moves first. Each viewer sees the board from their own seat's side, so the board flips for the black seat. Spectators see it from white's side.
- A round ends in checkmate (the mated side loses) or in an automatic draw (`winnerIndex` null) on stalemate, insufficient material (K vs K, K and one minor piece vs K, or bishops on same-colored squares only), threefold repetition, or the fifty-move rule. No draw claim is needed.
- Resign, rematch, abandon, timeout, round settlement, and the single cross-game MMR are reused unchanged. The existing sudden-death clocks apply. A timeout always loses, even when the winner has insufficient material.
- The rules come from the `chess.js` library (BSD-2). Only `convex/models/games/chess/rules.ts` imports it. That file exposes a pure rules API (legal moves, apply, status, SAN labels) like the other games, and the engine, client Room, board, and Learn page all go through it.
- The chess state is a Convex validator that holds a FEN string plus a bounded list of position keys since the last capture or pawn move. The list exists for threefold repetition, because chess.js drops history when it loads a FEN.
- A move is a from square, a to square, and an optional promotion piece. The board shows legal-move hints for the selected piece, a promotion picker when a pawn reaches the last rank, the last move, and a king in check.
- Move history shows SAN labels.
- Chess appears wherever games are listed: home cards, `/play`, `/lobby`, `/history`, `/me`, the Tour, and the Learn index. `/learn/chess` gets lessons, demos, and a practice board like checkers, and becomes indexable and listed in the sitemap.
- Add a chess game icon whose motion stops under reduced motion.

Out of scope: draw offers and draw claims (planned later as a change that covers every game), increments and other time controls, per-game ratings, a draw on timeout against insufficient material, engine or AI opponents, PGN import and export, and premoves.

## Capabilities

### New Capabilities

- `chess-rules`: the rules the server enforces for chess. Covers seat colors, legal moves including castling, en passant, and promotion, how a round ends (checkmate, stalemate, insufficient material, threefold repetition, fifty-move rule), and server re-validation of every move.
- `chess-board`: how a player makes chess moves on the board. Covers board orientation per seat, piece selection, legal-move hints, the promotion picker, the check indicator, and SAN move labels. There is no per-game checkers spec, because checkers interaction fit inside the shared board specs. Chess adds interaction those specs don't cover (orientation and the promotion picker), so it gets its own capability. The shared parts still go into the shared specs.

### Modified Capabilities

- `learn`: the index lists chess, `/learn/chess` has a rules lesson, and the unknown-game example moves from `chess` to a slug that isn't registered.
- `search-indexing`: `/learn/chess` becomes indexable and appears in the sitemap, and the landing HTML names Chess.
- `landing-page`: the game-card scenario includes a Chess card linking to `/play?game=chess`.
- `board-accessibility`: chess board roles (64 square buttons in a "Chess board" group), square labels (coordinate, piece, and whether it can move), and arrow-key movement across all 64 squares as drawn, flipped for black.
- `move-replay`: the last-move highlight marks a chess move's from and to squares.
- `optimistic-moves`: a chess move, including a promotion, shows at once while the request is pending.
- `user-preferences`: the unknown-game example for the stored play setup changes from `chess` to a slug that isn't registered.
- `info-pages`: the Tour names Chess and links to `/learn/chess`.
- `ui-accessibility`: the chess icon holds still under reduced motion.
- `layout-stability`: chess rooms are included in the layout-shift budget and the turn-change checks, including when the promotion picker opens and closes.
- `ui-click-sounds`: clicking a chess board square plays no click tick, as on the other boards.

## Impact

- **Schema change.** `gameTypeValidator`, `gameStateValidator`, and `gameMoveValidator` in `convex/models/games/index.ts` widen to include chess. These flow into the `rooms`, `games`, `moves`, and `pairings` tables. Adding to a union is additive, so no data migration is needed.
- **New dependency.** `chess.js` (BSD-2), imported only by `convex/models/games/chess/rules.ts`. The decision is recorded in `.agents/skills/twoplay/references/decisions.md`.
- **No new public Convex function.** The existing play and submit path accepts the widened move validator.
- **Trust boundary.** The trust boundary is unchanged. Every play mutation still authenticates through `ctx.auth` and checks room membership and turn order. The server re-checks every chess move against `rules.ts`, including the promotion piece, and computes draws and checkmate itself. The client only predicts the result.
- **Server:** new `convex/models/games/chess/` (`schema.ts`, `rules.ts`, `engine.ts`, `index.ts`) and the registry `convex/models/games/index.ts` (`gameEngines`, the `applyMove`, `roundWinner`, and `gameStatus` switches).
- **Client:** new `src/lib/features/play/chess/` (ChessRoom, board component, labels). Also changed: `src/lib/features/play/games.ts` (`GAMES`), `room.svelte.ts` `isSameState`, `components/layout/board/keys.ts`, the Room ternary in `ui/playing/playing.svelte`, the home `preview.svelte`, Learn under `core/rules/`, the `src/lib/assets/icons/games/` icons, preferences `STORED_GAMES`, `utils/seo` (descriptions, indexable paths, sitemap), the Tour and About copy, and the new route `src/routes/(games)/chess/[code]/[[round]]/`.
- **Overlap.** The in-flight change `rework-about-page-agent-build` also changes `info-pages`, `layout-stability`, and `ui-accessibility`. The two changes must be archived one after the other, and the second must rebase its deltas onto the first.
