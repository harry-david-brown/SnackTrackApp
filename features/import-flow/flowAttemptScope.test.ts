import { FlowAttemptScope } from './flowAttemptScope';

test('admits one command synchronously and ignores a late release', () => {
  const scope = new FlowAttemptScope();
  const first = scope.begin()!;
  expect(scope.begin()).toBeNull();
  scope.finish(first);
  const second = scope.begin()!;
  scope.finish(first);
  expect(scope.owns(second)).toBe(true);
});
test('cleanup invalidates work even when the same owner is reactivated', () => {
  const scope = new FlowAttemptScope();
  const first = scope.begin()!;
  scope.invalidate();
  expect(scope.begin()).toBeNull();
  scope.activate();
  const second = scope.begin()!;
  expect(scope.owns(first)).toBe(false);
  expect(scope.owns(second)).toBe(true);
});
