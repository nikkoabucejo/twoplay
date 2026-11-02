# about-build Specification

## Purpose

Plays a live build of the About page by nine named agent cursors on a visitor's first visit, as a client-only layer over the complete server-rendered page.

## Requirements

### Requirement: Build plays once per session

The About build SHALL start on its own only on the first `/about` visit in a browser session, recorded in `sessionStorage`. Later visits in that session SHALL show the final page at once with a Replay control. If `sessionStorage` is unavailable, the build SHALL play and the page SHALL NOT throw.

#### Scenario: First visit plays the build

- **WHEN** a visitor without reduced motion opens `/about` for the first time in a browser session
- **THEN** the build starts and the HUD shows a Skip control

#### Scenario: Second visit shows the final page

- **WHEN** the same visitor opens `/about` again in that session
- **THEN** no build starts, the final page is shown, and the HUD shows Replay

#### Scenario: Storage blocked

- **WHEN** reading or writing `sessionStorage` throws
- **THEN** the build plays and no error escapes

### Requirement: Server-rendered final page

The server-rendered HTML for `/about` SHALL contain every section's final text, with no agent overlay, and the build SHALL only add client state on top of it. On a first visit, the page content SHALL be hidden with opacity before first paint so the final content does not flash before the build starts, and SHALL become visible within 3 seconds even if the client never starts.

#### Scenario: SSR holds the final content

- **WHEN** `/about` is server-rendered
- **THEN** the HTML contains every section heading and its final body text, one `h1`, and no agent cursor

#### Scenario: No flash on first visit

- **WHEN** a first-session visitor loads `/about` with a cold cache
- **THEN** the final page content is not visible in any frame before the build's starting state appears

#### Scenario: Client fails to start

- **WHEN** the page's JavaScript never runs on a first visit
- **THEN** the final page content becomes visible within 3 seconds

### Requirement: Agents build the page section by section

During the build, nine named agent cursors SHALL join one at a time about one second apart, triage first. Each section SHALL be scanned, built with the tools its parts list in markup order, verified, click-tested, audited where it holds the repo link, and reviewed with "LGTM". At the end the agents SHALL gather at the credit and leave, and the HUD SHALL show "Built by 9 agents in Ns" with Replay.

#### Scenario: Tools from markup

- **WHEN** a part's `data-build` lists any of frame, fill, type, size, paint, pop, line, draw, radius, spacing, gradient, shadow, align, code, layers, or contrast
- **THEN** an agent builds it with those tools in the listed order

#### Scenario: Agents join in order

- **WHEN** the build starts
- **THEN** the triage agent appears first and the ninth agent appears last, about one second apart

#### Scenario: Run completes

- **WHEN** the build finishes without Skip
- **THEN** every section shows its final content, no agent cursor remains, and the HUD reads "Built by 9 agents in" a seconds value with a Replay control

### Requirement: Every agent stays busy

An agent with no step it can start SHALL assist instead (`measure`, `comment`, `inspect`, or `pair` on a running type, draw, code, or gradient step), and SHALL wander only when no assist is free. Assists SHALL target only built elements in the work window, one agent per target, and SHALL NOT repeat a kind on a target within 6 s. Assists SHALL NOT count toward progress or a section's review.

#### Scenario: Inspect stays occasional

- **WHEN** agents assist during a build
- **THEN** at most one inspect panel is open at a time, with at least 4 s between inspects across the team

#### Scenario: Idle agent assists

- **WHEN** an agent has no step it can start and a built element is in the work window
- **THEN** it assists on that element instead of wandering

#### Scenario: Pair ends with its step

- **WHEN** an idle agent pairs on a running long step
- **THEN** the pair ends when that step ends

#### Scenario: Assists do not move progress

- **WHEN** a run completes
- **THEN** the number of completed steps equals the number of planned steps, whatever assists ran

### Requirement: Build never moves the page layout

The build SHALL change only `transform`, `opacity`, `clip-path`, stroke offsets, and text inside boxes whose size is reserved. Pending targets SHALL be invisible until an agent builds them, and SHALL appear without fading out first. A focused control inside a target or item that is not yet built SHALL be visible. Typed text SHALL be revealed over its reserved final text, and font-size changes SHALL be shown as a transform scale.

#### Scenario: Focused control shows mid-build

- **WHEN** the visitor moves focus to the repo link or the tour link before the agents have built it
- **THEN** that link is visible while it has focus

#### Scenario: No layout shift while building

- **WHEN** a first-session visitor loads `/about` at 360x640 and at 1280x800 and the build runs to the end
- **THEN** the cumulative layout-shift score is at most 0.01

### Requirement: Click-test is visual only

The build's click-test, audit, and review steps SHALL NOT dispatch events to page controls, so they never navigate, open the repo link, or play a click sound.

#### Scenario: No click sound during a run

- **WHEN** the build runs to the end with UI sounds on
- **THEN** no click tick plays and no navigation or new tab occurs

### Requirement: Skip and Replay

The HUD SHALL be an in-flow bar directly below the hero that the agents build like any section. Its Skip button SHALL be the first focusable control in the page content, reachable by keyboard from the start of the build and visible when focused; Escape SHALL also skip a running build. Skip SHALL stop the run at once and show the final page. Replay SHALL start a new run from the top of the page, including under reduced motion.

#### Scenario: Skip ends the run

- **WHEN** the visitor activates Skip during the build
- **THEN** all timers and animation frames stop, every section shows its final text, no agent cursor remains, and the HUD shows Replay

#### Scenario: Replay restarts the run

- **WHEN** the visitor activates Replay
- **THEN** the page scrolls to the top and a new build starts with the triage agent

#### Scenario: Escape skips

- **WHEN** the visitor presses Escape during the build
- **THEN** the run ends as with Skip, and Escape does nothing once the build is done

### Requirement: Build bar comes first

The agents SHALL build the HUD before any other part of the page: its scan SHALL NOT wait for an earlier section, and its steps SHALL go ahead of every other step and SHALL NOT wait for the work window.

#### Scenario: Build bar comes first

- **WHEN** the build starts
- **THEN** the first step any agent takes is the HUD section's scan, and every HUD step starts before the first section is reviewed

### Requirement: Builders work in view

Outside the first section and the HUD, agents SHALL only start a step whose element overlaps the visible area of the scroll container, below a small top gap, plus a 15% look-ahead below it, taking the highest such element first. No new step SHALL start on an element wholly above that area while follow-scroll runs. The gate SHALL open once follow-scroll reaches the bottom, SHALL NOT apply under reduced motion, and SHALL stay open after a 1.5 s stall once the visitor stops follow-scroll.

#### Scenario: Work waits for the view

- **WHEN** a section below the first starts below the work window
- **THEN** no agent starts its steps until it enters the window

#### Scenario: Leftovers finish at the bottom

- **WHEN** follow-scroll reaches the bottom with steps left on elements above the view
- **THEN** those steps still run and the build finishes

#### Scenario: No gate under reduced motion

- **WHEN** the visitor prefers reduced motion and presses Replay
- **THEN** the build runs without scrolling the page, starts sections below the view without waiting, and finishes in about a normal run's length

#### Scenario: A stall lifts the gate for good

- **WHEN** the visitor has stopped follow-scroll and no step has started for 1.5 s
- **THEN** the gate opens and stays open until the run ends

### Requirement: Follow-scroll

Once the first section is reviewed, the page SHALL scroll to the bottom along one fixed curve: about 1 s ease-in, a constant speed set once to land near a 42 s run (36 s on small screens), and about 1 s ease-out. It SHALL NOT change speed mid-course, and SHALL resume on the same curve after a hidden tab. It SHALL NOT run under reduced motion, whether set by the OS or by the app's "Always reduce" setting.

#### Scenario: Starts after the first review

- **WHEN** the build starts
- **THEN** the page does not scroll until the first section is reviewed

#### Scenario: Constant speed

- **WHEN** follow-scroll is between its ease-in and ease-out
- **THEN** every animation frame moves the page down by the same amount

#### Scenario: Builders speed up after the hero

- **WHEN** the first section is reviewed
- **THEN** step and assist timing runs 1.5, then 2.3, then 2.8 times its hero speed over thirds of the rest of the run (of the scroll while following, else of the steps left), each change easing in over about 1 s, holding 2.8 times until the run ends, and the scroll speed does not change

#### Scenario: Building continues after the scroll lands

- **WHEN** follow-scroll reaches the bottom
- **THEN** agents keep working for at least 1 s before they gather

#### Scenario: Builders catch up

- **WHEN** a target in view has more steps left than fit before it scrolls out
- **THEN** step and assist timing speeds up past the base pace, by at most 2.2 times, and returns to the base pace once the work fits

### Requirement: Visitor input stops follow-scroll

Follow-scroll SHALL stop for the rest of the run when the visitor scrolls by wheel, touch, key, or pointer, or moves focus inside the page.

#### Scenario: User scroll stops following

- **WHEN** the visitor scrolls with the wheel during the build
- **THEN** the build does not scroll the page again in that run, and agents work in the visitor's view

#### Scenario: Tab stops following

- **WHEN** the visitor moves focus with Tab inside the page during the build
- **THEN** the build does not scroll the page again in that run

### Requirement: Build runs only while visible and mounted

The build SHALL pause its animation-frame loop while the document is hidden and resume when visible. Leaving `/about` SHALL cancel every timer, animation frame, and listener the build started.

#### Scenario: Teardown on navigation

- **WHEN** the visitor navigates away from `/about` during the build
- **THEN** no build timer or animation frame runs afterward and no overlay element remains

#### Scenario: Hidden tab pauses

- **WHEN** the tab is hidden during the build
- **THEN** no animation frame is requested until the tab is visible again

### Requirement: Build is silent to assistive technology

The agent cursors, chat bubbles, and overlay effects SHALL be `aria-hidden`. Screen readers SHALL get each section's final text, never partially typed text. The HUD SHALL NOT be an `aria-live` region.

#### Scenario: Overlay hidden from the accessibility tree

- **WHEN** the build is running
- **THEN** the agent cursors, bubbles, and overlay effects are not in the accessibility tree, and each heading's accessible name is its final text
