import { useState } from 'react';
import { View } from 'react-native';
import { AppButton } from '@components/ui/AppButton';
import { AppText } from '@components/ui/AppText';
import { AnimatedDisclosure } from '@components/ui/AnimatedDisclosure';
export const RECEIPT_INBOX_TITLE = 'Where do your delivery receipts arrive?';
export const RECEIPT_INBOX_BODY = 'Choose the inbox that receives your Uber Eats or DoorDash order emails. It doesn’t have to be your SnackTrack sign-in email.';
export function ReceiptInboxGuidance({ showInboxNote = true }: { showInboxNote?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  return <View>
    {showInboxNote ? <AppText variant="metadata" tone="muted">Different inboxes? Start with one and add another later.</AppText> : null}
    <AppButton label={expanded ? 'Hide help' : 'Not sure which email to use?'} variant="tertiary" accessibilityState={{ expanded }} onPress={() => setExpanded(value => !value)} />
    <AnimatedDisclosure expanded={expanded}><AppText variant="surfaceBody" tone="muted">Check the email in your delivery-app account and look for order receipts. If your receipts go to different inboxes, start with one and add another later. If you use another email service or can’t find receipts, tap “Use another method” to see another way to add your orders.</AppText></AnimatedDisclosure>
  </View>;
}
