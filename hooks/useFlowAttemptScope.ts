import { useLayoutEffect, useMemo } from 'react';
import { FlowAttemptScope } from '@features/import-flow/flowAttemptScope';

/** Commit-scoped identity: abandoned renders never invalidate live work. */
export function useFlowAttemptScope(owner: string): FlowAttemptScope {
  const binding = useMemo(
    () => ({ owner, scope: new FlowAttemptScope() }),
    [owner],
  );
  useLayoutEffect(() => {
    binding.scope.activate();
    return () => binding.scope.invalidate();
  }, [binding]);
  return binding.scope;
}
