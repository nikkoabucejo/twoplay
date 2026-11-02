## MODIFIED Requirements

### Requirement: Tour page

`/tour` SHALL describe what twoplay is and the games it offers, linking each game to its rules page. It SHALL NOT link to Ko-fi, because the footer's Support link is the only one.

#### Scenario: Tour renders

- **WHEN** a visitor opens `/tour`
- **THEN** the page has one `h1`, names Tic-Tac-Toe, Checkers, and Chess with links to their rules pages, and has no link to Ko-fi in its content
