import { useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Motion } from '@constants/motion';
import { useAppReducedMotion } from '@contexts/MotionContext';

/** Keep content measured so both opening and closing follow its actual height. */
export function AnimatedDisclosure({ expanded, children }: PropsWithChildren<{ expanded: boolean }>) {
  const reduceMotion = useAppReducedMotion();
  const [contentHeight, setContentHeight] = useState(0);
  const height = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const toValue = expanded ? contentHeight : 0;
    if (reduceMotion) {
      height.setValue(toValue);
      return;
    }
    const animation = Animated.timing(height, { toValue, duration: Motion.content, easing: Motion.easing, useNativeDriver: false });
    animation.start();
    return () => animation.stop();
  }, [contentHeight, expanded, height, reduceMotion]);

  return <Animated.View
    style={{ height, overflow: 'hidden' }}
    pointerEvents={expanded ? 'auto' : 'none'}
    accessibilityElementsHidden={!expanded}
    importantForAccessibility={expanded ? 'auto' : 'no-hide-descendants'}
  >
    <View style={styles.content} onLayout={event => setContentHeight(event.nativeEvent.layout.height)}>{children}</View>
  </Animated.View>;
}

const styles = StyleSheet.create({ content: { position: 'absolute', top: 0, left: 0, right: 0 } });
