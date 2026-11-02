# client-auth Specification

## Purpose

Defines how the browser-side auth client behaves when the auth provider's scripts fail to load, so the app never waits forever on a token.

## Requirements

### Requirement: Auth load failure is contained

If loading the auth provider's UI bundle or SDK fails, the client SHALL catch the error, record it, and not leave an unhandled promise rejection.

#### Scenario: UI bundle blocked

- **WHEN** the auth UI bundle request fails
- **THEN** no unhandled rejection is raised and the client reports a load error

### Requirement: Token requests settle after a failed load

After a failed load, pending and future access-token requests SHALL resolve to no token instead of waiting indefinitely.

#### Scenario: Token request during failure

- **WHEN** a token request is waiting and the load then fails
- **THEN** the request resolves with no token

#### Scenario: Token request after failure

- **WHEN** a token is requested after the load has failed
- **THEN** it resolves with no token immediately

### Requirement: Signed-out fallback after a failed load

After a failed load, the client SHALL report the viewer as signed out, even if the server rendered the page signed in, and the Sign in action SHALL be disabled. The client SHALL keep whether the server rendered the viewer signed in, so the shell can keep the member navigation it rendered.

#### Scenario: Hydrated session then failure

- **WHEN** the page was server-rendered for a signed-in user and the auth client then fails to load
- **THEN** the client reports signed out, member-only queries are not subscribed, and Sign in is disabled

#### Scenario: Member navigation flag

- **WHEN** the page was server-rendered for a signed-in user and the auth client then fails to load
- **THEN** the client reports that member navigation stays shown; after a normal load and sign-out, or a failed load for a signed-out render, it reports that it is not shown

### Requirement: Auth error banner

When the auth client fails to load, the app SHALL show a banner below the header, announced as an alert, stating that sign-in is unavailable and offering a reload action. The banner SHALL overlay the page rather than push its content (see `layout-stability`). The rest of the page SHALL stay usable.

#### Scenario: Banner on blocked bundle

- **WHEN** the auth UI bundle is blocked and `/play` is loaded
- **THEN** an alert banner explains sign-in is unavailable with a Reload button, and the page renders instead of hanging

#### Scenario: No banner on success

- **WHEN** the auth client loads normally
- **THEN** no auth error banner is shown
