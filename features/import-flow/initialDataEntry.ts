import type { SetupGuidance } from "./contracts";

export type InitialDataEntry =
  | { id: "loading" }
  | { id: "retry" }
  | { id: "guided_setup" }
  | { id: "home" };

export function resolveInitialDataEntry({
  isAuthenticated,
  hasUser,
  totalReceipts,
  guidance,
  isLoading,
  hasError,
  now = new Date(),
}: {
  isAuthenticated: boolean;
  hasUser: boolean;
  totalReceipts: number | null;
  guidance: SetupGuidance | null;
  isLoading: boolean;
  hasError: boolean;
  now?: Date;
}): InitialDataEntry {
  if (!isAuthenticated || !hasUser) return { id: "home" };
  if (hasError) return { id: "retry" };
  if (isLoading || totalReceipts === null || !guidance) return { id: "loading" };
  if (totalReceipts > 0) return { id: "home" };

  const deferredUntil = guidance.initialSetupDeferredUntil
    ? new Date(guidance.initialSetupDeferredUntil)
    : null;
  const hasActiveDeferral = deferredUntil
    && !Number.isNaN(deferredUntil.getTime())
    && now.getTime() < deferredUntil.getTime();
  return hasActiveDeferral ? { id: "home" } : { id: "guided_setup" };
}
