import { useFlowAttemptScope } from './useFlowAttemptScope';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { alertEnrollmentKey } from '@utils/importJourneyStorage';
import { useProviderReadyAlerts } from '@hooks/useProviderReadyAlerts';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { BackHandler } from 'react-native';
import { usePreventRemove } from '@react-navigation/native';
import { isActiveImportOperation, type ExportProvider, type MailboxProvider } from '@features/import-flow/contracts';
import { resolvePostOnboardingImportJourney, type GuidedImportSelection, type GuidedImportStep } from '@features/import-flow/postOnboardingImportJourney';
import { importReturnDestination, parseImportReturnTo } from '@features/import-flow/importNavigation';
import type { PostOnboardingImportRoute } from '@features/import-flow/postOnboardingImportRoute';
import { getPendingExportRequest, clearPendingExportRequest, type PendingExportRequest } from '@utils/exportDownloadHandoff';
import { showSimpleAlert } from '@utils/platformAlert';
import { useReturningImportActions } from './useReturningImportActions';
import { importSelectionReducer } from '@features/import-flow/importSelectionState';
import { useImportFileSession } from '@hooks/useImportFileSession';
import { useImportOperation } from '@hooks/useImportOperation';
import { appDestinations, useAppNavigation, useExternalNavigationBlocker } from '@features/navigation';

const platform = (p: ExportProvider) => p === 'uber_eats' ? 'uber' as const : 'doordash' as const;
export function usePostOnboardingImportController(route: PostOnboardingImportRoute) {
  const navigation = useAppNavigation();
  const [resumedReturnTo, setResumedReturnTo] = useState<ReturnType<typeof parseImportReturnTo> | null>(null);
  const returnTo = resumedReturnTo ?? parseImportReturnTo(route.returnTo);
  const initial = useCallback((): GuidedImportSelection => ({ intent: route.intent === 'reconnect' && route.connectionSucceeded ? 'email' : route.intent, provider: route.provider, mailbox: route.mailbox ?? null, step: route.downloadedVersion ? 'ready' : route.confirmRequest ? 'confirm_request' : null }), [route.intent, route.connectionSucceeded, route.provider, route.mailbox, route.downloadedVersion, route.confirmRequest]);
  const [journey, dispatchSelection] = useReducer(importSelectionReducer, undefined, () => ({ selection: initial(), history: [] }));
  const selection = journey.selection;
  const setSelection = useCallback((value: GuidedImportSelection | ((current: GuidedImportSelection) => GuidedImportSelection)) => {
    dispatchSelection({ type: 'replace', value });
  }, []);
  const [stepSheetVisible,setStepSheetVisible]=useState(false);
  const [preparingFile, setPreparingFile] = useState(false);
  const handledDirectPicker = useRef<string | null>(null);
  const [pendingRequests, setPendingRequests] = useState<Partial<Record<ExportProvider, PendingExportRequest>>>({});
  const base = useReturningImportActions(selection.provider, returnTo, route.journeyContext);
  const openProviderTutorial = base.openProviderTutorial;
  const selectedOperation = useImportOperation(Boolean(route.operationId), false, route.operationId ?? undefined);
  const importBlocked = isActiveImportOperation(base.activeImportOperation);
  const fileSession = useImportFileSession(selection.provider ?? 'uber_eats', route.journeyContext ?? 'post_onboarding', importBlocked && base.activeImportOperation?.status !== 'awaiting_upload', base.activeImportOperation, base.activeImportUnavailable);
  const navigationBlocked = preparingFile || fileSession.choosing || fileSession.isPending || base.requestSaving;
  useExternalNavigationBlocker('post-onboarding-import-submit', navigationBlocked);
  usePreventRemove(navigationBlocked, () => showSimpleAlert('Please keep this page open', preparingFile || fileSession.choosing ? 'Your file is being prepared for import.' : fileSession.isPending ? 'Your file is being uploaded and submitted. You can leave once processing is accepted.' : 'Your request is being saved.'));
  const userId = base.user?.id;
  const preparationScope = useFlowAttemptScope(JSON.stringify([userId, selection.provider]));
  useEffect(() => { setPreparingFile(false); }, [preparationScope]);
  const providerStatuses = base.importPreferences?.export.providers;
  useEffect(() => {
    if (!userId || !providerStatuses) return;
    let live = true;
    void Promise.all((['uber_eats', 'doordash'] as const).map(async provider => [provider, await getPendingExportRequest(userId, provider, (provider === 'uber_eats' ? providerStatuses.uberEats : providerStatuses.doorDash).updatedAt)] as const)).then(entries => {
      if (live) setPendingRequests(Object.fromEntries(entries.filter(([, value]) => value !== null)));
    });
    return () => { live = false; };
  }, [providerStatuses, userId]);
  useEffect(() => { dispatchSelection({ type: 'reset', selection: initial() }); setPendingRequests({}); setStepSheetVisible(false); handledDirectPicker.current=null; }, [initial,userId]);
  const navigate = useCallback((patch: Partial<GuidedImportSelection>) => {
    if (navigationBlocked) return;
    dispatchSelection({ type: 'navigate', patch });
  }, [navigationBlocked]);
  const close = useCallback(() => { if (!navigationBlocked) navigation.replace(importReturnDestination(returnTo)); }, [navigation, navigationBlocked, returnTo]);
  const goBack = useCallback(() => {
    if (stepSheetVisible) { setStepSheetVisible(false); return; }
    if (navigationBlocked) return;
    if (fileSession.operation) { close(); return; }
    if (journey.history.length || selection.provider || selection.intent !== 'choose') dispatchSelection({ type: 'back' });
    else close();
  }, [close, fileSession.operation, navigationBlocked, stepSheetVisible, selection.provider, selection.intent, journey.history.length]);
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
  const chooseFile = fileSession.choose;
  const submitFile = fileSession.submit;
  const reportDownloaded = base.reportDownloaded;
  const closeTutorial = base.closeTutorial;
  const chooseDownloadedFile = useCallback(async (provider = selection.provider) => {
    if (!provider || navigationBlocked) return false;
    const attempt = preparationScope.begin();
    if (attempt === null) return false;
    setPreparingFile(true);
    try {
      const selected = await chooseFile();
      if (!selected || !preparationScope.owns(attempt)) return false;
      navigate({ provider, intent: 'provider', step: 'upload' });
      closeTutorial();
      void Promise.resolve(reportDownloaded(provider, false)).catch(() => undefined);
      setPreparingFile(false);
      // Pass the validated file directly; React may not have committed selection yet.
      await submitFile(selected);
      return true;
    } finally {
      if (preparationScope.owns(attempt)) setPreparingFile(false);
      preparationScope.finish(attempt);
    }
  }, [chooseFile, closeTutorial, navigate, navigationBlocked, reportDownloaded, selection.provider, submitFile, preparationScope]);
  useEffect(() => {
    if (!route.downloadedVersion || !route.provider) return;
    const handoff = `${route.provider}:${route.downloadedVersion}`;
    if (handledDirectPicker.current === handoff) return;
    handledDirectPicker.current = handoff;
    void chooseDownloadedFile(route.provider);
  }, [chooseDownloadedFile, route.downloadedVersion, route.provider]);
  useEffect(() => { if (route.requestNew) setSelection(current => ({ ...current, step: 'request' })); }, [route.requestNew, setSelection]);
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
  const goHome=()=>{if(!navigationBlocked)navigation.replace(appDestinations.home);};
  const readyAlerts=useProviderReadyAlerts({userId,provider:selection.provider,goHome,connectGmail:base.connectGmailForReadyAlerts,connectOutlook:base.connectOutlookForReadyAlerts});
  useEffect(()=>{
    if(!userId || !(route.connectionSucceeded || route.connectionFailed) || route.gmailPurpose!=='export_ready_alerts')return;
    let live=true;
    void AsyncStorage.getItem(alertEnrollmentKey(userId)).then(value=>{
      if(!live||!value)return;
      const pending=JSON.parse(value);
      if((pending.provider==='uber_eats'||pending.provider==='doordash') && Date.now()-pending.createdAt<30*60*1000)
        setSelection({intent:'resume_export',provider:pending.provider,mailbox:null,step:null});
    }).catch(()=>undefined);
    return()=>{live=false;};
  },[userId,route.connectionSucceeded,route.connectionFailed,route.gmailPurpose,setSelection]);
  return { ...base, state, readyAlerts, switchInbox: () => { if (!base.connectionBusy) void (selection.mailbox === 'gmail' ? base.connectEmail() : base.connectOutlook()); },stepSheetVisible,openSteps:()=>setStepSheetVisible(true),closeSteps:()=>setStepSheetVisible(false), selection, selectedProvider: selection.provider, importBlocked, fileSession, preparingFile, navigationBlocked, returnTo, pendingRequests,
    requestNotSubmitted: (p: 'uber' | 'doordash') => {
      base.requestNotSubmitted(p);
      const provider = p === 'uber' ? 'uber_eats' : 'doordash';
      setPendingRequests(current => { const next = { ...current }; delete next[provider]; return next; });
    },
    goBack, close, chooseProvider, chooseMailbox, startEmail, chooseDownloadedFile, openProviderGuide, openRequestPage, confirmProviderReady, completeTutorial,
    chooseEmail: () => navigate({ intent: selection.intent === 'reconnect' ? 'reconnect' : 'email', mailbox: null, step: 'email_choice' }),
    setStep: (step: GuidedImportStep) => navigate({ step }),
    showProviderChoice: () => { if(navigationBlocked)return; base.closeTutorial(); dispatchSelection({ type: 'reset', selection: { intent: 'choose', provider: null, mailbox: null, step: null } }); },
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
    finishDownloadGuide: (p: 'uber' | 'doordash') => chooseDownloadedFile(p === 'uber' ? 'uber_eats' : 'doordash'),
    refreshStatus: () => { void base.refreshImportPreferences(); void base.refreshActiveImport(); if (route.operationId) void selectedOperation.refresh(); },
    viewOperation: () => { if (operation) navigation.open({ pathname: isActiveImportOperation(operation) ? '/import-progress' : '/import-result', params: { operationId: operation.id, returnTo } }); },
    goHome,
  };
}
