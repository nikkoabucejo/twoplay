# Spec Delta

## MODIFIED Requirements

### Requirement: Avatar menu

When signed in, the header SHALL show the user's avatar as a button whose accessible name includes the user's display name, opening a menu with exactly four items in order: My stats, Settings, Account, and Sign out.

#### Scenario: Avatar button has an accessible name

- **WHEN** a signed-in user named "Ada" loads any page
- **THEN** the avatar button's accessible name contains "Ada"

#### Scenario: Menu actions

- **WHEN** the user opens the avatar menu
- **THEN** My stats goes to `/me`, Settings goes to `/settings`, Account opens the account profile, and Sign out signs the user out

#### Scenario: No Support item in the menu

- **WHEN** the user opens the avatar menu
- **THEN** the menu has no Support item and no link to the Ko-fi page

### Requirement: Footer

Non-game routes SHALL show a fixed footer bar below the scrolling main region and above the tab bar, holding How to play (`/how-to-play`), Tour, About, Privacy, and Terms grouped on the left, and the Support link on the right. Below the `sm` breakpoint the Support link SHALL show only its icon, keeping its label for screen readers. The footer SHALL NOT show a copyright. The footer SHALL hold only internal links that the header, tab bar, and avatar menu do not render. Every internal footer link SHALL point to a page that exists. Game-room routes SHALL NOT render the footer.

#### Scenario: Footer links

- **WHEN** any non-game page renders
- **THEN** the footer links to `/how-to-play`, `/tour`, `/about`, `/privacy`, `/terms`, and the Ko-fi page

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

### Requirement: One navigation surface per destination

At any viewport width, each in-app destination SHALL be linked from at most one of the header (including the avatar menu), the tab bar, and the footer. The avatar menu SHALL hold only the viewer's own pages and account actions (My stats, Settings, Account, Sign out).

#### Scenario: No duplicate links on mobile

- **WHEN** a signed-in user views `/play` at 360px wide
- **THEN** among the displayed header, tab bar, and footer links, no href appears more than once

#### Scenario: No duplicate links on desktop

- **WHEN** a signed-in user views `/play` at 1280px wide
- **THEN** among the displayed header and footer links, no href appears more than once, and the tab bar is not displayed
