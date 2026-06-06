# Onboarding Import Strategy

## Goal

Improve first-time-user activation by making the fastest path to value the default, while preserving the richer Uber/DoorDash export flow for users who want deeper insights later.

## Current Problem

The app currently has two import paths with very different UX characteristics:

- Email import: fast, low-friction, immediate payoff
- Uber/DoorDash export import: more complete and more accurate, but slow and high-friction

The export flow is strong from a data-quality perspective, but weak as an onboarding experience because it asks users to:

1. Leave the app
2. Request data from Uber or DoorDash
3. Wait for an email
4. Return later with a ZIP file

That is too much friction before the user has seen value.

## Recommended Direction

Default onboarding to email import.

Treat Uber/DoorDash export import as a secondary, post-activation upgrade path rather than the primary first-run experience.

In practical terms:

- First-time users should be guided toward connecting an email provider
- Export import should remain available, but should not be framed as the main onboarding path
- After users successfully import via email and see their first insights, the app should prompt them to upgrade to the detailed export flow for more complete analytics

## Product Principle

Use a `fast now, deeper later` model.

The user should not have to choose between ingestion methods before they understand the product value. The app should optimize for:

- fastest time to first insight
- lowest cognitive load at onboarding
- clear trust-building before asking for higher-effort actions

## Proposed UX Approach

### Option A: Preferred

Do not present a neutral import-method chooser up front.

Instead:

- Primary onboarding CTA: connect email
- Secondary CTA: use account export instead

This keeps the better UX path front and center without removing choice.

### Option B: Acceptable Fallback

Let users choose between:

- Fast import
- Detailed import

This is workable, but weaker. It forces a product decision onto users before they have enough context to evaluate the tradeoff.

If this approach is used, the fast path should still be visually and structurally dominant.

## High-Level User Journey

### First-Time Flow

1. User opens app
2. User sees a short value proposition
3. User creates an account or signs in
4. User is taken directly to the email import flow
5. User imports receipts and gets first insights quickly
6. User sees a follow-up prompt for deeper import options

### Upgrade Flow

After successful email import, the app can introduce the export path with messaging like:

- Get more complete historical data
- Unlock deeper insights
- Improve accuracy across fees, order history, and long-term trends

This makes the export flow feel like an enhancement, not an onboarding blocker.

## Positioning

The distinction between the two methods should be explicit and honest.

### Email Import

- Fastest setup
- Best for getting started
- Good coverage
- May be less complete than full account exports

### Full Export Import

- Most complete data
- Better for advanced or long-term insights
- Requires requesting data from Uber or DoorDash
- Slower setup

This framing matters. Users should understand that email import is the recommended starting point, not the final or most complete state.

## Why This Direction Makes Sense

### Benefits

- Reduces onboarding friction
- Improves time to first value
- Makes the app easier to understand
- Builds trust before asking for higher-effort actions
- Creates a clearer upgrade funnel into the richer import path

### Risks

- Some users may assume email import is the full product experience
- Some advanced insights may not be available immediately
- The app will need clear upgrade messaging so users understand what the export path adds

These risks are manageable if the product clearly communicates:

- what users get now
- what they unlock later
- why the detailed import is worth doing

## Messaging Guidance

Avoid framing the initial decision as an internal tradeoff like `fast vs slow`.

Prefer user-centered framing:

- Get started with email
- Import from your inbox
- Have an export already? Upload it here

Later, for the upsell:

- Want more accurate and complete insights?
- Unlock deeper trends with your full Uber or DoorDash export

The product should talk about user outcomes, not ingestion mechanics.

## UX Implications

If this direction is adopted, the onboarding flow should eventually be updated so that:

- email import becomes the primary post-auth destination
- export upload becomes secondary but still accessible
- post-import success states introduce the detailed import as the next step
- copy is standardized across the app so file type and method expectations are consistent

## Rollout Suggestion

Phase 1:

- Reposition email import as the default onboarding path
- Keep export upload available as a secondary option

Phase 2:

- Add a post-email-import upgrade prompt for full exports
- Explain the additional insights unlocked by full exports

Phase 3:

- Expand beyond Gmail to additional email providers
- Refine onboarding messaging and upgrade timing based on activation and conversion data

## Success Criteria

This direction is working if:

- more first-time users complete an import
- time to first meaningful insight decreases
- more users reach their first successful insight session
- a healthy subset of activated users later upgrade to full export import

## Summary

SnackTrack should optimize onboarding for activation, not maximum data completeness on day one.

The recommended direction is:

- default to email import for new users
- keep export import available but secondary
- upsell detailed imports after users have already experienced value

That approach is more likely to improve conversion, reduce friction, and still preserve the richer long-term data path that makes the product stronger.
