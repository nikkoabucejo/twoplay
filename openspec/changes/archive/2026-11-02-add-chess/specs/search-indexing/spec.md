## MODIFIED Requirements

### Requirement: Indexing rules

Only `/`, `/play`, `/learn`, `/learn/tictactoe`, `/learn/checkers`, `/learn/chess`, `/tour`, `/about`, `/privacy`, `/terms`, and `/sandbox/sound` on the production origin `https://twoplay.xyz` SHALL be indexable. Every other page, and every page on any other origin, SHALL render `meta[name="robots"]` with `noindex`, and SHALL NOT render a canonical link.

#### Scenario: Game room is not indexed

- **WHEN** `/tictactoe/ABCD` is rendered on `https://twoplay.xyz`
- **THEN** `meta[name="robots"]` contains `noindex` and no canonical link is present

#### Scenario: History, lobby, and leaderboard are not indexed

- **WHEN** `/history`, `/lobby`, or `/leaderboard` is rendered
- **THEN** `meta[name="robots"]` contains `noindex`

#### Scenario: Stats and settings are not indexed

- **WHEN** `/me` or `/settings` is rendered on `https://twoplay.xyz`
- **THEN** `meta[name="robots"]` contains `noindex`

#### Scenario: Rules and info pages are indexed

- **WHEN** `/learn/checkers`, `/learn/chess`, `/tour`, `/about`, or `/privacy` is rendered on `https://twoplay.xyz`
- **THEN** no `meta[name="robots"]` tag contains `noindex` and the canonical link equals `https://twoplay.xyz` plus the path

#### Scenario: Chess room is not indexed

- **WHEN** `/chess/ABCD` is rendered on `https://twoplay.xyz`
- **THEN** `meta[name="robots"]` contains `noindex` and no canonical link is present

#### Scenario: Preview host is not indexed

- **WHEN** `/play` is rendered on an origin other than `https://twoplay.xyz`
- **THEN** `meta[name="robots"]` contains `noindex`

#### Scenario: Indexed page has no robots restriction

- **WHEN** `/play` is rendered on `https://twoplay.xyz`
- **THEN** no `meta[name="robots"]` tag contains `noindex`

### Requirement: Sitemap

`GET /sitemap.xml` SHALL return `application/xml` in the sitemaps.org format listing exactly the indexed paths as absolute `https://twoplay.xyz` URLs.

#### Scenario: Sitemap lists indexed pages only

- **WHEN** `/sitemap.xml` is requested
- **THEN** the response is 200 `application/xml` with `<loc>` entries for `/`, `/play`, `/learn`, `/learn/tictactoe`, `/learn/checkers`, `/learn/chess`, `/tour`, `/about`, `/privacy`, `/terms`, and `/sandbox/sound` under `https://twoplay.xyz`, and no others

### Requirement: Crawlable landing content

The landing page SHALL render, in its server HTML for a signed-out visitor, each game's name, a one-sentence description of the site, and links to `/play`.

#### Scenario: Signed-out landing lists the games

- **WHEN** `/` is rendered for a signed-out visitor
- **THEN** the HTML contains `Tic-Tac-Toe`, `Checkers`, and `Chess` and at least one link to `/play`
