# Onboarding Import Execution Plan

## Objective

Shift first-time onboarding so that email import becomes the default activation path, while Uber/DoorDash export import becomes a secondary, post-activation upgrade path.

This plan is intended to guide product, design, and engineering work before implementation begins.

## Primary Product Decision

New default flow:

1. User opens app
2. User sees a short value proposition
3. User creates an account or signs in
4. User is taken directly into email import
5. User gets first insights as quickly as possible
6. User is later prompted to upgrade to full export import for deeper insights

## Success Criteria

We should expect this work to improve:

- first-time import completion rate
- time to first insight
- onboarding completion rate
- percentage of users who return after first session

Secondary success criteria:

- percentage of activated users who later start the export flow
- percentage of activated users who complete the export flow

## Scope

### In Scope

- Reordering the first-run funnel
- Changing CTA hierarchy and copy
- Making email import the default post-auth path
- Repositioning export import as a secondary or upgrade option
- Adding a post-email-import upsell for deeper import

### Out of Scope

- Rebuilding the analytics model
- Supporting all future email providers immediately
- Redesigning every existing insight screen
- Removing the export flow entirely

## Workstreams

## 1. Define the Target First-Run Flow

### Goal

Replace the current onboarding logic with a simpler activation path.

### Deliverables

- final approved first-run journey
- definition of primary vs secondary import methods
- rules for when to show detailed export prompts

### Decisions to Lock

- whether onboarding intro remains at all
- whether auth happens before import selection
- whether users land directly in email import or on an import hub
- when the export upsell appears

### Phase 1 Decisions

- Keep the onboarding intro, but reduce it to a single value-prop screen
- Keep authentication before import selection
- Route authenticated users with no imported receipt data directly into the email-first import experience
- Use the existing upload route as the Phase 1 post-auth destination, with Gmail import opened first when possible
- Route authenticated users who already have imported data into the main app experience
- Move the full export flow out of the required first-run path and keep it as a secondary option

## 2. Audit the Current Experience

### Goal

Document the current funnel and identify which screens should be reused, changed, or removed.

### Deliverables

- current-state flow map
- target-state flow map
- screen inventory with actions for each screen

### Current Areas to Review

- root onboarding flow
- login and registration screen
- tutorial flow
- upload/import screen
- post-import success path
- dashboard empty states

## 3. Define the New Screen Responsibilities

### Goal

Make each screen do one job well.

### Proposed Direction

- Intro/value prop screen: explain what SnackTrack does in a short, trust-building way
- Auth screen: create account or sign in
- Email import screen: primary activation screen
- Export import option: secondary entry point
- First insight state: immediate payoff after successful email import
- Export upsell: shown after value is established

### Deliverables

- clear screen-by-screen responsibility list
- entry and exit conditions for each screen

## 4. Rewrite Messaging and CTA Hierarchy

### Goal

Make the product easier to understand and reduce decision friction.

### Principles

- lead with value, not mechanics
- avoid making users choose between `fast` and `slow`
- be explicit about completeness tradeoffs
- make trust and privacy legible early

### Messaging Direction

Primary:

- Connect your email
- Import from your inbox
- Get your first insights fast

Secondary:

- Have a ZIP export already?
- Want more complete insights?
- Upload your full Uber or DoorDash export

### Deliverables

- updated onboarding copy
- updated auth-adjacent copy
- updated import screen copy
- export upsell copy

## 5. Rework Navigation and State Logic

### Goal

Ensure the app routes new users into the correct primary flow.

### Key Changes Needed

- new users should not default to the dashboard after auth
- email import should become the primary post-auth destination
- export tutorial should no longer be the required next step for all users
- onboarding completion logic may need to be split from import-method progression

### Deliverables

- navigation/state transition plan
- onboarding state model for first-run users
- definition of when a user is considered activated

## 6. Design the Export Upgrade Funnel

### Goal

Preserve the richer import path without making it an onboarding blocker.

### Questions to Answer

- when should the export upsell appear
- what additional insights should be promised
- should the export upgrade be shown inline, as a modal, or as a card in the app
- should users be able to dismiss it permanently or snooze it

### Deliverables

- export upsell entry points
- export upsell copy and content structure
- list of deeper insights enabled by export import

## 7. Add Instrumentation

### Goal

Measure whether the new funnel is actually better.

### Events to Track

- intro viewed
- auth started
- account created
- email import started
- email import succeeded
- first insight viewed
- export upsell shown
- export upsell clicked
- export request tutorial started
- export upload completed

### Deliverables

- event list
- event naming conventions
- success dashboard requirements

## 8. Rollout Strategy

### Goal

Reduce implementation risk and allow validation in stages.

### Suggested Phases

#### Phase 1

- define and approve target flow
- update docs and copy direction
- route new users to the new primary import path

#### Phase 2

- refine email import onboarding UX
- reposition export import as secondary
- adjust dashboard and empty states to support the new model

#### Phase 3

- add export upsell after first value
- instrument and evaluate conversion

#### Phase 4

- expand beyond Gmail to more email providers
- optimize prompts based on data

## Immediate Next Steps

1. Finalize the target first-run flow
2. Create a current-state vs target-state screen map
3. Decide whether the post-auth destination is a dedicated email import screen or a revised import hub
4. Define the minimum copy changes needed for the first implementation pass
5. Identify the exact components and routes that need to change first

## Recommended Implementation Order

1. Flow mapping
2. Navigation/state changes
3. Screen hierarchy changes
4. Copy updates
5. Export upsell design
6. Instrumentation
7. Iteration based on usage data

## Notes

- The key mistake to avoid is treating email import and export import as equal first-run choices.
- The app should optimize for activation first, then depth.
- Export import remains strategically important, but should be introduced after trust and product value are established.
