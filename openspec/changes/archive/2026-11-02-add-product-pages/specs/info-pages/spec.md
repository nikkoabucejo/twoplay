# Spec Delta

## Purpose

Gives the app a Tour page, an About page, and plain-language Privacy and Terms pages, linked from the footer.

## ADDED Requirements

### Requirement: Tour page

`/tour` SHALL describe what twoplay is and the games it offers, linking each game to its rules page. It SHALL NOT link to Ko-fi, because the footer's Support link is the only one.

#### Scenario: Tour renders

- **WHEN** a visitor opens `/tour`
- **THEN** the page has one `h1`, names Tic-Tac-Toe and Checkers with links to their rules pages, and has no link to Ko-fi in its content

### Requirement: About page

`/about` SHALL tell the project story: why it exists, a timeline of milestones from the git history starting at the first commit, an "Under the hood" section, a link to the Tour, and a "Made by Nikko Abucejo" credit with one link to `https://github.com/nikkoabucejo/twoplay` that opens in a new tab.

#### Scenario: About renders

- **WHEN** a visitor opens `/about`
- **THEN** the page has one `h1`, a timeline whose first milestone is the first commit, a link to `/tour`, and credits Nikko Abucejo

#### Scenario: Repo link

- **WHEN** a visitor opens `/about`
- **THEN** exactly one link points to `https://github.com/nikkoabucejo/twoplay`, with `target="_blank"` and `rel="noopener noreferrer"`

### Requirement: Privacy and Terms

`/privacy` and `/terms` SHALL state in plain language that sign-in is handled by Clerk, that game history and ratings are stored, and that the app has no ads or tracking. Each SHALL show the date it was last updated and an "On this page" list linking to each section's anchor. Neither SHALL show a draft label.

#### Scenario: Privacy content

- **WHEN** a visitor opens `/privacy`
- **THEN** the page mentions Clerk, game history, and no ads or tracking, shows its updated date, and shows no "Draft" label

#### Scenario: Terms content

- **WHEN** a visitor opens `/terms`
- **THEN** the page mentions Clerk, stored history, and no ads or tracking, shows its updated date, and shows no "Draft" label

#### Scenario: Jump to a section

- **WHEN** a visitor activates a link in the "On this page" list
- **THEN** the page scrolls to that section, the URL hash becomes the section's id, and that link is marked current

### Requirement: Info page metadata

`/tour`, `/about`, `/privacy`, and `/terms` SHALL render the titles `Tour · twoplay`, `About · twoplay`, `Privacy · twoplay`, and `Terms · twoplay`, each with a description.

#### Scenario: Privacy title

- **WHEN** `/privacy` renders
- **THEN** the document title is `Privacy · twoplay` and a description meta tag is present
