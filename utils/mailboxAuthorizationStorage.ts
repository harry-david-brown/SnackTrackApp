import * as SecureStore from 'expo-secure-store';

export type MailboxAuthorizationProvider = 'gmail' | 'outlook';
export const mailboxAuthorizationKey = (provider: MailboxAuthorizationProvider) => `mailbox_authorization_${provider}`;

export const clearMailboxAuthorization = async (): Promise<void> => {
  await Promise.all(['gmail', 'outlook'].map((provider) =>
    SecureStore.deleteItemAsync(mailboxAuthorizationKey(provider as MailboxAuthorizationProvider))));
};
