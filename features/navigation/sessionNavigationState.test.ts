import { resolveSessionNavigationState } from './sessionNavigationState';

describe('session navigation state', () => {
  it('keeps protected routes registered while session restoration is pending', () => {
    expect(resolveSessionNavigationState({ isLoading: true, isAuthenticated: false, hasUser: false }))
      .toEqual({ protectedRoutesAvailable: true, mountAuthenticatedControllers: false });
  });

  it('mounts session controllers only for a resolved authenticated user', () => {
    expect(resolveSessionNavigationState({ isLoading: false, isAuthenticated: true, hasUser: true }))
      .toEqual({ protectedRoutesAvailable: true, mountAuthenticatedControllers: true });
  });

  it('removes protected routes and controllers after logout', () => {
    expect(resolveSessionNavigationState({ isLoading: false, isAuthenticated: false, hasUser: false }))
      .toEqual({ protectedRoutesAvailable: false, mountAuthenticatedControllers: false });
  });
});
