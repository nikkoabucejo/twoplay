# sandbox Specification

## Purpose
A public, unindexed `/sandbox` page for previewing sound, mood, and game UI states without joining a game.

## Requirements

### Requirement: Sandbox page

`/sandbox` SHALL render one page with a heading per section, in order: Sound, then Game. `/sandbox/sound` SHALL respond 404.

#### Scenario: Sections are listed

- **WHEN** `/sandbox` is rendered
- **THEN** it shows a Sound section and then a Game section, each with a heading

#### Scenario: Old sound route is gone

- **WHEN** `/sandbox/sound` is requested
- **THEN** the response is 404

### Requirement: Sound section

The Sound section SHALL contain the sound and mood lab with the same controls and behavior it had at `/sandbox/sound`.

#### Scenario: Sound lab renders in its section

- **WHEN** `/sandbox` is rendered
- **THEN** the Sound section contains the sound and mood lab controls

### Requirement: Game interaction previews

The Game section SHALL show labeled previews of each game's UI states, built from static positions and rendered without a room, sign-in, or any server call.

#### Scenario: Every game's states are covered

- **WHEN** `/sandbox` is rendered
- **THEN** it shows a tic-tac-toe win, meta-win, and draw; a checkers selection with destinations, must-capture rings, and kings; and a chess last move, selection with destinations, check, checkmate, and promotion preview

#### Scenario: Tic-tac-toe win line is visible

- **WHEN** `/sandbox` is rendered
- **THEN** the tic-tac-toe win preview shows the winning mark's strike line

#### Scenario: Chess promotion picker opens

- **WHEN** the visitor opens the promotion preview
- **THEN** a "Promote to" picker offers Queen, Rook, Bishop, and Knight, and closing it returns to the board

#### Scenario: Chess check is tinted

- **WHEN** `/sandbox` is rendered
- **THEN** the chess check preview marks the king's square as in check

#### Scenario: Result cards cover every outcome

- **WHEN** `/sandbox` is rendered
- **THEN** result cards for a win, a loss, a draw, and a timeout are shown

#### Scenario: No live game needed

- **WHEN** a signed-out visitor renders `/sandbox`
- **THEN** every preview renders and no Convex query or mutation is called

### Requirement: Sandbox indexing

`/sandbox` SHALL render `meta[name="robots"]` with `noindex`, SHALL NOT appear in the sitemap, and SHALL stay linked from the footer.

#### Scenario: Sandbox is not indexed

- **WHEN** `/sandbox` is rendered on `https://twoplay.xyz`
- **THEN** `meta[name="robots"]` contains `noindex`, and `/sitemap.xml` has no `/sandbox` entry

#### Scenario: Footer links to the sandbox

- **WHEN** any page with the footer is rendered
- **THEN** the footer's Sandbox link points to `/sandbox`
