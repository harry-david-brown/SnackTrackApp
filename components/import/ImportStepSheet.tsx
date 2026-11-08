import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  findNodeHandle,
  Modal,
  Pressable,
  View,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAppTheme } from "@contexts/AppearanceContext";
import { AppButton } from "@components/ui/AppButton";
import { AppText } from "@components/ui/AppText";

export function ImportStepSheet({
  visible,
  onClose,
  onReady,
  onFile,
  onRequest,
}: {
  visible: boolean;
  onClose: () => void;
  onReady: () => void;
  onFile: () => void;
  onRequest: () => void;
}) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const heading = useRef<View>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion);
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReducedMotion,
    );
    return () => subscription.remove();
  }, []);
  const choose = (action: () => void) => {
    onClose();
    action();
  };
  return (
    <Modal
      visible={visible}
      transparent
      animationType={reducedMotion ? "none" : "slide"}
      onRequestClose={onClose}
      onShow={() => {
        const node = findNodeHandle(heading.current);
        if (node) AccessibilityInfo.setAccessibilityFocus(node);
      }}
    >
      <View
        style={[
          styles.backdrop,
          { backgroundColor: theme.colors.alpha(theme.colors.black, 0.4) },
        ]}
      >
        <Pressable
          style={styles.dismiss}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close step choices"
        />
        <View
          accessibilityViewIsModal
          style={[
            styles.sheet,
            {
              backgroundColor: theme.colors.background,
              paddingBottom: Math.max(insets.bottom, 18),
            },
          ]}
        >
          <ScrollView>
            <View style={styles.heading}>
              <View
                ref={heading}
                accessible
                accessibilityRole="header"
                accessibilityLabel="Where are you now?"
              >
                <AppText variant="surfaceTitle">Where are you now?</AppText>
              </View>
              <AppButton label="Close" variant="tertiary" onPress={onClose} />
            </View>
            <AppText variant="body" tone="muted">
              Your progress stays saved. Choose the help you need.
            </AppText>
            <AppButton
              label="I received the ready email"
              icon="mail-open-outline"
              variant="tertiary"
              onPress={() => choose(onReady)}
            />
            <AppButton
              label="Already saved it? Choose file"
              icon="folder-open-outline"
              variant="tertiary"
              onPress={() => choose(onFile)}
            />
            <AppButton
              label="I haven’t submitted the request"
              icon="open-outline"
              variant="tertiary"
              onPress={() => choose(onRequest)}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end" },
  dismiss: { flex: 1 },
  sheet: {
    padding: 18,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
  },
  heading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
});
