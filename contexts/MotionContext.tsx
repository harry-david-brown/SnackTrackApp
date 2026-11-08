import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { AccessibilityInfo, AppState } from 'react-native';

// Stay still until the system preference is known (also safe outside the app provider).
const MotionContext = createContext(true);

export function MotionProvider({ children }: PropsWithChildren) {
  const [reduceMotion, setReduceMotion] = useState(true);
  const [active, setActive] = useState(AppState.currentState === 'active');

  useEffect(() => {
    let mounted = true;
    let preferenceChanged = false;
    const motionSubscription = AccessibilityInfo.addEventListener('reduceMotionChanged', value => {
      preferenceChanged = true;
      setReduceMotion(value);
    });
    void AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (mounted && !preferenceChanged) setReduceMotion(value);
    }).catch(() => { /* Keep the safe, motion-free default when unavailable. */ });
    const appSubscription = AppState.addEventListener('change', state => setActive(state === 'active'));
    return () => {
      mounted = false;
      motionSubscription.remove();
      appSubscription.remove();
    };
  }, []);

  return <MotionContext.Provider value={reduceMotion || !active}>{children}</MotionContext.Provider>;
}

export function useAppReducedMotion() {
  return useContext(MotionContext);
}
