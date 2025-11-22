import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle } from 'react-native';

interface SlideInViewProps {
  children: React.ReactNode;
  direction?: 'left' | 'right' | 'up' | 'down';
  duration?: number;
  delay?: number;
  distance?: number;
  style?: ViewStyle;
}

export function SlideInView({ 
  children, 
  direction = 'up', 
  duration = 500, 
  delay = 0,
  distance = 50,
  style 
}: SlideInViewProps) {
  const slideAnim = useRef(new Animated.Value(distance)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getTransform = () => {
    switch (direction) {
      case 'left':
        return [{ translateX: slideAnim.interpolate({ inputRange: [-distance, distance], outputRange: [-distance, distance] }) }];
      case 'right':
        return [{ translateX: slideAnim }];
      case 'up':
        return [{ translateY: slideAnim }];
      case 'down':
        return [{ translateY: slideAnim.interpolate({ inputRange: [-distance, distance], outputRange: [-distance, distance] }) }];
    }
  };

  return (
    <Animated.View 
      style={[
        style, 
        { 
          opacity: fadeAnim,
          transform: getTransform(),
        }
      ]}
    >
      {children}
    </Animated.View>
  );
}

