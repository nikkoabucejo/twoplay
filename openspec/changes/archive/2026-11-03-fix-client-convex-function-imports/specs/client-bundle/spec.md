# Spec Delta

## Purpose

Defines which Convex modules browser code may load, so the client never pulls in server function definitions.

## ADDED Requirements

### Requirement: Client code loads no Convex function modules

Browser code SHALL value-import only Convex modules that register no queries, mutations, or actions, directly or through their own value imports. Type-only imports of any Convex module are allowed.

#### Scenario: Pages load without the Convex import warning

- **WHEN** `/`, `/play`, or a room page loads in the browser
- **THEN** the console shows no "Convex functions should not be imported in the browser" warning

#### Scenario: A value import of a function module is rejected

- **WHEN** a non-test file under `src/` value-imports a Convex module that registers a function, including a mixed `import { x, type Y }` or a dynamic `import()`
- **THEN** the client-boundary test fails and names the file and the imported path

#### Scenario: Function-free and type-only imports are accepted

- **WHEN** non-test files under `src/` value-import only `_generated/api`, `models/*/constants.ts`, or `models/games/<game>/{index,rules}.ts`, and import other Convex modules type-only
- **THEN** the client-boundary test passes

### Requirement: Trashtalk allowlist and time-control clamp are unchanged

The server SHALL keep accepting exactly the same trashtalk emojis and clamping time controls to the same range and default after the shared values move.

#### Scenario: Unknown emoji is still rejected

- **WHEN** a seated player calls `trashtalk` with an emoji outside the allowlist
- **THEN** the mutation throws "Unknown emoji" and the player's emoji is unchanged

#### Scenario: Time control is still clamped

- **WHEN** a room is created with no time control, a non-finite one, or one outside 10 seconds to 60 minutes
- **THEN** the stored time is 5 minutes, 5 minutes, or the nearest bound respectively
