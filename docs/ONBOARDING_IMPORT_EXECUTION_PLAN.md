# Onboarding Import Execution Plan

## Objective

Shift first-time onboarding so that email import becomes the default activation path, while Uber/DoorDash export import becomes a secondary, post-activation upgrade path.

This document now reflects the current product direction and acts as a live checklist for implementation status.

## Primary Product Decision

Current default flow:

1. User opens app
2. User sees a short value proposition
3. User creates an account or signs in
4. User lands on the revised upload page
5. The primary Gmail CTA handles connect and import in one action
6. User gets first insights as quickly as possible
7. User is later prompted to upgrade to full export import for deeper insights

## Current Direction Snapshot

- [x] Keep the onboarding intro, but reduce it to a single value-prop screen
- [x] Keep authentication before import selection
- [x] Route authenticated users with no imported receipt data to the upload route instead of the dashboard
- [x] Make the upload route an email-first import hub
- [x] Make the primary Gmail action connect and import in one step
- [x] Keep the Gmail management drawer/modal only for managing an existing Gmail connection
- [x] Route authenticated users who already have imported data into the main app experience
- [x] Move the full export flow out of the required first-run path and keep it as a secondary option
- [x] Standardize the rest of the app around the new email-first positioning for the current first-run and empty-state surfaces
- [ ] Add a post-value export upsell
- [ ] Add instrumentation for the new funnel

## Success Criteria

We should expect this work to improve:

- [ ] first-time import completion rate
- [ ] time to first insight
- [ ] onboarding completion rate
- [ ] percentage of users who return after first session

Secondary success criteria:

- [ ] percentage of activated users who later start the export flow
- [ ] percentage of activated users who complete the export flow

## Scope

### In Scope

- [x] Reordering the first-run funnel
- [x] Changing CTA hierarchy and copy at the top of the funnel
- [x] Making email import the default post-auth path
- [x] Repositioning export import as a secondary or upgrade option on the upload screen
- [ ] Adding a post-email-import upsell for deeper import
- [x] Standardizing follow-on copy across dashboard, wrapped, receipts, profile, and help surfaces

### Out of Scope

- [ ] Rebuilding the analytics model
- [ ] Supporting all future email providers immediately
- [ ] Redesigning every existing insight screen
- [ ] Removing the export flow entirely

## Workstreams

## 1. Define the Target First-Run Flow

### Goal

Replace the current onboarding logic with a simpler activation path.

### Deliverables

- [x] final approved first-run journey
- [x] definition of primary vs secondary import methods
- [ ] rules for when to show detailed export prompts

### Decisions to Lock

- [x] whether onboarding intro remains at all
- [x] whether auth happens before import selection
- [x] whether users land directly in email import or on an import hub
- [ ] when the export upsell appears

### Phase 1 Decisions

- [x] Keep the onboarding intro, but reduce it to a single value-prop screen
- [x] Keep authentication before import selection
- [x] Route authenticated users with no imported receipt data directly into the email-first import experience
- [x] Use the existing upload route as the Phase 1 post-auth destination
- [x] Keep Gmail connect and import as the primary first-run action on that route
- [x] Do not auto-open the Gmail management drawer on first run
- [x] Route authenticated users who already have imported data into the main app experience
- [x] Move the full export flow out of the required first-run path and keep it as a secondary option

## 2. Audit the Current Experience

### Goal

Document the current funnel and identify which screens should be reused, changed, or removed.

### Deliverables

- [x] current-state flow map
- [x] target-state flow map
- [x] screen inventory with actions for each screen

### Current Areas Reviewed

- [x] root onboarding flow
- [x] login and registration screen
- [x] tutorial flow
- [x] upload/import screen
- [x] post-import success path
- [x] dashboard empty states
- [x] receipts empty state
- [x] wrapped journey empty state
- [x] profile/help upload affordances

## 3. Define the New Screen Responsibilities

### Goal

Make each screen do one job well.

### Proposed Direction

- [x] Intro/value prop screen: explain what SnackTrack does in a short, trust-building way
- [x] Auth screen: create account or sign in
- [x] Email-first upload screen: primary activation screen
- [x] Export import option: secondary entry point
- [x] First insight state: immediate payoff after successful email import
- [ ] Export upsell: shown after value is established

### Deliverables

- [x] clear screen-by-screen responsibility list
- [x] entry and exit conditions for each screen

### Current Screen Responsibility Status

- [x] Onboarding screen: value proposition only
- [x] Login screen: auth only
- [x] Upload screen: primary Gmail import plus secondary export path
- [x] Gmail management modal: manage existing Gmail connection only
- [x] Dashboard: copy and actions fully aligned to email-first model
- [x] Wrapped empty state: aligned to email-first model
- [x] Profile/help surfaces: aligned to email-first model
- [ ] Export upsell surface defined

## 4. Rewrite Messaging and CTA Hierarchy

### Goal

Make the product easier to understand and reduce decision friction.

### Principles

- [x] lead with value, not mechanics
- [x] avoid making users choose between `fast` and `slow`
- [x] be explicit about completeness tradeoffs
- [x] make trust and privacy legible early

### Messaging Direction

Primary:

- [x] Connect your email
- [x] Import from your inbox
- [x] Get your first insights fast

Secondary:

- [x] Have a ZIP export already?
- [x] Want more complete insights?
- [x] Upload your full Uber or DoorDash export

### Deliverables

- [x] updated onboarding copy
- [x] updated auth-adjacent copy
- [x] updated import screen copy
- [ ] export upsell copy
- [x] dashboard copy cleanup
- [x] receipts empty-state copy cleanup
- [x] wrapped empty-state copy cleanup
- [x] profile/help copy cleanup
- [x] export uploader copy cleanup

## 5. Rework Navigation and State Logic

### Goal

Ensure the app routes new users into the correct primary flow.

### Key Changes Needed

- [x] new users should not default to the dashboard after auth
- [x] email import should become the primary post-auth destination
- [x] export tutorial should no longer be the required next step for all users
- [x] onboarding completion logic should be separate from import-method progression
- [x] remove obsolete `openGmail` routing/query-param cleanup code

### Deliverables

- [x] navigation/state transition plan
- [x] onboarding state model for first-run users
- [ ] definition of when a user is considered activated

## 6. Design the Export Upgrade Funnel

### Goal

Preserve the richer import path without making it an onboarding blocker.

### Questions to Answer

- [ ] when should the export upsell appear
- [ ] what additional insights should be promised
- [ ] should the export upgrade be shown inline, as a modal, or as a card in the app
- [ ] should users be able to dismiss it permanently or snooze it

### Deliverables

- [ ] export upsell entry points
- [ ] export upsell copy and content structure
- [ ] list of deeper insights enabled by export import

## 7. Add Instrumentation

### Goal

Measure whether the new funnel is actually better.

### Events to Track

- [ ] intro viewed
- [ ] auth started
- [ ] account created
- [ ] email import started
- [ ] email import succeeded
- [ ] first insight viewed
- [ ] export upsell shown
- [ ] export upsell clicked
- [ ] export request tutorial started
- [ ] export upload completed

### Deliverables

- [ ] event list
- [ ] event naming conventions
- [ ] success dashboard requirements

## 8. Rollout Strategy

### Goal

Reduce implementation risk and allow validation in stages.

### Suggested Phases

#### Phase 1

- [x] define and approve target flow
- [x] update docs and copy direction
- [x] route new users to the new primary import path
- [x] revise upload screen so Gmail is primary and export is secondary
- [x] remove obsolete first-run Gmail-open route state

#### Phase 2

- [ ] refine email import onboarding UX
- [x] reposition export import as secondary
- [x] adjust dashboard and empty states to support the new model
- [x] align profile/help/wrapped copy to the new model

#### Phase 3

- [ ] add export upsell after first value
- [ ] instrument and evaluate conversion

#### Phase 4

- [ ] expand beyond Gmail to more email providers
- [ ] optimize prompts based on data

## Immediate Next Steps

1. [x] Remove obsolete `openGmail` route state and related cleanup code
2. [x] Update dashboard copy and actions to stop signaling export-first onboarding
3. [x] Update receipts, wrapped, profile, and help empty states / upload entry points to match the email-first model
4. [x] Reword the export uploader so it reads as a secondary, deeper import path
5. [ ] Define and implement the post-value export upsell
6. [ ] Add instrumentation for onboarding, Gmail import, first insight, and export upgrade events

## Recommended Implementation Order

1. [x] Flow mapping
2. [x] Navigation/state changes
3. [x] Screen hierarchy changes
4. [ ] Copy updates outside the upload screen
5. [ ] Export upsell design
6. [ ] Instrumentation
7. [ ] Iteration based on usage data

## Notes

- [x] The key mistake to avoid is treating email import and export import as equal first-run choices.
- [x] The app should optimize for activation first, then depth.
- [x] Export import remains strategically important, but should be introduced after trust and product value are established.
