import { Image, type ImageSourcePropType, StyleSheet, View, type ViewStyle } from 'react-native';
export type MascotPose = 'neutral' | 'wink' | 'cheer' | 'thinking' | 'shocked' | 'sunglasses' | 'wave' | 'flex' | 'celebrate' | 'sleepy' | 'sheepish' | 'sad' | 'pointing' | 'prop-receipt' | 'prop-salad' | 'prop-phone-chart' | 'prop-piggy-bank' | 'prop-coffee' | 'trophy';
const assets: Partial<Record<MascotPose, ImageSourcePropType>> = {
  neutral: require('../../assets/mascot/bust.png'), wink: require('../../assets/mascot/archer-flex-wink-smile.png'), thinking: require('../../assets/mascot/thinking.png'), shocked: require('../../assets/mascot/very-shocked-hands.png'), sunglasses: require('../../assets/mascot/sunglasses.png'), wave: require('../../assets/mascot/waving.png'), flex: require('../../assets/mascot/flex.png'), celebrate: require('../../assets/mascot/celebrate.png'), sleepy: require('../../assets/mascot/sleepy.png'), sheepish: require('../../assets/mascot/guilty-sheepish.png'), sad: require('../../assets/mascot/sad-apolagetic.png'), 'prop-receipt': require('../../assets/mascot/prop-receipt-disbelief.png'), 'prop-coffee': require('../../assets/mascot/prop-coffee.png'),
};
const fallbacks: Record<MascotPose, MascotPose> = { neutral: 'neutral', wink: 'wink', cheer: 'celebrate', thinking: 'thinking', shocked: 'shocked', sunglasses: 'sunglasses', wave: 'wave', flex: 'flex', celebrate: 'celebrate', sleepy: 'sleepy', sheepish: 'sheepish', sad: 'sad', pointing: 'prop-receipt', 'prop-receipt': 'prop-receipt', 'prop-salad': 'prop-receipt', 'prop-phone-chart': 'sunglasses', 'prop-piggy-bank': 'sunglasses', 'prop-coffee': 'prop-coffee', trophy: 'celebrate' };
const warnedFallbacks = new Set<MascotPose>();
const opticalScale: Record<MascotPose, number> = { neutral: 1.28, wink: 1.22, cheer: 1.22, thinking: 1.25, shocked: 1.22, sunglasses: 1.3, wave: 1.22, flex: 1.22, celebrate: 1.22, sleepy: 1.22, sheepish: 1.22, sad: 1.18, pointing: 1.18, 'prop-receipt': 1.18, 'prop-salad': 1.18, 'prop-phone-chart': 1.25, 'prop-piggy-bank': 1.25, 'prop-coffee': 1.22, trophy: 1.22 };
export function Mascot({ pose, size = 118, accessibilityLabel = 'SnackTrack mascot', style }: { pose: MascotPose; size?: number; accessibilityLabel?: string; style?: ViewStyle; variant?: 'filled' | 'outline'; hideLabel?: boolean }) {
  const resolvedPose = assets[pose] ? pose : fallbacks[pose];
  if (__DEV__ && !assets[pose] && !warnedFallbacks.has(pose)) {
    warnedFallbacks.add(pose);
    console.warn(`[Mascot] Using approved ${resolvedPose} fallback for missing ${pose} artwork.`);
  }
  const source = assets[resolvedPose] ?? assets.neutral!;
  return <View style={[styles.frame, { width: size, height: size }, style]} accessibilityRole="image" accessibilityLabel={accessibilityLabel}><Image source={source} resizeMode="contain" style={[styles.image, { transform: [{ scale: opticalScale[pose] }] }]} /></View>;
}
const styles = StyleSheet.create({ frame: { alignItems: 'center', justifyContent: 'center' }, image: { width: '100%', height: '100%' } });
