# Reviewing a change at the right scope

Describe the requested behavior in one sentence. Identify the closest input or state that should still behave differently. For a spelling correction, reading the label in context and checking any exact-copy assertion is sufficient.

Trace a behavioral rule to the code that owns the decision. Check the other callers that rely on that rule. Keep presentation choices with the existing formatter or component, and keep data meaning with the code that knows the underlying facts. Look for places where parsing display text, copying a conditional, or defaulting missing data to zero would hide a real distinction.

Make the smallest change that expresses the rule once and preserves those callers. Introduce a shared abstraction only when actual consumers need the same behavior. Stop when the requested behavior and its nearest counterexample are accounted for.

Match verification to the risk. For local copy, inspect the rendered wording or its existing assertion. For a state-dependent display, exercise both states and the formatting boundary. For a rule shared across surfaces, follow a representative fixture through the affected consumers and check the user-visible results. Follow the repository's verification commands and test permissions.
