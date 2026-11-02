## MODIFIED Requirements

### Requirement: Footer

Non-game routes SHALL show a fixed footer bar below the scrolling main region, with About, Tour, Learn, Privacy, and Terms on the left and Support on the right; below `sm` Support shows only its icon. The footer SHALL hold only existing internal pages that the header, tab bar, and avatar menu do not link, and no copyright. Game-room routes SHALL NOT render the footer.

#### Scenario: Footer links

- **WHEN** any non-game page renders
- **THEN** the footer links to `/about`, `/tour`, `/learn` (labelled "Learn"), `/privacy`, `/terms`, and the Ko-fi page

#### Scenario: Footer layout

- **WHEN** any non-game page renders at 360px or wider
- **THEN** the info links sit together on the left and Support on the right in one compact row, no copyright is shown, and the page has no horizontal scroll

#### Scenario: Support is icon-only on mobile

- **WHEN** any non-game page renders below the `sm` breakpoint
- **THEN** the Support link shows the Ko-fi icon with its "Support" label visually hidden but still in its accessible name

#### Scenario: Footer does not repeat header or tab bar links

- **WHEN** a signed-in user loads `/history`
- **THEN** the footer contains no href that the header (wordmark, primary links, or avatar menu) or the tab bar also renders

#### Scenario: Footer links resolve

- **WHEN** a user follows each internal footer link
- **THEN** every one returns a page, not a 404

#### Scenario: No footer in a room

- **WHEN** a user opens `/tictactoe/ABCD`
- **THEN** no footer is rendered
