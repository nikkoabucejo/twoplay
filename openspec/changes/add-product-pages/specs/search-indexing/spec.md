# Spec Delta

## MODIFIED Requirements

### Requirement: Indexing rules

Only `/`, `/play`, `/how-to-play`, `/how-to-play/tictactoe`, `/how-to-play/checkers`, `/about`, `/privacy`, and `/terms` on the production origin `https://twoplay.xyz` SHALL be indexable. Every other page, and every page on any other origin, SHALL render `meta[name="robots"]` with `noindex`, and SHALL NOT render a canonical link.

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

- **WHEN** `/how-to-play/checkers` or `/privacy` is rendered on `https://twoplay.xyz`
- **THEN** no `meta[name="robots"]` tag contains `noindex` and the canonical link equals `https://twoplay.xyz` plus the path

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
- **THEN** the response is 200 `application/xml` with `<loc>` entries for `/`, `/play`, `/how-to-play`, `/how-to-play/tictactoe`, `/how-to-play/checkers`, `/about`, `/privacy`, and `/terms` under `https://twoplay.xyz`, and no others
