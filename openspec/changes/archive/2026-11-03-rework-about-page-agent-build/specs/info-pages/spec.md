# Spec Delta

## MODIFIED Requirements

### Requirement: About page

`/about` SHALL tell the project story in this order: a hero with the only `h1` ("How twoplay came to be") and the stats 1 engineer, 9 agents, 2 games, 860+ tests; Who I am; Why this?; Highlights; How it's built (the eight-step `/dev:work` pipeline with Approval by Nikko); What I learned; a Timeline of milestones from the git history starting at the first commit, each with its short commit hash; What's next; a link to the Tour; and a "Made by Nikko Abucejo" credit with one link to `https://github.com/nikkoabucejo/twoplay` that opens in a new tab.

#### Scenario: About renders

- **WHEN** a visitor opens `/about`
- **THEN** the page has one `h1`, a timeline whose first milestone is the first commit, a link to `/tour`, and credits Nikko Abucejo

#### Scenario: Repo link

- **WHEN** a visitor opens `/about`
- **THEN** exactly one link points to `https://github.com/nikkoabucejo/twoplay`, with `target="_blank"` and `rel="noopener noreferrer"`

#### Scenario: Sections in order

- **WHEN** a visitor opens `/about`
- **THEN** the `h2` headings read Who I am, Why this?, Highlights, How it's built, What I learned, Timeline, What's next, Made by Nikko Abucejo, in that order

#### Scenario: Timeline shows commits

- **WHEN** a visitor opens `/about`
- **THEN** each timeline milestone shows its date and a seven-character commit hash, oldest first

#### Scenario: Approval is the engineer's step

- **WHEN** a visitor opens `/about`
- **THEN** the pipeline lists Triage, Spec, Approval, Build, Tests, Live QA, Review, Commit, and only Approval is marked as Nikko's step
