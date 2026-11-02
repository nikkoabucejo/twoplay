# Glossary

## Game

| Term         | Meaning                                                                                                                                |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Game type    | `tictactoe` or `checkers`. Server: `gameEngines`. Client: `GAMES`.                                                                     |
| Room         | A lobby joined by code. Holds the game type and two seats. Spans many rounds.                                                          |
| Room code    | 6-character shareable code. Not an authorization.                                                                                      |
| Visibility   | `private` or `public`. Public waiting rooms appear in `/lobby`.                                                                        |
| Room status  | `active` or `closed`. Closed reasons are `abandoned`, `empty`, and `inactive`.                                                         |
| Seat         | Index `0` or `1` in `rooms.players`. Sets the game role (e.g. X/O).                                                                    |
| Accent       | Seat color. Seat 0 is cyan, seat 1 is pink (`ACCENTS`).                                                                                |
| User         | Account row linked to Clerk (`users.clerk__userId`).                                                                                   |
| Player       | One user in one room. Holds a name snapshot, score, emoji, `leftAt`, and `seenAt`.                                                     |
| Spectator    | A signed-in user viewing a room without a seat.                                                                                        |
| Round        | One game in a room (`games.round`). The current round is the highest.                                                                  |
| Rematch      | Starts the next round in the same room.                                                                                                |
| Move         | One played move (`moves`). `turn` is its 0-based order. Stores the state after the move.                                               |
| Time control | Starting clock per player. Default 5 min, clamped to 10 s–60 min.                                                                      |
| Clock        | Remaining ms per player per round. `turnedAt` is set while it is running.                                                              |
| Result       | Per player per round. `state` is `timeout`, `resign`, or `abandon`. `mmr` is the rating change.                                        |
| Rating (MMR) | One rating per user across all games. Starts at 400, ±8 per decisive round, floor 100. Draws don't change it.                          |
| Pairing      | Quick-match queue entry. Deleted when paired, expires after 5 min.                                                                     |
| Heartbeat    | `players.heartbeat`. Updates `seenAt`.                                                                                                 |
| Sweep        | Cron, every 2 min. Closes a room whose second seat stayed empty for 45 min. Abandons a seat silent for 4 min. Clears expired pairings. |
| Trashtalk    | A player's status-bar emoji in a room.                                                                                                 |
| Cursor       | Live pointer position, normalized to 0–1.                                                                                              |
| Mood         | Ambient background driven by the board status.                                                                                         |

## Code

| Term            | Meaning                                                                                                       |
| --------------- | ------------------------------------------------------------------------------------------------------------- |
| Engine          | `GameEngine` implementation per game: initial state, move validation, status, round winner. Server authority. |
| Rules           | Pure board functions per game (`rules.ts`). No turn or player logic.                                          |
| Registry        | `convex/models/games/index.ts`: `gameEngines`, union validators, and switch dispatch.                         |
| `Room`          | Client base class (`$lib/utils/multiplayer`). Subclassed per game (`TictactoeRoom`, `CheckersRoom`).          |
| `Board`         | Shared layout component: status bar, play area, clocks, footer.                                               |
| `requireUser`   | Resolves the caller from `ctx.auth`, or throws.                                                               |
| `requirePlayer` | Resolves the caller's seat in a room, or throws.                                                              |
| Category        | A folder under `components/`, `utils/`, `features/`, or `services/` that owns a barrel.                       |
| Leaf            | A folder with `index.ts` one level inside a category.                                                         |

## Workflow

| Term                  | Meaning                                                                                    |
| --------------------- | ------------------------------------------------------------------------------------------ |
| Change                | An OpenSpec proposal in `openspec/changes/<id>/`: proposal, specs, design, and tasks.      |
| Spec                  | A capability's requirements in `openspec/specs/`. The source of truth after archive.       |
| Delta                 | A change's ADDED/MODIFIED/REMOVED requirements.                                            |
| Scenario              | A WHEN/THEN case under a requirement. Each one needs evidence.                             |
| Task group            | A `## N.` section of `tasks.md`, owned by `engineer` and/or `designer`.                    |
| Archive               | `openspec archive`: merges the deltas into specs and moves the change to `archive/`.       |
| Impact                | A CodeGraph list of symbols affected by changing a symbol (`codegraph impact`).            |
| Conform               | Steward pass that removes slop and convention drift from a diff without changing behavior. |
| Knowledge sync        | Steward pass that updates `.agents/skills/twoplay/references` to match the code.           |
| Slop                  | Code a careful human on this repo would not write. See `.agents/skills/anti-slop`.         |
| Test project          | Vitest project: `convex`, `server`, or `client`.                                           |
| QA                    | Live check of user-visible scenarios by the `qa` agent in two browsers.                    |
| browser-a / browser-b | chrome-devtools MCP servers, one per player, with separate Chrome profiles.                |
| `test.fails`          | A test that documents a known bug. It flips to failing when the bug is fixed.              |
