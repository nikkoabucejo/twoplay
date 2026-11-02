# error-pages Specification

## Purpose

Gives a missing page or a failed load a branded page inside the app shell, with a way back to play.

## Requirements

### Requirement: Error page

When a route is not found or fails to load, the app SHALL render a branded error page inside the header and footer, with a heading for the status, a short message, and New game (`/play`) and Lobby (`/lobby`) buttons. A 404 SHALL read as "Page not found"; any other status SHALL read as "Something went wrong".

#### Scenario: Unknown path

- **WHEN** a visitor opens `/nope`
- **THEN** the response status is 404, the page shows "Page not found", and it has links to `/play` and `/lobby`

#### Scenario: Other error

- **WHEN** a route throws a 500 error
- **THEN** the page shows "Something went wrong" with the same two links

### Requirement: Error page metadata

The error page SHALL render a document title of the form `<Heading> · twoplay` and a meta description, and SHALL NOT be indexed.

#### Scenario: Not-found title

- **WHEN** `/nope` renders
- **THEN** the document title is `Page not found · twoplay` and `meta[name="robots"]` contains `noindex`
