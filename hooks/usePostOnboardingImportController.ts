import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler } from 'react-native';
import { usePreventRemove } from '@react-navigation/native';
import { isActiveImportOperation, type ExportProvider, type MailboxProvider } from '@features/import-flow/contracts';
import type { ImportRouteParams } from '@features/import-flow/importRouteParams';
import { rememberImportSelection, resolvePostOnboardingImportJourney, type GuidedImportSelection, type GuidedImportStep } from '@features/import-flow/postOnboardingImportJourney';
import { hasMailboxBaseline } from '@features/import-flow/emailImportPresentation';
import { importReturnDestination, parseImportReturnTo } from '@features/import-flow/importNavigation';
import type { PostOnboardingImportRoute } from '@features/import-flow/postOnboardingImportRoute';
import { getPendingExportRequest, clearPendingExportRequest, type PendingExportRequest } from '@utils/exportDownloadHandoff';
import { showSimpleAlert } from '@utils/platformAlert';
import { useImportFlowController } from '@hooks/useImportFlowController';
import { useImportFileSession } from '@hooks/useImportFileSession';
import { useImportOperation } from '@hooks/useImportOperation';
import { appDestinations, useAppNavigation, useExternalNavigationBlocker } from '@features/navigation';

const platform = (p: ExportProvider) => p === 'uber_eats' ? 'uber' as const : 'doordash' as const;
export function usePostOnboardingImportController(route: PostOnboardingImportRoute) {
  const navigation = useAppNavigation();
  const [resumedReturnTo, setResumedReturnTo] = useState<ReturnType<typeof parseImportReturnTo> | null>(null);
  const returnTo = resumedReturnTo ?? parseImportReturnTo(route.returnTo);
  const initial = useCallback((): GuidedImportSelection => ({ intent: route.intent === 'reconnect' && route.connectionSucceeded ? 'email' : route.intent, provider: route.provider, mailbox: route.mailbox ?? null, step: route.downloadedVersion ? 'ready' : route.confirmRequest ? 'confirm_request' : null }), [route.intent, route.connectionSucceeded, route.provider, route.mailbox, route.downloadedVersion, route.confirmRequest]);
  const [selection, setSelection] = useState(initial);
  const history = useRef<GuidedImportSelection[]>([]);
  const handledDirectPicker = useRef<string | null>(null);
  const [pendingRequests, setPendingRequests] = useState<Partial<Record<ExportProvider, PendingExportRequest>>>({});
  const legacyRoute = useMemo<ImportRouteParams>(() => ({ returnTo, journeyContext: route.journeyContext, sourcePicker: false, showExportTutorial: false, focus: null, downloadedVersion: null, action: null, intentId: null, provider: selection.provider, gmailPurpose: route.gmailPurpose ?? null }), [returnTo, route.gmailPurpose, route.journeyContext, selection.provider]);
  const base = useImportFlowController(legacyRoute, 'manage');
  const openProviderTutorial = base.openProviderTutorial;
  const selectedOperation = useImportOperation(Boolean(route.operationId), false, route.operationId ?? undefined);
  const importBlocked = isActiveImportOperation(base.activeImportOperation);
  const fileSession = useImportFileSession(selection.provider ?? 'uber_eats', route.journeyContext ?? 'post_onboarding', importBlocked && base.activeImportOperation?.status !== 'awaiting_upload', base.activeImportOperation, base.activeImportUnavailable);
  const navigationBlocked = fileSession.isPending || base.requestSaving;
  useExternalNavigationBlocker('post-onboarding-import-submit', navigationBlocked);
  usePreventRemove(navigationBlocked, () => showSimpleAlert('Please keep this page open', fileSession.isPending ? 'Your file is being uploaded and submitted. You can leave once processing is accepted.' : 'Your request is being saved.'));
  const userId = base.user?.id;
  const providerStatuses = base.importPreferences?.export.providers;
  useEffect(() => {
    if (!userId || !providerStatuses) return;
    let live = true;
    void Promise.all((['uber_eats', 'doordash'] as const).map(async provider => [provider, await getPendingExportRequest(userId, provider, (provider === 'uber_eats' ? providerStatuses.uberEats : providerStatuses.doorDash).updatedAt)] as const)).then(entries => {
      if (live) setPendingRequests(Object.fromEntries(entries.filter(([, value]) => value !== null)));
    });
    return () => { live = false; };
  }, [providerStatuses, userId]);
  useEffect(() => { history.current = []; setSelection(initial()); }, [initial]);
  const navigate = useCallback((patch: Partial<GuidedImportSelection>) => {
    if (navigationBlocked) return;
    history.current = rememberImportSelection(history.current, selection);
    setSelection({ ...selection, ...patch });
  }, [navigationBlocked, selection]);
  const close = useCallback(() => { if (!navigationBlocked) navigation.replace(importReturnDestination(returnTo)); }, [navigation, navigationBlocked, returnTo]);
  const goBack = useCallback(() => {
    if (navigationBlocked) return;
    if (fileSession.operation) { close(); return; }
    const previous = history.current.pop();
    if (previous) setSelection(previous); else close();
  }, [close, fileSession.operation, navigationBlocked]);
  useEffect(() => {
    if (base.showTutorial) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { goBack(); return true; });
    return () => subscription.remove();
  }, [base.showTutorial, goBack]);
  const handledDownloadGuide = useRef<ExportProvider | null>(null);
  useEffect(() => {
    if (!route.showDownloadSteps || !route.provider || route.downloadedVersion) { handledDownloadGuide.current = null; return; }
    if (handledDownloadGuide.current === route.provider) return;
    handledDownloadGuide.current = route.provider;
    openProviderTutorial(platform(route.provider), 'download');
  }, [route.showDownloadSteps, route.provider, route.downloadedVersion, openProviderTutorial]);
  const operation = route.operationId ? selectedOperation.operation : base.activeImportOperation;
  const state = resolvePostOnboardingImportJourney({ preferences: base.importPreferences, preferencesLoading: base.importPreferencesLoading, preferencesUnavailable: Boolean(base.importPreferencesError), operation, operationRequested: Boolean(route.operationId), operationLoading: selectedOperation.isLoading, operationUnavailable: selectedOperation.isUnavailable, intent: selection.intent, selectedProvider: selection.provider, selectedMailbox: selection.mailbox, step: selection.step, downloadState: selection.step === 'upload' ? 'downloaded' : 'not_downloaded', gmailPurpose: route.gmailPurpose });
  const chooseProvider = (provider: ExportProvider) => navigate({ provider, intent: 'provider', mailbox: null, step: selection.step === 'request' ? 'request' : null });
  const selectedFile = fileSession.file;
  const chooseFile = fileSession.choose;
  const submitFile = fileSession.submit;
  const canSubmitSelectedFile = !fileSession.offline && !fileSession.importBlocked && !fileSession.statusUnavailable;
  const reportDownloaded = base.reportDownloaded;
  const chooseDownloadedFile = useCallback(async (provider = selection.provider) => {
    if (!provider) return false;
    const selected = selectedFile ?? await chooseFile();
    if (!selected) return false;
    navigate({ provider, intent: 'provider', step: 'upload' });
    void reportDownloaded(provider, false);
    if (canSubmitSelectedFile) await submitFile(selected);
    return true;
  }, [canSubmitSelectedFile, chooseFile, navigate, reportDownloaded, selectedFile, selection.provider, submitFile]);
  useEffect(() => {
    if (!route.downloadedVersion || !route.provider) return;
    const handoff = `${route.provider}:${route.downloadedVersion}`;
    if (handledDirectPicker.current === handoff) return;
    handledDirectPicker.current = handoff;
    void chooseDownloadedFile(route.provider);
  }, [chooseDownloadedFile, route.downloadedVersion, route.provider]);
  const chooseMailbox = (mailbox: MailboxProvider) => navigate({ intent: selection.intent === 'reconnect' ? 'reconnect' : 'email', mailbox, step: 'email_choice' });
  const startEmail = async () => {
    if (base.connectionBusy || !selection.mailbox || !base.importPreferences) return;
    const connection = selection.mailbox === 'gmail' ? base.importPreferences.gmailConnection : base.importPreferences.outlookConnection;
    if (connection.connectionHealth === 'unavailable') { void base.refreshImportPreferences(); return; }
    if (selection.intent === 'reconnect' || !connection.connected || connection.connectionHealth === 'reconnect_required') {
      const connect = route.gmailPurpose === 'ongoing_tracking'
        ? selection.mailbox === 'gmail' ? base.connectEmailForOngoingTracking : base.connectOutlookForOngoingTracking
        : selection.mailbox === 'gmail' ? (selection.intent === 'reconnect' ? base.reconnectEmail : base.connectEmail) : (selection.intent === 'reconnect' ? base.reconnectOutlook : base.connectOutlook);
      const connected = await connect();
      if (connected) setSelection(current => ({ ...current, intent: 'email' }));
      return;
    }
    if (route.gmailPurpose === 'ongoing_tracking') { base.setupOngoingUpdates(); return; }
    if (hasMailboxBaseline(base.importPreferences, selection.mailbox)) { navigation.replace({ pathname: '/settings/accounts-permissions', params: { mailbox: selection.mailbox, returnTo } }); return; }
    if (!connection.canImport || importBlocked || base.activeImportUnavailable) return;
    if (selection.mailbox === 'gmail') base.importEmail('initial', base.emailUpdates.automaticUpdates);
    else base.importOutlook('initial', base.emailUpdates.automaticUpdates);
  };
  const openProviderGuide = (provider = selection.provider, download = false) => { if (provider && !navigationBlocked) base.openProviderTutorial(platform(provider), download ? 'download' : 'request'); };
  const openRequestPage = async () => {
    if (!selection.provider) return;
    try { await base.openProviderRequestPage(platform(selection.provider)); navigate({ step: 'confirm_request' }); }
    catch { showSimpleAlert('Couldn’t open the request page', 'Try again, or use the step-by-step guide.'); }
  };
  const confirmProviderReady = (provider = selection.provider) => { if (provider) { base.tutorialReadyConfirmed(platform(provider)); navigate({ provider, intent: 'resume_export', step: 'ready' }); } };
  const completeTutorial = async (p: 'uber' | 'doordash') => {
    const saved = await base.completeTutorial(p);
    if (saved) {
      const provider = p === 'uber' ? 'uber_eats' : 'doordash';
      setPendingRequests(current => { const next = { ...current }; delete next[provider]; return next; });
      setSelection(current => ({ ...current, provider, intent: 'resume_export', step: null }));
    }
    return saved;
  };
  return { ...base, state, selection, selectedProvider: selection.provider, importBlocked, fileSession, navigationBlocked, returnTo, pendingRequests,
    requestNotSubmitted: (p: 'uber' | 'doordash') => {
      base.requestNotSubmitted(p);
      const provider = p === 'uber' ? 'uber_eats' : 'doordash';
      setPendingRequests(current => { const next = { ...current }; delete next[provider]; return next; });
    },
    goBack, close, chooseProvider, chooseMailbox, startEmail, chooseDownloadedFile, openProviderGuide, openRequestPage, confirmProviderReady, completeTutorial,
    chooseEmail: () => navigate({ intent: selection.intent === 'reconnect' ? 'reconnect' : 'email', mailbox: null, step: 'email_choice' }),
    setStep: (step: GuidedImportStep) => navigate({ step }),
    showProviderChoice: () => navigate({ intent: 'choose', provider: null, mailbox: null, step: null }),
    resumeProviderJourney: (provider: ExportProvider) => {
      if (pendingRequests[provider]) setResumedReturnTo(pendingRequests[provider]!.returnTo);
      navigate({ intent: 'resume_export', provider, step: pendingRequests[provider] ? 'confirm_request' : null });
    },
    requestHistory: () => navigate({ intent: 'provider', step: 'request' }),
    abandonPendingRequest: () => {
      if (userId && selection.provider) {
        const provider = selection.provider;
        void clearPendingExportRequest(userId, provider).catch(() => undefined);
        setPendingRequests(current => { const next = { ...current }; delete next[provider]; return next; });
      }
      openProviderGuide();
    },
    finishDownloadGuide: async (p: 'uber' | 'doordash') => { base.closeTutorial(); return chooseDownloadedFile(p === 'uber' ? 'uber_eats' : 'doordash'); },
    refreshStatus: () => { void base.refreshImportPreferences(); void base.refreshActiveImport(); if (route.operationId) void selectedOperation.refresh(); },
    viewOperation: () => { if (operation) navigation.open({ pathname: isActiveImportOperation(operation) ? '/import-progress' : '/import-result', params: { operationId: operation.id, returnTo } }); },
    goHome: () => { if (!navigationBlocked) navigation.replace(appDestinations.home); },
  };
}
