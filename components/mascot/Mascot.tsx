import { Image, type ImageSourcePropType, StyleSheet, View, type ViewStyle } from 'react-native';
export type MascotPose = 'neutral' | 'wink' | 'cheer' | 'thinking' | 'shocked' | 'sunglasses' | 'wave' | 'flex' | 'celebrate' | 'sleepy' | 'sheepish' | 'sad' | 'pointing' | 'prop-receipt' | 'prop-salad' | 'prop-phone-chart' | 'prop-piggy-bank' | 'prop-coffee' | 'prop-detective' | 'prop-empty-wallet' | 'prop-delivery-haul' | 'prop-midnight-phone' | 'prop-money-flex' | 'prop-bedtime-phone' | 'prop-first-receipt' | 'prop-repeat-menu' | 'prop-solo-drink' | 'prop-celebrating-haul' | 'prop-stopwatch' | 'prop-investment-teacher' | 'trophy';
const assets: Partial<Record<MascotPose, ImageSourcePropType>> = {
  'prop-investment-teacher': require('../../assets/mascot/prop-investment-teacher.png'),
  'prop-stopwatch': require('../../assets/mascot/prop-stopwatch.png'),
  'prop-money-flex': require('../../assets/mascot/prop-money-flex.png'),
  'prop-bedtime-phone': require('../../assets/mascot/prop-bedtime-phone.png'),
  'prop-first-receipt': require('../../assets/mascot/prop-first-receipt.png'),
  'prop-repeat-menu': require('../../assets/mascot/prop-repeat-menu.png'),
  'prop-solo-drink': require('../../assets/mascot/prop-solo-drink.png'),
  'prop-celebrating-haul': require('../../assets/mascot/prop-celebrating-haul.png'),
  neutral: require('../../assets/mascot/bust.png'), wink: require('../../assets/mascot/archer-flex-wink-smile.png'), thinking: require('../../assets/mascot/thinking.png'), shocked: require('../../assets/mascot/very-shocked-hands.png'), sunglasses: require('../../assets/mascot/sunglasses.png'), wave: require('../../assets/mascot/waving.png'), flex: require('../../assets/mascot/flex.png'), celebrate: require('../../assets/mascot/celebrate.png'), sleepy: require('../../assets/mascot/sleepy.png'), sheepish: require('../../assets/mascot/guilty-sheepish.png'), sad: require('../../assets/mascot/sad-apolagetic.png'), 'prop-receipt': require('../../assets/mascot/prop-receipt-disbelief.png'), 'prop-coffee': require('../../assets/mascot/prop-coffee.png'), 'prop-detective': require('../../assets/mascot/prop-detective.png'), 'prop-empty-wallet': require('../../assets/mascot/prop-empty-wallet.png'), 'prop-delivery-haul': require('../../assets/mascot/prop-delivery-haul.png'), 'prop-midnight-phone': require('../../assets/mascot/prop-midnight-phone.png'),
};
const fallbacks: Record<MascotPose, MascotPose> = {
  'prop-investment-teacher': 'thinking',
  'prop-stopwatch': 'thinking',
  'prop-money-flex': 'flex',
  'prop-bedtime-phone': 'prop-midnight-phone',
  'prop-first-receipt': 'prop-receipt',
  'prop-repeat-menu': 'thinking',
  'prop-solo-drink': 'prop-coffee',
  'prop-celebrating-haul': 'prop-delivery-haul',
  neutral: 'neutral', wink: 'wink', cheer: 'celebrate', thinking: 'thinking', shocked: 'shocked', sunglasses: 'sunglasses', wave: 'wave', flex: 'flex', celebrate: 'celebrate', sleepy: 'sleepy', sheepish: 'sheepish', sad: 'sad', pointing: 'prop-receipt', 'prop-receipt': 'prop-receipt', 'prop-salad': 'prop-receipt', 'prop-phone-chart': 'sunglasses', 'prop-piggy-bank': 'sunglasses', 'prop-coffee': 'prop-coffee', 'prop-detective': 'prop-detective', 'prop-empty-wallet': 'prop-empty-wallet', 'prop-delivery-haul': 'prop-delivery-haul', 'prop-midnight-phone': 'prop-midnight-phone', trophy: 'celebrate' };
const warnedFallbacks = new Set<MascotPose>();
const opticalScale: Record<MascotPose, number> = {
  'prop-investment-teacher': 1.08,
  'prop-stopwatch': 1,
  'prop-money-flex': 1,
  'prop-bedtime-phone': 1,
  'prop-first-receipt': 1,
  'prop-repeat-menu': 1,
  'prop-solo-drink': 1,
  'prop-celebrating-haul': 1,
  neutral: 1.28, wink: 1.22, cheer: 1.22, thinking: 1.25, shocked: 1.22, sunglasses: 1.3, wave: 1.22, flex: 1.22, celebrate: 1.22, sleepy: 1.22, sheepish: 1.22, sad: 1.18, pointing: 1.18, 'prop-receipt': 1.18, 'prop-salad': 1.18, 'prop-phone-chart': 1.25, 'prop-piggy-bank': 1.25, 'prop-coffee': 1.22, 'prop-detective': 1.14, 'prop-empty-wallet': 1.12, 'prop-delivery-haul': 1.08, 'prop-midnight-phone': 1.12, trophy: 1.22 };
export function Mascot({ pose, size = 118, accessibilityLabel = 'SnackTrack mascot', style }: { pose: MascotPose; size?: number; accessibilityLabel?: string; style?: ViewStyle; variant?: 'filled' | 'outline'; hideLabel?: boolean }) {
  const resolvedPose = assets[pose] ? pose : fallbacks[pose];
  if (__DEV__ && !assets[pose] && !warnedFallbacks.has(pose)) {
    warnedFallbacks.add(pose);
    console.warn(`[Mascot] Using approved ${resolvedPose} fallback for missing ${pose} artwork.`);
  }
  const source = assets[resolvedPose] ?? assets.neutral!;
  const width = resolvedPose === 'prop-investment-teacher' ? size * 1.5 : size;
  return <View style={[styles.frame, { width, height: size }, style]} accessibilityRole="image" accessibilityLabel={accessibilityLabel}><Image source={source} resizeMode="contain" style={[styles.image, { transform: [{ scale: opticalScale[pose] }] }]} /></View>;
}
const styles = StyleSheet.create({ frame: { alignItems: 'center', justifyContent: 'center' }, image: { width: '100%', height: '100%' } });
