# search-indexing Specification

## Purpose
TBD - created by archiving change add-seo-indexing. Update Purpose after archive.

## Requirements

### Requirement: Canonical URL

Every indexed page SHALL render a `link[rel="canonical"]` and an `og:url` equal to `https://twoplay.xyz` plus the page path, with no query string or fragment.

#### Scenario: Query string is dropped

- **WHEN** `/play?game=checkers` is rendered on `https://twoplay.xyz`
- **THEN** the canonical link and `og:url` are `https://twoplay.xyz/play`

#### Scenario: Landing page canonical

- **WHEN** `/` is rendered
- **THEN** the canonical link is `https://twoplay.xyz/`

### Requirement: Indexing rules

Only `/` and `/play` on the production origin `https://twoplay.xyz` SHALL be indexable. Every other page, and every page on any other origin, SHALL render `meta[name="robots"]` with `noindex`, and SHALL NOT render a canonical link.

#### Scenario: Game room is not indexed

- **WHEN** `/tictactoe/ABCD` is rendered on `https://twoplay.xyz`
- **THEN** `meta[name="robots"]` contains `noindex` and no canonical link is present

#### Scenario: History, lobby, and leaderboard are not indexed

- **WHEN** `/history`, `/lobby`, or `/leaderboard` is rendered
- **THEN** `meta[name="robots"]` contains `noindex`

#### Scenario: Preview host is not indexed

- **WHEN** `/play` is rendered on an origin other than `https://twoplay.xyz`
- **THEN** `meta[name="robots"]` contains `noindex`

#### Scenario: Indexed page has no robots restriction

- **WHEN** `/play` is rendered on `https://twoplay.xyz`
- **THEN** no `meta[name="robots"]` tag contains `noindex`

### Requirement: Social cards

Every page SHALL render `og:site_name` `twoplay`, `og:locale` `en_US`, an `og:image` of `https://twoplay.xyz/og.png` with `og:image:width` 1200, `og:image:height` 630 and `og:image:alt`, and `twitter:card` `summary_large_image` with `twitter:title`, `twitter:description`, and `twitter:image`.

#### Scenario: Large Twitter preview

- **WHEN** any page is rendered
- **THEN** `twitter:card` is `summary_large_image` and `twitter:image` equals `og:image`

### Requirement: Structured data

The landing page SHALL render one `script[type="application/ld+json"]` containing a `WebSite` and a `WebApplication` (category `GameApplication`, free offer) whose `url` is `https://twoplay.xyz/`. The JSON SHALL be escaped so it cannot close the script element.

#### Scenario: Landing page JSON-LD parses

- **WHEN** `/` is rendered and its JSON-LD script is parsed
- **THEN** it has `@context` `https://schema.org` and a `@graph` with a `WebSite` and a `WebApplication` entry

#### Scenario: Script-closing text is escaped

- **WHEN** structured data containing `</script>` is serialized
- **THEN** the output contains no `</script` sequence and still parses back to the same object

### Requirement: robots.txt

`GET /robots.txt` SHALL return `text/plain` that allows all user agents and names the sitemap `https://twoplay.xyz/sitemap.xml`.

#### Scenario: robots.txt names the sitemap

- **WHEN** `/robots.txt` is requested
- **THEN** the response is 200 `text/plain` with `User-agent: *` and `Sitemap: https://twoplay.xyz/sitemap.xml`

### Requirement: Sitemap

`GET /sitemap.xml` SHALL return `application/xml` in the sitemaps.org format listing exactly the indexed paths as absolute `https://twoplay.xyz` URLs.

#### Scenario: Sitemap lists indexed pages only

- **WHEN** `/sitemap.xml` is requested
- **THEN** the response is 200 `application/xml` with `<loc>` entries `https://twoplay.xyz/` and `https://twoplay.xyz/play` and no others

### Requirement: Crawlable landing content

The landing page SHALL render, in its server HTML for a signed-out visitor, each game's name, a one-sentence description of the site, and links to `/play`.

#### Scenario: Signed-out landing lists the games

- **WHEN** `/` is rendered for a signed-out visitor
- **THEN** the HTML contains `Tic-Tac-Toe` and `Checkers` and at least one link to `/play`
