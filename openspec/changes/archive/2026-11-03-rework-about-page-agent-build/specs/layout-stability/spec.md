# Spec Delta

## MODIFIED Requirements

### Requirement: Stable page load

Loading `/`, `/play`, `/lobby`, `/history`, `/leaderboard`, `/about`, and a game room (`/tictactoe/<code>`, `/checkers/<code>`) SHALL produce a cumulative layout-shift score of at most 0.01, at 360x640 and at 1280x800, both signed in and signed out. For `/about`, the measurement SHALL include the first-visit build running to the end.

#### Scenario: Signed-in load at both viewports

- **WHEN** a signed-in user loads each listed route with a cold cache at 360x640 and at 1280x800
- **THEN** the cumulative layout-shift score for each load is at most 0.01

#### Scenario: Signed-out load at both viewports

- **WHEN** a signed-out visitor loads each listed route at 360x640 and at 1280x800
- **THEN** the cumulative layout-shift score for each load is at most 0.01

#### Scenario: About build without shift

- **WHEN** a first-session visitor loads `/about` at 360x640 and at 1280x800 and the observer runs until the build ends
- **THEN** the cumulative layout-shift score is at most 0.01
