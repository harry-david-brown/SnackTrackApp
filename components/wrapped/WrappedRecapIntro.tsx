import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MascotPlaceholder } from '@components/mascot/MascotPlaceholder';
import { AppButton } from '@components/ui/AppButton';
import { Colors, Radius } from '@constants/theme';

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
        <View style={styles.storyBars}>{[0, 1, 2, 3].map(index => <View key={index} style={[styles.storyBar, index === 0 && styles.storyBarActive]} />)}</View>
        <View style={styles.content}>
          <Text style={styles.close} accessibilityRole="button" onPress={onClose}>×</Text>
          <Text style={styles.eyebrow}>{importEntry ? 'YOUR HISTORY IS READY' : 'YOUR RECAP IS READY'}</Text>
          <Text style={styles.title}>{orderCount} {orderCount === 1 ? 'order' : 'orders'}. One honest recap.</Text>
          <Text style={styles.body}>{importEntry ? 'We just finished building your first SnackTrack. Let’s see what your delivery history says.' : 'Your delivery history still has stories to tell. Let’s play the fun version.'}</Text>
          <View style={styles.mascot}><MascotPlaceholder pose="celebrate" size={190} variant="outline" /></View>
          <Text style={styles.hint}>Tap through your personalized recap</Text>
          <AppButton label="Start my recap" icon="play" onPress={onStart} />
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: { flex: 1 },
  storyBars: { flexDirection: 'row', gap: 5, paddingHorizontal: 14, paddingTop: 8 },
  storyBar: { flex: 1, height: 3, borderRadius: Radius.pill, backgroundColor: Colors.alpha(Colors.white, 0.25) },
  storyBarActive: { backgroundColor: Colors.white },
  content: { flex: 1, paddingHorizontal: 28, paddingBottom: 24, justifyContent: 'center' },
  close: { position: 'absolute', right: 24, top: 10, zIndex: 2, color: Colors.white, fontSize: 34, fontWeight: '300' },
  eyebrow: { color: Colors.leaf300, fontSize: 12, fontWeight: '700', letterSpacing: 1.5, textAlign: 'center' },
  title: { color: Colors.white, fontFamily: 'Fredoka_600SemiBold', fontSize: 39, lineHeight: 44, letterSpacing: -0.7, textAlign: 'center', marginTop: 12 },
  body: { color: Colors.alpha(Colors.white, 0.84), fontSize: 16, lineHeight: 24, textAlign: 'center', marginTop: 14 },
  mascot: { alignItems: 'center', marginVertical: 16 },
  hint: { color: Colors.alpha(Colors.white, 0.76), textAlign: 'center', fontSize: 13, marginBottom: 14 },
});

export default WrappedRecapIntro;
