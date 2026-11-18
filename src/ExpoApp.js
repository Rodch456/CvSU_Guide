import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, AppState, Easing, Image, Linking, Modal, PanResponder, Platform, Pressable, SafeAreaView, ScrollView, StatusBar as NativeStatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import bundledContent from './admission-content.json';
import attireGuide from './attire-guide.json';
import { getAcademicStatus, getAcademicStatuses, getAdmissionStepOrder, getCampusTrivia, getEligiblePrograms, getExamVenue, getReapplicationPrograms, getStepRequirements, getTrackOptions, validateContent } from './content-schema';

const coreStepOrder = getAdmissionStepOrder(bundledContent);
const defaultStatusSteps = coreStepOrder.filter((step) => step !== 'Interview');
function getSteps(program, keywords, order = coreStepOrder) {
  const programName = (program || '').toLowerCase();
  if (keywords.some((keyword) => programName.includes(keyword.toLowerCase()))) return order;
  return order === coreStepOrder ? defaultStatusSteps : order.filter((step) => step !== 'Interview');
}

function sameSteps(first, second) {
  return first.length === second.length && first.every((step, index) => step === second[index]);
}

function restoreStatusIndex(savedProgress, previousSteps, currentSteps) {
  const completedCount = savedProgress.currentStatusIndex || 0;
  if (completedCount >= previousSteps.length) return currentSteps.length;
  const completed = previousSteps.slice(0, completedCount);
  return Math.max(-1, ...completed.map((step) => currentSteps.indexOf(step))) + 1;
}

const mainTabs = ['Home', 'Status', 'Journey', 'Map', 'FAQ'];
const tabIcons = { Status: 'list-outline', Journey: 'footsteps-outline', Home: 'home-outline', Map: 'map-outline', FAQ: 'help-circle-outline' };
const androidTopInset = Platform.OS === 'android' ? NativeStatusBar.currentHeight || 0 : 0;
const savedApplicantKey = 'cvsu-admission-guide-state';
const savedProgressKey = 'cvsu-admission-guide-progress';
const applicantSetupSteps = 4;
const completedApplicantSetup = applicantSetupSteps + 1;
const applicantSexLabels = { male: 'Male', female: 'Female' };

function getAcademicStatusLabel(content, profile) {
  if (!profile || profile === 'Guest') return profile;
  return getAcademicStatus(content, profile)?.label
    || getAcademicStatus(bundledContent, profile)?.label
    || 'Previously selected academic status';
}

const faqGuideImage = require('../assets/Avatar.png');
const onboardingProgressStyles = { lastSegment: { flex: 0 } };
const onboardingHelpStyles = StyleSheet.create({
  helpText: { color: '#075b31', textAlign: 'center', paddingTop: 5, fontWeight: '700' },
  backdrop: { flex: 1, backgroundColor: 'rgba(4, 35, 18, 0.5)', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: '#fff', borderRadius: 8, padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { flex: 1, color: '#183225', fontSize: 19, fontWeight: '800', paddingRight: 12 },
  close: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#e4eee4', alignItems: 'center', justifyContent: 'center' },
  copy: { color: '#52695b', fontSize: 14, lineHeight: 21, marginBottom: 10 }
});
const onboardingSetupStyles = StyleSheet.create({
  screen: { backgroundColor: '#009c29' },
  header: { borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#d8e2d9' },
  kicker: { color: '#f7d521', fontSize: 10, fontWeight: '800' },
  title: { color: '#fff', fontSize: 32, lineHeight: 37, fontWeight: '800' },
  intro: { color: '#f2fff4', fontSize: 14, lineHeight: 21 },
  optionalField: { color: '#fff', fontSize: 14, fontWeight: '800', marginBottom: 8 },
  optionalInput: { minHeight: 48, borderWidth: 1, borderColor: '#d8e2d9', borderRadius: 8, backgroundColor: '#fff', color: '#183225', paddingHorizontal: 14, marginBottom: 20 },
  clearSelection: { alignSelf: 'flex-start', paddingVertical: 10 },
  clearSelectionText: { color: '#fff', fontSize: 13, fontWeight: '700', textDecorationLine: 'underline' },
  progress: { marginBottom: 34 },
  progressDot: { width: 24, height: 24, borderRadius: 12, borderColor: '#d8e2d9', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  activeProgressDot: { borderColor: '#f7d521', backgroundColor: '#f7d521' },
  completeProgressDot: { borderColor: '#f7d521', backgroundColor: '#075b31' },
  progressDotText: { color: '#698073', fontSize: 11, fontWeight: '800' },
  activeProgressDotText: { color: '#183225' },
  completeProgressDotText: { color: '#fff' },
  progressLine: { height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.35)' },
  progressTrack: { position: 'relative', height: 30, justifyContent: 'center' },
  progressRail: { position: 'absolute', left: 12, right: 12, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.35)' },
  progressFill: { position: 'absolute', left: 12, height: 3, borderRadius: 2, backgroundColor: '#f7d521' },
  progressDots: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  completeProgressLine: { backgroundColor: '#f7d521' },
  progressText: { alignSelf: 'center', color: '#f2fff4', fontSize: 11, letterSpacing: 0.5 },
  option: { borderRadius: 8, borderColor: '#d8e2d9' },
  selected: { backgroundColor: '#fffde8', borderColor: '#f7d521' },
  selectedLabel: { minWidth: 78, overflow: 'hidden', borderRadius: 10, backgroundColor: '#f7d521', color: '#183225', fontSize: 9, fontWeight: '800', letterSpacing: 0.8, textAlign: 'center', paddingHorizontal: 9, paddingVertical: 4 },
  hiddenSelectedLabel: { opacity: 0 },
  action: { backgroundColor: '#f7d521', borderRadius: 8 },
  actionText: { color: '#183225', fontWeight: '800' },
  back: { backgroundColor: '#fff', borderColor: '#d8e2d9', borderRadius: 8 },
  backText: { color: '#183225', fontWeight: '800' },
  fixedActions: { backgroundColor: '#009c29', borderTopColor: 'rgba(255,255,255,0.18)' }
});
const startStyles = StyleSheet.create({
  safe: { flex: 1, paddingTop: androidTopInset, backgroundColor: '#009c29' },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 28, paddingBottom: 28, gap: 16 },
  heroCard: { alignItems: 'center', borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', backgroundColor: '#075b31', padding: 22 },
  logo: { width: 118, height: 118, marginBottom: 20 },
  kicker: { color: '#f7d521', fontSize: 11, fontWeight: '800', letterSpacing: 1, marginBottom: 16 },
  title: { color: '#fff', fontSize: 30, lineHeight: 36, fontWeight: '800', textAlign: 'center' },
  copy: { color: '#f2fff4', fontSize: 14, lineHeight: 22, marginTop: 16, textAlign: 'center' },
  primaryAction: { minHeight: 86, flexDirection: 'row', alignItems: 'center', borderRadius: 8, backgroundColor: '#f7d521', borderWidth: 1, borderColor: '#f7d521', paddingHorizontal: 24, overflow: 'hidden' },
  primaryTitle: { flexShrink: 1, color: '#183225', fontSize: 17, lineHeight: 22, fontWeight: '800' },
  primaryCopy: { color: '#645f18', fontSize: 13, lineHeight: 18, marginTop: 6 },
  secondaryAction: { minHeight: 86, flexDirection: 'row', alignItems: 'center', borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#d8e2d9', paddingHorizontal: 24, overflow: 'hidden' },
  secondaryTitle: { flexShrink: 1, color: '#183225', fontSize: 17, lineHeight: 22, fontWeight: '800' },
  secondaryCopy: { color: '#698073', fontSize: 13, lineHeight: 18, marginTop: 6 },
  optionMain: { flex: 1, minWidth: 0, justifyContent: 'center', paddingRight: 14 },
  optionQuestion: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#e4eee4', alignItems: 'center', justifyContent: 'center' },
  optionQuestionText: { color: '#075b31', fontSize: 18, fontWeight: '800' },
  startReturnButton: { flexDirection: 'row', alignItems: 'center', padding: 8 },
  startReturnText: { marginLeft: 4, color: '#075b31', fontSize: 12, fontWeight: '800' },
  noticeCard: { width: '100%', maxWidth: 480, borderRadius: 12, backgroundColor: '#fff', padding: 22, shadowColor: '#021e0e', shadowOpacity: 0.2, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 8 },
  noticeHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  noticeIcon: { width: 46, height: 46, marginRight: 12, borderRadius: 23, backgroundColor: '#f7d521', alignItems: 'center', justifyContent: 'center' },
  noticeHeading: { flex: 1, minWidth: 0 },
  noticeKicker: { color: '#078743', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  noticeTitle: { flexShrink: 1, marginTop: 3, color: '#183225', fontSize: 24, lineHeight: 29, fontWeight: '800' },
  noticeCopy: { color: '#52695b', fontSize: 14, lineHeight: 21 },
  noticeDisclaimer: { flexDirection: 'row', marginTop: 16, padding: 14, borderRadius: 8, borderWidth: 1, borderColor: '#e8d36b', backgroundColor: '#fffbe1' },
  noticeDisclaimerIcon: { marginTop: 1, marginRight: 9 },
  noticeEmphasis: { flex: 1, color: '#183225', fontSize: 13, lineHeight: 20, fontWeight: '800' },
  noticeAction: { flexDirection: 'row', minHeight: 50, marginTop: 20, borderRadius: 8, backgroundColor: '#075b31', alignItems: 'center', justifyContent: 'center' },
  noticeActionText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  noticeActionIcon: { marginLeft: 8 },
  noticeTrigger: { position: 'absolute', top: androidTopInset + 16, right: 20, zIndex: 2, flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 11, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.95)' },
  noticeTriggerText: { marginLeft: 6, color: '#075b31', fontSize: 12, fontWeight: '800' },
  splashSafe: { flex: 1, paddingTop: androidTopInset, backgroundColor: '#009c29' },
  splashContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  splashLogo: { width: 150, height: 150, marginBottom: 26 },
  splashKicker: { color: '#f7d521', fontSize: 11, fontWeight: '800', letterSpacing: 1.2, textAlign: 'center' },
  splashTitle: { marginTop: 10, color: '#fff', fontSize: 32, lineHeight: 38, fontWeight: '800', textAlign: 'center' },
  splashCaption: { marginTop: 16, color: '#f2fff4', fontSize: 13, textAlign: 'center' }
});

const contentCacheKey = 'cvsu-published-content-v1';
const contentServer = process.env.EXPO_PUBLIC_ADMISSION_CONTENT_URL;
const installationKey = 'cvsu-installation-id';
const installationCheckInKey = 'cvsu-installation-last-check-in';
const checkInInterval = 24 * 60 * 60 * 1000;

function useInstallationCheckIn() {
  useEffect(() => {
    if (Platform.OS === 'web' || !contentServer) return;
    const endpoint = contentServer.replace(/\/api\/content(?:[?#].*)?$/, '/api/installations/check-in');
    if (endpoint === contentServer) return;
    let request = null;

    async function checkIn() {
      if (request) return;
      const controller = new AbortController();
      request = controller;
      const timer = setTimeout(() => controller.abort(), 75000);
      try {
        const lastCheckIn = Number(await AsyncStorage.getItem(installationCheckInKey));
        if (Date.now() - lastCheckIn < checkInInterval) return;
        let installationId = await AsyncStorage.getItem(installationKey);
        if (!installationId) {
          installationId = Array.from({ length: 4 }, () =>
            Math.floor(Math.random() * 0x100000000).toString(16).padStart(8, '0')
          ).join('');
          await AsyncStorage.setItem(installationKey, installationId);
        }
        if (controller.signal.aborted) return;
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ installationId }),
          signal: controller.signal
        });
        if (response.status === 204) await AsyncStorage.setItem(installationCheckInKey, String(Date.now()));
      } catch {
        // The guide remains usable when a check-in cannot be sent.
      } finally {
        clearTimeout(timer);
        request = null;
      }
    }

    checkIn();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') checkIn();
    });
    return () => {
      subscription.remove();
      request?.abort();
    };
  }, []);
}

async function fetchAdmissionContent(controller) {
  const timer = setTimeout(() => controller.abort(), 3500);
  try {
    const response = await fetch(contentServer, { signal: controller.signal });
    if (!response.ok) throw new Error('Content unavailable');
    const data = await response.json();
    if (validateContent(data)) throw new Error('Invalid admission content');
    return data;
  } finally {
    clearTimeout(timer);
  }
}

function useAdmissionContent() {
  const [content, setContent] = useState(bundledContent);
  const [ready, setReady] = useState(!contentServer);
  const [refreshing, setRefreshing] = useState(false);
  const [updateMessage, setUpdateMessage] = useState('');
  const refreshRequest = useRef(null);
  useEffect(() => {
    if (!contentServer) return;
    let active = true;
    const controller = new AbortController();
    const cached = AsyncStorage.getItem(contentCacheKey).then((raw) => {
      const data = raw && JSON.parse(raw);
      return data && !validateContent(data) ? data : bundledContent;
    }).catch(() => bundledContent);
    async function load() {
      try {
        const data = await fetchAdmissionContent(controller);
        if (!active) return;
        setContent(data);
        AsyncStorage.setItem(contentCacheKey, JSON.stringify(data)).catch(() => {});
      } catch {
        const data = await cached;
        if (active) setContent(data);
      } finally {
        if (active) setReady(true);
      }
    }
    load();
    return () => {
      active = false;
      controller.abort();
      const request = refreshRequest.current;
      refreshRequest.current = null;
      request?.abort();
    };
  }, []);

  async function refreshContent() {
    if (!contentServer || !ready || refreshRequest.current) return;
    const controller = new AbortController();
    refreshRequest.current = controller;
    setRefreshing(true);
    setUpdateMessage('Checking for updates…');
    try {
      const data = await fetchAdmissionContent(controller);
      if (refreshRequest.current !== controller) return;
      const serialized = JSON.stringify(data);
      const changed = serialized !== JSON.stringify(content);
      if (changed) setContent(data);
      AsyncStorage.setItem(contentCacheKey, serialized).catch(() => {});
      setUpdateMessage(changed ? 'Guide content updated.' : 'Your guide is up to date.');
    } catch {
      if (refreshRequest.current === controller) {
        setUpdateMessage('Could not check for updates. Your current guide is still available. Try again when connected.');
      }
    } finally {
      if (refreshRequest.current === controller) {
        refreshRequest.current = null;
        setRefreshing(false);
      }
    }
  }

  return {
    content, ready,
    contentUpdate: { onRefresh: contentServer ? refreshContent : undefined, refreshing, message: updateMessage }
  };
}

export default function ExpoApp() {
  useInstallationCheckIn();
  const { content, ready: contentReady, contentUpdate } = useAdmissionContent();
  const [step, setStep] = useState(1), [profile, setProfile] = useState(''), [track, setTrack] = useState(''), [program, setProgram] = useState(''), [query, setQuery] = useState('');
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [nickname, setNickname] = useState('');
  const [sex, setSex] = useState('');
  const [showSetupHelp, setShowSetupHelp] = useState(false);
  const [startMode, setStartMode] = useState('start');
  const [showSplash, setShowSplash] = useState(true);
  const [storageLoaded, setStorageLoaded] = useState(false);
  useEffect(() => {
    const splashTimer = setTimeout(() => setShowSplash(false), 2200);
    return () => clearTimeout(splashTimer);
  }, []);
  useEffect(() => {
    AsyncStorage.getItem(savedApplicantKey).then((storedState) => {
      if (storedState) {
        const savedState = JSON.parse(storedState);
        setProfile(savedState.profile || '');
        setTrack(savedState.track || '');
        setProgram(savedState.program || '');
        setProfilePhoto(savedState.profilePhoto || null);
        setNickname(savedState.nickname || '');
        setSex(Object.hasOwn(applicantSexLabels, savedState.sex) ? savedState.sex : '');
        if (savedState.profile) {
          setStep(completedApplicantSetup);
          setStartMode('saved');
        }
      }
    }).catch(() => {}).finally(() => setStorageLoaded(true));
  }, []);
  useEffect(() => {
    if (!storageLoaded || step !== completedApplicantSetup || !profile || !program) return;
    AsyncStorage.setItem(savedApplicantKey, JSON.stringify({ profile, track, program, profilePhoto, nickname, sex })).catch(() => {});
  }, [storageLoaded, step, profile, track, program, profilePhoto, nickname, sex]);
  const tracks = getTrackOptions(content, profile);
  const eligiblePrograms = getEligiblePrograms(content, profile, track);
  const results = eligiblePrograms.filter((item) => item.toLowerCase().includes(query.toLowerCase().trim()));
  const chooseProfile = (value) => {
    if (value !== profile) { setTrack(''); setProgram(''); }
    setProfile(value);
  };
  const chooseTrack = (value) => {
    if (value !== track) { setProgram(''); setQuery(''); }
    setTrack(value);
  };
  const canContinue = [true, Boolean(profile), tracks.some(([name]) => name === track), eligiblePrograms.includes(program)][step - 1];
  if (showSplash || !storageLoaded || !contentReady) return <SplashScreen />;
  if (startMode === 'start') return <StartScreen onSetup={() => { setStartMode('setup'); setStep(1); }} onGuest={() => { setStartMode('guest'); setStep(completedApplicantSetup); }} />;
  return <SafeAreaView style={[styles.safe, { paddingTop: androidTopInset }]}><StatusBar style={step === completedApplicantSetup ? 'dark' : 'light'} />
    <View style={styles.greenWash} />{step <= applicantSetupSteps ? <><ScrollView key={step} contentContainerStyle={[styles.screen, onboardingSetupStyles.screen]} keyboardShouldPersistTaps="handled"><View style={[styles.header, onboardingSetupStyles.header]}><View style={styles.brand}><Image source={require('../assets/CvSU_Logo.png')} style={styles.logo} /><View><Text style={styles.eyebrow}>CAVITE STATE UNIVERSITY</Text><Text style={styles.brandName}>Admission Guide</Text></View></View><Pressable accessibilityLabel="How your profile personalizes your journey" onPress={() => setShowSetupHelp(true)} style={({ pressed }) => [styles.help, pressed && styles.pressed]}><Text style={onboardingHelpStyles.helpText}>?</Text></Pressable></View><Progress currentStep={step} totalSteps={applicantSetupSteps} />
    {step === 1 && <Page kicker="STEP 1 · PERSONAL DETAILS" title="Tell us about yourself" intro="You can leave both fields blank and continue.">
      <Text style={onboardingSetupStyles.optionalField}>Nickname (optional)</Text>
      <TextInput accessibilityLabel="Nickname (optional)" value={nickname} onChangeText={setNickname}
        maxLength={30} autoCapitalize="words" placeholder="What should we call you?" placeholderTextColor="#52695b"
        style={onboardingSetupStyles.optionalInput} />
      <Text style={onboardingSetupStyles.optionalField}>Sex (optional)</Text>
      <View accessibilityRole="radiogroup" style={styles.list}>
        {Object.entries(applicantSexLabels).map(([value, label]) => (
          <Option key={value} label={label} selected={sex === value} onPress={() => setSex(value)} profileCard />
        ))}
      </View>
      {Boolean(sex) && <Pressable accessibilityRole="button" onPress={() => setSex('')} style={onboardingSetupStyles.clearSelection}>
        <Text style={onboardingSetupStyles.clearSelectionText}>Clear sex selection</Text>
      </Pressable>}
    </Page>}
    {step === 2 && <Page kicker="STEP 2 · ACADEMIC STATUS" title="Tell us about your journey." intro="Choose the description that best matches your current academic status."><View style={styles.list}>{getAcademicStatuses(content).map(({ id: value, label, description: caption }) => <Option key={value} label={label} caption={caption} value={value} selected={profile === value} onPress={() => chooseProfile(value)} profileCard />)}</View></Page>}
    {step === 3 && <Page kicker="STEP 3 · ACADEMIC BACKGROUND" title="What was your track or strand?" intro="Your academic background determines which programs you can select."><View style={styles.list}>{tracks.map(([label, caption]) => <Option key={label} label={label} caption={caption} value={label} selected={track === label} onPress={() => chooseTrack(label)} profileCard />)}</View></Page>}
    {step === 4 && <Page kicker="STEP 4 · YOUR DIRECTION" title="Which program feels like you?" intro={`Choose from the programs available to applicants in ${track}.`}><View style={styles.search}><Text style={styles.searchIcon}>⌕</Text><TextInput value={query} onChangeText={setQuery} placeholder="Search programs" placeholderTextColor="#8aa294" style={styles.input} /><Pressable onPress={() => setQuery('')} style={styles.clear}><Text style={styles.clearText}>×</Text></Pressable></View>{results.length === 0 && <Text style={styles.muted}>{eligiblePrograms.length ? 'No matching programs found.' : 'No programs are currently available for this background.'}</Text>}<View style={styles.list}>{results.map((item) => <Option key={item} label={item} value="→" selected={program === item} onPress={() => setProgram(item)} compact />)}</View></Page>}
  </ScrollView><View style={[styles.fixedActions, onboardingSetupStyles.fixedActions]}><Pressable accessibilityRole="button" accessibilityLabel="Return to start page" onPress={() => { setStartMode('start'); setStep(1); }} style={({ pressed }) => [styles.back, onboardingSetupStyles.back, pressed && styles.pressed]}><Text style={[styles.backText, onboardingSetupStyles.backText]}>Start page</Text></Pressable>{step > 1 && <Back onPress={() => setStep(step - 1)} />}<Action disabled={!canContinue} onPress={() => setStep(step + 1)} /></View><Modal visible={showSetupHelp} transparent animationType="fade" onRequestClose={() => setShowSetupHelp(false)}><Pressable style={onboardingHelpStyles.backdrop} onPress={() => setShowSetupHelp(false)}><Pressable accessibilityRole="none" style={onboardingHelpStyles.card} onPress={() => {}}><View style={onboardingHelpStyles.header}><Text style={onboardingHelpStyles.title}>Your personalized journey</Text><Pressable accessibilityLabel="Close personalization help" onPress={() => setShowSetupHelp(false)} style={({ pressed }) => [onboardingHelpStyles.close, pressed && styles.pressed]}><Ionicons name="close" size={20} color="#183225" /></Pressable></View><Text style={onboardingHelpStyles.copy}>Your applicant type, track or strand, and preferred program help tailor the admission guidance shown in this app.</Text><Text style={onboardingHelpStyles.copy}>We use these choices to highlight relevant requirements, recommended next steps, campus locations, and progress through your admission journey.</Text></Pressable></Pressable></Modal></> : <MainApp content={content} contentUpdate={contentUpdate} onProgramChange={setProgram} profile={profile} program={program} track={track} profilePhoto={profilePhoto} nickname={nickname} sex={sex} onProfilePhotoChange={setProfilePhoto} onNicknameChange={setNickname} onRestart={() => { setStartMode('setup'); setStep(1); }} onBackToStart={() => { setStartMode('start'); setStep(1); }} startAsGuest={startMode === 'guest'} />}</SafeAreaView>;
}
function SplashScreen() { return <SafeAreaView style={startStyles.splashSafe}><StatusBar style="light" /><View style={startStyles.splashContent}><Image source={require('../assets/CvSU_Logo.png')} style={startStyles.splashLogo} /><Text style={startStyles.splashKicker}>CAVITE STATE UNIVERSITY</Text><Text style={startStyles.splashTitle}>CvSU Virtual Admission Guide</Text><Text style={startStyles.splashCaption}>Preparing your admission guide</Text></View></SafeAreaView>; }
function StartScreen({ onSetup, onGuest }) { const [showNotice, setShowNotice] = useState(true); const [showOptionInfo, setShowOptionInfo] = useState(null); return <SafeAreaView style={startStyles.safe}><StatusBar style="light" /><Pressable accessibilityRole="button" accessibilityLabel="Show important notice" onPress={() => setShowNotice(true)} style={({ pressed }) => [startStyles.noticeTrigger, pressed && styles.pressed]}><Ionicons name="information-circle-outline" size={18} color="#075b31" /><Text style={startStyles.noticeTriggerText}>Important notice</Text></Pressable><View style={startStyles.content}><View style={startStyles.heroCard}><Image source={require('../assets/CvSU_Logo.png')} style={startStyles.logo} /><Text style={startStyles.kicker}>CAVITE STATE UNIVERSITY</Text><Text style={startStyles.title}>CvSU Virtual Admission Guide</Text><Text style={startStyles.copy}>Your clear starting point for application requirements, admission steps, and campus guidance.</Text></View><View style={startStyles.secondaryAction}><Pressable onPress={onGuest} style={({ pressed }) => [startStyles.optionMain, pressed && styles.pressed]}><Text style={startStyles.secondaryTitle}>Continue as Guest</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="About Continue as Guest" onPress={() => setShowOptionInfo('guest')} style={({ pressed }) => [startStyles.optionQuestion, pressed && styles.pressed]}><Text style={startStyles.optionQuestionText}>?</Text></Pressable></View><View style={startStyles.primaryAction}><Pressable onPress={onSetup} style={({ pressed }) => [startStyles.optionMain, pressed && styles.pressed]}><Text style={startStyles.primaryTitle}>Complete Applicant Profile</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="About Complete Applicant Profile" onPress={() => setShowOptionInfo('profile')} style={({ pressed }) => [startStyles.optionQuestion, pressed && styles.pressed]}><Text style={startStyles.optionQuestionText}>?</Text></Pressable></View></View><Modal visible={showNotice} transparent animationType="fade" onRequestClose={() => {}}><View style={onboardingHelpStyles.backdrop}><View style={startStyles.noticeCard}><View style={startStyles.noticeHeader}><View style={startStyles.noticeIcon}><Ionicons name="information" size={24} color="#183225" /></View><View style={startStyles.noticeHeading}><Text style={startStyles.noticeKicker}>BEFORE YOU BEGIN</Text><Text style={startStyles.noticeTitle}>Important Notice</Text></View></View><Text style={startStyles.noticeCopy}>CvSU Virtual Admission Guide is designed to help prospective students understand the Cavite State University admission process. It provides application requirements, admission steps, examination and medical guidance, campus locations, FAQs, and progress tracking.</Text><View style={startStyles.noticeDisclaimer}><Ionicons name="shield-checkmark" size={19} color="#9a7c00" style={startStyles.noticeDisclaimerIcon} /><Text style={startStyles.noticeEmphasis}>This app is not the official CvSU admission portal and cannot process applications. It is intended only to guide applicants and help them prepare for the official admission process.</Text></View><Pressable accessibilityRole="button" onPress={() => setShowNotice(false)} style={({ pressed }) => [startStyles.noticeAction, pressed && styles.pressed]}><Text style={startStyles.noticeActionText}>Proceed to Guide</Text><Ionicons name="arrow-forward" size={19} color="#fff" style={startStyles.noticeActionIcon} /></Pressable></View></View></Modal><Modal visible={Boolean(showOptionInfo)} transparent animationType="fade" onRequestClose={() => setShowOptionInfo(null)}><View style={onboardingHelpStyles.backdrop}><View style={startStyles.noticeCard}><View style={startStyles.noticeHeader}><View style={startStyles.noticeIcon}><Ionicons name="help" size={24} color="#183225" /></View><View style={startStyles.noticeHeading}><Text style={startStyles.noticeKicker}>OPTION DETAILS</Text><Text style={startStyles.noticeTitle}>{showOptionInfo === 'guest' ? 'Continue as Guest' : 'Complete Applicant Profile'}</Text></View></View><Text style={startStyles.noticeCopy}>{showOptionInfo === 'guest' ? 'Choose this option if you are still exploring CvSU admission, helping another applicant, or only need to review general requirements, procedures, FAQs, and campus guidance. You can use the guide without entering applicant details, but your progress will not be personalized or saved as an applicant profile.' : 'Choose this option if you are a prospective applicant who wants guidance tailored to your academic background and preferred program. You will provide your applicant type, track or strand, and program choice so the guide can highlight relevant requirements, admission steps, and progress tracking for your journey.'}</Text><Pressable accessibilityRole="button" onPress={() => setShowOptionInfo(null)} style={({ pressed }) => [startStyles.noticeAction, pressed && styles.pressed]}><Text style={startStyles.noticeActionText}>Close</Text></Pressable></View></View></Modal></SafeAreaView>; }
function Page({ kicker, title, intro, children }) { return <><Text style={[styles.kicker, onboardingSetupStyles.kicker]}>{kicker}</Text><Text style={[styles.title, onboardingSetupStyles.title]}>{title}</Text><Text style={[styles.intro, onboardingSetupStyles.intro]}>{intro}</Text>{children}</>; }
function Progress({ currentStep, totalSteps = 4 }) { const progress = totalSteps > 1 ? Math.max(0, (currentStep - 1) / (totalSteps - 1)) * 100 : 0; return <View style={[styles.progress, onboardingSetupStyles.progress]}><View style={onboardingSetupStyles.progressTrack}><View style={onboardingSetupStyles.progressRail} /><View style={[onboardingSetupStyles.progressFill, { width: `${progress}%` }]} /><View style={onboardingSetupStyles.progressDots}>{Array.from({ length: totalSteps }, (_, index) => index + 1).map((item) => <View key={item} style={[styles.progressDot, onboardingSetupStyles.progressDot, item === currentStep && onboardingSetupStyles.activeProgressDot, item < currentStep && onboardingSetupStyles.completeProgressDot]}><Text style={[onboardingSetupStyles.progressDotText, item === currentStep && onboardingSetupStyles.activeProgressDotText, item < currentStep && onboardingSetupStyles.completeProgressDotText]}>{item}</Text></View>)}</View></View><Text style={[styles.progressText, onboardingSetupStyles.progressText]}>Step {currentStep} of {totalSteps}</Text></View>; }
function Option({ label, caption, value, selected, onPress, compact, profileCard = false }) { return <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={onPress} style={({ pressed }) => [styles.option, onboardingSetupStyles.option, compact && styles.compact, profileCard && styles.profileOption, selected && styles.selected, selected && onboardingSetupStyles.selected, pressed && styles.pressed]}>{!profileCard && <Text style={[styles.icon, selected && styles.selectedIcon]}>{value}</Text>}<View style={styles.optionCopy}><View style={styles.optionHeader}><Text style={[styles.optionText, profileCard && styles.profileOptionText, selected && profileCard && styles.profileOptionTextSelected]}>{label}</Text><Text style={[styles.selectedLabel, onboardingSetupStyles.selectedLabel, !selected && onboardingSetupStyles.hiddenSelectedLabel]}>SELECTED</Text></View>{caption && <Text style={styles.optionCaption}>{caption}</Text>}</View></Pressable>; }
function Action({ label = 'Continue', disabled, onPress }) { return <Pressable disabled={disabled} onPress={onPress} style={[styles.action, onboardingSetupStyles.action, disabled && styles.disabled]}><Text style={[styles.actionText, onboardingSetupStyles.actionText]}>{label}</Text></Pressable>; }
function Back({ onPress }) { return <Pressable onPress={onPress} style={[styles.back, onboardingSetupStyles.back]}><Text style={[styles.backText, onboardingSetupStyles.backText]}>Back</Text></Pressable>; }
function Tile({ label }) { return <View style={styles.tile}><Text style={styles.tileLabel}>{label}</Text><Text style={styles.muted}>See what to prepare next</Text></View>; }
function MainApp({ content = bundledContent, contentUpdate, onProgramChange, profile, program, track, profilePhoto, nickname, sex, onProfilePhotoChange, onNicknameChange, onRestart, onBackToStart, startAsGuest = false }) {
  const { exceptionProgramKeywords } = content;
  const stepOrder = getAdmissionStepOrder(content);
  const [activeProgram, setActiveProgram] = useState(program);
  const [failedProgram, setFailedProgram] = useState('');
  const [reapplicationProgram, setReapplicationProgram] = useState('');
  const [guestFailedProgram, setGuestFailedProgram] = useState('');
  const [guestReapplicationProgram, setGuestReapplicationProgram] = useState('');
  const updateApplicantProgram = (nextProgram) => { setActiveProgram(nextProgram); onProgramChange?.(nextProgram); };
  const [activeTab, setActiveTab] = useState('Home');
  const [showProfile, setShowProfile] = useState(false);
  const [guestMode, setGuestMode] = useState(startAsGuest);
  const [showGuestSetup, setShowGuestSetup] = useState(false);
  const [guestSetupStep, setGuestSetupStep] = useState(1);
  const [guestSetupIsEditing, setGuestSetupIsEditing] = useState(false);
  const [guestProfile, setGuestProfile] = useState('');
  const [guestTrack, setGuestTrack] = useState('');
  const [guestProgram, setGuestProgram] = useState('');
  const guestTrackOptions = getTrackOptions(content, guestProfile);
  const guestEligiblePrograms = getEligiblePrograms(content, guestProfile, guestTrack);
  const guestCanContinue = guestSetupStep === 1 ? Boolean(guestProfile) : guestSetupStep === 2
    ? guestTrackOptions.some(([name]) => name === guestTrack) : guestEligiblePrograms.includes(guestProgram);
  const chooseGuestProfile = (value) => {
    if (value !== guestProfile) { setGuestTrack(''); setGuestProgram(''); }
    setGuestProfile(value);
  };
  const chooseGuestTrack = (value) => {
    if (value !== guestTrack) setGuestProgram('');
    setGuestTrack(value);
  };
  const [currentStatusIndex, setCurrentStatusIndex] = useState(0);
  const [selectedStepIndex, setSelectedStepIndex] = useState(null);
  const [checkedRequirements, setCheckedRequirements] = useState({});
  const [examinationAttempt, setExaminationAttempt] = useState('initial');
  const [guestStatusIndex, setGuestStatusIndex] = useState(0);
  const [guestSelectedStepIndex, setGuestSelectedStepIndex] = useState(null);
  const [guestCheckedRequirements, setGuestCheckedRequirements] = useState({});
  const [guestExaminationAttempt, setGuestExaminationAttempt] = useState('initial');
  const [progressLoaded, setProgressLoaded] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem(savedProgressKey).then((storedProgress) => {
      if (storedProgress) {
        const savedProgress = JSON.parse(storedProgress);
        const previousSteps = savedProgress.admissionSteps || getSteps(program, bundledContent.exceptionProgramKeywords);
        setCurrentStatusIndex(restoreStatusIndex(savedProgress, previousSteps, getSteps(program, exceptionProgramKeywords, stepOrder)));
        setCheckedRequirements(Object.fromEntries(Object.entries(savedProgress.checkedRequirements || {}).map(([step, checks]) => [
          step, checks.map((check) => typeof check === 'number' ? bundledContent.statusStepDetails[step]?.requirements[check] : check).filter(Boolean)
        ])));
        setExaminationAttempt(savedProgress.examinationAttempt || 'initial');
        setFailedProgram(savedProgress.failedProgram || '');
        setReapplicationProgram(savedProgress.reapplicationProgram || '');
      }
    }).catch(() => {}).finally(() => setProgressLoaded(true));
  }, []);
  useEffect(() => {
    setActiveProgram(program);
  }, [program]);
  const applicantSteps = useMemo(() => getSteps(activeProgram, exceptionProgramKeywords, stepOrder), [activeProgram, exceptionProgramKeywords, stepOrder]);
  const guestSteps = useMemo(() => getSteps(guestProgram, exceptionProgramKeywords, stepOrder), [guestProgram, exceptionProgramKeywords, stepOrder]);
  const [previousContent, setPreviousContent] = useState(content);
  if (previousContent !== content) {
    setPreviousContent(content);
    const previousOrder = getAdmissionStepOrder(previousContent);
    const previousApplicantSteps = getSteps(activeProgram, previousContent.exceptionProgramKeywords, previousOrder);
    const previousGuestSteps = getSteps(guestProgram, previousContent.exceptionProgramKeywords, previousOrder);
    if (!sameSteps(previousApplicantSteps, applicantSteps)) {
      setCurrentStatusIndex(restoreStatusIndex({ currentStatusIndex }, previousApplicantSteps, applicantSteps));
      setSelectedStepIndex(null);
    }
    if (!sameSteps(previousGuestSteps, guestSteps)) {
      setGuestStatusIndex(restoreStatusIndex({ currentStatusIndex: guestStatusIndex }, previousGuestSteps, guestSteps));
      setGuestSelectedStepIndex(null);
    }
  }
  useEffect(() => {
    if (!progressLoaded || guestMode) return;
    AsyncStorage.setItem(savedProgressKey, JSON.stringify({ currentStatusIndex, checkedRequirements, examinationAttempt, failedProgram, reapplicationProgram, admissionSteps: applicantSteps })).catch(() => {});
  }, [progressLoaded, guestMode, currentStatusIndex, checkedRequirements, examinationAttempt, failedProgram, reapplicationProgram, applicantSteps]);
  const steps = guestMode ? guestSteps : applicantSteps;
  const bottomNavigation = !showGuestSetup && (
    <View style={styles.bottomNav}>
      {mainTabs.map((tab) => {
        const selected = !showProfile && activeTab === tab;
        return (
          <Pressable
            key={tab}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => {
              setShowProfile(false);
              setActiveTab(tab);
            }}
            style={({ pressed }) => [styles.navItem, selected && styles.activeNavItem, pressed && styles.pressed]}
          >
            <Ionicons name={tabIcons[tab]} size={27} color={selected ? '#009c29' : '#698073'} />
            <Text style={[styles.navLabel, selected && styles.activeNavText]}>{tab}</Text>
          </Pressable>
        );
      })}
    </View>
  );
  const openStep = (index) => {
    if (guestMode) setGuestSelectedStepIndex(index);
    else setSelectedStepIndex(index);
    if (activeTab !== 'Journey') setActiveTab('Status');
  };
  const resetJourney = () => {
    if (guestMode) {
      setGuestStatusIndex(0);
      setGuestSelectedStepIndex(null);
      setGuestCheckedRequirements({});
      setGuestExaminationAttempt('initial');
      setGuestFailedProgram('');
      setGuestReapplicationProgram('');
      setShowProfile(false);
      setActiveTab('Home');
      return;
    }
    setCurrentStatusIndex(0);
    setSelectedStepIndex(null);
    setCheckedRequirements({});
    setExaminationAttempt('initial');
    setFailedProgram('');
    setReapplicationProgram('');
    setActiveProgram(program);
    setGuestMode(false);
    setShowProfile(false);
    setActiveTab('Home');
  };
  const viewAsGuest = () => {
    setGuestProfile('');
    setGuestTrack('');
    setGuestProgram('');
    setGuestSetupStep(1);
    setGuestSetupIsEditing(false);
    setGuestStatusIndex(0);
    setGuestSelectedStepIndex(null);
    setGuestCheckedRequirements({});
    setGuestExaminationAttempt('initial');
    setGuestFailedProgram('');
    setGuestReapplicationProgram('');
    setGuestMode(true);
    setShowProfile(false);
    setShowGuestSetup(true);
    setActiveTab('Home');
  };
  const exitGuestMode = () => {
    setGuestMode(false);
    setShowProfile(false);
    setShowGuestSetup(false);
    setActiveTab('Home');
    return <View style={styles.mainApp}>
      <View style={styles.mainHeader}>
        <View style={profileStyles.headerBrand}>
          <Pressable accessibilityRole="button" accessibilityLabel="Go to Home" onPress={() => { setShowProfile(false); setShowGuestSetup(false); setActiveTab('Home'); }}><Image source={require('../assets/CvSU_Logo.png')} style={styles.mainLogo} /></Pressable>
          <Text style={[styles.mainTitle, { position: 'absolute', left: 58, right: 0, textAlign: 'center' }]}>CvSU Virtual Admission Guide</Text>
        </View>
        <Pressable
          accessibilityLabel="Return to start page"
          onPress={onBackToStart}
          style={({ pressed }) => [startStyles.startReturnButton, pressed && styles.pressed]}
        >
          <Ionicons name="home-outline" size={18} color="#075b31" />
          <Text style={startStyles.startReturnText}>Start</Text>
        </Pressable>
        <Pressable
          accessibilityLabel="Open applicant profile"
          onPress={() => setShowProfile(true)}
          style={({ pressed }) => [styles.profileButton, pressed && styles.pressed]}
        >
          <Image
            source={!guestMode && profilePhoto ? { uri: profilePhoto } : require('../assets/Profile.png')}
            style={styles.profileImage}
          />
        </Pressable>
      </View>
      {guestMode && (showGuestSetup || showProfile || activeTab === 'Home') && (
        <Pressable
          accessibilityLabel="Exit guest mode"
          onPress={exitGuestMode}
          style={({ pressed }) => [profileStyles.guestModeBar, pressed && styles.pressed]}
        >
          <View>
            <Text style={profileStyles.guestModeLabel}>GUEST MODE</Text>
            <Text style={profileStyles.guestModeCopy}>{profile ? 'Your saved applicant profile is hidden.' : 'Exploring the app as a guest.'}</Text>
          </View>
          <View style={profileStyles.exitGuestAction}>
            <Ionicons name="log-out-outline" size={18} color="#075b31" />
            <Text style={profileStyles.exitGuestText}>Exit Guest Mode</Text>
          </View>
        </Pressable>
      )}
      <ScrollView
        style={styles.mainContent}
        contentContainerStyle={[
          styles.mainContentInner,
          (activeTab === 'Home' || showProfile) && homeStyles.content,
          showGuestSetup && guestSetupStyles.content,
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {showGuestSetup ? (
          <GuestProfileSetup content={content}
            step={guestSetupStep}
            profile={guestProfile}
            track={guestTrack}
            program={guestProgram}
            onProfileChange={chooseGuestProfile}
            onTrackChange={chooseGuestTrack}
            onProgramChange={setGuestProgram}
          />
        ) : showProfile ? (
          <ApplicantProfilePage content={content} contentUpdate={contentUpdate}
            profile={displayedProfile}
            track={displayedTrack}
            program={displayedProgram}
            photo={profilePhoto}
            nickname={nickname}
            sex={sex}
            isGuest={guestMode}
            onPhotoChange={onProfilePhotoChange}
            onNicknameChange={onNicknameChange}
            onEdit={onRestart}
            onEditGuest={() => {
              setGuestSetupStep(1);
              setGuestSetupIsEditing(true);
              setShowProfile(false);
              setShowGuestSetup(true);
            }}
            onBack={() => {
              setShowProfile(false);
              setActiveTab('Home');
            }}
            onGuest={viewAsGuest}
            onReset={resetJourney}
          />
        ) : activeTab === 'Status' ? (
          <StatusPage content={content}
            displayName={displayName}
            profile={displayedProfile}
            program={displayedProgram}
            track={displayedTrack}
            steps={steps}
            currentStatusIndex={displayedStatusIndex}
            onStatusChange={guestMode ? setGuestStatusIndex : setCurrentStatusIndex}
            selectedStepIndex={displayedSelectedStepIndex}
            onSelectStep={guestMode ? setGuestSelectedStepIndex : setSelectedStepIndex}
            checkedRequirements={displayedCheckedRequirements}
            onRequirementsChange={guestMode ? setGuestCheckedRequirements : setCheckedRequirements}
            examinationAttempt={displayedExaminationAttempt}
            onExaminationAttemptChange={guestMode ? setGuestExaminationAttempt : setExaminationAttempt}
            failedProgram={displayedFailedProgram}
            reapplicationProgram={displayedReapplicationProgram}
            onFailedProgramChange={guestMode ? setGuestFailedProgram : setFailedProgram}
            onReapplicationProgramChange={guestMode ? setGuestReapplicationProgram : setReapplicationProgram}
            onProgramChange={guestMode ? setGuestProgram : updateApplicantProgram}
            isGuest={guestMode}
          />
        ) : activeTab === 'Journey' ? (
          <JourneyPage content={content}
            displayName={displayName}
            program={displayedProgram}
            profilePhoto={guestMode ? null : profilePhoto}
            steps={steps}
            currentStatusIndex={displayedStatusIndex}
            examinationAttempt={displayedExaminationAttempt}
            onOpenStep={openStep}
            isGuest={guestMode}
          />
        ) : activeTab === 'Home' ? (
          <HomePage content={content}
            displayName={displayName}
            profile={displayedProfile}
            program={displayedProgram}
            track={displayedTrack}
            steps={steps}
            currentStatusIndex={displayedStatusIndex}
            examinationAttempt={displayedExaminationAttempt}
            onOpenStep={openStep}
            onRestart={() => setShowProfile(true)}
            onOpenTab={setActiveTab}
          />
        ) : activeTab === 'Map' ? (
          <MapPage content={content} avatarSex={guestMode ? undefined : sex} profilePhoto={guestMode ? null : profilePhoto} />
        ) : (
          <FAQPage content={content} />
        )}
      </ScrollView>
      {showGuestSetup && (
        <View style={guestSetupStyles.actions}>
          <Pressable
            onPress={() => {
              setShowGuestSetup(false);
              if (guestSetupIsEditing) setShowProfile(true);
              else setActiveTab('Home');
              setGuestSetupIsEditing(false);
            }}
            style={({ pressed }) => [profileStyles.backButton, pressed && styles.pressed]}
          >
            <Text style={profileStyles.backButtonText}>{guestSetupIsEditing ? 'Cancel' : 'Skip'}</Text>
          </Pressable>
          {guestSetupStep > 1 && <Back onPress={() => setGuestSetupStep((current) => current - 1)} />}
          <Action
            label={guestSetupStep === 3 ? (guestSetupIsEditing ? 'Save Guest Profile' : 'Start as Guest') : 'Continue'}
            disabled={!guestCanContinue}
            onPress={() => {
              if (guestSetupStep < 3) setGuestSetupStep((current) => current + 1);
              else {
                setShowGuestSetup(false);
                setGuestSetupIsEditing(false);
                setActiveTab('Home');
              }
            }}
          />
        </View>
      )}
      {bottomNavigation}
    </View>;
    setShowGuestSetup(false);
    setActiveTab('Home');
  };
  const displayedProfile = guestMode ? guestProfile || 'Guest' : profile;
  const displayedTrack = guestMode ? guestTrack || 'Not selected' : track;
  const displayedProgram = guestMode ? guestProgram || 'Not selected' : activeProgram;
  const displayedStatusIndex = guestMode ? guestStatusIndex : currentStatusIndex;
  const displayedSelectedStepIndex = guestMode ? guestSelectedStepIndex : selectedStepIndex;
  const displayedCheckedRequirements = guestMode ? guestCheckedRequirements : checkedRequirements;
  const displayedExaminationAttempt = guestMode ? guestExaminationAttempt : examinationAttempt;
  const displayName = guestMode ? 'Guest' : nickname.trim() || 'Future Kabsuhenyo';
    const displayedFailedProgram = guestMode ? guestFailedProgram : failedProgram;
    const displayedReapplicationProgram = guestMode ? guestReapplicationProgram : reapplicationProgram;
    if (showGuestSetup) {
      return (
        <View style={[styles.safe, { backgroundColor: '#009c29' }]}>
          <StatusBar style="light" />
          <ScrollView
            contentContainerStyle={[styles.screen, onboardingSetupStyles.screen, guestSetupStyles.content]}
            keyboardShouldPersistTaps="handled"
          >
            <GuestProfileSetup content={content}
              step={guestSetupStep}
              profile={guestProfile}
              track={guestTrack}
              program={guestProgram}
              onProfileChange={chooseGuestProfile}
              onTrackChange={chooseGuestTrack}
              onProgramChange={setGuestProgram}
            />
          </ScrollView>
          <View style={[styles.fixedActions, onboardingSetupStyles.fixedActions]}>
            <Pressable
              onPress={() => {
                setShowGuestSetup(false);
                setGuestSetupIsEditing(false);
                if (guestSetupIsEditing) setShowProfile(true);
                else setActiveTab('Home');
              }}
              style={[styles.back, onboardingSetupStyles.back]}
            >
              <Text style={[styles.backText, onboardingSetupStyles.backText]}>{guestSetupIsEditing ? 'Cancel' : 'Skip'}</Text>
            </Pressable>
            {guestSetupStep > 1 && <Back onPress={() => setGuestSetupStep((current) => current - 1)} />}
            <Action
              label={guestSetupStep === 3 ? (guestSetupIsEditing ? 'Save Guest Profile' : 'Start as Guest') : 'Continue'}
              disabled={!guestCanContinue}
              onPress={() => {
                if (guestSetupStep < 3) setGuestSetupStep((current) => current + 1);
                else {
                  setShowGuestSetup(false);
                  setGuestSetupIsEditing(false);
                  setActiveTab('Home');
                }
              }}
            />
          </View>
        </View>
      );
    }
  return <View style={[styles.mainApp, { backgroundColor: '#078743' }]}>
    <View style={styles.mainHeader}><Pressable accessibilityRole="button" accessibilityLabel="Go to Home" style={styles.headerSide} onPress={() => { setShowProfile(false); setShowGuestSetup(false); setActiveTab('Home'); }}><Image source={require('../assets/CvSU_Logo.png')} style={styles.mainLogo} /></Pressable><Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.75} style={styles.mainTitle}>CvSU Virtual Admission Guide</Text><Pressable accessibilityLabel="Open applicant profile" onPress={() => setShowProfile(true)} style={({ pressed }) => [styles.profileButton, pressed && styles.pressed]}><Image source={!guestMode && profilePhoto ? { uri: profilePhoto } : require('../assets/Profile.png')} style={styles.profileImage} /></Pressable></View>
    {guestMode && (showGuestSetup || showProfile || activeTab === 'Home') && <Pressable accessibilityLabel="Exit guest mode" onPress={exitGuestMode} style={({ pressed }) => [profileStyles.guestModeBar, pressed && styles.pressed]}><View><Text style={profileStyles.guestModeLabel}>GUEST MODE</Text><Text style={profileStyles.guestModeCopy}>{profile ? 'Your saved applicant profile is hidden.' : 'Exploring the app as a guest.'}</Text></View><View style={profileStyles.exitGuestAction}><Ionicons name="log-out-outline" size={18} color="#075b31" /><Text style={profileStyles.exitGuestText}>Exit Guest Mode</Text></View></Pressable>}
    <ScrollView style={styles.mainContent} contentContainerStyle={[styles.mainContentInner, (activeTab === 'Home' || showProfile) && homeStyles.content, showGuestSetup && guestSetupStyles.content]} keyboardShouldPersistTaps="handled">{showGuestSetup ? <GuestProfileSetup content={content} step={guestSetupStep} profile={guestProfile} track={guestTrack} program={guestProgram} onProfileChange={chooseGuestProfile} onTrackChange={chooseGuestTrack} onProgramChange={setGuestProgram} onBack={() => setGuestSetupStep((current) => Math.max(1, current - 1))} onNext={() => setGuestSetupStep((current) => Math.min(3, current + 1))} onComplete={() => { setShowGuestSetup(false); setActiveTab('Home'); }} onSkip={() => { setShowGuestSetup(false); setActiveTab('Home'); }} /> : showProfile ? <ApplicantProfilePage content={content} contentUpdate={contentUpdate} profile={displayedProfile} track={displayedTrack} program={displayedProgram} photo={profilePhoto} nickname={nickname} sex={sex} isGuest={guestMode} onPhotoChange={onProfilePhotoChange} onNicknameChange={onNicknameChange} onEdit={onRestart} onEditGuest={() => { setShowProfile(false); setShowGuestSetup(true); }} onBack={() => { setShowProfile(false); setActiveTab('Home'); }} onGuest={viewAsGuest} onReset={resetJourney} /> : activeTab === 'Status' ? <StatusPage content={content} displayName={displayName} profile={displayedProfile} program={displayedProgram} track={displayedTrack} steps={steps} currentStatusIndex={displayedStatusIndex} onStatusChange={guestMode ? setGuestStatusIndex : setCurrentStatusIndex} selectedStepIndex={displayedSelectedStepIndex} onSelectStep={guestMode ? setGuestSelectedStepIndex : setSelectedStepIndex} checkedRequirements={displayedCheckedRequirements} onRequirementsChange={guestMode ? setGuestCheckedRequirements : setCheckedRequirements} examinationAttempt={displayedExaminationAttempt} onExaminationAttemptChange={guestMode ? setGuestExaminationAttempt : setExaminationAttempt} failedProgram={displayedFailedProgram} reapplicationProgram={displayedReapplicationProgram} onFailedProgramChange={guestMode ? setGuestFailedProgram : setFailedProgram} onReapplicationProgramChange={guestMode ? setGuestReapplicationProgram : setReapplicationProgram} onProgramChange={guestMode ? setGuestProgram : updateApplicantProgram} isGuest={guestMode} /> : activeTab === 'Journey' ? <><JourneyPage content={content} displayName={displayName} program={displayedProgram} profilePhoto={guestMode ? null : profilePhoto} steps={steps} currentStatusIndex={displayedStatusIndex} examinationAttempt={displayedExaminationAttempt} onOpenStep={openStep} isGuest={guestMode} /><StatusPage content={content} detailsOnly displayName={displayName} profile={displayedProfile} program={displayedProgram} track={displayedTrack} steps={steps} currentStatusIndex={displayedStatusIndex} onStatusChange={guestMode ? setGuestStatusIndex : setCurrentStatusIndex} selectedStepIndex={displayedSelectedStepIndex} onSelectStep={guestMode ? setGuestSelectedStepIndex : setSelectedStepIndex} checkedRequirements={displayedCheckedRequirements} onRequirementsChange={guestMode ? setGuestCheckedRequirements : setCheckedRequirements} examinationAttempt={displayedExaminationAttempt} onExaminationAttemptChange={guestMode ? setGuestExaminationAttempt : setExaminationAttempt} failedProgram={displayedFailedProgram} reapplicationProgram={displayedReapplicationProgram} onFailedProgramChange={guestMode ? setGuestFailedProgram : setFailedProgram} onReapplicationProgramChange={guestMode ? setGuestReapplicationProgram : setReapplicationProgram} onProgramChange={guestMode ? setGuestProgram : updateApplicantProgram} isGuest={guestMode} /></> : activeTab === 'Home' ? <HomePage content={content} displayName={displayName} profile={displayedProfile} program={displayedProgram} track={displayedTrack} steps={steps} currentStatusIndex={displayedStatusIndex} examinationAttempt={displayedExaminationAttempt} onOpenStep={openStep} onRestart={() => setShowProfile(true)} onOpenTab={setActiveTab} /> : activeTab === 'Map' ? <MapPage content={content} avatarSex={guestMode ? undefined : sex} profilePhoto={guestMode ? null : profilePhoto} /> : <FAQPage content={content} />}</ScrollView>
    {bottomNavigation}
  </View>;
}
function ProfilePhotoEditor({ photo, onChange }) {
  const choosePhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!result.canceled) onChange(result.assets[0].uri);
  };
  return <View style={profileStyles.photoEditor}><Image source={photo ? { uri: photo } : require('../assets/Profile.png')} style={profileStyles.photoPreview} /><View style={profileStyles.photoActions}><Text style={profileStyles.photoTitle}>Profile Picture</Text><Pressable accessibilityLabel={photo ? 'Change profile picture' : 'Upload profile picture'} onPress={choosePhoto} style={({ pressed }) => [profileStyles.photoButton, pressed && styles.pressed]}><Ionicons name="camera-outline" size={18} color="#075b31" /><Text style={profileStyles.photoButtonText}>{photo ? 'Change Picture' : 'Upload Picture'}</Text></Pressable>{photo && <Pressable accessibilityLabel="Remove profile picture" onPress={() => onChange(null)} style={({ pressed }) => [profileStyles.removePhotoButton, pressed && styles.pressed]}><Text style={profileStyles.removePhotoText}>Remove</Text></Pressable>}</View></View>;
}
function GuestProfileSetup({ content = bundledContent, step, profile, track, program, onProfileChange, onTrackChange, onProgramChange }) {
  const [query, setQuery] = useState('');
  const tracks = getTrackOptions(content, profile);
  const eligiblePrograms = getEligiblePrograms(content, profile, track);
  const filteredPrograms = eligiblePrograms.filter((item) => item.toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <View style={guestSetupStyles.page}>
      <View style={[styles.header, onboardingSetupStyles.header]}>
        <View style={styles.brand}>
          <Image source={require('../assets/CvSU_Logo.png')} style={styles.logo} />
          <View>
            <Text style={styles.eyebrow}>CAVITE STATE UNIVERSITY</Text>
            <Text style={styles.brandName}>Guest Profile</Text>
          </View>
        </View>
      </View>
      <Progress currentStep={step} totalSteps={3} />
      {step === 1 && (
        <Page kicker="LET'S GET STARTED" title="Tell us about your journey." intro="Choose the description that best matches your current academic status.">
          <View style={styles.list}>{getAcademicStatuses(content).map(({ id: value, label, description: caption }) => <Option key={value} label={label} caption={caption} value={value} selected={profile === value} onPress={() => onProfileChange(value)} profileCard />)}</View>
        </Page>
      )}
      {step === 2 && (
        <Page kicker="STEP 2 · ACADEMIC BACKGROUND" title="What was your track or strand?" intro="Your academic background determines which programs you can select.">
          <View style={styles.list}>{tracks.map(([label, caption]) => <Option key={label} label={label} caption={caption} value={label} selected={track === label} onPress={() => onTrackChange(label)} profileCard />)}</View>
        </Page>
      )}
      {step === 3 && (
        <Page kicker="STEP 3 · YOUR DIRECTION" title="Which program feels like you?" intro={`Choose from the programs available to applicants in ${track}.`}>
          <View style={styles.search}>
            <Ionicons name="search" size={20} color="#075b31" />
            <TextInput value={query} onChangeText={setQuery} placeholder="Search programs" placeholderTextColor="#8aa294" style={styles.input} />
            {query.length > 0 && <Pressable accessibilityLabel="Clear program search" onPress={() => setQuery('')} style={styles.clear}><Ionicons name="close" size={16} color="#078743" /></Pressable>}
          </View>
          {filteredPrograms.length === 0 && <Text style={styles.muted}>{eligiblePrograms.length ? 'No matching programs found.' : 'No programs are currently available for this background.'}</Text>}
          <View style={styles.list}>{filteredPrograms.map((item) => <Option key={item} label={item} value="→" selected={program === item} onPress={() => onProgramChange(item)} compact />)}</View>
        </Page>
      )}
    </View>
  );
}
function ApplicantProfilePage({ content = bundledContent, contentUpdate = {}, profile, track, program, photo, nickname, sex, isGuest = false, onPhotoChange, onNicknameChange, onEdit, onEditGuest, onBack, onGuest, onReset }) {
  const [showResetWarning, setShowResetWarning] = useState(false);
  const profileLabel = getAcademicStatusLabel(content, profile);
  const { onRefresh, refreshing, message } = contentUpdate;
  const statusRemoved = profile && profile !== 'Guest' && !getAcademicStatus(content, profile);
  return <View style={profileStyles.page}>
    <Text style={profileStyles.title}>{isGuest ? 'Guest Profile' : 'Applicant Profile'}</Text>
    <Text style={profileStyles.subtitle}>{isGuest ? 'This is a temporary profile. Your saved applicant details and progress remain private.' : 'Your application profile is saved. You can update it anytime.'}</Text>
    {statusRemoved && <Text style={profileStyles.subtitle}>This academic status is no longer offered. Edit your profile to choose a current status.</Text>}
    {!isGuest && <ProfilePhotoEditor photo={photo} onChange={onPhotoChange} />}
    {!isGuest && <View style={profileStyles.nicknameEditor}><Text style={profileStyles.nicknameLabel}>NICKNAME</Text><TextInput value={nickname} onChangeText={onNicknameChange} maxLength={30} placeholder="Enter your nickname" placeholderTextColor="#8aa294" style={profileStyles.nicknameInput} /></View>}
    <View style={profileStyles.summary}>{!isGuest && nickname.trim().length > 0 && <ProfileSummaryItem label="NICKNAME" value={nickname.trim()} />}{!isGuest && applicantSexLabels[sex] && <ProfileSummaryItem label="SEX" value={applicantSexLabels[sex]} />}<ProfileSummaryItem label="APPLICANT TYPE" value={profileLabel} /><ProfileSummaryItem label="TRACK / STRAND" value={track} /><ProfileSummaryItem label="PROGRAM" value={program} last /></View>
    <Pressable onPress={() => Linking.openURL('http://admission.cvsu.edu.ph')} style={({ pressed }) => [homeStyles.profilePortal, pressed && styles.pressed]}><View style={homeStyles.actionIcon}><Ionicons name="open-outline" size={22} color="#4c4a12" /></View><View style={homeStyles.actionCopy}><Text style={homeStyles.actionEyebrow}>OFFICIAL PORTAL</Text><Text style={homeStyles.portalTitle}>Open CvSU Admission</Text><Text style={homeStyles.portalSubtitle}>admission.cvsu.edu.ph</Text></View><Ionicons name="arrow-forward" size={22} color="#183225" /></Pressable>
    <View style={profileStyles.primaryActions}><Pressable onPress={isGuest ? onEditGuest : onEdit} style={({ pressed }) => [profileStyles.editButton, pressed && styles.pressed]}><Text style={profileStyles.editButtonText}>{isGuest ? 'Edit Guest Profile' : 'Edit Profile'}</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="Back to Home" onPress={onBack} style={({ pressed }) => [profileStyles.backButton, pressed && styles.pressed]}><Ionicons name="arrow-back" size={18} color="#075b31" /><Text style={profileStyles.backButtonText}>Back to Home</Text></Pressable></View>
    {!isGuest && <Pressable onPress={onGuest} style={({ pressed }) => [profileStyles.guestButton, pressed && styles.pressed]}><Text style={profileStyles.guestTitle}>View App as Guest</Text><Text style={profileStyles.guestCopy}>View procedures without showing or saving your profile progress.</Text></Pressable>}
    <View style={profileStyles.updateCard}>
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: !onRefresh || refreshing, busy: Boolean(refreshing) }} disabled={!onRefresh || refreshing} onPress={onRefresh} style={({ pressed }) => [profileStyles.updateButton, (!onRefresh || refreshing) && profileStyles.updateDisabled, pressed && styles.pressed]}>
        <Ionicons name="refresh-outline" size={18} color="#075b31" />
        <Text style={profileStyles.backButtonText}>{refreshing ? 'Checking for updates…' : 'Check for content updates'}</Text>
      </Pressable>
      <Text accessibilityLiveRegion="polite" style={profileStyles.updateMessage}>
        {message || (onRefresh ? 'Download the latest published admission guide.' : 'Content updates are unavailable in this build.')}
      </Text>
    </View>
    <Pressable accessibilityRole="button" onPress={() => setShowResetWarning(true)} style={({ pressed }) => [profileStyles.resetButton, pressed && styles.pressed]}><Text style={profileStyles.resetTitle}>{isGuest ? 'Reset Temporary Journey' : 'Reset Admission Journey'}</Text><Text style={profileStyles.resetCopy}>{isGuest ? 'Start this guest session again' : 'Keep your profile, start progress again'}</Text></Pressable>
    <Modal visible={showResetWarning} transparent animationType="fade" onRequestClose={() => setShowResetWarning(false)}>
      <View style={onboardingHelpStyles.backdrop}>
        <View accessibilityViewIsModal style={statusInfoStyles.warningCard}>
          <Ionicons name="warning-outline" size={30} color="#a56b00" />
          <Text accessibilityRole="header" style={styles.statusHeading}>Reset your admission progress?</Text>
          <Text style={statusInfoStyles.warningCopy}>
            {isGuest
              ? 'This clears the progress and checked requirements for this guest session.'
              : 'This clears your completed steps, checked requirements, and recorded exam result. Your applicant profile will be kept.'}
          </Text>
          <View style={profileStyles.resetDialogActions}>
            <Pressable accessibilityRole="button" onPress={() => setShowResetWarning(false)}
              style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
              <Text style={styles.backText}>Cancel</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => {
              setShowResetWarning(false);
              onReset();
            }} style={({ pressed }) => [styles.action, profileStyles.resetConfirmAction, pressed && styles.pressed]}>
              <Text style={styles.actionText}>Reset progress</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  </View>;
}
function ProfileSummaryItem({ label, value, last = false }) { return <View style={!last && profileStyles.summaryItem}><Text style={profileStyles.summaryLabel}>{label}</Text><Text style={profileStyles.summaryValue}>{value}</Text></View>; }
function HomePage({ content = bundledContent, displayName, profile, program, track, steps, currentStatusIndex, examinationAttempt, onOpenStep, onRestart, onOpenTab }) {
  const profileLabel = getAcademicStatusLabel(content, profile);
  const applicationStopped = examinationAttempt === 'stopped';
  const isFinished = currentStatusIndex === steps.length;
  const progress = Math.round((currentStatusIndex / steps.length) * 100);
  const currentStep = applicationStopped ? 'Application ended' : isFinished ? 'Enrollment complete' : steps[currentStatusIndex];
  const stage = content.statusStepDetails[currentStep]?.title || currentStep;
  const openCurrentStep = () => {
    if (applicationStopped || isFinished) {
      onOpenTab('Status');
      return;
    }
    onOpenStep(currentStatusIndex);
  };
  return <HomePageReordered displayName={displayName} profileLabel={profileLabel} track={track} program={program} steps={steps} currentStatusIndex={currentStatusIndex} progress={progress} applicationStopped={applicationStopped} isFinished={isFinished} stage={stage} onOpenStep={openCurrentStep} onRestart={onRestart} onOpenTab={onOpenTab} />;
  return <View style={homeStyles.page}><View style={homeStyles.welcome}><View style={homeStyles.welcomeCopy}><Text style={homeStyles.kicker}>CVSU VIRTUAL ADMISSION GUIDE</Text><Text style={homeStyles.title}>Welcome Back, {displayName}!</Text><Text style={homeStyles.subtitle}>{applicationStopped ? 'Thank you for applying to Cavite State University, ' + displayName + '.' : isFinished ? 'Your admission journey is complete, ' + displayName + '. Welcome to CvSU!' : 'Your admissions journey looks strong, ' + displayName + '. Keep moving through each step with confidence.'}</Text></View><View style={homeStyles.progressBadge}><Text style={homeStyles.progressBadgeText}>{progress}%</Text></View></View><Pressable onPress={() => Linking.openURL('http://admission.cvsu.edu.ph')} style={({ pressed }) => [homeStyles.portal, pressed && styles.pressed]}><View style={homeStyles.actionIcon}><Ionicons name="open-outline" size={22} color="#4c4a12" /></View><View style={homeStyles.actionCopy}><Text style={homeStyles.actionEyebrow}>OFFICIAL PORTAL</Text><Text style={homeStyles.portalTitle}>Open CvSU Admission</Text><Text style={homeStyles.portalSubtitle}>admission.cvsu.edu.ph</Text></View><Ionicons name="arrow-forward" size={22} color="#183225" /></Pressable><Pressable onPress={onRestart} style={({ pressed }) => [homeStyles.card, pressed && styles.pressed]}><Text style={homeStyles.cardEyebrow}>APPLICANT TYPE</Text><Text style={homeStyles.cardTitle}>{profileLabel}</Text><Text style={homeStyles.profileLine}>Track: {track}</Text><Text style={homeStyles.profileLine}>Program: {program}</Text><Text style={homeStyles.cardHint}>Tap to update your applicant profile and personalize your journey.</Text></Pressable><View style={homeStyles.card}><Text style={homeStyles.cardEyebrow}>YOUR PROGRESS</Text><View style={homeStyles.progressTrack}><View style={[homeStyles.progressFill, { width: `${progress}%` }]} /></View><Text style={homeStyles.progressLabel}>{progress}% Complete</Text><Text style={homeStyles.cardHint}>{currentStatusIndex} of {steps.length} admission steps completed</Text></View><Pressable onPress={openCurrentStep} style={({ pressed }) => [homeStyles.card, homeStyles.stageCard, pressed && styles.pressed]}><Text style={homeStyles.cardEyebrow}>{applicationStopped ? 'APPLICATION STATUS' : isFinished ? 'FINAL STAGE' : 'CURRENT STAGE'}</Text><Text style={homeStyles.cardTitle}>{stage}</Text><Text style={homeStyles.cardHint}>{applicationStopped || isFinished ? 'Tap Status to review your admission journey.' : 'Tap to see details and continue your progress.'}</Text></Pressable><Pressable onPress={openCurrentStep} style={({ pressed }) => [homeStyles.nextAction, pressed && styles.pressed]}><View style={homeStyles.actionIcon}><Ionicons name={applicationStopped ? 'information-circle-outline' : isFinished ? 'checkmark-circle-outline' : 'navigate-outline'} size={23} color="#4c4a12" /></View><View style={homeStyles.actionCopy}><Text style={homeStyles.actionEyebrow}>NEXT ACTION</Text><Text style={homeStyles.nextTitle}>{applicationStopped ? 'Review application status' : isFinished ? 'Review completed journey' : `Continue with ${stage}`}</Text><Text style={homeStyles.nextSubtitle}>Open Status to continue your progress.</Text></View><Ionicons name="chevron-forward" size={23} color="#183225" /></Pressable><View style={homeStyles.card}><Text style={homeStyles.cardEyebrow}>YOUR PROGRESS</Text><View style={homeStyles.progressTrack}><View style={[homeStyles.progressFill, { width: `${progress}%` }]} /></View><Text style={homeStyles.progressLabel}>{progress}% Complete</Text><Text style={homeStyles.cardHint}>{currentStatusIndex} of {steps.length} admission steps completed</Text></View><View style={homeStyles.sectionTitle}><View style={homeStyles.sectionAccent} /><Text style={homeStyles.sectionTitleText}>Quick Actions</Text></View><HomeAction icon="person-outline" title="Application Profile" subtitle="Update your applicant type" onPress={onRestart} /><HomeAction icon="map-outline" title="Campus Map" subtitle="Open map tab" onPress={() => onOpenTab('Map')} /><HomeAction icon="help-circle-outline" title="FAQ & Help" subtitle="Find answers fast" onPress={() => onOpenTab('FAQ')} /><View style={homeStyles.tip}><Text style={homeStyles.tipTitle}>Did you know?</Text><Text style={homeStyles.tipText}>Your progress stays available while this app remains open, so Status, Journey, and Home always show the same stage.</Text></View></View>;
}
function HomePageReordered({ displayName, profileLabel, track, program, steps, currentStatusIndex, progress, applicationStopped, isFinished, stage, onOpenStep, onRestart, onOpenTab }) {
  return <View style={homeStyles.page}><View style={homeStyles.welcome}><View style={homeStyles.welcomeCopy}><Text style={homeStyles.kicker}>CVSU VIRTUAL ADMISSION GUIDE</Text><Text style={homeStyles.title}>Welcome Back, {displayName}!</Text><Text style={homeStyles.subtitle}>{applicationStopped ? 'Thank you for applying to Cavite State University, ' + displayName + '.' : isFinished ? 'Your admission journey is complete, ' + displayName + '. Welcome to CvSU!' : 'Your admissions journey looks strong, ' + displayName + '. Keep moving through each step with confidence.'}</Text></View><View style={homeStyles.progressBadge}><Text style={homeStyles.progressBadgeText}>{progress}%</Text></View></View><Pressable onPress={onRestart} style={({ pressed }) => [homeStyles.card, pressed && styles.pressed]}><Text style={homeStyles.cardEyebrow}>APPLICANT TYPE</Text><Text style={homeStyles.cardTitle}>{profileLabel}</Text><Text style={homeStyles.profileLine}>Track: {track}</Text><Text style={homeStyles.profileLine}>Program: {program}</Text><Text style={homeStyles.cardHint}>Tap to update your applicant profile and personalize your journey.</Text></Pressable><Pressable onPress={onOpenStep} style={({ pressed }) => [homeStyles.card, homeStyles.stageCard, pressed && styles.pressed]}><Text style={homeStyles.cardEyebrow}>{applicationStopped ? 'APPLICATION STATUS' : isFinished ? 'FINAL STAGE' : 'CURRENT STAGE'}</Text><Text style={homeStyles.cardTitle}>{stage}</Text><Text style={homeStyles.cardHint}>{applicationStopped || isFinished ? 'Tap Status to review your admission journey.' : 'Tap to see details and continue your progress.'}</Text></Pressable><Pressable onPress={onOpenStep} style={({ pressed }) => [homeStyles.nextAction, pressed && styles.pressed]}><View style={homeStyles.actionIcon}><Ionicons name={applicationStopped ? 'information-circle-outline' : isFinished ? 'checkmark-circle-outline' : 'navigate-outline'} size={23} color="#4c4a12" /></View><View style={homeStyles.actionCopy}><Text style={homeStyles.actionEyebrow}>NEXT ACTION</Text><Text style={homeStyles.nextTitle}>{applicationStopped ? 'Review application status' : isFinished ? 'Review completed journey' : `Continue with ${stage}`}</Text><Text style={homeStyles.nextSubtitle}>Open Status to continue your progress.</Text></View><Ionicons name="chevron-forward" size={23} color="#183225" /></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`Your progress, ${progress}% complete`} accessibilityHint={applicationStopped || isFinished ? 'Opens Status' : `Opens ${stage}`} onPress={onOpenStep} style={({ pressed }) => [homeStyles.card, pressed && styles.pressed]}>
    <View style={homeStyles.progressCardHeader}><Text style={homeStyles.cardEyebrow}>YOUR PROGRESS</Text><Ionicons name="chevron-forward" size={18} color="#075b31" /></View>
    <View style={homeStyles.progressTrack}><View style={[homeStyles.progressFill, { width: `${progress}%` }]} /></View>
    <Text style={homeStyles.progressLabel}>{progress}% Complete</Text>
    <Text style={homeStyles.cardHint}>{currentStatusIndex} of {steps.length} admission steps completed</Text>
  </Pressable><View style={homeStyles.sectionTitle}><View style={homeStyles.sectionAccent} /><Text style={homeStyles.sectionTitleText}>Quick Actions</Text></View><HomeAction icon="person-outline" title="Application Profile" subtitle="Update your applicant type" onPress={onRestart} /><HomeAction icon="map-outline" title="Campus Map" subtitle="Open map tab" onPress={() => onOpenTab('Map')} /><HomeAction icon="help-circle-outline" title="FAQ & Help" subtitle="Find answers fast" onPress={() => onOpenTab('FAQ')} /><View style={homeStyles.tip}><Text style={homeStyles.tipTitle}>Did you know?</Text><Text style={homeStyles.tipText}>Your profile and progress remain available on this device after you close the app, and the guide can be reviewed offline. Internet access is still required to open the official admission portal and submit or update an application.</Text></View></View>;
}
function HomeAction({ icon, title, subtitle, onPress }) { return <Pressable onPress={onPress} style={({ pressed }) => [homeStyles.quickAction, pressed && styles.pressed]}><View style={homeStyles.quickIcon}><Ionicons name={icon} size={23} color="#52695b" /></View><View style={homeStyles.actionCopy}><Text style={homeStyles.quickTitle}>{title}</Text><Text style={homeStyles.quickSubtitle}>{subtitle}</Text></View><Ionicons name="chevron-forward" size={20} color="#698073" /></Pressable>; }
function FAQPage({ content = bundledContent } = {}) {
  const faqTrivia = getCampusTrivia(content);
  const hasTagalog = Boolean(content.faqTranslations?.some(Boolean));
  const [showTagalog, setShowTagalog] = useState(false);
  const categories = ['All', ...new Set(content.faqItems.map(([category]) => category))];
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [openQuestion, setOpenQuestion] = useState(null);
  const [triviaIndex, setTriviaIndex] = useState(0);
  const guideMotion = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(guideMotion, { toValue: 1, duration: 850, useNativeDriver: true }),
      Animated.timing(guideMotion, { toValue: 0, duration: 850, useNativeDriver: true })
    ]));
    animation.start();
    return () => animation.stop();
  }, [guideMotion]);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredItems = content.faqItems.flatMap(([itemCategory, question, answer], index) => {
    const translation = content.faqTranslations?.[index];
    if (category !== 'All' && itemCategory !== category) return [];
    if (normalizedQuery && ![question, answer, ...(translation || [])].some((text) => text.toLowerCase().includes(normalizedQuery))) return [];
    const [displayQuestion, displayAnswer] = showTagalog && translation ? translation : [question, answer];
    return [{ itemCategory, key: JSON.stringify([itemCategory, question]), displayQuestion, displayAnswer }];
  });
  const guideStyle = { transform: [{ translateY: guideMotion.interpolate({ inputRange: [0, 1], outputRange: [3, -8] }) }, { rotate: guideMotion.interpolate({ inputRange: [0, 1], outputRange: ['-2deg', '2deg'] }) }] };
  return <View style={faqStyles.page}><View style={[journeyStyles.hero, faqStyles.hero]}><View style={journeyStyles.heroTop}><Text style={journeyStyles.heroTag}>ADMISSION GUIDE</Text></View><Text style={journeyStyles.heroTitle}>Frequently Asked Questions</Text><Text style={journeyStyles.heroCopy}>Ask, explore, and find your next answer.</Text></View>{faqTrivia.length > 0 && <Pressable disabled={faqTrivia.length < 2} accessibilityLabel={faqTrivia.length > 1 ? 'Show another campus fact' : undefined} onPress={() => setTriviaIndex((current) => (current + 1) % faqTrivia.length)} style={({ pressed }) => [faqStyles.guideCard, pressed && faqStyles.guideCardPressed]}><View style={faqStyles.triviaBubble}><Text style={faqStyles.triviaEyebrow}>CAMPUS TRIVIA</Text><Text style={faqStyles.triviaText}>{faqTrivia[triviaIndex % faqTrivia.length]}</Text>{faqTrivia.length > 1 && <Text style={faqStyles.triviaHint}>Tap the avatar for another fact.</Text>}</View><View style={faqStyles.guideStage}><Animated.Image source={faqGuideImage} style={[faqStyles.guideImage, guideStyle]} resizeMode="contain" /><View style={faqStyles.guideBadge}><Text style={faqStyles.guideBadgeText}>GUIDE</Text></View></View></Pressable>}{hasTagalog && <View accessibilityRole="tablist" accessibilityLabel="FAQ language" style={faqStyles.languageTabs}>
    {['English', 'Tagalog'].map((language) => {
      const tagalog = language === 'Tagalog';
      const selected = showTagalog === tagalog;
      return <Pressable key={language} accessibilityRole="tab" accessibilityState={{ selected }}
        onPress={() => setShowTagalog(tagalog)} style={[faqStyles.languageTab, selected && faqStyles.languageTabSelected]}>
        <Text style={[faqStyles.languageText, selected && faqStyles.languageTextSelected]}>{language}</Text>
      </Pressable>;
    })}
  </View>}<View style={faqStyles.findHeader}><View><Text style={faqStyles.findTitle}>Find your answer</Text><Text style={faqStyles.findCopy}>Search by topic or browse a category.</Text></View><Text style={faqStyles.resultCount}>{filteredItems.length} {filteredItems.length === 1 ? 'answer' : 'answers'}</Text></View><View style={faqStyles.search}><Ionicons name="search" size={20} color="#075b31" /><TextInput value={query} onChangeText={(value) => { setQuery(value); setOpenQuestion(null); }} placeholder="Search questions or answers" placeholderTextColor="#819187" style={faqStyles.searchInput} />{query.length > 0 && <Pressable accessibilityLabel="Clear FAQ search" onPress={() => setQuery('')} style={faqStyles.clearSearch}><Ionicons name="close" size={17} color="#52695b" /></Pressable>}</View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={faqStyles.categories}>{categories.map((item) => <Pressable key={item} onPress={() => { setCategory(item); setOpenQuestion(null); }} style={({ pressed }) => [faqStyles.category, category === item && faqStyles.categoryActive, pressed && styles.pressed]}><Text style={[faqStyles.categoryText, category === item && faqStyles.categoryTextActive]}>{item}</Text></Pressable>)}</ScrollView><View style={faqStyles.answers}>{filteredItems.map(({ itemCategory, key: itemKey, displayQuestion, displayAnswer }) => { const isOpen = openQuestion === itemKey; return <Pressable key={itemKey} accessibilityRole="button" accessibilityState={{ expanded: isOpen }} onPress={() => setOpenQuestion(isOpen ? null : itemKey)} style={({ pressed }) => [faqStyles.answerCard, isOpen && faqStyles.answerCardOpen, pressed && styles.pressed]}><View style={faqStyles.questionRow}><View style={faqStyles.questionCopy}><Text style={faqStyles.question}>{displayQuestion}</Text>{isOpen && <Text style={faqStyles.answer}>{displayAnswer}</Text>}</View><Ionicons name={isOpen ? 'chevron-up' : 'chevron-forward'} size={18} color="#009c29" /></View>{isOpen && <View style={faqStyles.answerMeta}><View style={faqStyles.answerDot} /><Text style={faqStyles.answerCategory}>{itemCategory}</Text></View>}</Pressable>; })}{filteredItems.length === 0 && <View style={faqStyles.empty}><Ionicons name="search-outline" size={30} color="#698073" /><Text style={faqStyles.emptyTitle}>No answers found</Text><Text style={faqStyles.emptyCopy}>Try another phrase or choose a different category.</Text></View>}</View></View>;
}
const entranceRoutes = [1, 2, 3];
const alternateExamVenuePhotos = {
  rolle: require('../assets/Rolle Hall.jpg'),
  ccj: require('../assets/CCJ.jpg')
};
const admissionLocations = [
  { number: 1, name: 'Office of Student Affairs and Services (OSAS) - Registrar', purpose: 'Validation and assessment of requirements', description: 'Submit your required documents here for validation and assessment before moving to the next admission step.', guide: 'Start at the southern entrance and follow the road to marker 1 beside the oval.', image: require('../assets/OSAS (Final).jpg'), routeGates: entranceRoutes },
  { number: 2, name: 'International Convention Center (ICON)', purpose: 'Admission examination', description: 'Proceed to the International Convention Center for your scheduled admission examination. Bring your appointment details and valid identification.', guide: 'From marker 1, walk north past the oval, then turn left toward marker 2.', image: require('../assets/ICON (Final).jpg'), routeGates: entranceRoutes },
  { number: 3, name: 'University Clinic (Infirmary)', purpose: 'Medical examination', description: 'Visit the University Clinic for your required medical examination and follow the clinic staff instructions for your assessment.', guide: 'Return to the southern road and continue east from marker 1 to marker 3.', image: require('../assets/INFIRMARY (Final).jpg'), routeGates: [0] }
];
const campusGates = [
  { number: 1, name: 'Gate 1', purpose: 'Campus entrance', description: 'Use Gate 1 as your campus entry point when it is indicated on your admission appointment or by campus personnel.', image: require('../assets/Gate_1.jpg') },
  { number: 2, name: 'Gate 2', purpose: 'Campus entrance', description: 'Use Gate 2 as your campus entry point when it is indicated on your admission appointment or by campus personnel.', image: require('../assets/Gate_2.jpg') },
  { number: 3, name: 'Gate 3', purpose: 'Campus entrance', description: 'Use Gate 3 as your campus entry point when it is indicated on your admission appointment or by campus personnel.', image: require('../assets/Gate_3.jpg') }
];
const campusTips = [
  ['Arrive Early', 'Expect traffic, especially during peak hours. Allow extra travel time so you can enter the campus, find the correct building, and arrive before your scheduled appointment.'],
  ['Getting Around', 'If you are not sure how to get to a building, you can ride a tricycle for around 15 pesos. Ask the driver or campus personnel for directions to your destination.'],
  ['Prepare for Inspection', 'Security personnel may check your attire, identification, bags, and other requirements before allowing entry. Keep your documents ready and follow campus guidelines.']
];
function MapPage({ content = bundledContent, avatarSex, profilePhoto }) {
  const examVenue = resolveMapExamVenue(getExamVenue(content));
  const usesIcon = examVenue.id === 'icon';
  const locations = usesIcon ? admissionLocations : [
    admissionLocations[0],
    {
      number: 2, name: examVenue.name, purpose: 'Admission examination', directions: examVenue.directions,
      image: alternateExamVenuePhotos[examVenue.id],
      routeGates: examVenue.id === 'ccj' ? [0] : examVenue.pin ? entranceRoutes : []
    },
    admissionLocations[2]
  ];
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedGate, setSelectedGate] = useState(null);
  const [activeGuideRoute, setActiveGuideRoute] = useState(null);
  const [showLocationPreview, setShowLocationPreview] = useState(false);
  const [showLocationDetailsButton, setShowLocationDetailsButton] = useState(false);
  const [showLocationImage, setShowLocationImage] = useState(false);
  const [attireImage, setAttireImage] = useState(null);
  const [showAttireGuide, setShowAttireGuide] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [walkingSpeed, setWalkingSpeed] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);
  const tip = campusTips[tipIndex];
  const selected = selectedGate !== null ? campusGates[selectedGate] : selectedLocation !== null ? locations[selectedLocation] : null;
  const selectLocation = (index) => {
    setSelectedLocation(index);
    setSelectedGate(null);
    setActiveGuideRoute(null);
    setShowLocationPreview(true);
    setShowLocationDetailsButton(false);
  };
  const selectWalkingRoute = (gateNumber) => {
    if (selectedLocation === null || !selected?.routeGates?.includes(gateNumber)) return;
    const buildingNumber = selectedLocation + 1;
    const route = { buildingNumber, gateNumber, runId: Date.now() };
    if (buildingNumber === 2 && !usesIcon) {
      const points = alternateExamRoute(examVenue, gateNumber);
      if (!points) return;
      setActiveGuideRoute({ ...route, points, destination: examVenue.name });
    } else {
      setActiveGuideRoute(route);
    }
    setShowLocationPreview(false);
    setShowLocationDetailsButton(true);
  };
  const selectGate = (index) => {
    setSelectedGate(index);
    setActiveGuideRoute(null);
    setShowLocationPreview(false);
    setShowLocationDetailsButton(true);
  };
  const zoomIn = () => setZoom((current) => Math.min(3, current + 0.5));
  const zoomOut = () => setZoom((current) => Math.max(1, current - 0.5));
  const resetMap = () => setZoom(1);
  return <View style={mapStyles.page}>
    <View style={[journeyStyles.hero, mapStyles.hero]}><View style={journeyStyles.heroTop}><Text style={journeyStyles.heroTag}>CAMPUS TRAIL</Text></View><Text style={journeyStyles.heroTitle}>Campus Map</Text><Text style={journeyStyles.heroCopy}>Follow the guided route from the road to your admission stop.</Text></View>
    <AttireGuide expanded={showAttireGuide} onToggle={() => setShowAttireGuide((current) => !current)} onOpenImage={setAttireImage} />
    <View style={mapStyles.mapCard}>
      <View style={mapStyles.mapHeader}><View><Text style={mapStyles.mapTitle}>CvSU Main Campus</Text><Text style={mapStyles.mapSubtitle}>Use the controls to inspect the campus</Text></View><View style={mapStyles.guidedBadge}><View style={mapStyles.guidedDot} /><Text style={mapStyles.guidedText}>GUIDED</Text></View></View>
      <MapLegend />
      <MapCanvas avatarSex={avatarSex} examVenue={examVenue} onSelectWalkingRoute={selectWalkingRoute} walkingSpeed={walkingSpeed} onWalkingSpeedChange={setWalkingSpeed} zoom={zoom} selected={selected} guideRoute={activeGuideRoute} selectedBuildingNumber={selectedGate === null && selectedLocation !== null ? selected.number : null} selectedGateNumber={selectedGate !== null ? selected.number : null} showLocationPreview={showLocationPreview} showLocationDetailsButton={showLocationDetailsButton} onCloseLocationPreview={() => { setShowLocationPreview(false); setShowLocationDetailsButton(true); }} onOpenLocationPreview={() => setShowLocationPreview(true)} onOpenLocationImage={() => setShowLocationImage(true)} onSelectMarker={selectLocation} onSelectGate={selectGate} onZoomIn={zoomIn} onZoomOut={zoomOut} onReset={resetMap} onFullscreen={() => { setZoom(1); setIsFullscreen(true); }} profilePhoto={profilePhoto} />
    </View>
    <View style={mapStyles.locationsCard}><View style={mapStyles.locationsHeader}><Text style={mapStyles.locationsTitle}>Admission Locations</Text><Text style={mapStyles.locationsCount}>3 stops</Text></View>{locations.map((location, index) => <Pressable key={location.number} onPress={() => selectLocation(index)} style={({ pressed }) => [mapStyles.locationRow, selectedGate === null && index === selectedLocation && mapStyles.locationRowSelected, index === locations.length - 1 && mapStyles.locationRowLast, pressed && styles.pressed]}>{selectedGate === null && index === selectedLocation && <View pointerEvents="none" style={mapStyles.locationSelectedStripe} />}<View style={[mapStyles.locationNumber, selectedGate === null && index === selectedLocation && mapStyles.locationNumberSelected]}><Text style={mapStyles.locationNumberText}>{location.number}</Text></View><View style={mapStyles.locationCopy}><Text style={mapStyles.locationName}>{location.name}</Text><Text style={mapStyles.locationPurpose}>{location.purpose}</Text></View><Ionicons name="chevron-forward" size={20} color="#075b31" /></Pressable>)}</View>
    <Pressable accessibilityRole="button" accessibilityLabel="Show next campus tip" onPress={() => setTipIndex((current) => (current + 1) % campusTips.length)} style={({ pressed }) => [mapStyles.tip, pressed && styles.pressed]}><View style={mapStyles.tipBadge}><Text style={mapStyles.tipBadgeText}>TIP</Text></View><View style={mapStyles.tipCopy}><Text style={mapStyles.tipTitle}>{tip[0]}</Text><Text style={mapStyles.tipText}>{tip[1]}</Text><Text style={mapStyles.tipHint}>Tap for another tip</Text></View><Ionicons name="chevron-forward-circle-outline" size={23} color="#8a7412" /></Pressable>
    <Modal visible={isFullscreen} animationType="fade" onRequestClose={() => setIsFullscreen(false)}><SafeAreaView style={mapStyles.fullscreen}><View style={mapStyles.fullscreenHeader}><View><Text style={mapStyles.fullscreenEyebrow}>CVSU MAIN CAMPUS</Text><Text style={mapStyles.fullscreenTitle}>Campus Map</Text></View><Pressable accessibilityLabel="Close full screen map" onPress={() => setIsFullscreen(false)} style={({ pressed }) => [mapStyles.closeControl, pressed && styles.pressed]}><Ionicons name="close" size={24} color="#183225" /></Pressable></View><MapLegend fullscreen /><MapCanvas avatarSex={avatarSex} examVenue={examVenue} onSelectWalkingRoute={selectWalkingRoute} fullscreen walkingSpeed={walkingSpeed} onWalkingSpeedChange={setWalkingSpeed} zoom={1} selected={selected} guideRoute={activeGuideRoute} selectedBuildingNumber={selectedGate === null && selectedLocation !== null ? selected.number : null} selectedGateNumber={selectedGate !== null ? selected.number : null} showLocationPreview={showLocationPreview} showLocationDetailsButton={showLocationDetailsButton} onCloseLocationPreview={() => { setShowLocationPreview(false); setShowLocationDetailsButton(true); }} onOpenLocationPreview={() => setShowLocationPreview(true)} onOpenLocationImage={() => setShowLocationImage(true)} onSelectMarker={selectLocation} onSelectGate={selectGate} onZoomIn={zoomIn} onZoomOut={zoomOut} onReset={resetMap} onFullscreen={() => setIsFullscreen(false)} profilePhoto={profilePhoto} /></SafeAreaView></Modal>
    <Modal visible={showLocationImage && !!selected} transparent animationType="fade" hardwareAccelerated onRequestClose={() => setShowLocationImage(false)}><View style={mapStyles.imageModal}><Pressable accessibilityLabel="Close location image" onPress={() => setShowLocationImage(false)} style={mapStyles.imageModalBackdrop} /><View style={mapStyles.imageModalContent}>{selected && <Image source={selected.image} style={mapStyles.imageModalImage} resizeMode="contain" />}<Pressable accessibilityLabel="Close location image" onPress={() => setShowLocationImage(false)} style={({ pressed }) => [mapStyles.imageModalClose, pressed && styles.pressed]}><Ionicons name="close" size={24} color="#183225" /></Pressable></View></View></Modal>
    <Modal visible={!!attireImage} transparent animationType="fade" hardwareAccelerated onRequestClose={() => setAttireImage(null)}><View style={mapStyles.imageModal}><Pressable accessibilityLabel="Close attire image" onPress={() => setAttireImage(null)} style={mapStyles.imageModalBackdrop} /><View style={mapStyles.imageModalContent}>{attireImage && <Image source={attireImage.source} style={mapStyles.imageModalImage} resizeMode="contain" />}<Pressable accessibilityLabel="Close attire image" onPress={() => setAttireImage(null)} style={({ pressed }) => [mapStyles.imageModalClose, pressed && styles.pressed]}><Ionicons name="close" size={24} color="#183225" /></Pressable></View></View></Modal>
  </View>;
}
const bundledAttireImages = {
  dressCode: require('../assets/Dresscode.jpg'),
  femaleUniform: require('../assets/Female_Uniform.jpg'),
  maleUniform: require('../assets/Male_Uniform.jpg')
};

function AttireGuide({ expanded, onToggle, onOpenImage }) {
  const guide = attireGuide;
  const [tab, setTab] = useState('visit');
  const section = guide[tab];
  const renderImage = (key) => {
    const image = guide.images[key];
    const source = bundledAttireImages[key];
    const isDressCode = key === 'dressCode';
    return (
      <Pressable key={key} accessibilityRole="button" accessibilityLabel={'View ' + image.label}
        onPress={() => onOpenImage({ source })}
        style={({ pressed }) => [isDressCode ? mapStyles.attireImageButton : mapStyles.uniformCard, pressed && styles.pressed]}>
        <Image source={source} style={isDressCode ? mapStyles.attireDresscodeImage : mapStyles.uniformImage} resizeMode="contain" />
        {!isDressCode && <Text style={mapStyles.uniformLabel}>{image.label}</Text>}
      </Pressable>
    );
  };
  return (
    <View style={mapStyles.attireSection}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={onToggle}
        style={({ pressed }) => [mapStyles.attireHeader, pressed && styles.pressed]}>
        <Text style={mapStyles.attireHeaderText}>Campus attire &amp; uniform guide</Text>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={22} color="#f7d521" />
      </Pressable>
      {expanded && <View style={mapStyles.attireCard}>
        <Text style={mapStyles.attireEyebrow}>CAMPUS READY</Text>
        <Text style={mapStyles.attireGuideTitle}>{guide.title}</Text>
        <View style={mapStyles.attireTabs}>
          {['visit', 'classes'].map((key) => (
            <Pressable key={key} accessibilityRole="tab" accessibilityState={{ selected: tab === key }}
              onPress={() => setTab(key)}
              style={({ pressed }) => [mapStyles.attireTab, tab === key && mapStyles.attireTabActive, pressed && styles.pressed]}>
              <Text style={[mapStyles.attireTabText, tab === key && mapStyles.attireTabTextActive]}>{guide[key].label}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={mapStyles.attireIntro}>{section.intro}</Text>
        {section.notes.map(([title, paragraphs], index) => (
          <View key={title + index} style={mapStyles.attireNote}>
            <Text style={mapStyles.attireNoteTitle}>{title}</Text>
            {paragraphs.map((paragraph) => <Text key={paragraph} style={mapStyles.attireNoteText}>{paragraph}</Text>)}
          </View>
        ))}
        {tab === 'visit' && renderImage('dressCode')}
        {Boolean(section.caption) && <Text style={mapStyles.attireCaption}>{section.caption}</Text>}
        {tab === 'classes' &&
          <View style={mapStyles.uniformRow}>{renderImage('femaleUniform')}{renderImage('maleUniform')}</View>}
      </View>}
    </View>
  );
}

function MapLegend({ fullscreen = false }) { return <View style={[mapStyles.legendImageFrame, fullscreen && mapStyles.fullscreenLegend]}><Image source={require('../assets/CvSU_Map_Legends.png')} style={mapStyles.legendImage} resizeMode="contain" /></View>; }
function LocationPreview({ location, onClose, onOpenImage, onSelectRoute }) {
  return (
    <View style={mapStyles.locationPreview}>
      <View style={mapStyles.locationPreviewHeader}>
        <View style={mapStyles.locationPreviewHeading}>
          <Text style={mapStyles.locationPreviewEyebrow}>{location.name.startsWith('Gate') ? location.name.toUpperCase() : 'LOCATION ' + location.number}</Text>
          <Text style={mapStyles.locationPreviewTitle}>{location.name}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Close location details" onPress={onClose} hitSlop={4}
          style={({ pressed }) => [mapStyles.locationPreviewClose, pressed && styles.pressed]}>
          <Ionicons name="close" size={20} color="#183225" />
        </Pressable>
      </View>
      <ScrollView style={mapStyles.locationPreviewScroll} contentContainerStyle={mapStyles.locationPreviewCopy} nestedScrollEnabled>
        <View style={mapStyles.locationPreviewSummary}>
          {location.image && <Pressable accessibilityRole="button" accessibilityLabel={'View ' + location.name + ' image'}
            onPress={onOpenImage} style={mapStyles.locationPreviewThumbnail}>
            <Image source={location.image} style={mapStyles.locationPreviewImage} resizeMode="cover" />
            <View style={mapStyles.locationPreviewImageHint}><Ionicons name="expand-outline" size={11} color="#fff" /></View>
          </Pressable>}
          <View style={mapStyles.locationPreviewHeading}>
            <Text style={mapStyles.locationPreviewPurpose}>{location.purpose}</Text>
            {Boolean(location.directions) && <Text style={mapStyles.locationPreviewDescription}>{location.directions}</Text>}
          </View>
        </View>
        {location.routeGates?.length > 0 && <View style={mapStyles.walkRouteList}>
          <Text style={mapStyles.locationPreviewEyebrow}>HOW TO GET THERE</Text>
          <View style={mapStyles.walkRouteButtons}>
            {location.routeGates.map((gate) => (
              <Pressable key={gate} accessibilityRole="button" accessibilityLabel={gate === 0 ? 'Start walking guide' : 'Walk from Gate ' + gate}
                onPress={() => onSelectRoute(gate)} hitSlop={{ top: 5, bottom: 5 }} style={({ pressed }) => [mapStyles.walkRouteButton, pressed && styles.pressed]}>
                {gate === 0 && <Ionicons name="walk-outline" size={15} color="#fff" />}
                <Text style={mapStyles.walkRouteButtonText}>{gate === 0 ? 'Start walking guide' : 'Gate ' + gate}</Text>
              </Pressable>
            ))}
          </View>
        </View>}
      </ScrollView>
    </View>
  );
}
const mapMarkerPositions = {
  1: { left: '53.5%', top: '60%' },
  2: { left: '60%', top: '25%' },
  3: { left: '17%', top: '67%' }
};
const campusMapImages = {
  icon: require('../assets/CvSU_Map.png'),
  rolle: require('../assets/CvSU_Map (Rolle Hall).png'),
  ccj: require('../assets/CvSU_Map (CCJ).png')
};
const gateMarkerPositions = {
  1: { left: '37%', top: '72%' },
  2: { left: '25%', top: '45%' },
  3: { left: '56%', top: '71.5%' }
};
const guideRoutes = {
  1: {
    3: [{ x: 55, y: 80 }, { x: 50, y: 65 }, { x: 53.5, y: 65 }],
    2: [{ x: 24, y: 52 }, { x: 30, y: 53 }, { x: 45, y: 52 }, { x: 51, y: 65 }, { x: 53.5, y: 65 }],
    1: [{ x: 35, y: 79 }, { x: 55, y: 78 }, { x: 50, y: 65 }, { x: 53.5, y: 65 }]
  },
  2: {
    2: [{ x: 24, y: 52 }, { x: 22, y: 42 }, { x: 70, y: 39 }, { x: 68, y: 28 }, { x: 60, y: 28 }],
    3: [{ x: 55, y: 78 }, { x: 77, y: 77 }, { x: 81, y: 74 }, { x: 68, y: 28 },{ x: 60, y: 28 }],
    1: [{ x: 35, y: 79 }, { x: 77, y: 77 }, { x: 81, y: 74 }, { x: 68, y: 28 },{ x: 60, y: 28 }]
  },
  3: {
    0: [{ x: 26, y: 80 }, { x: 20, y: 67 }, { x: 17, y: 67 }]
  },
  rolle: {
    // Set the confirmed destination as { x, y }, or place its pin in the admin editor.
    destination: null,
    // Gate routes list their points in walking order. The destination pin is appended.
    2: [{ x: 24, y: 52 }, { x: 22, y: 42 }, { x: 50, y: 39 }],
    3: [{ x: 55, y: 78 }, { x: 77, y: 77 }, { x: 81, y: 74 }, { x: 68, y: 38 },{ x: 50, y: 39 }],
    1: [{ x: 35, y: 79 }, { x: 77, y: 77 }, { x: 81, y: 74 }, { x: 68, y: 38 },{ x: 50, y: 39 }]
  },
  ccj: [
    { x: 26, y: 80 },
    { x: 22, y: 64 },
    { x: 17, y: 63 } // CCJ destination, slightly above the Infirmary.
  ]
};
const guideRestingPoint = { x: 43, y: 98 };
function resolveMapExamVenue(venue) {
  if (venue.pin) return venue;
  if (venue.id === 'rolle') return { ...venue, pin: guideRoutes.rolle.destination };
  if (venue.id === 'ccj') return { ...venue, pin: guideRoutes.ccj.at(-1) };
  return venue;
}

function alternateExamRoute(venue, gate) {
  if (venue.id === 'ccj') return [...guideRoutes.ccj.slice(0, -1), venue.pin];
  const points = guideRoutes.rolle[gate];
  return points && venue.pin ? [...points, venue.pin] : null;
}

function containedMapPoint(point, mapSize) {
  const scale = Math.min(mapSize.width / 1080, mapSize.height / 1350);
  const width = 1080 * scale;
  const height = 1350 * scale;
  return { x: (mapSize.width - width) / 2 + width * point.x / 100, y: (mapSize.height - height) / 2 + height * point.y / 100 };
}

function percentToPoint(point, size) {
  return { x: (point.x / 100) * size.width, y: (point.y / 100) * size.height };
}
function WalkingDust({ delay, side }) {
  const puff = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animation = Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.timing(puff, { toValue: 1, duration: 620, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(puff, { toValue: 0, duration: 0, useNativeDriver: true })
    ]));
    animation.start();
    return () => animation.stop();
  }, [delay, puff]);
  return <Animated.View pointerEvents="none" style={[walkerStyles.dust, { opacity: puff.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.55, 0] }), transform: [{ translateX: puff.interpolate({ inputRange: [0, 1], outputRange: [side * 5, side * 19] }) }, { translateY: puff.interpolate({ inputRange: [0, 1], outputRange: [0, -9] }) }, { scale: puff.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1.5] }) }] }]} />;
}
function CampusWalker({ avatarSex, walking, walkingSpeed = 1 }) {
  const female = avatarSex === 'female';
  const stride = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    stride.setValue(0);
    if (!walking) return;
    const cycle = Animated.loop(Animated.sequence([
      Animated.timing(stride, { toValue: 1, duration: 180 / walkingSpeed, useNativeDriver: true }),
      Animated.timing(stride, { toValue: -1, duration: 360 / walkingSpeed, useNativeDriver: true }),
      Animated.timing(stride, { toValue: 0, duration: 180 / walkingSpeed, useNativeDriver: true })
    ]));
    cycle.start();
    return () => { cycle.stop(); stride.setValue(0); };
  }, [walking, stride, walkingSpeed]);
  const swing = (opposite = false) => ({ transform: [{ rotate: stride.interpolate({ inputRange: [-1, 0, 1], outputRange: opposite ? ['24deg', '0deg', '-24deg'] : ['-24deg', '0deg', '24deg'] }) }] });
  const bounce = {
    transform: [
      { translateY: stride.interpolate({ inputRange: [-1, 0, 1], outputRange: [-2, 0, -2] }) },
      { rotate: stride.interpolate({ inputRange: [-1, 0, 1], outputRange: ['-3deg', '0deg', '3deg'] }) }
    ]
  };
  const ponytailSwing = {
    transform: [{ rotate: stride.interpolate({ inputRange: [-1, 0, 1], outputRange: ['-8deg', '0deg', '8deg'] }) }]
  };
  return (
    <View style={walkerStyles.figure}>
      <View style={walkerStyles.shadow} />
      {walking && <><WalkingDust delay={0} side={-1} /><WalkingDust delay={220} side={1} /><WalkingDust delay={430} side={-1} /></>}
      <Animated.View style={[walkerStyles.body, bounce]}>
        {female && <Animated.View style={[walkerStyles.ponytail, ponytailSwing]} />}
        {[false, true].map((right) => (
          <Animated.View key={String(right)}
            style={[walkerStyles.leg, right ? walkerStyles.rightLeg : walkerStyles.leftLeg, female && walkerStyles.skirtLeg, swing(right)]}>
            {female && <View style={walkerStyles.sock} />}
            <View style={[walkerStyles.shoe, female && walkerStyles.strapShoe]}>
              {female && <View style={walkerStyles.shoeStrap} />}
            </View>
          </Animated.View>
        ))}
        <Animated.View style={[walkerStyles.arm, walkerStyles.leftArm, swing(true)]}><View style={walkerStyles.hand} /></Animated.View>
        <Animated.View style={[walkerStyles.arm, walkerStyles.rightArm, swing()]}><View style={walkerStyles.hand} /></Animated.View>
        {female && <View style={walkerStyles.skirt}>
          <View style={[walkerStyles.skirtPleat, walkerStyles.skirtPleatLeft]} />
          <View style={[walkerStyles.skirtPleat, walkerStyles.skirtPleatRight]} />
        </View>}
        <View style={[walkerStyles.shirt, female && walkerStyles.blouse]}><View style={walkerStyles.collar} /></View>
        <View style={walkerStyles.head}>
          <View style={[walkerStyles.hair, female && walkerStyles.femaleFringe]} />
          <View style={walkerStyles.eyes}><View style={walkerStyles.eye} /><View style={walkerStyles.eye} /></View>
          {female && <><View style={[walkerStyles.blush, walkerStyles.blushLeft]} /><View style={[walkerStyles.blush, walkerStyles.blushRight]} /></>}
          <View style={walkerStyles.smile} />
          {female ? <View style={walkerStyles.bow}>
            <View style={[walkerStyles.bowLoop, walkerStyles.bowLoopLeft]} />
            <View style={[walkerStyles.bowLoop, walkerStyles.bowLoopRight]} />
            <View style={walkerStyles.bowKnot} />
          </View> : <View style={walkerStyles.cap}><View style={walkerStyles.capBrim} /></View>}
        </View>
      </Animated.View>
    </View>
  );
}
const walkerStyles = StyleSheet.create({
  dust: { position: 'absolute', left: 14, bottom: 1, width: 9, height: 7, borderRadius: 5, backgroundColor: '#f0ebd9' },
  figure: { width: 36, height: 46 }, shadow: { position: 'absolute', left: 6, bottom: 0, width: 25, height: 5, borderRadius: 13, backgroundColor: 'rgba(0,0,0,0.22)' },
  body: { width: 36, height: 44 }, head: { position: 'absolute', top: 3, left: 9, width: 19, height: 19, borderRadius: 9, backgroundColor: '#f4c694', borderWidth: 1, borderColor: '#70482e' },
  hair: { position: 'absolute', top: 0, left: 0, right: 0, height: 6, borderTopLeftRadius: 9, borderTopRightRadius: 9, backgroundColor: '#332b22' },
  ponytail: { position: 'absolute', left: 22, top: 5, width: 12, height: 23, borderTopLeftRadius: 8, borderTopRightRadius: 8, borderBottomLeftRadius: 9, borderBottomRightRadius: 3, backgroundColor: '#402921' },
  femaleFringe: { height: 7, borderBottomRightRadius: 7, backgroundColor: '#402921' },
  bow: { position: 'absolute', right: -8, top: -4, width: 18, height: 11 },
  bowLoop: { position: 'absolute', top: 1, width: 9, height: 8, borderRadius: 3, backgroundColor: '#f486b6', borderWidth: 1, borderColor: '#9b345e' },
  bowLoopLeft: { left: 0, transform: [{ rotate: '21deg' }] },
  bowLoopRight: { right: 0, transform: [{ rotate: '-21deg' }] },
  bowKnot: { position: 'absolute', top: 2, left: 6, width: 6, height: 6, borderRadius: 3, backgroundColor: '#ffc4dd', borderWidth: 1, borderColor: '#9b345e' },
  blush: { position: 'absolute', top: 11, width: 3, height: 2, borderRadius: 1, backgroundColor: '#d77875' },
  blushLeft: { left: 2 },
  blushRight: { right: 2 },
  blouse: { height: 10, borderBottomLeftRadius: 2, borderBottomRightRadius: 2 },
  skirt: { position: 'absolute', top: 29, left: 7, width: 23, height: 10, borderTopLeftRadius: 4, borderTopRightRadius: 4, borderBottomLeftRadius: 2, borderBottomRightRadius: 2, backgroundColor: '#a74770', borderTopWidth: 2, borderTopColor: '#72314d' },
  skirtPleat: { position: 'absolute', top: 0, bottom: 1, width: 2, borderRadius: 1, backgroundColor: '#e999b9' },
  skirtPleatLeft: { left: 5, transform: [{ rotate: '13deg' }] },
  skirtPleatRight: { right: 5, transform: [{ rotate: '-13deg' }] },
  skirtLeg: { backgroundColor: '#f4c694' },
  sock: { position: 'absolute', left: 0, right: 0, bottom: 2, height: 4, backgroundColor: '#fff5f8' },
  strapShoe: { backgroundColor: '#5e2c43', borderRadius: 2 },
  shoeStrap: { position: 'absolute', top: 0, left: 3, width: 2, height: 2, backgroundColor: '#f6abc9' },
  cap: { position: 'absolute', top: -3, left: -1, width: 20, height: 8, borderTopLeftRadius: 8, borderTopRightRadius: 8, backgroundColor: '#f7d521' }, capBrim: { position: 'absolute', left: 9, bottom: -1, width: 14, height: 3, borderRadius: 2, backgroundColor: '#e7b80c' },
  eyes: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 4, marginTop: 8 }, eye: { width: 2, height: 3, borderRadius: 1, backgroundColor: '#332b22' }, smile: { position: 'absolute', left: 6, top: 12, width: 6, height: 3, borderBottomWidth: 1, borderBottomColor: '#70482e', borderRadius: 3 },
  shirt: { position: 'absolute', top: 21, left: 9, width: 19, height: 13, borderRadius: 5, backgroundColor: '#075b31', borderWidth: 1, borderColor: '#e6f6e4' }, collar: { position: 'absolute', top: 0, left: 6, width: 5, height: 3, backgroundColor: '#f7d521', borderBottomLeftRadius: 2, borderBottomRightRadius: 2 },
  arm: { position: 'absolute', top: 22, width: 5, height: 13, borderRadius: 3, backgroundColor: '#078743' }, leftArm: { left: 5 }, rightArm: { right: 4 }, hand: { position: 'absolute', bottom: -1, width: 5, height: 5, borderRadius: 3, backgroundColor: '#f4c694' },
  leg: { position: 'absolute', top: 32, width: 6, height: 11, borderRadius: 2, backgroundColor: '#234d67' }, leftLeg: { left: 11 }, rightLeg: { left: 21 }, shoe: { position: 'absolute', bottom: -1, left: -1, width: 8, height: 4, borderRadius: 2, backgroundColor: '#172e25' }
});
function GuideCharacter({ avatarSex, routeRequest, mapSize, walkingSpeed = 1 }) {
  const [walking, setWalking] = useState(false);
  const [arrived, setArrived] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const route = routeRequest?.points ?? (routeRequest ? guideRoutes[routeRequest.buildingNumber]?.[routeRequest.gateNumber] : null);
  const [standbyMessage, setStandbyMessage] = useState('I can guide you...');
  useEffect(() => {
    progress.setValue(0);
    setWalking(false);
    setArrived(false);
  }, [mapSize.width, mapSize.height, progress, route, routeRequest?.runId]);
  useEffect(() => {
    if (!route || !mapSize.width || !mapSize.height) return;
    let cancelled = false;
    let journey;
    progress.stopAnimation((value) => {
      if (cancelled || value >= route.length - 1) return;
      const remaining = 1 - value / (route.length - 1);
      setWalking(true);
      journey = Animated.timing(progress, { toValue: route.length - 1, duration: 6000 * remaining / walkingSpeed, easing: Easing.linear, useNativeDriver: true });
      journey.start(({ finished }) => { if (finished && !cancelled) { setWalking(false); setArrived(true); } });
    });
    return () => { cancelled = true; journey?.stop(); };
  }, [mapSize.width, mapSize.height, progress, route, routeRequest?.runId, walkingSpeed]);
  useEffect(() => {
    if (route) return;
    setStandbyMessage('I can guide you...');
    const messageTimer = setInterval(() => setStandbyMessage((current) => current === 'I can guide you...' ? 'Click a location...' : 'I can guide you...'), 4000);
    return () => clearInterval(messageTimer);
  }, [route, routeRequest?.runId]);
  if (!mapSize.width || !mapSize.height) return null;
  if (!route) {
    const point = percentToPoint(guideRestingPoint, mapSize);
    return <Animated.View pointerEvents="none" style={[mapStyles.guideCharacter, { transform: [{ translateX: point.x - 18 }, { translateY: point.y - 44 }] }]}><View style={mapStyles.guideStandbyCloud}><Text style={mapStyles.guideStandbyText}>{standbyMessage}</Text></View><CampusWalker avatarSex={avatarSex} walking={walking} walkingSpeed={walkingSpeed} /></Animated.View>;
  }
  const points = route.map((point) => routeRequest?.points ? containedMapPoint(point, mapSize) : percentToPoint(point, mapSize));
  const inputRange = points.map((_, index) => index);
  const translateX = progress.interpolate({ inputRange, outputRange: points.map((point) => point.x - 18) });
  const translateY = progress.interpolate({ inputRange, outputRange: points.map((point) => point.y - 44) });
  // Position the bubble in map coordinates, keeping both edges inside the image.
  const bubbleWidth = Math.min(150, Math.max(0, mapSize.width - 16));
  const destination = points[points.length - 1];
  const bubbleMapLeft = Math.max(8, Math.min(mapSize.width - bubbleWidth - 8, destination.x - bubbleWidth / 2));
  const arrivalBubbleStyle = { width: bubbleWidth, left: bubbleMapLeft - (destination.x - 18) };
  const destinationName = routeRequest?.destination || { 1: 'OSAS / Registrar', 2: 'ICON', 3: 'University Clinic' }[routeRequest?.buildingNumber];
  return <Animated.View pointerEvents="none" style={[mapStyles.guideCharacter, { transform: [{ translateX }, { translateY }] }]}>{arrived && <View accessible accessibilityLiveRegion="polite" style={[mapStyles.guideStandbyCloud, arrivalBubbleStyle]}><Text style={mapStyles.guideStandbyText}>{`We arrived at ${destinationName || 'your destination'}!`}</Text></View>}<CampusWalker avatarSex={avatarSex} walking={walking} walkingSpeed={walkingSpeed} /></Animated.View>;
}
function markerPoint(position, mapSize) {
  return { left: parseFloat(position.left) / 100 * mapSize.width, top: parseFloat(position.top) / 100 * mapSize.height };
}
function GateMarkers({ selectedNumber, onSelect, mapSize }) {
  return <View pointerEvents="box-none" style={[mapStyles.mapMarkerLayer, { width: mapSize.width, height: mapSize.height }]}>{[1, 2, 3].map((number) => <Pressable key={number} accessibilityLabel={`Show Gate ${number}`} onPress={() => onSelect(number - 1)} style={[mapStyles.gateMarker, markerPoint(gateMarkerPositions[number], mapSize), number === selectedNumber && mapStyles.gateMarkerSelected]}><Text style={mapStyles.gateMarkerText}>{number}</Text></Pressable>)}</View>;
}
function MapMarkers({ examVenue, selectedNumber, onSelect, mapSize }) {
  const alternate = examVenue && examVenue.id !== 'icon';
  const numbers = alternate && !examVenue.pin ? [1, 3] : [1, 2, 3];
  function positionFor(number) {
    if (number !== 2 || !alternate) return markerPoint(mapMarkerPositions[number], mapSize);
    const point = containedMapPoint(examVenue.pin, mapSize);
    return { left: point.x, top: point.y };
  }
  return <View pointerEvents="box-none" style={[mapStyles.mapMarkerLayer, { width: mapSize.width, height: mapSize.height }]}>{numbers.map((number) => <Pressable key={number} accessibilityLabel={`Show location ${number}`} onPress={() => onSelect(number - 1)} style={[mapStyles.mapMarker, positionFor(number), number === selectedNumber && mapStyles.mapMarkerSelected]}><Text style={mapStyles.mapMarkerText}>{number}</Text></Pressable>)}</View>;
}
function MapCanvas({ avatarSex, examVenue, onSelectWalkingRoute, walkingSpeed = 1, onWalkingSpeedChange, zoom, selected, guideRoute, selectedBuildingNumber, selectedGateNumber, showLocationPreview, showLocationDetailsButton, onCloseLocationPreview, onOpenLocationPreview, onOpenLocationImage, onSelectMarker, onSelectGate, onZoomIn, onZoomOut, onReset, onFullscreen, profilePhoto, fullscreen = false }) {
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 });
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  useEffect(() => { if (zoom === 1) setPanOffset({ x: 0, y: 0 }); }, [zoom]);
  const panOffsetRef = useRef(panOffset);
  panOffsetRef.current = panOffset;
  const mapSizeRef = useRef(mapSize);
  mapSizeRef.current = mapSize;
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const panStart = useRef({ x: 0, y: 0 }).current;
  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: ({ nativeEvent }) => nativeEvent.touches.length >= 2,
    onMoveShouldSetPanResponder: ({ nativeEvent }) => nativeEvent.touches.length >= 2,
    onPanResponderGrant: () => { panStart.x = panOffsetRef.current.x; panStart.y = panOffsetRef.current.y; },
    onPanResponderMove: ({ nativeEvent }, gestureState) => {
      if (nativeEvent.touches.length >= 2 && zoomRef.current > 1) {
        const maxPanX = (zoomRef.current - 1) * mapSizeRef.current.width / 2;
        const maxPanY = (zoomRef.current - 1) * mapSizeRef.current.height / 2;
        setPanOffset({
          x: Math.max(-maxPanX, Math.min(maxPanX, panStart.x + gestureState.dx)),
          y: Math.max(-maxPanY, Math.min(maxPanY, panStart.y + gestureState.dy))
        });
      }
    }
  })).current;
  const resetMapPosition = () => { setPanOffset({ x: 0, y: 0 }); onReset(); };
  const maxPanX = Math.max(0, (zoom - 1) * mapSize.width / 2);
  const maxPanY = Math.max(0, (zoom - 1) * mapSize.height / 2);
  const boundedPanOffset = { x: Math.max(-maxPanX, Math.min(maxPanX, panOffset.x)), y: Math.max(-maxPanY, Math.min(maxPanY, panOffset.y)) };
  return <View onLayout={({ nativeEvent }) => setMapSize(nativeEvent.layout)} style={[mapStyles.mapFrame, fullscreen && mapStyles.fullscreenMap]}><View {...panResponder.panHandlers} style={[mapStyles.mapZoomLayer, { width: mapSize.width, height: mapSize.height, transform: [{ translateX: boundedPanOffset.x }, { translateY: boundedPanOffset.y }, { scale: zoom }] }]}><Image source={campusMapImages[examVenue?.id] || campusMapImages.icon} accessibilityLabel={examVenue?.name ? "Campus map highlighting " + examVenue.name : "CvSU Main Campus map"} style={mapStyles.mapImage} resizeMode="contain" /><GuideCharacter avatarSex={avatarSex} walkingSpeed={walkingSpeed} routeRequest={guideRoute} mapSize={mapSize} profilePhoto={profilePhoto} /><MapMarkers examVenue={examVenue} mapSize={mapSize} selectedNumber={selectedBuildingNumber} onSelect={onSelectMarker} /><GateMarkers mapSize={mapSize} selectedNumber={selectedGateNumber} onSelect={onSelectGate} /></View>{!showLocationPreview && !showLocationDetailsButton && selected?.guide && <View style={mapStyles.guideBubble}><Text style={mapStyles.guideLabel}>STOP {selected.number}</Text><Text style={mapStyles.guideText}>{selected.guide}</Text></View>}{selected && showLocationDetailsButton && !showLocationPreview && <Pressable accessibilityLabel={`Show details for ${selected.name}`} onPress={onOpenLocationPreview} style={({ pressed }) => [mapStyles.locationDetailsButton, pressed && styles.pressed]}><Ionicons name="information" size={20} color="#fff" /></Pressable>}{selected && showLocationPreview && <LocationPreview location={selected} onSelectRoute={onSelectWalkingRoute} onClose={onCloseLocationPreview} onOpenImage={onOpenLocationImage} />}<View style={mapStyles.mapControls}><MapControl icon={fullscreen ? 'contract-outline' : 'scan-outline'} label={fullscreen ? 'Exit full screen' : 'Full screen'} onPress={onFullscreen} />{!fullscreen && <><MapControl icon="add" label="Zoom in" onPress={onZoomIn} disabled={zoom === 3} /><MapControl icon="remove" label="Zoom out" onPress={onZoomOut} disabled={zoom === 1} /><Pressable accessibilityLabel="Reset map zoom" onPress={resetMapPosition} style={({ pressed }) => [mapStyles.resetControl, pressed && styles.pressed]}><Text style={mapStyles.resetText}>Reset</Text></Pressable></>}</View><Pressable accessibilityRole="button" accessibilityLabel={"Walking speed " + walkingSpeed + " times. Tap to change."} onPress={() => { const speeds = [0.5, 1, 1.5, 2, 3]; onWalkingSpeedChange?.(speeds[(speeds.indexOf(walkingSpeed) + 1) % speeds.length]); }} style={({ pressed }) => [mapStyles.walkingSpeedButton, pressed && styles.pressed]}><Ionicons name="walk-outline" size={18} color="#fff" /><Text style={mapStyles.walkingSpeedText}>Walk {walkingSpeed}x</Text></Pressable><View style={mapStyles.zoomBadge}><Text style={mapStyles.zoomText}>{zoom.toFixed(1)}x</Text></View></View>;
}
function MapControl({ icon, label, onPress, disabled }) { return <Pressable accessibilityLabel={label} disabled={disabled} onPress={onPress} style={({ pressed }) => [mapStyles.mapControl, disabled && mapStyles.mapControlDisabled, pressed && styles.pressed]}><Ionicons name={icon} size={23} color="#183225" /></Pressable>; }
function LegacyMapPage() {
  const [selectedLocation, setSelectedLocation] = useState(0);
  const [showAttire, setShowAttire] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);
  const selected = admissionLocations[selectedLocation];
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const tip = campusTips[tipIndex];
  const zoomIn = () => setZoom((current) => Math.min(3, current + 0.5));
  const zoomOut = () => setZoom((current) => Math.max(1, current - 0.5));
  const resetMap = () => setZoom(1);
  return <View style={mapStyles.page}><View style={mapStyles.hero}><Text style={mapStyles.heroEyebrow}>CAMPUS TRAIL</Text><Text style={mapStyles.heroTitle}>Campus Map</Text><Text style={mapStyles.heroCopy}>Follow the guided route from the road to your admission stop.</Text></View><Pressable onPress={() => setShowAttire((current) => !current)} style={({ pressed }) => [mapStyles.attireButton, pressed && styles.pressed]}><Text style={mapStyles.attireTitle}>Campus attire & uniform guide</Text><Ionicons name={showAttire ? 'chevron-up' : 'chevron-down'} size={20} color="#f7d521" /></Pressable>{showAttire && <View style={mapStyles.attirePanel}>{['Wear proper school or smart-casual attire.', 'Bring a valid school or government-issued ID.', 'Follow the dress requirements stated on your appointment slip.'].map((item) => <View key={item} style={mapStyles.attireRow}><Ionicons name="checkmark-circle" size={17} color="#009c29" /><Text style={mapStyles.attireText}>{item}</Text></View>)}</View>}<View style={mapStyles.mapCard}><View style={mapStyles.mapHeader}><View><Text style={mapStyles.mapTitle}>CvSU Main Campus</Text><Text style={mapStyles.mapSubtitle}>Select a location below to start the guide</Text></View><View style={mapStyles.guidedBadge}><View style={mapStyles.guidedDot} /><Text style={mapStyles.guidedText}>GUIDED</Text></View></View><View style={mapStyles.legend}>{[['#f7d521', 'Admission'], ['#c7d4c5', 'Buildings'], ['#000', 'Roads'], ['#fff', 'Walkway']].map(([color, label]) => <View key={label} style={mapStyles.legendItem}><View style={[mapStyles.legendSwatch, { backgroundColor: color }]} /><Text style={mapStyles.legendLabel}>{label}</Text></View>)}</View><View style={mapStyles.mapFrame}><Image source={require('../assets/CvSU_Map.png')} style={mapStyles.mapImage} resizeMode="contain" /><View style={mapStyles.guideBubble}><Text style={mapStyles.guideLabel}>STOP {selected.number}</Text><Text style={mapStyles.guideText}>{selected.guide}</Text></View></View></View><View style={mapStyles.locationsCard}><View style={mapStyles.locationsHeader}><Text style={mapStyles.locationsTitle}>Admission Locations</Text><Text style={mapStyles.locationsCount}>3 stops</Text></View>{admissionLocations.map((location, index) => <Pressable key={location.number} onPress={() => setSelectedLocation(index)} style={({ pressed }) => [mapStyles.locationRow, index === selectedLocation && mapStyles.locationRowSelected, index === admissionLocations.length - 1 && mapStyles.locationRowLast, pressed && styles.pressed]}>{index === selectedLocation && <View pointerEvents="none" style={mapStyles.locationSelectedStripe} />}<View style={[mapStyles.locationNumber, index === selectedLocation && mapStyles.locationNumberSelected]}><Text style={mapStyles.locationNumberText}>{location.number}</Text></View><View style={mapStyles.locationCopy}><Text style={mapStyles.locationName}>{location.name}</Text><Text style={mapStyles.locationPurpose}>{location.purpose}</Text></View><Ionicons name="chevron-forward" size={20} color="#075b31" /></Pressable>)}</View><Pressable onPress={() => setTipIndex((current) => (current + 1) % campusTips.length)} style={({ pressed }) => [mapStyles.tip, pressed && styles.pressed]}><View style={mapStyles.tipBadge}><Text style={mapStyles.tipBadgeText}>TIP</Text></View><View style={mapStyles.tipCopy}><Text style={mapStyles.tipTitle}>{tip[0]}</Text><Text style={mapStyles.tipText}>{tip[1]}</Text><Text style={mapStyles.tipHint}>Tap for another tip</Text></View><Ionicons name="chevron-forward" size={20} color="#735f37" /></Pressable></View>;
}
function StepDetailsHandle({ onClose }) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const dismissed = useRef(false);
  const responder = useRef(PanResponder.create({
    // Capture the touch on the handle before the browser or scroll view takes it.
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: () => { dismissed.current = false; },
    onPanResponderMove: (_, { dx, dy }) => {
      if (!dismissed.current && dy >= 20 && dy > Math.abs(dx)) {
        dismissed.current = true;
        closeRef.current();
      }
    },
    onPanResponderRelease: (_, { dx, dy }) => {
      // Also allow a simple tap on the handle to dismiss the details.
      if (!dismissed.current && Math.abs(dx) < 8 && Math.abs(dy) < 8) {
        closeRef.current();
      }
    },
    onPanResponderTerminationRequest: () => false,
  })).current;

  return <View {...responder.panHandlers} accessible accessibilityRole="button" accessibilityLabel="Close step details" accessibilityHint="Tap or swipe down to close" onAccessibilityTap={onClose} style={{ alignItems: 'center', justifyContent: 'center', height: 44, touchAction: 'none' }}><View pointerEvents="none" style={{ width: 42, height: 4, borderRadius: 2, backgroundColor: '#b8d3bc' }} /></View>;
}
function StatusPage({ content = bundledContent, displayName, profile, program, track, steps, currentStatusIndex, onStatusChange, selectedStepIndex, onSelectStep, checkedRequirements, onRequirementsChange, examinationAttempt, onExaminationAttemptChange, failedProgram, reapplicationProgram, onFailedProgramChange, onReapplicationProgramChange, onProgramChange, isGuest = false, detailsOnly = false }) {
  const { statusStepDetails } = content;
  const isFinished = currentStatusIndex === steps.length;
  const applicationStopped = examinationAttempt === 'stopped';
  const selectedStep = selectedStepIndex === null ? null : steps[selectedStepIndex];
  const selectedDetails = selectedStep ? statusStepDetails[selectedStep] : null;
  const examVenue = selectedStep === 'Admission Examination' ? getExamVenue(content) : null;
  const selectedRequirements = selectedStep ? getStepRequirements(content, profile, selectedStep) : [];
  const selectedChecks = selectedRequirements.flatMap((item, index) => checkedRequirements[selectedStep]?.includes(item) ? [index] : []);
  const uncheckedRequirements = selectedRequirements.filter((_, index) => !selectedChecks.includes(index));
  const [pendingAction, setPendingAction] = useState(null);
  const showRequirementsWarning = pendingAction?.step === selectedStep;
  useEffect(() => { setPendingAction(null); }, [selectedStep, content]);
  const [localFailedProgram, setLocalFailedProgram] = useState(failedProgram || '');
  const [localReapplicationProgram, setLocalReapplicationProgram] = useState(reapplicationProgram || '');
  const failedProgramValue = failedProgram || localFailedProgram || (examinationAttempt === 'failed' || examinationAttempt === 'reapplication' ? program : '');
  const reapplicationProgramValue = reapplicationProgram || localReapplicationProgram;
  const reapplicationOptions = getReapplicationPrograms(content, profile, track, failedProgramValue);
  const profileLabel = getAcademicStatusLabel(content, profile);
  const checklistDisabled = isGuest || applicationStopped || selectedStepIndex < currentStatusIndex;
  const canUpdateCurrentStep = selectedStep && !isGuest && !applicationStopped && selectedStepIndex === currentStatusIndex;
  const toggleRequirement = (index) => {
    if (checklistDisabled || !selectedRequirements[index]) return;
    onRequirementsChange((current) => {
      const stepChecks = current[selectedStep] || [];
      const requirement = selectedRequirements[index];
      return { ...current, [selectedStep]: stepChecks.includes(requirement) ? stepChecks.filter((item) => item !== requirement) : [...stepChecks, requirement] };
    });
  };
  const toggleAllRequirements = () => {
    if (checklistDisabled || !selectedStep) return;
    onRequirementsChange((current) => {
      const marked = current[selectedStep] || [];
      const allChecked = selectedRequirements.every((item) => marked.includes(item));
      return { ...current, [selectedStep]: allChecked ? [] : [...selectedRequirements] };
    });
  };
  const runWithRequirements = (action) => {
    if (!canUpdateCurrentStep) return;
    if (uncheckedRequirements.length) {
      setPendingAction({ step: selectedStep, action });
      return;
    }
    action();
  };
  const confirmAllRequirements = () => {
    if (!canUpdateCurrentStep || !showRequirementsWarning) return;
    onRequirementsChange((current) => ({ ...current, [selectedStep]: [...selectedRequirements] }));
    setPendingAction(null);
    pendingAction.action();
  };
  const advanceStep = () => {
    onStatusChange(currentStatusIndex + 1);
    onSelectStep(null);
  };
  const passExamination = () => {
    if (selectedStep !== 'Admission Examination') return;
    if (examinationAttempt === 'reapplication' && !reapplicationOptions.includes(reapplicationProgramValue)) return;
    runWithRequirements(() => {
      if (examinationAttempt === 'reapplication') {
        onProgramChange?.(reapplicationProgramValue);
        onRequirementsChange((previous) => Object.fromEntries(Object.entries(previous).filter(([step]) => steps.indexOf(step) >= 0 && steps.indexOf(step) <= currentStatusIndex)));
      }
      onExaminationAttemptChange('passed');
      advanceStep();
    });
  };
  const failExamination = () => {
    if (selectedStep !== 'Admission Examination') return;
    runWithRequirements(() => {
      if (examinationAttempt === 'reapplication') { onExaminationAttemptChange('stopped'); return; }
      setLocalFailedProgram(program);
      onFailedProgramChange?.(program);
      onExaminationAttemptChange('failed');
    });
  };
  const startReapplication = (selectedProgram) => {
    if (selectedStep !== 'Admission Examination') return;
    if (!reapplicationOptions.includes(selectedProgram)) return;
    runWithRequirements(() => {
      setLocalReapplicationProgram(selectedProgram);
      onReapplicationProgramChange?.(selectedProgram);
      onExaminationAttemptChange('reapplication');
    });
  };
  const undoLatestCompletedStep = () => {
    if (isGuest || selectedStepIndex !== currentStatusIndex - 1) return;
    onRequirementsChange((current) => {
      const next = { ...current };
      delete next[selectedStep];
      return next;
    });
    if (selectedStep === 'Admission Examination') onExaminationAttemptChange('initial');
    onStatusChange(currentStatusIndex - 1);
    onSelectStep(null);
  };
  return <>{!detailsOnly && <><View><View style={journeyStyles.hero}><View style={journeyStyles.heroTop}><Text style={journeyStyles.heroTag}>ADMISSION TRAIL</Text><Text style={journeyStyles.heroCount}>{currentStatusIndex}/{steps.length}</Text></View><Text style={journeyStyles.heroCopy}>See how far you are in the admission process and which step needs your attention next.</Text></View><Text style={journeyStyles.heroTitle}>Admission Process for {displayName}</Text><Text style={journeyStyles.heroCopy}>Track your admission journey, one station at a time.</Text></View><View style={statusInfoStyles.card}><Text style={statusInfoStyles.eyebrow}>CVSU MAIN CAMPUS ONLINE ADMISSION</Text><Text style={statusInfoStyles.body}>Access the main campus portal using a Gmail account, then complete and save your online application.</Text><Text style={statusInfoStyles.remember}>Remember:</Text>{['Your declared track or strand must match your documentary requirements.', 'Choose the correct applicant category.', 'Review all entries carefully before submitting.', 'Save your application every time you make a change.'].map((item) => <View key={item} style={statusInfoStyles.reminderRow}><View style={statusInfoStyles.bullet} /><Text style={statusInfoStyles.reminderText}>{item}</Text></View>)}<Pressable onPress={() => Linking.openURL('http://admission.cvsu.edu.ph')} style={({ pressed }) => [statusInfoStyles.portalButton, pressed && styles.pressed]}><Ionicons name="open-outline" size={18} color="#fff" /><Text style={statusInfoStyles.portalButtonText}>Open admission portal</Text></Pressable></View><View style={statusInfoStyles.card}><Text style={statusInfoStyles.eyebrow}>YOUR APPLICANT PROFILE</Text><ProfileRow label="Type" value={profileLabel} /><ProfileRow label="Track / Strand" value={track} /><ProfileRow label="Program" value={program} last /></View><View style={[styles.statusCard, { borderRadius: 8 }]}><Text style={styles.cardEyebrow}>CURRENT APPLICATION</Text><Text style={styles.statusHeading}>{applicationStopped ? 'Application process ended' : isFinished ? 'Admission journey complete' : 'Track your progress'}</Text><Text style={styles.statusCaption}>{applicationStopped ? 'Thank you for applying to Cavite State University. The admission process has ended after the re-application examination result.' : isFinished ? 'All admission steps have been marked as completed.' : `${currentStatusIndex} of ${steps.length} steps completed. Tap a step to update your progress.`}</Text>{steps.map((item, index) => {
    const isComplete = index < currentStatusIndex;
    const isCurrent = index === currentStatusIndex;
    const state = item === 'Admission Examination' && applicationStopped ? 'Application ended' : applicationStopped && index > currentStatusIndex ? 'Unavailable' : isComplete ? 'Completed' : isCurrent ? 'In progress' : 'Upcoming';
    const requirements = getStepRequirements(content, profile, item);
    const requirementCount = requirements.length;
    const checkedCount = requirements.filter((requirement) => checkedRequirements[item]?.includes(requirement)).length;
    return <Pressable key={item} onPress={() => onSelectStep(index)} style={({ pressed }) => [styles.statusStep, pressed && styles.pressed]}><View style={[styles.statusDot, isComplete && styles.currentStatusDot, isCurrent && { backgroundColor: '#fff7d6', borderColor: '#f7d521', borderWidth: 3 }]}>{isCurrent ? <Ionicons name="time" size={18} color="#8a5e12" /> : <Text style={[styles.statusNumber, isComplete && { color: '#fff' }]}>{isComplete ? '✓' : index + 1}</Text>}</View><View style={styles.statusStepCopy}><Text style={styles.statusStepTitle}>{statusStepDetails[item].title || item}</Text><Text style={[styles.statusStepState, isComplete && { color: '#009c29', fontWeight: '700' }, isCurrent && { color: '#8a5e12', fontWeight: '800' }]}>{state}</Text><Text style={styles.statusStepDescription}>{statusStepDetails[item].description}</Text><Text style={{ color: checkedCount === requirementCount ? '#009c29' : '#698073', fontSize: 11, fontWeight: '700', marginTop: 5 }}>{checkedCount} / {requirementCount} requirements ready</Text></View>{index < steps.length - 1 && <View style={[styles.statusConnector, isComplete && { backgroundColor: '#009c29' }]} />}</Pressable>;
  })}{isFinished && <Pressable onPress={() => onStatusChange(0)} style={({ pressed }) => [styles.back, { marginTop: 8, alignItems: 'center' }, pressed && styles.pressed]}><Text style={styles.backText}>Reset progress</Text></Pressable>}</View></>}<Modal visible={selectedStep !== null} transparent animationType="slide" onRequestClose={() => showRequirementsWarning ? setPendingAction(null) : onSelectStep(null)}><View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 35, 21, 0.55)' }}>{showRequirementsWarning ? <RequirementsWarning items={uncheckedRequirements} stepTitle={selectedDetails?.title || selectedStep} onReview={() => setPendingAction(null)} onConfirm={confirmAllRequirements} /> : <View style={{ maxHeight: '88%', backgroundColor: '#fff', borderTopLeftRadius: 12, borderTopRightRadius: 12, paddingTop: 8 }}><StepDetailsHandle onClose={() => onSelectStep(null)} /><ScrollView contentContainerStyle={{ padding: 22, paddingBottom: 30 }}><View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}><View style={{ flex: 1, paddingRight: 14 }}><Text style={styles.cardEyebrow}>ADMISSION STEP {selectedStepIndex + 1}</Text><Text style={[styles.statusHeading, { marginTop: 8 }]}>{selectedDetails?.title || selectedStep}</Text></View><Pressable accessibilityLabel="Close details" onPress={() => onSelectStep(null)} style={({ pressed }) => [{ width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19, backgroundColor: '#e4eee4' }, pressed && styles.pressed]}><Ionicons name="close" size={22} color="#075b31" /></Pressable></View><Text style={[styles.statusCaption, { fontSize: 14, marginBottom: 20 }]}>{selectedDetails?.description}</Text><DetailSection title="Instructions" items={selectedDetails?.instructions} numbered /><RequirementChecklist items={selectedRequirements} checked={selectedChecks} onToggle={toggleRequirement} onToggleAll={toggleAllRequirements} disabled={checklistDisabled} />{canUpdateCurrentStep && uncheckedRequirements.length > 0 && <Text style={statusInfoStyles.requirementsReminder}>Check every requirement before continuing.</Text>}{examVenue ? <DetailSection title="Examination venue" items={[examVenue.name, examVenue.directions].filter(Boolean)} /> : selectedDetails?.location && <DetailSection title="Location" items={[selectedDetails.location]} />}{Boolean(selectedDetails?.details?.length) && <DetailSection title="Additional details" items={selectedDetails.details} />}{isGuest ? selectedStepIndex === currentStatusIndex && <Pressable onPress={() => onSelectStep(null)} disabled style={{ padding: 14, borderRadius: 8, backgroundColor: '#fffde8', borderWidth: 1, borderColor: '#f7d521', marginTop: 12 }}><Text style={{ color: '#183225', fontWeight: '700', textAlign: 'center' }}>Guest Mode - View Only</Text><Text style={{ color: '#52695b', fontSize: 12, textAlign: 'center', marginTop: 6 }}>Exit guest mode and use your applicant profile to accomplish the admission steps.</Text></Pressable> : selectedStepIndex < currentStatusIndex ? selectedStepIndex === currentStatusIndex - 1 && !applicationStopped ? <Pressable onPress={undoLatestCompletedStep} style={({ pressed }) => [styles.back, { marginTop: 4, alignItems: 'center' }, pressed && styles.pressed]}><Text style={styles.backText}>Undo completion</Text></Pressable> : <View style={{ padding: 14, borderRadius: 8, backgroundColor: '#dff5df', alignItems: 'center' }}><Text style={{ color: '#075b31', fontWeight: '700' }}>Completed</Text></View> : selectedStepIndex > currentStatusIndex ? <View style={{ padding: 14, borderRadius: 8, backgroundColor: '#eef3ee', alignItems: 'center' }}><Text style={{ color: '#52695b', fontWeight: '700', textAlign: 'center' }}>{applicationStopped ? 'The application process has ended' : 'Complete the previous step first'}</Text></View> : selectedStep === 'Admission Examination' ? <ExaminationResultActions availablePrograms={reapplicationOptions} attempt={examinationAttempt === 'reapplication' && !reapplicationOptions.includes(reapplicationProgramValue) ? 'failed' : examinationAttempt} onPassed={passExamination} onFailed={failExamination} onReapply={startReapplication} reapplicationProgram={reapplicationProgramValue} /> : <Pressable onPress={() => runWithRequirements(advanceStep)} style={({ pressed }) => [styles.action, { flex: 0, marginTop: 4 }, pressed && styles.pressed]}><Text style={styles.actionText}>Mark as completed</Text></Pressable>}</ScrollView></View>}</View></Modal></>;
}
function JourneyPage({ content = bundledContent, displayName, program, profilePhoto, steps, currentStatusIndex, examinationAttempt, onOpenStep, isGuest = false }) {
  const roadGlow = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(roadGlow, { toValue: 1, duration: 900, useNativeDriver: false }),
      Animated.timing(roadGlow, { toValue: 0, duration: 900, useNativeDriver: false })
    ]));
    animation.start();
    return () => animation.stop();
  }, [roadGlow]);
  const applicationStopped = examinationAttempt === 'stopped';
  const isFinished = currentStatusIndex === steps.length;
  const progress = Math.round((currentStatusIndex / steps.length) * 100);
  const currentStep = applicationStopped ? 'Application ended' : isFinished ? 'Finish line reached' : content.statusStepDetails[steps[currentStatusIndex]]?.title || steps[currentStatusIndex];
  return <View style={journeyStyles.page}><View style={journeyStyles.hero}><View style={journeyStyles.heroTop}><Text style={journeyStyles.heroTag}>ADMISSION TRAIL</Text><Text style={journeyStyles.heroCount}>{currentStatusIndex}/{steps.length}</Text></View><Text style={journeyStyles.heroTitle}>CvSU Journey for {displayName}</Text><Text style={journeyStyles.heroCopy}>{applicationStopped ? 'Your trail has ended, ' + displayName + '. Thank you for applying.' : 'Follow the trail from application to enrollment, ' + displayName + '.'}</Text><View style={[journeyStyles.currentStop, applicationStopped && journeyStyles.stoppedStop]}><Text style={journeyStyles.stopLabel}>{applicationStopped ? 'TRAIL STATUS' : isFinished ? 'DESTINATION REACHED' : 'CURRENT STOP'}</Text><Text style={journeyStyles.stopTitle}>{currentStep}</Text><Text style={journeyStyles.stopCopy}>{applicationStopped ? 'The re-application result ended this application.' : isFinished ? 'Every admission mission is complete.' : 'Tap the open station on the trail to continue.'}</Text></View></View><View style={journeyStyles.passportSummary}><View style={journeyStyles.passportProfile}><Image source={profilePhoto ? { uri: profilePhoto } : require('../assets/Profile.png')} style={journeyStyles.passportAvatar} /><View style={{ flex: 1, minWidth: 0 }}><Text style={journeyStyles.passportName}>{displayName}</Text><Text style={journeyStyles.passportProgram}>{program || 'Your admission path'}</Text></View></View><View style={journeyStyles.passportProgressRow}><Text style={journeyStyles.passportProgressCopy}>{currentStatusIndex} / {steps.length} stops completed</Text><Text style={journeyStyles.passportPercent}>{progress}%</Text></View><View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: steps.length, now: currentStatusIndex }} style={journeyStyles.passportTrack}><View style={[journeyStyles.passportFill, { width: progress + '%' }]} /></View><View style={journeyStyles.passportStamps}>{steps.map((step, index) => <Pressable key={step} accessibilityRole="button" accessibilityLabel={step + (index < currentStatusIndex ? ', completed' : index === currentStatusIndex && !applicationStopped ? ', current step' : ', upcoming')} onPress={() => onOpenStep(index)} style={({ pressed }) => [journeyStyles.passportStamp, index < currentStatusIndex && journeyStyles.passportStampComplete, pressed && journeyStyles.passportStampPressed]}><Ionicons name={index < currentStatusIndex ? 'checkmark-circle' : 'ellipse-outline'} size={19} color={index < currentStatusIndex ? '#075b31' : '#bed7c8'} /><Text style={[journeyStyles.passportStampNumber, index < currentStatusIndex && { color: '#075b31' }]}>{index + 1}</Text></Pressable>)}</View></View><View style={journeyStyles.trailCard}><View style={journeyStyles.trailHeading}><View><Text style={journeyStyles.trailEyebrow}>CAMPUS TRAIL</Text><Text style={journeyStyles.trailTitle}>Admission Journey</Text></View><Ionicons name="map" size={28} color="#f4bf32" /></View><View style={journeyStyles.legend}><LegendItem color="#078743" icon="checkmark" label="Completed" /><LegendItem color="#fff" border="#078743" label="Open" /><LegendItem color="#dfe7e1" icon="lock-closed" label="Locked" /></View><View style={journeyStyles.trail}>{steps.map((step, index) => {
    const completed = index < currentStatusIndex;
    const current = index === currentStatusIndex && !applicationStopped;
    const stopped = step === 'Admission Examination' && applicationStopped;
    const locked = !completed && !current && !stopped;
    const icon = completed ? 'checkmark' : stopped ? 'close' : 'lock-closed';
    const stateLabel = completed ? 'Mission complete' : stopped ? 'Trail ended' : current ? 'Open mission' : 'Locked';
    return <View key={step} style={journeyStyles.stationRow}>{index < steps.length - 1 && <GlowRoad glow={roadGlow} direction={index % 2 === 0 ? 'right' : 'left'} completed={completed} />}<Pressable accessibilityLabel={`${content.statusStepDetails[step]?.title || step}, ${stateLabel}`} onPress={() => !isGuest && onOpenStep(index)} disabled={isGuest} style={({ pressed }) => [journeyStyles.station, index % 2 === 0 ? journeyStyles.stationLeft : journeyStyles.stationRight, pressed && styles.pressed]}>{current && <View style={journeyStyles.currentMarker}><Image source={profilePhoto ? { uri: profilePhoto } : require('../assets/Profile.png')} style={journeyStyles.avatarImage} /></View>}<View style={[journeyStyles.node, completed && journeyStyles.nodeComplete, current && journeyStyles.nodeCurrent, locked && journeyStyles.nodeLocked, stopped && journeyStyles.nodeStopped]}>{current ? <Text style={journeyStyles.nodeNumber}>{index + 1}</Text> : <Ionicons name={icon} size={completed ? 28 : 21} color={completed || stopped ? '#fff' : '#829489'} />}</View><Text style={[journeyStyles.nodeLabel, current && journeyStyles.nodeLabelCurrent, stopped && journeyStyles.nodeLabelStopped]} numberOfLines={2}>{content.statusStepDetails[step]?.title || step}</Text></Pressable></View>;
  })}<View style={journeyStyles.finish}><View style={journeyStyles.finishFlag}><Ionicons name="flag" size={26} color="#f7d521" /></View><View style={journeyStyles.finishCopy}><Text style={journeyStyles.finishLabel}>FINAL DESTINATION</Text>{isFinished && <><Text style={journeyStyles.finishTitle}>WELCOME TO CvSU</Text><View style={journeyStyles.finishProgram}><View style={journeyStyles.finishProgramCopy}><Text style={journeyStyles.finishProgramLabel}>YOUR ADMISSION PATH</Text><Text style={journeyStyles.program} numberOfLines={3}>{program}</Text></View></View></>}</View><View style={journeyStyles.finishFlag}><Ionicons name="flag" size={26} color="#f7d521" /></View></View></View></View></View>;
}
function GlowRoad({ direction, completed, glow }) {
  const borderColor = glow.interpolate({ inputRange: [0, 1], outputRange: completed ? ['#e0bd16', '#fff2a3'] : ['#aebbb3', '#d9fff0'] });
  return <Animated.View pointerEvents="none" style={[journeyStyles.road, direction === 'right' ? journeyStyles.roadRight : journeyStyles.roadLeft, completed && journeyStyles.roadComplete, { zIndex: completed ? 2 : 1, borderColor, opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.78, 1] }), shadowColor: completed ? '#f7d521' : '#8ef0c1', shadowOpacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.1, 0.75] }), shadowRadius: glow.interpolate({ inputRange: [0, 1], outputRange: [2, 12] }), shadowOffset: { width: 0, height: 0 } }]} />;
}
function LegendItem({ color, border, icon, label }) { return <View style={journeyStyles.legendItem}><View style={[journeyStyles.legendDot, { backgroundColor: color, borderColor: border || color }]}>{icon && <Ionicons name={icon} size={11} color={color === '#009c29' ? '#fff' : '#829489'} />}</View><Text style={journeyStyles.legendText}>{label}</Text></View>; }
function ProfileRow({ label, value, last }) { return <View style={[statusInfoStyles.profileRow, last && { marginBottom: 0 }]}><Text style={statusInfoStyles.profileLabel}>{label}</Text><Text style={statusInfoStyles.profileValue}>{value}</Text></View>; }
function DetailSection({ title, items = [], numbered = false }) { return <View style={{ marginBottom: 22 }}><Text style={{ color: '#075b31', fontSize: 14, fontWeight: '700', marginBottom: 10 }}>{title}</Text>{items.map((item, index) => <View key={item} style={{ flexDirection: 'row', marginBottom: 9 }}><Text style={{ width: 24, color: '#078743', fontWeight: '700' }}>{numbered ? `${index + 1}.` : '•'}</Text><Text style={{ flex: 1, color: '#52695b', fontSize: 13, lineHeight: 19 }}>{item}</Text></View>)}</View>; }
function ExaminationResultActions({ availablePrograms, attempt, onPassed, onFailed, onReapply, reapplicationProgram }) {
  if (attempt === 'stopped') return <View style={{ padding: 18, borderRadius: 8, backgroundColor: '#eef3ee' }}><Text style={{ color: '#183225', fontSize: 16, fontWeight: '700', textAlign: 'center' }}>Thank you for applying</Text><Text style={{ color: '#52695b', fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 7, textAlign: 'center' }}>The re-application was not passed, so the admission process has ended.</Text></View>;
  if (attempt === 'failed') return <View><View style={{ padding: 14, borderRadius: 8, backgroundColor: '#fffde8', borderWidth: 1, borderColor: '#f7d521', marginBottom: 12 }}><Text style={{ color: '#183225', fontWeight: '700', textAlign: 'center' }}>Admission examination failed</Text><Text style={{ color: '#52695b', fontSize: 12, textAlign: 'center', marginTop: 6 }}>{availablePrograms.length ? 'Select the program for your re-application.' : 'No programs are currently available for re-application.'}</Text><Text style={{ color: '#645f18', fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 8 }}>Note: Follow the official re-application instructions in the online admission portal.</Text></View>{availablePrograms.map((item) => <Pressable key={item} onPress={() => onReapply(item)} style={({ pressed }) => [{ padding: 10, borderBottomWidth: 1, borderBottomColor: '#e5ebe5' }, pressed && styles.pressed]}><Text style={{ color: '#183225', fontSize: 12 }}>{item}</Text></Pressable>)}</View>;
  return <View><Text style={{ color: '#075b31', fontSize: 14, fontWeight: '700', textAlign: 'center', marginBottom: 12 }}>{attempt === 'reapplication' ? 'Re-application result' : 'Admission examination result'}</Text>{attempt === 'reapplication' && <Text style={{ color: '#645f18', fontSize: 12, lineHeight: 18, textAlign: 'center', marginBottom: 12 }}>Follow the official re-application instructions in the online admission portal.</Text>}{attempt === 'reapplication' && reapplicationProgram && <Text style={{ color: '#52695b', fontSize: 12, textAlign: 'center', marginBottom: 12 }}>Guide program: {reapplicationProgram}</Text>}<View style={{ flexDirection: 'row', gap: 10 }}><Pressable onPress={onFailed} style={({ pressed }) => [styles.back, { flex: 1, alignItems: 'center', borderColor: '#f7d521', backgroundColor: '#fffde8' }, pressed && styles.pressed]}><Text style={{ color: '#183225', fontWeight: '700' }}>Failed</Text></Pressable><Pressable onPress={onPassed} style={({ pressed }) => [styles.action, pressed && styles.pressed]}><Text style={styles.actionText}>Passed</Text></Pressable></View></View>;
}
function RequirementsWarning({ items, stepTitle, onReview, onConfirm }) {
  return (
    <View accessibilityViewIsModal style={statusInfoStyles.warningFrame}>
      <View style={statusInfoStyles.warningCard}>
        <Ionicons name="warning-outline" size={30} color="#a56b00" />
        <Text accessibilityRole="header" style={styles.statusHeading}>Requirements still unchecked</Text>
        <Text style={statusInfoStyles.warningCopy}>Review the unchecked items for {stepTitle}, or confirm that you have completed them all.</Text>
        <ScrollView style={statusInfoStyles.warningList}>
          <DetailSection title="Unchecked requirements" items={items} />
        </ScrollView>
        <Pressable accessibilityRole="button" onPress={onReview} style={({ pressed }) => [styles.action, { flex: 0 }, pressed && styles.pressed]}>
          <Text style={styles.actionText}>Review requirements</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onConfirm} style={({ pressed }) => [styles.back, statusInfoStyles.warningConfirm, pressed && styles.pressed]}>
          <Text style={styles.backText}>Mark all as done and continue</Text>
        </Pressable>
      </View>
    </View>
  );
}

function RequirementChecklist({ items = [], checked, onToggle, onToggleAll, disabled = false }) {
  const allChecked = items.length > 0 && items.every((_, index) => checked.includes(index));
  return <View style={{ marginBottom: 22 }}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
      <Text style={{ color: '#075b31', fontSize: 14, fontWeight: '700' }}>Requirements</Text>
      <Text style={{ color: checked.length === items.length ? '#078743' : '#698073', fontSize: 12, fontWeight: '700' }}>{checked.length} / {items.length} ready</Text>
    </View>
    {items.length > 0 && !disabled && <Pressable accessibilityRole="button" accessibilityLabel={allChecked ? 'Deselect all requirements' : 'Select all requirements'} onPress={onToggleAll} style={({ pressed }) => [{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 6, borderRadius: 8, backgroundColor: '#e4eee4' }, pressed && styles.pressed]}>
      <Ionicons name={allChecked ? 'checkbox' : 'square-outline'} size={20} color="#075b31" /><Text style={{ color: '#075b31', fontSize: 13, fontWeight: '700' }}>{allChecked ? 'Deselect all' : 'Select all'}</Text>
    </Pressable>}
    {items.map((item, index) => {
      const isChecked = checked.includes(index);
      return (
        <Pressable key={item} accessibilityRole="checkbox" accessibilityState={{ checked: isChecked, disabled }} disabled={disabled} onPress={() => onToggle(index)} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8 }, pressed && styles.pressed]}>
          <View style={{ width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: isChecked ? '#078743' : '#b8d3bc', backgroundColor: isChecked ? '#078743' : '#fff', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>{isChecked && <Ionicons name="checkmark" size={16} color="#fff" />}</View>
          <Text style={{ flex: 1, color: isChecked ? '#698073' : '#52695b', fontSize: 13, lineHeight: 20, textDecorationLine: isChecked ? 'line-through' : 'none' }}>{item}</Text>
        </Pressable>
      );
    })}
  </View>;
}
const faqStyles = StyleSheet.create({
  page: { paddingBottom: 18 },
  hero: { backgroundColor: '#009c29', borderWidth: 1, borderColor: '#f7d521', borderRadius: 8, padding: 18, marginBottom: 14 },
  heroEyebrow: { color: '#f7d521', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  heroTitle: { color: '#fff', fontSize: 28, lineHeight: 33, fontWeight: '800', marginTop: 14, maxWidth: 280 },
  heroCopy: { color: '#f2fff4', fontSize: 14, lineHeight: 20, marginTop: 8 },
  guideCard: { minHeight: 330, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#d8e2d9', padding: 14, marginBottom: 18, overflow: 'hidden' },
  guideCardPressed: { transform: [{ scale: 0.985 }] },
  triviaBubble: { borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#d8e2d9', padding: 14, zIndex: 2 },
  triviaEyebrow: { color: '#698073', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  triviaText: { color: '#183225', fontSize: 13, lineHeight: 19, fontWeight: '700', marginTop: 9 },
  triviaHint: { color: '#75877b', fontSize: 10, marginTop: 12 },
  guideStage: { flex: 1, minHeight: 150, alignItems: 'center', justifyContent: 'flex-end', paddingTop: 14 },
  guideImage: { width: 142, height: 142 },
  guideBadge: { position: 'absolute', top: 10, right: 64, borderRadius: 12, backgroundColor: '#f7d521', paddingHorizontal: 10, paddingVertical: 5 },
  guideBadgeText: { color: '#564f0e', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  findHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 10 },
  languageTabs: { flexDirection: 'row', alignSelf: 'flex-start', padding: 3, gap: 3, marginBottom: 14, borderRadius: 8, backgroundColor: '#e5efe6' },
  languageTab: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 6 },
  languageTabSelected: { backgroundColor: '#075b31' },
  languageText: { color: '#183225', fontSize: 13, fontWeight: '700' },
  languageTextSelected: { color: '#fff' },
  findTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  findCopy: { color: '#f2fff4', fontSize: 10, marginTop: 4 },
  resultCount: { color: '#f7d521', fontSize: 10, fontWeight: '800', paddingBottom: 1 },
  search: { minHeight: 50, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#d8e2d9', paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  searchInput: { flex: 1, color: '#183225', fontSize: 13, paddingHorizontal: 10, paddingVertical: 12 },
  clearSearch: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#eef3ee', alignItems: 'center', justifyContent: 'center' },
  categories: { gap: 8, paddingBottom: 14 },
  category: { minHeight: 38, borderRadius: 19, backgroundColor: '#fff', borderWidth: 1, borderColor: '#d8e2d9', paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  categoryActive: { backgroundColor: '#075b31', borderColor: '#f7d521' },
  categoryText: { color: '#31483a', fontSize: 11, fontWeight: '700' },
  categoryTextActive: { color: '#fff' },
  answers: { gap: 10 },
  answerCard: { minHeight: 64, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#d8e2d9', padding: 15, justifyContent: 'center' },
  answerCardOpen: { borderLeftWidth: 5, borderLeftColor: '#f7d521', backgroundColor: '#fffef2' },
  questionRow: { flexDirection: 'row', alignItems: 'flex-start' },
  questionCopy: { flex: 1, paddingRight: 12 },
  question: { color: '#183225', fontSize: 13, lineHeight: 18, fontWeight: '800' },
  answer: { color: '#52695b', fontSize: 12, lineHeight: 19, marginTop: 12 },
  answerMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  answerDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#f7d521', marginRight: 7 },
  answerCategory: { color: '#698073', fontSize: 9, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  empty: { minHeight: 160, borderRadius: 8, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 20 },
  emptyTitle: { color: '#183225', fontSize: 15, fontWeight: '800', marginTop: 10 },
  emptyCopy: { color: '#698073', fontSize: 11, textAlign: 'center', marginTop: 5 }
});
const mapStyles = StyleSheet.create({
  page: { paddingBottom: 18 },
  hero: { backgroundColor: '#009c29', borderWidth: 1, borderColor: '#f7d521', borderRadius: 8, padding: 18, marginBottom: 14 },
  heroEyebrow: { color: '#f7d521', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  heroTitle: { color: '#fff', fontSize: 28, lineHeight: 33, fontWeight: '800', marginTop: 14, maxWidth: 280 },
  heroCopy: { color: '#f2fff4', fontSize: 14, lineHeight: 20, marginTop: 8 },
  attireSection: { marginBottom: 14 },
  attireHeader: { minHeight: 58, borderRadius: 8, backgroundColor: '#183225', paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  attireHeaderText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  attireCard: { backgroundColor: '#fff', borderRadius: 8, padding: 14, marginTop: 10, borderWidth: 1, borderColor: '#d8e2d9' },
  attireEyebrow: { color: '#009c29', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  attireGuideTitle: { color: '#183225', fontSize: 25, lineHeight: 30, fontWeight: '800', marginTop: 10 },
  attireTabs: { minHeight: 54, borderRadius: 8, backgroundColor: '#e7f1e8', padding: 4, flexDirection: 'row', marginTop: 14 },
  attireTab: { flex: 1, borderRadius: 6, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  attireTabActive: { backgroundColor: '#183225' },
  attireTabText: { color: '#698073', fontSize: 12, fontWeight: '800', textAlign: 'center' },
  attireTabTextActive: { color: '#fff' },
  attireIntro: { color: '#698073', fontSize: 14, lineHeight: 22, marginTop: 14 },
  attireNote: { backgroundColor: '#fff8d8', borderWidth: 2, borderColor: '#e3c51f', borderRadius: 8, padding: 14, marginTop: 14 },
  attireNoteTitle: { color: '#183225', fontSize: 16, lineHeight: 21, fontWeight: '800' },
  attireNoteText: { color: '#52695b', fontSize: 13, lineHeight: 21, marginTop: 12 },
  attireImageButton: { borderRadius: 8, overflow: 'hidden', marginTop: 14 },
  attireDresscodeImage: { width: '100%', height: 230, backgroundColor: '#f4faf5', borderWidth: 1, borderColor: '#d8e2d9', borderRadius: 8, marginTop: 14 },
  attireCaption: { color: '#7b8c81', fontSize: 11, lineHeight: 17, fontStyle: 'italic', marginTop: 12 },
  uniformRow: { flexDirection: 'row', gap: 12, marginTop: 14 },
  uniformCard: { flex: 1, borderWidth: 1, borderColor: '#d8e2d9', borderRadius: 8, overflow: 'hidden', backgroundColor: '#f8fcf8' },
  uniformImage: { width: '100%', height: 220, backgroundColor: '#fff' },
  uniformLabel: { color: '#183225', fontSize: 13, lineHeight: 18, fontWeight: '800', textAlign: 'center', paddingVertical: 10 },
  attireButton: { minHeight: 50, borderRadius: 8, backgroundColor: '#075b31', paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  attireTitle: { color: '#fff', fontSize: 13, fontWeight: '800' },
  attirePanel: { borderRadius: 8, backgroundColor: '#fffde8', padding: 14, marginBottom: 12 },
  attireRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  attireText: { flex: 1, color: '#52695b', fontSize: 12, lineHeight: 18, marginLeft: 9 },
  mapCard: { borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#d8e2d9', padding: 14, marginBottom: 14 },
  mapHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
  mapTitle: { color: '#183225', fontSize: 19, fontWeight: '800' },
  mapSubtitle: { color: '#698073', fontSize: 11, marginTop: 4 },
  guidedBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, backgroundColor: '#e2f2dc', paddingHorizontal: 8, paddingVertical: 5 },
  guidedDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#009c29', marginRight: 5 },
  guidedText: { color: '#075b31', fontSize: 9, fontWeight: '800' },
  legendImageFrame: { width: '100%', aspectRatio: 5.4, backgroundColor: '#009c29', overflow: 'hidden', marginBottom: 12 },
  legendImage: { width: '100%', height: '100%' },
  fullscreenLegend: { marginBottom: 0, borderTopWidth: 1, borderTopColor: '#f7d521' },
  legend: { minHeight: 55, backgroundColor: '#009c29', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 7, marginBottom: 12 },
  legendItem: { alignItems: 'center', minWidth: 54 },
  legendSwatch: { width: 26, height: 12, borderWidth: 1, borderColor: 'rgba(0,0,0,0.18)' },
  legendLabel: { color: '#fff', fontSize: 8, fontWeight: '700', marginTop: 4 },
  mapFrame: { width: '100%', aspectRatio: 1080 / 1350, borderRadius: 8, overflow: 'hidden', backgroundColor: '#075b31', position: 'relative' },
  mapZoomLayer: { position: 'absolute', left: 0, top: 0 },
  mapImage: { position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' },
  mapMarkerLayer: { position: 'absolute', left: 0, top: 0 },
  mapMarker: { position: 'absolute', width: 44, height: 30, marginLeft: -22, marginTop: -15, borderRadius: 8, backgroundColor: '#f7d521', borderWidth: 3, borderColor: '#fff', alignItems: 'center', justifyContent: 'center', elevation: 4, zIndex: 2 },
  mapMarkerSelected: { borderColor: '#075b31', borderWidth: 4, transform: [{ scale: 1.12 }] },
  mapMarkerText: { color: '#183225', fontSize: 17, fontWeight: '800' },
  gateMarker: { position: 'absolute', width: 34, height: 24, marginLeft: -17, marginTop: -12, borderRadius: 7, backgroundColor: '#075b31', borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center', elevation: 4, zIndex: 3 },
  gateMarkerSelected: { borderColor: '#f7d521', borderWidth: 3, transform: [{ scale: 1.12 }] },
  gateMarkerText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  guideCharacter: { position: 'absolute', left: 0, top: 0, width: 36, height: 46, alignItems: 'center', zIndex: 20, elevation: 20 },
  guideAvatarImage: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: '#f7d521', backgroundColor: '#fff' },
  guideStandbyCloud: { position: 'absolute', bottom: 48, left: -57, width: 150, minHeight: 38, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: '#d8e2d9', alignItems: 'center', justifyContent: 'center', elevation: 5 },
  guideStandbyText: { color: '#183225', fontSize: 11, lineHeight: 15, fontWeight: '800', textAlign: 'center' },
  guideHead: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#f7d521', borderWidth: 2, borderColor: '#fff' },
  guideBody: { width: 30, height: 28, borderRadius: 8, backgroundColor: '#075b31', borderWidth: 2, borderColor: '#dff5df', alignItems: 'center', justifyContent: 'center', marginTop: -2 },
  guideBubble: { position: 'absolute', left: 14, right: 14, top: 14, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.9)', borderLeftWidth: 4, borderLeftColor: '#f7d521', padding: 11 },
  guideLabel: { color: '#009c29', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  guideText: { color: '#183225', fontSize: 11, lineHeight: 16, marginTop: 3 },
  locationDetailsButton: { position: 'absolute', top: 14, left: 14, width: 42, height: 42, borderRadius: 8, backgroundColor: '#075b31', borderWidth: 2, borderColor: '#f7d521', alignItems: 'center', justifyContent: 'center', elevation: 5, zIndex: 4 },
  locationPreview: { position: 'absolute', top: 10, left: 10, width: '62%', maxWidth: 210, maxHeight: '78%', backgroundColor: '#fff', borderWidth: 1, borderColor: '#d8e2d9', borderRadius: 9, overflow: 'hidden', elevation: 8, zIndex: 8 },
  locationPreviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 7, backgroundColor: '#f0f8ef', borderBottomWidth: 1, borderBottomColor: '#d8e2d9' },
  locationPreviewHeading: { flex: 1, minWidth: 0 },
  locationPreviewScroll: { flexGrow: 0, flexShrink: 1 },
  locationPreviewSummary: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  locationPreviewThumbnail: { width: 42, height: 40, borderRadius: 6, overflow: 'hidden' },
  locationPreviewImage: { width: '100%', height: '100%', backgroundColor: '#d8e2d9' },
  locationPreviewImageHint: { position: 'absolute', right: 2, bottom: 2, borderRadius: 4, backgroundColor: 'rgba(7,91,49,0.92)', padding: 2 },
  locationPreviewClose: { width: 36, height: 36, borderRadius: 7, backgroundColor: '#fff', borderWidth: 1, borderColor: '#d8e2d9', alignItems: 'center', justifyContent: 'center' },
  locationPreviewCopy: { padding: 7 },
  locationPreviewEyebrow: { color: '#009c29', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  locationPreviewTitle: { color: '#183225', fontSize: 14, lineHeight: 18, fontWeight: '800', marginTop: 3 },
  locationPreviewPurpose: { color: '#075b31', fontSize: 11, lineHeight: 15, fontWeight: '700' },
  locationPreviewDescription: { color: '#52695b', fontSize: 12, lineHeight: 16, marginTop: 5 },
  walkRouteList: { marginTop: 7, gap: 5 },
  walkRouteButtons: { flexDirection: 'row', gap: 4 },
  walkRouteButton: { flex: 1, minHeight: 34, borderRadius: 6, backgroundColor: '#075b31', paddingHorizontal: 3, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  walkRouteButtonText: { flexShrink: 1, color: '#fff', fontSize: 11, fontWeight: '800', textAlign: 'center' },
  imageModal: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  imageModalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(4,24,13,0.86)' },
  imageModalContent: { width: '100%', maxWidth: 520, aspectRatio: 1.25, backgroundColor: '#fff', borderRadius: 8, overflow: 'hidden', elevation: 8 },
  imageModalImage: { width: '100%', height: '100%' },
  imageModalClose: { position: 'absolute', top: 10, right: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.94)', alignItems: 'center', justifyContent: 'center' },
  locationsCard: { borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#d8e2d9', padding: 14, marginBottom: 14 },
  locationsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  locationsTitle: { color: '#183225', fontSize: 17, fontWeight: '800' },
  locationsCount: { color: '#009c29', fontSize: 11, fontWeight: '800' },
  locationRow: { minHeight: 78, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#e5ebe5', paddingHorizontal: 6, paddingVertical: 10 },
  locationRowSelected: { backgroundColor: '#fffbe5', paddingLeft: 12 },
  locationSelectedStripe: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5, backgroundColor: '#f7d521' },
  locationRowLast: { borderBottomWidth: 0 },
  locationNumber: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#f7d521', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  locationNumberSelected: { borderWidth: 3, borderColor: '#009c29' },
  locationNumberText: { color: '#183225', fontSize: 14, fontWeight: '800' },
  locationCopy: { flex: 1, paddingRight: 8 },
  locationName: { color: '#183225', fontSize: 12, lineHeight: 16, fontWeight: '800' },
  locationPurpose: { color: '#698073', fontSize: 10, lineHeight: 15, marginTop: 4 },
  tip: { borderRadius: 8, backgroundColor: '#fffde8', borderLeftWidth: 5, borderLeftColor: '#f7d521', padding: 15, flexDirection: 'row', alignItems: 'flex-start', marginTop: 2 },
  tipBadge: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f7d521', alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  tipBadgeText: { color: '#5e5812', fontSize: 10, fontWeight: '800' },
  tipCopy: { flex: 1, paddingRight: 8 },
  tipTitle: { color: '#183225', fontSize: 14, fontWeight: '800' },
  tipText: { color: '#645f18', fontSize: 12, lineHeight: 19, marginTop: 5 },
  tipHint: { color: '#8a7412', fontSize: 10, fontWeight: '700', marginTop: 9 },
  tipHint: { color: '#698073', fontSize: 9, marginTop: 8 },
  mapControls: { position: 'absolute', top: 12, right: 12, alignItems: 'center', gap: 7 },
  mapControl: { width: 46, height: 46, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.94)', borderWidth: 1, borderColor: '#d8e2d9', alignItems: 'center', justifyContent: 'center' },
  mapControlDisabled: { opacity: 0.45 },
  resetControl: { minWidth: 52, height: 34, borderRadius: 8, backgroundColor: '#075b31', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  resetText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  walkingSpeedButton: { position: 'absolute', left: 12, bottom: 12, minHeight: 40, paddingHorizontal: 12, borderRadius: 20, backgroundColor: 'rgba(7,91,49,0.95)', flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f7d521' },
  walkingSpeedText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  zoomBadge: { position: 'absolute', right: 12, bottom: 12, borderRadius: 12, backgroundColor: 'rgba(7,91,49,0.92)', paddingHorizontal: 9, paddingVertical: 5 },
  zoomText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  fullscreen: { flex: 1, backgroundColor: '#2b9047' },
  fullscreenHeader: { height: 72, backgroundColor: '#fff', paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fullscreenEyebrow: { color: '#009c29', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  fullscreenTitle: { color: '#183225', fontSize: 20, fontWeight: '800', marginTop: 3 },
  closeControl: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f2f5f2', borderWidth: 1, borderColor: '#d8e2d9', alignItems: 'center', justifyContent: 'center' },
  fullscreenMap: { width: '100%', height: undefined, aspectRatio: 1080 / 1350, borderRadius: 0 }
});
const profileStyles = StyleSheet.create({
  headerBrand: { flex: 1, position: 'relative', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 10 },
  headerBack: { width: 30, height: 42, alignItems: 'center', justifyContent: 'center' },
  photoEditor: { minHeight: 112, marginBottom: 20, flexDirection: 'row', alignItems: 'center' },
  photoPreview: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#e6f6e4', marginRight: 16 },
  photoActions: { flex: 1, alignItems: 'flex-start' },
  photoTitle: { color: '#fff', fontSize: 14, fontWeight: '800', marginBottom: 8 },
  photoButton: { minHeight: 38, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#d8e2d9', paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 7 },
  photoButtonText: { color: '#075b31', fontSize: 11, fontWeight: '800' },
  removePhotoButton: { minHeight: 30, justifyContent: 'center', paddingHorizontal: 4, marginTop: 3 },
  removePhotoText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  nicknameEditor: { marginBottom: 20 },
  nicknameLabel: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 7 },
  nicknameInput: { minHeight: 48, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#d8e2d9', color: '#183225', fontSize: 14, paddingHorizontal: 14, paddingVertical: 11 },
  guestModeBar: { minHeight: 64, backgroundColor: '#fffde8', borderBottomWidth: 1, borderBottomColor: '#e3d274', paddingHorizontal: 18, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  guestModeLabel: { color: '#5e5812', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  guestModeCopy: { color: '#645f18', fontSize: 10, marginTop: 3 },
  exitGuestAction: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 12 },
  exitGuestText: { color: '#075b31', fontSize: 11, fontWeight: '800' },
  page: { paddingBottom: 24 },
  title: { color: '#fff', fontSize: 29, lineHeight: 34, fontWeight: '800' },
  subtitle: { color: '#f2fff4', fontSize: 13, lineHeight: 19, marginTop: 8, marginBottom: 22, maxWidth: 420 },
  summary: { borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#d8e2d9', padding: 18, marginBottom: 22 },
  summaryItem: { marginBottom: 16 },
  summaryLabel: { color: '#698073', fontSize: 10, lineHeight: 14, fontWeight: '800', letterSpacing: 1, marginBottom: 4 },
  summaryValue: { color: '#183225', fontSize: 15, lineHeight: 21, fontWeight: '600' },
  primaryActions: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  editButton: { minHeight: 52, minWidth: 122, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#d8e2d9', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  editButtonText: { color: '#183225', fontSize: 13, fontWeight: '700' },
  backButton: { flex: 1, minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#d8e2d9', paddingHorizontal: 12 },
  backButtonText: { color: '#075b31', fontSize: 13, fontWeight: '800' },
  guestButton: { minHeight: 76, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#d8e2d9', alignItems: 'center', justifyContent: 'center', padding: 13, marginBottom: 12 },
  guestTitle: { color: '#183225', fontSize: 12, fontWeight: '800', textAlign: 'center' },
  guestCopy: { color: '#75877b', fontSize: 10, lineHeight: 15, textAlign: 'center', marginTop: 5, maxWidth: 310 },
  updateCard: { borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#d8e2d9', marginBottom: 12, paddingBottom: 12 },
  updateButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 12 },
  updateDisabled: { opacity: 0.65 },
  updateMessage: { color: '#52695b', fontSize: 12, lineHeight: 17, paddingHorizontal: 14, textAlign: 'center' },
  resetButton: { minHeight: 68, borderRadius: 8, backgroundColor: '#fffde8', borderWidth: 1, borderColor: '#f7d521', justifyContent: 'center', padding: 14 },
  resetDialogActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  resetConfirmAction: { backgroundColor: '#9a3128', paddingHorizontal: 12 },
  resetTitle: { color: '#183225', fontSize: 13, fontWeight: '800' },
  resetCopy: { color: '#698073', fontSize: 10, marginTop: 5 }
});
const guestSetupStyles = StyleSheet.create({
  content: { backgroundColor: '#009c29', paddingTop: 24, paddingBottom: 18 },
  page: { paddingBottom: 12 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingHorizontal: 18, paddingVertical: 14, backgroundColor: '#f2fbf0', borderTopWidth: 1, borderTopColor: '#d8e2d9' }
});
const homeStyles = StyleSheet.create({
  content: { backgroundColor: '#009c29', paddingTop: 24 },
  page: { paddingBottom: 24 },
  welcome: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  welcomeCopy: { flex: 1, paddingRight: 14 },
  kicker: { color: '#f7d521', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  title: { color: '#fff', fontSize: 27, lineHeight: 31, fontWeight: '800', marginTop: 8 },
  subtitle: { color: '#f2fff4', fontSize: 13, lineHeight: 19, marginTop: 10 },
  progressBadge: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#f7d521', alignItems: 'center', justifyContent: 'center' },
  progressBadgeText: { color: '#4c4a12', fontSize: 18, fontWeight: '800' },
  progressCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  portal: { display: 'none' },
  profilePortal: { minHeight: 94, borderRadius: 8, backgroundColor: '#f7d521', padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  actionIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  actionCopy: { flex: 1 },
  actionEyebrow: { color: '#5e5812', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  portalTitle: { color: '#183225', fontSize: 17, fontWeight: '800', marginTop: 4 },
  portalSubtitle: { color: '#645f18', fontSize: 11, marginTop: 3 },
  card: { borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#d8e2d9', padding: 17, marginBottom: 16 },
  cardEyebrow: { color: '#698073', fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 10 },
  cardTitle: { color: '#183225', fontSize: 20, lineHeight: 25, fontWeight: '800', marginBottom: 8 },
  profileLine: { color: '#31483a', fontSize: 13, lineHeight: 19 },
  cardHint: { color: '#75877b', fontSize: 12, lineHeight: 17, marginTop: 4 },
  progressTrack: { height: 10, borderRadius: 5, backgroundColor: '#dfe7e1', overflow: 'hidden', marginTop: 2 },
  progressFill: { height: '100%', borderRadius: 5, backgroundColor: '#009c29' },
  progressLabel: { color: '#009c29', fontSize: 14, fontWeight: '800', marginTop: 10 },
  stageCard: { borderLeftWidth: 5, borderLeftColor: '#f7d521' },
  nextAction: { minHeight: 94, borderRadius: 8, backgroundColor: '#f7d521', padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  nextTitle: { color: '#183225', fontSize: 15, lineHeight: 20, fontWeight: '800', marginTop: 4 },
  nextSubtitle: { color: '#645f18', fontSize: 11, marginTop: 3 },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', marginTop: 2, marginBottom: 14 },
  sectionAccent: { width: 5, height: 25, borderRadius: 3, backgroundColor: '#f7d521', marginRight: 10 },
  sectionTitleText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  quickAction: { minHeight: 78, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#d8e2d9', paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  quickIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#f2f5f2', borderWidth: 1, borderColor: '#d8e2d9', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  quickTitle: { color: '#183225', fontSize: 15, fontWeight: '700' },
  quickSubtitle: { color: '#75877b', fontSize: 12, marginTop: 4 },
  tip: { borderRadius: 8, backgroundColor: '#fffde8', borderLeftWidth: 5, borderLeftColor: '#f7d521', padding: 17, marginTop: 10 },
  tipTitle: { color: '#183225', fontSize: 14, fontWeight: '800' },
  tipText: { color: '#645f18', fontSize: 12, lineHeight: 18, marginTop: 8 }
});
const journeyStyles = StyleSheet.create({
  passportStampPressed: { transform: [{ scale: 0.94 }] },
  passportSummary: { backgroundColor: '#064b2e', borderRadius: 12, padding: 16, marginTop: 16 },
  passportProfile: { flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, borderTopColor: '#397454', paddingTop: 18 },
  passportAvatar: { width: 46, height: 46, borderRadius: 23, borderWidth: 2, borderColor: '#f7d521', backgroundColor: '#fff' },
  passportName: { color: '#fff', fontSize: 16, fontWeight: '700' },
  passportProgram: { color: '#c5dfd0', fontSize: 12, lineHeight: 18, marginTop: 4 },
  passportProgressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 22 },
  passportProgressCopy: { flex: 1, color: '#c5dfd0', fontSize: 13, lineHeight: 18 },
  passportPercent: { color: '#f7d521', fontSize: 24, fontWeight: '800' },
  passportTrack: { height: 8, borderRadius: 4, backgroundColor: '#397454', overflow: 'hidden', marginTop: 10 },
  passportFill: { height: '100%', borderRadius: 4, backgroundColor: '#f7d521' },
  passportStamps: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 18 },
  passportStamp: { flexGrow: 1, flexBasis: 38, minWidth: 44, minHeight: 50, borderRadius: 10, borderWidth: 1, borderColor: '#82ae94', alignItems: 'center', justifyContent: 'center', gap: 3 },
  passportStampComplete: { backgroundColor: '#f7d521', borderColor: '#f7d521' },
  passportStampNumber: { color: '#c5dfd0', fontSize: 10, fontWeight: '800' },

  page: { paddingBottom: 28 },
  hero: { backgroundColor: '#009c29', borderWidth: 1, borderColor: '#f7d521', borderRadius: 12, padding: 22 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroTag: { alignSelf: 'flex-start', color: '#183225', backgroundColor: '#f7d521', borderRadius: 14, paddingHorizontal: 11, paddingVertical: 6, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  heroCount: { color: '#fff', fontSize: 18, fontWeight: '800' },
  heroTitle: { color: '#fff', fontSize: 27, lineHeight: 33, fontWeight: '800', marginTop: 20 },
  heroCopy: { color: '#f2fff4', fontSize: 14, lineHeight: 21, marginTop: 8 },
  currentStop: { backgroundColor: '#075b31', borderLeftWidth: 4, borderLeftColor: '#f7d521', borderRadius: 8, padding: 14, marginTop: 18 },
  stoppedStop: { backgroundColor: '#fffde8', borderLeftColor: '#f7d521' },
  stopLabel: { color: '#f2fff4', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  stopTitle: { color: '#fff', fontSize: 20, fontWeight: '800', marginTop: 5 },
  stopCopy: { color: '#f2fff4', fontSize: 12, lineHeight: 17, marginTop: 4 },
  progressCard: { backgroundColor: '#fff', borderRadius: 10, padding: 18, marginVertical: 16, borderWidth: 1, borderColor: '#d8e2d9' },
  progressTrack: { height: 9, borderRadius: 5, backgroundColor: '#dfe7e1', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 5, backgroundColor: '#009c29' },
  progressCopy: { color: '#52695b', fontSize: 13, fontWeight: '700', marginTop: 9 },
  trailCard: { backgroundColor: '#f3f8f2', borderWidth: 1, borderColor: '#b8d3bc', borderRadius: 10, padding: 16, overflow: 'hidden', marginTop: 16 },
  trailHeading: { backgroundColor: '#009c29', borderRadius: 8, padding: 17, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  trailEyebrow: { color: '#f7d521', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  trailTitle: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 5 },
  legend: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  legendDot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  legendText: { color: '#52695b', fontSize: 10, marginLeft: 5 },
  trail: { paddingHorizontal: 4, paddingTop: 4 },
  stationRow: { height: 110, position: 'relative' },
  road: { position: 'absolute', top: 21, left: 70, right: 70, height: 126, borderBottomWidth: 16, borderColor: '#aebbb3' },
  roadRight: { borderLeftWidth: 16, borderBottomLeftRadius: 64 },
  roadLeft: { borderRightWidth: 16, borderBottomRightRadius: 64 },
  roadComplete: { borderColor: '#e0bd16' },
  station: { position: 'absolute', top: 0, width: 58, alignItems: 'center', zIndex: 2 },
  stationLeft: { left: 41 },
  stationRight: { right: 41 },
  currentMarker: { position: 'absolute', top: -34, width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', borderWidth: 3, borderColor: '#f7d521', alignItems: 'center', justifyContent: 'center', zIndex: 4, overflow: 'hidden' },
  avatarImage: { width: 38, height: 38, borderRadius: 19 },
  node: { width: 58, height: 58, borderRadius: 29, borderWidth: 4, borderColor: '#009c29', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', zIndex: 3 },
  nodeComplete: { backgroundColor: '#009c29', borderColor: '#f7d521' },
  nodeCurrent: { backgroundColor: '#fff', borderColor: '#009c29' },
  nodeLocked: { backgroundColor: '#dfe7e1', borderColor: '#91a49a' },
  nodeStopped: { backgroundColor: '#fffde8', borderColor: '#f7d521' },
  nodeNumber: { color: '#075b31', fontSize: 20, fontWeight: '800' },
  nodeLabel: { width: 112, color: '#698073', fontSize: 10, lineHeight: 13, fontWeight: '700', textAlign: 'center', marginTop: 5, backgroundColor: '#f3f8f2' },
  nodeLabelCurrent: { color: '#075b31' },
  nodeLabelStopped: { color: '#075b31' },
  finish: { backgroundColor: '#075b31', borderTopWidth: 8, borderTopColor: '#fff', borderStyle: 'dashed', borderRadius: 8, padding: 15, flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  finishFlag: { width: 30, alignItems: 'center' },
  finishCopy: { flex: 1, alignItems: 'center', marginHorizontal: 10 },
  finishLabel: { color: '#f7d521', fontSize: 9, fontWeight: '800', letterSpacing: 1, textAlign: 'center' },
  finishTitle: { color: '#fff', fontSize: 17, fontWeight: '800', marginTop: 3, textAlign: 'center' },
  finishProgram: { width: '100%', flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(247,213,33,0.55)', paddingTop: 9, marginTop: 11 },
  finishProgramCopy: { flex: 1, alignItems: 'center' },
  finishProgramLabel: { color: '#f7d521', fontSize: 8, fontWeight: '800', letterSpacing: 1 },
  program: { color: '#fff', fontSize: 12, lineHeight: 16, fontWeight: '800', marginTop: 2, textAlign: 'center' }
});
const statusInfoStyles = StyleSheet.create({
  requirementsReminder: { color: '#805508', fontSize: 13, fontWeight: '600', marginBottom: 14 },
  warningFrame: { flex: 1, justifyContent: 'center', padding: 24 },
  warningCard: { alignSelf: 'center', width: '100%', maxWidth: 460, maxHeight: '85%', padding: 22, borderRadius: 18, backgroundColor: '#fff' },
  warningCopy: { color: '#52695b', fontSize: 14, lineHeight: 21, marginTop: 8 },
  warningList: { marginTop: 16, flexGrow: 0 },
  warningConfirm: { marginTop: 10, alignItems: 'center', padding: 12 },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd9ce', borderRadius: 10, padding: 20, marginTop: 16, marginBottom: 16 },
  eyebrow: { color: '#009c29', fontSize: 10, fontWeight: '800', letterSpacing: 1.1, marginBottom: 14 },
  body: { color: '#52695b', fontSize: 14, lineHeight: 22 },
  remember: { color: '#183225', fontSize: 14, fontWeight: '800', marginTop: 18, marginBottom: 10 },
  reminderRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#f7d521', marginTop: 7, marginRight: 9 },
  reminderText: { flex: 1, color: '#52695b', fontSize: 13, lineHeight: 20 },
  portalButton: { minHeight: 48, backgroundColor: '#f7d521', borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14 },
  portalButtonText: { color: '#183225', fontSize: 14, fontWeight: '800' },
  profileRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  profileLabel: { width: 102, color: '#698073', fontSize: 13 },
  profileValue: { flex: 1, color: '#183225', fontSize: 13, lineHeight: 18, fontWeight: '700' }
});
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: '#075b31' }, screen: { padding: 23, paddingBottom: 110, backgroundColor: '#f2fbf0', minHeight: '100%' }, greenWash: { position: 'absolute', top: 0, left: 0, right: 0, height: 150, backgroundColor: '#075b31' }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 12, backgroundColor: '#dff5df' }, brand: { flexDirection: 'row', alignItems: 'center' }, logo: { width: 51, height: 51, marginRight: 11 }, eyebrow: { color: '#698073', fontSize: 10, fontWeight: '700', letterSpacing: 1 }, brandName: { color: '#075b31', fontSize: 18, fontWeight: '700' }, help: { color: '#075b31', borderWidth: 1, borderColor: '#b8d3bc', borderRadius: 20, width: 32, height: 32, textAlign: 'center', paddingTop: 5, fontWeight: '700', backgroundColor: '#fff' }, progress: { marginTop: 34, marginBottom: 42 }, progressTrack: { flexDirection: 'row', alignItems: 'center' }, progressSegment: { flex: 1, flexDirection: 'row', alignItems: 'center' }, progressDot: { width: 10, height: 10, borderRadius: 6, borderWidth: 2, borderColor: '#b8d3bc', backgroundColor: '#f2fbf0' }, activeProgressDot: { width: 14, height: 14, borderRadius: 8, borderWidth: 3, borderColor: '#078743' }, completeProgressDot: { borderColor: '#078743', backgroundColor: '#078743' }, progressLine: { height: 2, flex: 1, backgroundColor: '#cfe1d0' }, completeProgressLine: { backgroundColor: '#078743' }, progressText: { color: '#698073', fontSize: 12, fontWeight: '700', marginTop: 8 }, kicker: { color: '#078743', fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 10 }, title: { color: '#075b31', fontSize: 38, fontWeight: '700', lineHeight: 42 }, intro: { color: '#698073', fontSize: 15, lineHeight: 23, marginTop: 15, marginBottom: 30 }, list: { gap: 12 }, option: { minHeight: 68, padding: 15, borderWidth: 1, borderColor: '#d9e7da', borderRadius: 10, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center' }, compact: { minHeight: 58, padding: 11 }, profileOption: { minHeight: 112, padding: 20, alignItems: 'flex-start' }, selected: { borderWidth: 2, borderColor: '#078743', backgroundColor: '#dff5df' }, pressed: { opacity: 0.78, transform: [{ scale: 0.985 }] }, icon: { width: 38, height: 38, borderRadius: 20, backgroundColor: '#dff5df', color: '#078743', textAlign: 'center', paddingTop: 10, marginRight: 12, fontWeight: '700' }, selectedIcon: { backgroundColor: '#078743', color: '#fff' }, optionCopy: { flex: 1 }, optionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, optionText: { flex: 1, color: '#183225', fontSize: 14, fontWeight: '700' }, profileOptionText: { fontSize: 18, lineHeight: 23 }, profileOptionTextSelected: { color: '#078743' }, selectedLabel: { color: '#078743', fontSize: 11, fontWeight: '800', marginLeft: 12 }, optionCaption: { color: '#698073', fontSize: 14, lineHeight: 21, marginTop: 10 }, check: { color: '#078743', fontSize: 18 }, actions: { flexDirection: 'row', gap: 12, marginTop: 28, alignItems: 'center' }, fixedActions: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 18, paddingHorizontal: 23, flexDirection: 'row', gap: 12, backgroundColor: '#e5f6e3', borderTopWidth: 1, borderTopColor: '#b8d3bc' }, action: { flex: 1, minHeight: 48, borderRadius: 8, backgroundColor: '#075b31', justifyContent: 'center', alignItems: 'center' }, actionText: { color: '#fff', fontWeight: '700' }, disabled: { backgroundColor: '#9fbaaa' }, back: { minHeight: 48, paddingHorizontal: 16, borderWidth: 1, borderColor: '#b8d3bc', borderRadius: 8, justifyContent: 'center', backgroundColor: '#fff' }, backText: { color: '#075b31', fontWeight: '700' }, search: { height: 48, borderWidth: 1, borderColor: '#b8d3bc', borderRadius: 8, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, marginBottom: 15 }, searchIcon: { color: '#078743', fontSize: 24, marginRight: 9 }, input: { flex: 1, color: '#183225' }, clear: { width: 24, height: 24, borderRadius: 13, backgroundColor: '#dff5df', alignItems: 'center', justifyContent: 'center' }, clearText: { color: '#078743', fontSize: 18 }, muted: { color: '#698073', fontSize: 13 }, welcome: { borderWidth: 1, borderColor: '#d9e7da', backgroundColor: '#fff', padding: 21 }, welcomeTitle: { color: '#075b31', fontSize: 23, fontWeight: '700' }, tiles: { flexDirection: 'row', gap: 10, marginVertical: 12 }, tile: { flex: 1, padding: 17, backgroundColor: '#dff5df', borderWidth: 1, borderColor: '#d9e7da' }, tileLabel: { color: '#075b31', fontSize: 16, fontWeight: '700', marginBottom: 5 }, mainApp: { flex: 1, backgroundColor: '#078743' }, mainHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, backgroundColor: '#fff' }, mainLogo: { width: 42, height: 42 }, headerSide: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center' }, mainTitle: { flex: 1, minWidth: 0, paddingHorizontal: 8, textAlign: 'center', color: '#075b31', fontSize: 19, fontWeight: '700' }, profileButton: { width: 46, height: 46, padding: 2, alignItems: 'center', justifyContent: 'center', borderRadius: 24, backgroundColor: '#e6f6e4' }, profileImage: { width: 42, height: 42, borderRadius: 22 }, mainContent: { flex: 1 }, mainContentInner: { padding: 23, paddingBottom: 100 }, statusTitle: { color: '#fff', fontSize: 30, fontWeight: '700', lineHeight: 35 }, statusIntro: { color: '#dff5df', fontSize: 14, marginTop: 8, marginBottom: 22 }, statusCard: { padding: 18, borderWidth: 1, borderColor: '#b8d3bc', borderRadius: 12, backgroundColor: '#fff' }, cardEyebrow: { color: '#078743', fontSize: 10, fontWeight: '700', letterSpacing: 1 }, statusHeading: { color: '#183225', fontSize: 21, fontWeight: '700', marginTop: 6 }, statusCaption: { color: '#698073', fontSize: 13, lineHeight: 19, marginTop: 5, marginBottom: 20 }, statusStep: { minHeight: 104, flexDirection: 'row', alignItems: 'flex-start', position: 'relative' }, statusDot: { width: 34, height: 34, borderRadius: 18, backgroundColor: '#e4eee4', alignItems: 'center', justifyContent: 'center', zIndex: 1 }, currentStatusDot: { backgroundColor: '#078743' }, statusNumber: { color: '#698073', fontSize: 13, fontWeight: '700' }, statusStepCopy: { flex: 1, marginLeft: 12, paddingBottom: 18 }, statusStepTitle: { color: '#183225', fontSize: 14, fontWeight: '700' }, statusStepState: { color: '#8aa294', fontSize: 11, marginTop: 2 }, statusStepDescription: { color: '#52695b', fontSize: 12, lineHeight: 18, marginTop: 6 }, statusConnector: { position: 'absolute', left: 16, top: 34, bottom: 0, width: 2, backgroundColor: '#d9e7da' }, bottomNav: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', justifyContent: 'space-around', paddingTop: 13, paddingBottom: 8, borderTopWidth: 1, borderTopColor: '#b8d3bc', backgroundColor: '#fff' }, navItem: { alignItems: 'center', minWidth: 49, paddingVertical: 5, borderRadius: 8 }, activeNavItem: { borderTopWidth: 2, borderTopColor: '#078743', backgroundColor: '#dff5df' }, navLabel: { color: '#698073', fontSize: 10, marginTop: 3 }, activeNavText: { color: '#075b31', fontWeight: '700' } });
