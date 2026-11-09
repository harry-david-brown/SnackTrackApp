# User comprehension and task flow

Read this for user-facing UI, copy, interaction, and navigation changes. Apply it to the touched journey, including its immediate entry and exit. A small wording edit needs a short review, not a separate design document, new research project, or full-app redesign.

## Start from what the user knows

Before implementing, establish:

- What is the user trying to accomplish, and how did they reach this screen?
- What have they actually learned or chosen so far? Do not assume knowledge of later instructions or internal architecture.
- What decision is needed now, and what will happen immediately after the action?
- What effort, waiting, external app, account access, or file handling must they understand before committing?

Use reasonable product judgment to answer these from the current journey. Ask only when an unresolved product decision materially changes behavior; do not turn this review into a routine approval gate.

## Explain the task before the mechanism

- Lead with familiar objects and outcomes: orders, Uber Eats, DoorDash, email receipts, spending. Introduce exports, ZIP files, coverage, matching, or other technical concepts only when the task needs them, with an explanation.
- Do not use an unfamiliar noun to explain another unfamiliar noun. “Use a history download” does not explain an alternative to connecting email.
- Place the information necessary to choose beside the choice. Help/disclosures can contain detail, but must not hide what an option does, what it requires, or whether it grants access.
- Name the action's actual outcome. “Add orders from Uber Eats or DoorDash” can introduce the guided file route; “Import directly from Uber” is appropriate only if the product really retrieves the data directly. These are examples, not mandatory strings for every surface.
- Match claims to actual capability and data: completeness, timing, automatic behavior, currency conversion, notifications, and permission scope must be supported. More appealing copy must not create a stronger promise than the implementation delivers.
- Keep one term for the same user-facing concept across related screens. Different states can have different wording, but not different meanings for the same action.

## Make the next step predictable

- Verify the action handler and destination, not just the label. “View order history” should reach History; an optional offer must not silently replace that destination. If a necessary intervening step exists, explain it and preserve the intended destination.
- Each screen should have a clear next action. Avoid repeated confirmation screens that ask for no new decision; preserve meaningful consent and destructive-action boundaries.
- Distinguish selecting a service, selecting an account, authorizing access, and starting work. Show enough context to catch a wrong selection and provide a correction path before commitment.
- Keep optional choices optional. Provide an appropriate way to decline, leave, or resume; do not make users complete an import to disconnect an account or abandon setup.
- Explain external handoffs before leaving the app and provide a clear way to resume. A browser return does not prove the user completed the external task.
- Progress should describe real stages and expectations. Do not imply a short linear task when a provider may prepare a file asynchronously.

## Make incomplete outcomes useful

- Review loading, empty, partial, success, unavailable, and failure states relevant to the change. Give a next action that addresses the cause instead of sending every user back to a generic start screen.
- Distinguish no orders found, orders already saved, unknown results, and failed work. Preserve useful saved data and user input during recovery.
- Translate errors into what happened, its consequence, and what to do next. Retain diagnostic codes for support without relying on raw server messages as primary UX.
- Keep uncertainty that affects trust visible near the affected result. Simplifying wording must not hide estimated amounts, missing history, excluded records, or permission limits.

## Review before calling the change done

Walk the touched journey as a first-time user using only information already visible to them. Include a returning user or recovery case when the behavior differs. Ask: “Can I explain this choice, predict this tap, and recover if I chose incorrectly?” Trace each answer to the rendered copy and actual handler/state.

Check the same concept at adjacent entry points so an onboarding fix does not conflict with Home, Settings, or returning-user flows. Confirm a suspected defect is reachable; unused components and old plans are not evidence of current UX.

Use the visual/accessibility reference for hierarchy, readable text, touch targets, and motion. Do not preserve confusing copy merely because it appears in a visual mockup. Keep the approved visual character while correcting comprehension within the authorized scope.

For behavior changes, add appropriate assertions at the existing resolver/controller boundary; do not add tests that only freeze approved strings. Follow the existing verification policy. A source walkthrough can establish action/copy consistency, but cannot establish real user comprehension or native layout quality. State assumptions and hand off only the relevant device or usability checks.
