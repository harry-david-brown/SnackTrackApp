import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Mascot } from '@components/mascot/Mascot';
import { AppButton } from '@components/ui/AppButton';
import { Colors, FontFamily, Radius } from '@constants/theme';

interface WrappedRecapIntroProps {
  orderCount: number;
  entryPoint: 'automatic_first_import' | 'summary' | 'notification';
  onVisible: () => void;
  onStart: () => void;
  onClose: () => void;
}

export function WrappedRecapIntro({ orderCount, entryPoint, onVisible, onStart, onClose }: WrappedRecapIntroProps) {
  useEffect(onVisible, [onVisible]);
  const importEntry = entryPoint !== 'summary';
  return (
    <LinearGradient colors={[Colors.lagoonDeep, Colors.lagoonMid, Colors.lagoonBright]} style={styles.gradient}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.storyBars}>{[0, 1, 2, 3, 4].map(index => <View key={index} style={[styles.storyBar, index === 0 && styles.storyBarActive]} />)}</View>
        <View style={styles.content}>
          <Text style={styles.close} accessibilityRole="button" onPress={onClose}>×</Text>
          <View style={styles.heading}>
            <Text style={styles.eyebrow}>{importEntry ? 'YOUR HISTORY IS READY' : 'YOUR RECAP IS READY'}</Text>
            <Text style={styles.title}>{orderCount} {orderCount === 1 ? 'order' : 'orders'}. One honest recap.</Text>
            <Text style={styles.body}>{importEntry ? 'We just finished building your first SnackTrack. Let’s see what your delivery history says.' : 'Your delivery history still has stories to tell. Let’s play the fun version.'}</Text>
          </View>
          <View style={styles.mascot}><Mascot pose="celebrate" size={210} variant="outline" accessibilityLabel="SnackTrack celebrating your completed history" /></View>
          <View style={styles.footer}><Text style={styles.hint}>Tap through your personalized recap</Text><AppButton label="Start my recap" icon="play" onPress={onStart} accentColor={Colors.white} /></View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },
  storyBars: { flexDirection: 'row', gap: 4, paddingHorizontal: 18, paddingTop: 3 },
  storyBar: { flex: 1, height: 3, borderRadius: Radius.pill, backgroundColor: Colors.alpha(Colors.white, 0.25) },
  storyBarActive: { backgroundColor: Colors.white },
  content: { flex: 1, paddingHorizontal: 18, paddingBottom: 22 },
  close: { position: 'absolute', right: 24, top: 10, zIndex: 2, color: Colors.white, fontSize: 34, fontWeight: '300' },
  heading: { alignSelf: 'stretch', alignItems: 'flex-start' },
  eyebrow: { color: Colors.alpha(Colors.white, 0.8), fontFamily: FontFamily.medium, fontSize: 12, letterSpacing: 1.44, marginTop: 22 },
  title: { alignSelf: 'stretch', color: Colors.white, fontFamily: FontFamily.display, fontSize: 34, lineHeight: 36, letterSpacing: -0.7, marginTop: 7, textAlign: 'left' },
  body: { alignSelf: 'stretch', color: Colors.alpha(Colors.white, 0.84), fontFamily: FontFamily.regular, fontSize: 15, lineHeight: 22, marginTop: 8, textAlign: 'left' },
  mascot: { alignItems: 'center', marginTop: 18 },
  footer: { marginTop: 'auto' },
  hint: { color: Colors.alpha(Colors.white, 0.74), textAlign: 'center', fontFamily: FontFamily.regular, fontSize: 12, marginBottom: 11 },
});

export default WrappedRecapIntro;
