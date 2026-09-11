export interface SessionNavigationState {
  readonly protectedRoutesAvailable: boolean;
  readonly mountAuthenticatedControllers: boolean;
}

export function resolveSessionNavigationState(input: {
  readonly isLoading: boolean;
  readonly isAuthenticated: boolean;
  readonly hasUser: boolean;
}): SessionNavigationState {
  return {
    // Keep a protected deep link registered until session restoration resolves.
    protectedRoutesAvailable: input.isLoading || input.isAuthenticated,
    mountAuthenticatedControllers: !input.isLoading && input.isAuthenticated && input.hasUser,
  };
}

