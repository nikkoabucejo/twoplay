# Spec Delta

## Purpose

Gives every page a distinct title, description, and social preview, and makes the app installable with its own icons and theme color.

## ADDED Requirements

### Requirement: Per-route title and description

Every route SHALL render a document title of the form `<Page> · twoplay` (the landing page uses `twoplay` alone) and a meta description specific to that route.

#### Scenario: Leaderboard page title

- **WHEN** a visitor opens `/leaderboard`
- **THEN** the document title is `Leaderboard · twoplay` and a `meta[name="description"]` tag is present with non-empty content

#### Scenario: Game room title names the game

- **WHEN** a player opens `/tictactoe/<code>`
- **THEN** the document title starts with `Tic-Tac-Toe`

### Requirement: Open Graph preview

Every route SHALL render `og:title`, `og:description`, `og:type`, and `og:image` meta tags, with `og:image` resolving to a static image served by the app.

#### Scenario: Shared link has a preview image

- **WHEN** the HTML of `/play` is fetched
- **THEN** it contains `og:title`, `og:description`, and an `og:image` URL that returns HTTP 200 with an image content type

### Requirement: Favicon and theme color

The app SHALL serve an SVG favicon, a PNG apple-touch icon, and a `theme-color` meta tag matching the dark background.

#### Scenario: Icons and theme color present

- **WHEN** any page's HTML is fetched
- **THEN** it links an SVG `icon`, an `apple-touch-icon`, and a `theme-color` meta tag whose value equals the app's dark background color

### Requirement: Web app manifest

The app SHALL serve a web app manifest with name, short name, start URL `/`, `display: standalone`, dark background and theme colors, and 192px and 512px icons including a maskable icon.

#### Scenario: Manifest is linked and valid

- **WHEN** any page's HTML is fetched and its `link[rel="manifest"]` URL is requested
- **THEN** the response is JSON containing `name`, `short_name`, `start_url` equal to `/`, `display` equal to `standalone`, and icons sized `192x192` and `512x512`, one with `purpose` including `maskable`
