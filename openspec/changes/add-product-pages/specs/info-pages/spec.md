# Spec Delta

## Purpose

Gives the app an About page and plain-language Privacy and Terms pages, linked from the footer.

## ADDED Requirements

### Requirement: About page

`/about` SHALL describe what twoplay is and the games it offers. It SHALL NOT link to Ko-fi, because the footer's Support link is the only one.

#### Scenario: About renders

- **WHEN** a visitor opens `/about`
- **THEN** the page has one `h1`, names Tic-Tac-Toe and Checkers, and has no link to Ko-fi in its content

### Requirement: Privacy and Terms drafts

`/privacy` and `/terms` SHALL state in plain language that sign-in is handled by Clerk, that game history and ratings are stored, and that the app has no ads or tracking. Each SHALL show a visible "Draft · needs review" label.

#### Scenario: Privacy draft

- **WHEN** a visitor opens `/privacy`
- **THEN** the page mentions Clerk, game history, and no ads or tracking, and shows "Draft · needs review"

#### Scenario: Terms draft

- **WHEN** a visitor opens `/terms`
- **THEN** the page shows "Draft · needs review"

### Requirement: Info page metadata

`/about`, `/privacy`, and `/terms` SHALL render the titles `About · twoplay`, `Privacy · twoplay`, and `Terms · twoplay`, each with a description.

#### Scenario: Privacy title

- **WHEN** `/privacy` renders
- **THEN** the document title is `Privacy · twoplay` and a description meta tag is present
