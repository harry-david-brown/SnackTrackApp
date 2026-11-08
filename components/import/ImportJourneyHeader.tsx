import { View, StyleSheet } from "react-native";
import { AppButton } from "@components/ui/AppButton";
import { AppText } from "@components/ui/AppText";
import { useAppTheme } from "@contexts/AppearanceContext";

export function ImportJourneyHeader({
  provider,
  stage,
  mailbox = false,
  waiting = false,
  backLabel = "Add orders",
  onBack,
  onOverview,
  onSteps,
  disabled = false,
  compact = false,
}: {
  provider?: string;
  stage?: number;
  mailbox?: boolean;
  waiting?: boolean;
  backLabel?: string;
  onBack: () => void;
  onOverview?: () => void;
  onSteps?: () => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  const theme = useAppTheme();
  const labels = mailbox
    ? ["Connect", "Import", "Results"]
    : ["Request", "Download", "Upload"];
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <AppButton
          label={compact ? "Back" : backLabel}
          icon="arrow-back"
          variant="tertiary"
          disabled={disabled}
          onPress={onBack}
        />
        {compact && provider ? (
          <AppText variant="rowTitle" style={styles.provider}>{provider}</AppText>
        ) : null}
        {compact && onSteps ? (
          <AppButton label="All steps" variant="tertiary" disabled={disabled} onPress={onSteps} />
        ) : !compact && onOverview ? (
          <AppButton
            label="Add orders"
            variant="tertiary"
            disabled={disabled}
            onPress={onOverview}
          />
        ) : null}
      </View>
      {provider && !compact ? (
        <View style={styles.row}>
          <AppText variant="rowTitle">
            {provider}
            {waiting ? " · Waiting for email" : ""}
          </AppText>
          {onSteps ? (
            <AppButton
              label="All steps"
              variant="tertiary"
              disabled={disabled}
              onPress={onSteps}
            />
          ) : null}
        </View>
      ) : null}
      {stage !== undefined ? (
        <View style={styles.row}>
          {labels.map((label, index) => (
            <View
              key={label}
              style={styles.segment}
              accessibilityLabel={`${label}${stage === index ? " · Current stage" : index < stage ? " · Completed" : ""}`}
            >
              <View
                style={[
                  styles.track,
                  {
                    backgroundColor:
                      index <= stage
                        ? theme.colors.primary
                        : theme.colors.divider,
                  },
                ]}
              />
              <AppText
                variant="metadata"
                tone={index <= stage ? "brand" : "muted"}
              >
                {waiting && index === 0
                  ? "Requested"
                  : index < stage ? `✓ ${label}` : `${index + 1}. ${label}`}
              </AppText>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
const styles = StyleSheet.create({
  container: { gap: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  segment: { flex: 1, gap: 7 },
  provider: { flex: 1, textAlign: "center" },
  track: { height: 4, borderRadius: 4 },
});
