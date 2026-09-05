import { useEffect, useRef, useState } from 'react';
import { Animated, Image, Linking, Modal, PanResponder, Platform, Pressable, SafeAreaView, ScrollView, StatusBar as NativeStatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { useVideoPlayer, VideoView } from 'expo-video';

const exceptionProgramKeywords = ['Nursing', 'Medical Technology', 'Midwifery', 'Tourism Management', 'Hospitality Management', 'Accountancy', 'International Studies'];
const defaultStatusSteps = ['Online Application', 'Validation Appointment', 'Admission Examination', 'Medical Examination', 'Enrollment'];
const exceptionStatusSteps = ['Online Application', 'Validation Appointment', 'Admission Examination', 'Interview', 'Medical Examination', 'Enrollment'];
const statusStepDetails = {
  'Online Application': {
    description: 'Complete and submit your application through the CvSU Online Admission Portal.',
    instructions: ['Go to admission.cvsu.edu.ph using a Gmail account.', 'Fill out the online application form completely and accurately.', 'Choose the correct entry type or applicant category.', 'Ensure the declared track or strand matches your documentary requirements.', 'Review all information before saving and submitting.', 'Save or update the application every time a change is made.', 'Upload documentary requirements as individual JPEG, PNG, or BMP pages up to 1MB each.', 'Use a white-background 2x2 ID photo with a file size of at most 10KB.'],
    requirements: ['Completed online application form', '2x2 ID photo with white background, up to 10KB', 'Documentary requirements signed by authorized school personnel', 'Separate scanned pages in JPEG, PNG, or BMP format, up to 1MB each']
  },
  'Validation Appointment': {
    description: 'Schedule an appointment to have your application documents verified by an admission processor.',
    instructions: ['Log in to the CvSU Online Admission Portal using your registered account.', 'Select an available schedule for document validation.', 'Download and print the generated Validation or Appointment Slip.', 'Report to the designated campus office on your scheduled date and time.', 'Present the original documents and complete photocopies for verification.'],
    requirements: ['Printed Validation or Appointment Slip', 'Original and photocopy of Form 138, Report Card, or Transcript of Records', 'Original and photocopy of PSA Birth Certificate', 'Certificate of Good Moral Character signed by authorized school personnel', '2x2 ID photo with white background', 'Long brown envelope and long plastic envelope']
  },
  'Admission Examination': {
    description: 'Take the admission examination at the assigned venue and schedule.',
    instructions: ['After document validation, download and print your Test Permit from the admission portal.', 'Arrive at the designated venue 30 to 45 minutes before the examination.', 'Bring your Test Permit and valid ID into the examination room.', 'Follow all examination guidelines; cellphones and unauthorized electronic devices are prohibited.', 'Monitor the portal or official announcements for examination results.'],
    requirements: ['Printed Test Permit or Examination Permit', 'Valid school ID or government-issued ID', 'No. 2 pencils']
  },
  Interview: {
    description: 'Attend the required program interview and discuss your academic background and course choice.',
    instructions: ['Check eligibility and program requirements, especially for quota or board courses.', 'Check the portal or department notification for your interview schedule and session.', 'Attend on time in smart casual or official school attire.', 'Prepare to answer questions about your academic background and course choice.'],
    requirements: ['Printed Interview Slip or Exam Result Slip', 'Valid photo ID', 'Copy of Form 138, Report Card, or Summary of Grades'],
    location: 'Designated College or Department Building, such as CEIT, CON, or CED, or the official video conference link for online interviews.'
  },
  'Medical Examination': {
    description: 'Complete the required tests and secure an official medical clearance from the university.',
    instructions: ['Secure the official Medical Examination Form from the portal or University Health Services Unit.', 'Undergo the required laboratory tests at a licensed diagnostic facility or hospital.', 'Report to the University Clinic for a physical examination and submit your test results.', 'Secure the official Medical Clearance issued by university medical staff.'],
    requirements: ['Chest X-ray result taken within the last 3 to 6 months', 'Complete Blood Count result', 'Urinalysis result', 'Blood typing result', 'Completed Medical History Form', '2x2 ID photo'],
    details: ['In-school: Physical examination, dental check-up, and height and weight checks are conducted on campus.', 'Outside medical: Laboratory tests are taken at external diagnostic centers and presented to the University Clinic for validation.']
  },
  Enrollment: {
    description: 'Submit your original documents, register for subjects, and receive your Certificate of Registration.',
    instructions: ['Verify in the portal that Validation, Examination or Interview, and Medical Clearance are completed.', 'Submit all required original hard-copy documents to the Office of the University Registrar.', 'Secure your official Certificate of Registration with your subjects and section schedule.', 'Attend the mandatory student orientation.'],
    requirements: ['Original Form 138 or Senior High School Report Card', 'Original Certificate of Good Moral Character', 'Original PSA Birth Certificate', 'Official Medical Clearance issued by CvSU Health Services Unit', 'Printed Admission or Eligibility Slip', '2x2 ID photos with white background', 'Completed Student Personal Data Sheet or Enrollment Form']
  }
};
const mainTabs = ['Home', 'Status', 'Journey', 'Map', 'FAQ'];
const tabIcons = { Status: 'list-outline', Journey: 'footsteps-outline', Home: 'home-outline', Map: 'map-outline', FAQ: 'help-circle-outline' };
const androidTopInset = Platform.OS === 'android' ? NativeStatusBar.currentHeight || 0 : 0;

const profiles = [
  ['12', 'Current Grade 12 Student', 'Expecting to finish Senior High School at the end of the current school year.'],
  ['SH', 'SHS Graduate', 'A Senior High School graduate who has never been enrolled in any college or university.'],
  ['A', 'ALS Completer', 'Completed the Alternative Learning System and is eligible to enroll in college.']
];
const tracks = [
  ['STEM', 'Science, Technology, Engineering, and Mathematics'],
  ['ABM', 'Accountancy, Business, and Management'],
  ['HUMSS', 'Humanities and Social Sciences'],
  ['GAS', 'General Academic Strand'],
  ['TVL', 'Technical-Vocational-Livelihood Track'],
  ['Arts and Design', 'Arts and Design Track'],
  ['Sports', 'Sports Track']
];
const programs = [
  'Bachelor of Science in Agriculture',
  'Bachelor of Science in Agricultural Entrepreneurship',
  'Bachelor of Science in Environmental Science',
  'Bachelor of Science in Food Technology',
  'Bachelor of Science in Biology',
  'Bachelor of Arts in Communication',
  'Bachelor of Science in Development Communication',
  'Bachelor of Arts in English Language Studies',
  'Bachelor of Arts in Journalism',
  'Bachelor of Science in Applied Mathematics',
  'Bachelor of Arts in Political Science',
  'Bachelor of Science in Psychology',
  'Bachelor of Science in Social Work',
  'Bachelor of Science in Criminology',
  'Bachelor of Science in Industrial Security Management',
  'Bachelor of Science in Accountancy',
  'Bachelor of Science in Economics',
  'Bachelor of Science in Business Management',
  'Bachelor of Science in Development Management',
  'Bachelor of Science in International Studies',
  'Bachelor of Arts in International Studies',
  'Bachelor of Science in Office Administration',
  'Bachelor of Early Childhood Education',
  'Bachelor of Elementary Education',
  'Bachelor of Secondary Education',
  'Bachelor of Special Needs Education',
  'Bachelor of Technology and Livelihood Education',
  'Teacher Certificate Program',
  'Bachelor of Science in Agricultural and Biosystems Engineering',
  'Bachelor of Science in Civil Engineering',
  'Bachelor of Science in Computer Engineering',
  'Bachelor of Science in Electrical Engineering',
  'Bachelor of Science in Electronics Engineering',
  'Bachelor of Science in Industrial Engineering',
  'Bachelor of Science in Industrial Technology',
  'Bachelor of Science in Computer Science',
  'Bachelor of Science in Information Technology',
  'Bachelor of Science in Architecture',
  'Bachelor of Science in Nursing',
  'Bachelor of Science in Medical Technology',
  'Bachelor of Science in Midwifery',
  'Diploma in Midwifery',
  'Doctor of Medicine',
  'Bachelor of Physical Education',
  'Bachelor of Exercise and Sports Sciences',
  'Doctor of Veterinary Medicine',
  'Bachelor of Science in Animal Health and Management',
  'Bachelor of Science in Veterinary Technology',
  'Master in Veterinary Studies',
  'Master in Veterinary Science',
  'Bachelor of Science in Biomedical Science',
  'Bachelor of Science in Hospitality Management',
  'Bachelor of Science in Tourism Management'
];
const faqItems = [
  ['Application', 'How do I apply for admission?', 'Visit the official University Admission Portal, create an account, complete the Application Form, and upload the required documents.'],
  ['Application', 'What are the basic requirements for application?', 'The basic requirements are Form 138 / Grade 12 Report Card, PSA Birth Certificate, and a recent 2x2 ID photo.'],
  ['Application', 'Can I still apply if my Form 138 is incomplete or delayed?', 'Yes. You may temporarily submit Form 137 or a Certificate of Enrollment/Graduation from your Senior High School while processing your official Form 138.'],
  ['Application', 'Is there an application fee?', 'No. The application and admission process is free for qualified students under the Free Higher Education Act in state universities.'],
  ['Application', 'Can I edit my application after submitting it?', 'If you need to correct information after submission, contact the University Admission Helpdesk or Admission Office for assistance.'],
  ['Application', 'How can I check my application status?', 'Log in to the University Admission Portal and check your application status. If the status is unclear, contact the Admission Helpdesk.'],
  ['Application', 'What should I do if I forget my admission portal password?', "Use the portal's password recovery option. If you cannot recover your account, contact the Admission Helpdesk."],
  ['Examination', 'Are all applicants required to take the College Admission Test (CAT)?', 'Yes. The college entrance exam is part of the evaluation process for incoming first-year college students.'],
  ['Examination', 'What should I bring on the day of the examination?', 'Bring your printed Test Permit, a valid ID or School ID, Mongol Pencil No. 2 and an eraser, and a transparent envelope or folder.'],
  ['Examination', 'How will I know my exam schedule and venue?', 'Your examination schedule, room assignment, and venue will be indicated on your Test Permit, which can be downloaded from the admission portal once your application is verified.'],
  ['Examination', 'What happens if I lose my Test Permit?', 'Log in to the admission portal and check if you can download or print the permit again. If you cannot access it, contact the Admission Office.'],
  ['Examination', 'What happens if I miss my scheduled examination date?', 'Contact the Admission Office / Office of Student Affairs immediately. Rescheduling depends on slot availability and valid justification.'],
  ['Examination', 'What should I do if I am late on examination day?', 'Proceed to the assigned examination venue as soon as possible and ask the examination personnel for instructions. Admission may depend on the examination rules.'],
  ['Medical', 'When do I need to undergo the medical examination?', 'The medical examination is conducted after you pass the admission test and are qualified for enrollment. It is a prerequisite before official registration.'],
  ['Medical', 'What medical document do I need for enrollment?', "You need medical clearance issued or approved by the University Clinic. Follow the clinic's current instructions for any laboratory or diagnostic requirements."],
  ['Medical', 'Can I get medical tests done at an external clinic or hospital?', 'External testing may be accepted if allowed by the University Clinic. All outside results must be submitted for evaluation and clearance.'],
  ['Enrollment', 'What documents must I bring during official enrollment?', 'Bring the Admission / Notice of Acceptance Slip, Original Form 138, Original PSA Birth Certificate, Certificate of Good Moral Character, and Medical Clearance from the University Clinic.'],
  ['Enrollment', 'Can a representative process my enrollment for me?', 'Personal enrollment is highly recommended. If you cannot attend due to an emergency, your representative must present an Authorization Letter, a copy of your valid ID, and their own valid ID.'],
  ['Enrollment', 'How will I get my assigned section and class schedule?', 'After enrollment is processed, you will receive your Certificate of Registration (COR) or access the information through the Student Portal.'],
  ['Enrollment', 'What if I have incomplete requirements during enrollment?', "You do not need to restart the entire application process. Return once the missing requirements have been completed, subject to the university's enrollment schedule and instructions."],
  ['Enrollment', 'Can I change my information after enrollment?', "Contact the Registrar's Office or the appropriate university office if you need to correct or update your student information."],
  ['General', 'Is college tuition free?', 'Under Republic Act 10931, eligible Filipino undergraduate students in state universities may receive free tuition and other benefits covered by the law.'],
  ['General', 'How do I know if I have been accepted?', 'Check your admission portal for your application or admission status and follow the instructions provided by the university.'],
  ['General', 'What should I do after receiving an admission notice?', "Review the instructions, prepare the enrollment documents, complete the required medical clearance, and follow the university's enrollment schedule."],
  ['General', 'Where can I ask for help with my application?', "Contact the official University Admission Helpdesk or visit the Admission and Registrar's Office at the main campus."],
  ['General', 'What should I do if the admission portal is not working?', 'Check your internet connection and try accessing the portal again. If the problem continues, contact the official Admission Helpdesk and provide details about the issue.'],
  ['General', 'Where can I get the latest admission announcements?', "Check the university's official admission portal and official university announcements for updated schedules, requirements, and procedures."]
];
const faqTrivia = [
  'Did you know Don Severino de las Alas, whom the campus is named after, was the Secretary of the Interior in President Emilio Aguinaldo\'s cabinet?',
  'Did you know the campus was named after Don Severino de las Alas, who donated much of the land where the main campus stands today?',
  'Did you know the school changed its name five times before becoming Cavite State University: Indang Farm School, Indang Rural High School, Don Severino National Agriculture School, Don Severino Agricultural College, and CvSU in 1998?',
  'Did you know the university also conducts research on kaong, or sugar palm, which is Indang\'s One Town One Product?',
  'Did you know the famous Laya at Diwa monument at the campus entrance was created by artist Jonnel P. Castrillo and inaugurated in 2006 during CvSU\'s centennial celebration?',
  'Did you know CvSU Indang hosts the National Coffee Research Center and produces its own coffee brand, the Don Severino Aguinaldo Blend?',
  'Did you know the main campus sits on about 70 hectares of land in Bancod, Indang, roughly 60 kilometers southwest of Manila?',
  'Did you know CvSU became a state university on January 22, 1998, through Republic Act No. 8468, after being Don Severino Agricultural College since 1964?',
  'Did you know CvSU has been accredited by AACCUP and recognized by TESDA as an assessment center?',
  'Did you know the first Filipino principal, Dr. Mariano Mondonedo, took over in 1915 after the school had previously been led by American principals?',
  'Did you know CvSU Indang serves as the main campus and headquarters of the university system, which now has more than 11 campuses across Cavite?',
  'Did you know the Laya at Diwa monument\'s torch flame has CvSU written on it, and the sculpture represents the university\'s vision of Truth, Excellence, and Service?'
];
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
  noticeTrigger: { position: 'absolute', top: 16, right: 20, zIndex: 2, flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 11, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.95)' },
  noticeTriggerText: { marginLeft: 6, color: '#075b31', fontSize: 12, fontWeight: '800' },
  splashSafe: { flex: 1, paddingTop: androidTopInset, backgroundColor: '#009c29' },
  splashContent: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  splashLogo: { width: 150, height: 150, marginBottom: 26 },
  splashKicker: { color: '#f7d521', fontSize: 11, fontWeight: '800', letterSpacing: 1.2, textAlign: 'center' },
  splashTitle: { marginTop: 10, color: '#fff', fontSize: 32, lineHeight: 38, fontWeight: '800', textAlign: 'center' },
  splashCaption: { marginTop: 16, color: '#f2fff4', fontSize: 13, textAlign: 'center' }
});

export default function ExpoApp() {
  const [step, setStep] = useState(1), [profile, setProfile] = useState(''), [track, setTrack] = useState(''), [program, setProgram] = useState(''), [query, setQuery] = useState('');
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [nickname, setNickname] = useState('');
  const [showSetupHelp, setShowSetupHelp] = useState(false);
  const [startMode, setStartMode] = useState('start');
  const [showSplash, setShowSplash] = useState(true);
  useEffect(() => {
    const splashTimer = setTimeout(() => setShowSplash(false), 2200);
    return () => clearTimeout(splashTimer);
  }, []);
  const results = programs.filter((item) => item.toLowerCase().includes(query.toLowerCase().trim()));
  const next = (value, setter, number) => <Action disabled={!value} onPress={() => { setter(value); setStep(number); }} />;
  if (showSplash) return <SplashScreen />;
  if (startMode === 'start') return <StartScreen onSetup={() => { setStartMode('setup'); setStep(1); }} onGuest={() => { setStartMode('guest'); setStep(4); }} />;
  return <SafeAreaView style={styles.safe}><StatusBar style={step === 4 ? 'dark' : 'light'} /><View style={styles.greenWash} />{step < 4 ? <><ScrollView contentContainerStyle={[styles.screen, onboardingSetupStyles.screen]} keyboardShouldPersistTaps="handled"><View style={[styles.header, onboardingSetupStyles.header]}><View style={styles.brand}><Image source={require('../assets/CvSU_Logo.png')} style={styles.logo} /><View><Text style={styles.eyebrow}>CAVITE STATE UNIVERSITY</Text><Text style={styles.brandName}>Admission Guide</Text></View></View><Pressable accessibilityLabel="How your profile personalizes your journey" onPress={() => setShowSetupHelp(true)} style={({ pressed }) => [styles.help, pressed && styles.pressed]}><Text style={onboardingHelpStyles.helpText}>?</Text></Pressable></View><Progress currentStep={step} />
    {step === 1 && <Page kicker="LET'S GET STARTED" title="Tell us about your journey." intro="Choose the description that best matches your current academic status."><View style={styles.list}>{profiles.map(([value, label, caption]) => <Option key={value} label={label} caption={caption} value={value} selected={profile === value} onPress={() => setProfile(value)} profileCard />)}</View></Page>}
    {step === 2 && <Page kicker="STEP 2 · ACADEMIC BACKGROUND" title="What was your track or strand?" intro="This helps us recommend programs that fit what you already enjoy."><View style={styles.list}>{tracks.map(([label, caption]) => <Option key={label} label={label} caption={caption} value={label} selected={track === label} onPress={() => setTrack(label)} profileCard />)}</View></Page>}
    {step === 3 && <Page kicker="STEP 3 · YOUR DIRECTION" title="Which program feels like you?" intro={`Your ${track} background is a great starting point. Search the catalog and choose a first choice.`}><View style={styles.search}><Text style={styles.searchIcon}>⌕</Text><TextInput value={query} onChangeText={setQuery} placeholder="Search programs" placeholderTextColor="#8aa294" style={styles.input} /><Pressable onPress={() => setQuery('')} style={styles.clear}><Text style={styles.clearText}>×</Text></Pressable></View>{results.length === 0 && <Text style={styles.muted}>No matching programs found.</Text>}<View style={styles.list}>{results.map((item) => <Option key={item} label={item} value="→" selected={program === item} onPress={() => setProgram(item)} compact />)}</View></Page>}
  </ScrollView><View style={[styles.fixedActions, onboardingSetupStyles.fixedActions]}><Pressable accessibilityRole="button" accessibilityLabel="Return to start page" onPress={() => { setStartMode('start'); setStep(1); }} style={({ pressed }) => [styles.back, onboardingSetupStyles.back, pressed && styles.pressed]}><Text style={[styles.backText, onboardingSetupStyles.backText]}>Start page</Text></Pressable>{step > 1 && <Back onPress={() => setStep(step - 1)} />}{next(step === 1 ? profile : step === 2 ? track : program, step === 1 ? setProfile : step === 2 ? setTrack : setProgram, step + 1)}</View><Modal visible={showSetupHelp} transparent animationType="fade" onRequestClose={() => setShowSetupHelp(false)}><Pressable style={onboardingHelpStyles.backdrop} onPress={() => setShowSetupHelp(false)}><Pressable accessibilityRole="none" style={onboardingHelpStyles.card} onPress={() => {}}><View style={onboardingHelpStyles.header}><Text style={onboardingHelpStyles.title}>Your personalized journey</Text><Pressable accessibilityLabel="Close personalization help" onPress={() => setShowSetupHelp(false)} style={({ pressed }) => [onboardingHelpStyles.close, pressed && styles.pressed]}><Ionicons name="close" size={20} color="#183225" /></Pressable></View><Text style={onboardingHelpStyles.copy}>Your applicant type, track or strand, and preferred program help tailor the admission guidance shown in this app.</Text><Text style={onboardingHelpStyles.copy}>We use these choices to highlight relevant requirements, recommended next steps, campus locations, and progress through your admission journey.</Text></Pressable></Pressable></Modal></> : <MainApp profile={profile} program={program} track={track} profilePhoto={profilePhoto} nickname={nickname} onProfilePhotoChange={setProfilePhoto} onNicknameChange={setNickname} onRestart={() => { setStartMode('setup'); setStep(1); }} onBackToStart={() => { setStartMode('start'); setStep(1); }} startAsGuest={startMode === 'guest'} />}</SafeAreaView>;
}
function SplashScreen() { return <SafeAreaView style={startStyles.splashSafe}><StatusBar style="light" /><View style={startStyles.splashContent}><Image source={require('../assets/CvSU_Logo.png')} style={startStyles.splashLogo} /><Text style={startStyles.splashKicker}>CAVITE STATE UNIVERSITY</Text><Text style={startStyles.splashTitle}>CvSU Virtual Admission Guide</Text><Text style={startStyles.splashCaption}>Preparing your admission guide</Text></View></SafeAreaView>; }
function StartScreen({ onSetup, onGuest }) { const [showNotice, setShowNotice] = useState(true); const [showOptionInfo, setShowOptionInfo] = useState(null); return <SafeAreaView style={startStyles.safe}><StatusBar style="light" /><Pressable accessibilityRole="button" accessibilityLabel="Show important notice" onPress={() => setShowNotice(true)} style={({ pressed }) => [startStyles.noticeTrigger, pressed && styles.pressed]}><Ionicons name="information-circle-outline" size={18} color="#075b31" /><Text style={startStyles.noticeTriggerText}>Important notice</Text></Pressable><View style={startStyles.content}><View style={startStyles.heroCard}><Image source={require('../assets/CvSU_Logo.png')} style={startStyles.logo} /><Text style={startStyles.kicker}>CAVITE STATE UNIVERSITY</Text><Text style={startStyles.title}>CvSU Virtual Admission Guide</Text><Text style={startStyles.copy}>Your clear starting point for application requirements, admission steps, and campus guidance.</Text></View><View style={startStyles.secondaryAction}><Pressable onPress={onGuest} style={({ pressed }) => [startStyles.optionMain, pressed && styles.pressed]}><Text style={startStyles.secondaryTitle}>Continue as Guest</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="About Continue as Guest" onPress={() => setShowOptionInfo('guest')} style={({ pressed }) => [startStyles.optionQuestion, pressed && styles.pressed]}><Text style={startStyles.optionQuestionText}>?</Text></Pressable></View><View style={startStyles.primaryAction}><Pressable onPress={onSetup} style={({ pressed }) => [startStyles.optionMain, pressed && styles.pressed]}><Text style={startStyles.primaryTitle}>Complete Applicant Profile</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel="About Complete Applicant Profile" onPress={() => setShowOptionInfo('profile')} style={({ pressed }) => [startStyles.optionQuestion, pressed && styles.pressed]}><Text style={startStyles.optionQuestionText}>?</Text></Pressable></View></View><Modal visible={showNotice} transparent animationType="fade" onRequestClose={() => {}}><View style={onboardingHelpStyles.backdrop}><View style={startStyles.noticeCard}><View style={startStyles.noticeHeader}><View style={startStyles.noticeIcon}><Ionicons name="information" size={24} color="#183225" /></View><View style={startStyles.noticeHeading}><Text style={startStyles.noticeKicker}>BEFORE YOU BEGIN</Text><Text style={startStyles.noticeTitle}>Important Notice</Text></View></View><Text style={startStyles.noticeCopy}>CvSU Virtual Admission Guide is designed to help prospective students understand the Cavite State University admission process. It provides application requirements, admission steps, examination and medical guidance, campus locations, FAQs, and progress tracking.</Text><View style={startStyles.noticeDisclaimer}><Ionicons name="shield-checkmark" size={19} color="#9a7c00" style={startStyles.noticeDisclaimerIcon} /><Text style={startStyles.noticeEmphasis}>This app is not the official CvSU admission portal and cannot process applications. It is intended only to guide applicants and help them prepare for the official admission process.</Text></View><Pressable accessibilityRole="button" onPress={() => setShowNotice(false)} style={({ pressed }) => [startStyles.noticeAction, pressed && styles.pressed]}><Text style={startStyles.noticeActionText}>Proceed to Guide</Text><Ionicons name="arrow-forward" size={19} color="#fff" style={startStyles.noticeActionIcon} /></Pressable></View></View></Modal><Modal visible={Boolean(showOptionInfo)} transparent animationType="fade" onRequestClose={() => setShowOptionInfo(null)}><View style={onboardingHelpStyles.backdrop}><View style={startStyles.noticeCard}><View style={startStyles.noticeHeader}><View style={startStyles.noticeIcon}><Ionicons name="help" size={24} color="#183225" /></View><View style={startStyles.noticeHeading}><Text style={startStyles.noticeKicker}>OPTION DETAILS</Text><Text style={startStyles.noticeTitle}>{showOptionInfo === 'guest' ? 'Continue as Guest' : 'Complete Applicant Profile'}</Text></View></View><Text style={startStyles.noticeCopy}>{showOptionInfo === 'guest' ? 'Choose this option if you are still exploring CvSU admission, helping another applicant, or only need to review general requirements, procedures, FAQs, and campus guidance. You can use the guide without entering applicant details, but your progress will not be personalized or saved as an applicant profile.' : 'Choose this option if you are a prospective applicant who wants guidance tailored to your academic background and preferred program. You will provide your applicant type, track or strand, and program choice so the guide can highlight relevant requirements, admission steps, and progress tracking for your journey.'}</Text><Pressable accessibilityRole="button" onPress={() => setShowOptionInfo(null)} style={({ pressed }) => [startStyles.noticeAction, pressed && styles.pressed]}><Text style={startStyles.noticeActionText}>Close</Text></Pressable></View></View></Modal></SafeAreaView>; }
function Page({ kicker, title, intro, children }) { return <><Text style={[styles.kicker, onboardingSetupStyles.kicker]}>{kicker}</Text><Text style={[styles.title, onboardingSetupStyles.title]}>{title}</Text><Text style={[styles.intro, onboardingSetupStyles.intro]}>{intro}</Text>{children}</>; }
function Progress({ currentStep }) { return <View style={[styles.progress, onboardingSetupStyles.progress]}><View style={onboardingSetupStyles.progressTrack}><View style={onboardingSetupStyles.progressRail} /><View style={[onboardingSetupStyles.progressFill, { width: `${Math.max(0, currentStep - 1) * 33.33}%` }]} /><View style={onboardingSetupStyles.progressDots}>{[1, 2, 3, 4].map((item) => <View key={item} style={[styles.progressDot, onboardingSetupStyles.progressDot, item === currentStep && onboardingSetupStyles.activeProgressDot, item < currentStep && onboardingSetupStyles.completeProgressDot]}><Text style={[onboardingSetupStyles.progressDotText, item === currentStep && onboardingSetupStyles.activeProgressDotText, item < currentStep && onboardingSetupStyles.completeProgressDotText]}>{item}</Text></View>)}</View></View><Text style={[styles.progressText, onboardingSetupStyles.progressText]}>Step {currentStep} of 4</Text></View>; }
function Option({ label, caption, value, selected, onPress, compact, profileCard = false }) { return <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={onPress} style={({ pressed }) => [styles.option, onboardingSetupStyles.option, compact && styles.compact, profileCard && styles.profileOption, selected && styles.selected, selected && onboardingSetupStyles.selected, pressed && styles.pressed]}>{!profileCard && <Text style={[styles.icon, selected && styles.selectedIcon]}>{value}</Text>}<View style={styles.optionCopy}><View style={styles.optionHeader}><Text style={[styles.optionText, profileCard && styles.profileOptionText, selected && profileCard && styles.profileOptionTextSelected]}>{label}</Text><Text style={[styles.selectedLabel, onboardingSetupStyles.selectedLabel, !selected && onboardingSetupStyles.hiddenSelectedLabel]}>SELECTED</Text></View>{caption && <Text style={styles.optionCaption}>{caption}</Text>}</View></Pressable>; }
function Action({ label = 'Continue', disabled, onPress }) { return <Pressable disabled={disabled} onPress={onPress} style={[styles.action, onboardingSetupStyles.action, disabled && styles.disabled]}><Text style={[styles.actionText, onboardingSetupStyles.actionText]}>{label}</Text></Pressable>; }
function Back({ onPress }) { return <Pressable onPress={onPress} style={[styles.back, onboardingSetupStyles.back]}><Text style={[styles.backText, onboardingSetupStyles.backText]}>Back</Text></Pressable>; }
function Tile({ label }) { return <View style={styles.tile}><Text style={styles.tileLabel}>{label}</Text><Text style={styles.muted}>See what to prepare next</Text></View>; }
function MainApp({ profile, program, track, profilePhoto, nickname, onProfilePhotoChange, onNicknameChange, onRestart, onBackToStart, startAsGuest = false }) {
  const [activeProgram, setActiveProgram] = useState(program);
  const [activeTab, setActiveTab] = useState('Home');
  const [showProfile, setShowProfile] = useState(false);
  const [guestMode, setGuestMode] = useState(startAsGuest);
  const [showGuestSetup, setShowGuestSetup] = useState(false);
  const [guestSetupStep, setGuestSetupStep] = useState(1);
  const [guestProfile, setGuestProfile] = useState('');
  const [guestTrack, setGuestTrack] = useState('');
  const [guestProgram, setGuestProgram] = useState('');
  const [currentStatusIndex, setCurrentStatusIndex] = useState(0);
  const [selectedStepIndex, setSelectedStepIndex] = useState(null);
  const [checkedRequirements, setCheckedRequirements] = useState({});
  const [examinationAttempt, setExaminationAttempt] = useState('initial');
  const [guestStatusIndex, setGuestStatusIndex] = useState(0);
  const [guestSelectedStepIndex, setGuestSelectedStepIndex] = useState(null);
  const [guestCheckedRequirements, setGuestCheckedRequirements] = useState({});
  const [guestExaminationAttempt, setGuestExaminationAttempt] = useState('initial');
  const hasInterview = exceptionProgramKeywords.some((keyword) => activeProgram.includes(keyword));
  const steps = guestMode ? defaultStatusSteps : hasInterview ? exceptionStatusSteps : defaultStatusSteps;
  const openStep = (index) => {
    if (guestMode) setGuestSelectedStepIndex(index);
    else setSelectedStepIndex(index);
    setActiveTab('Status');
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
          {showProfile && (
            <Pressable
              accessibilityLabel="Back to home"
              onPress={() => {
                setShowProfile(false);
                setActiveTab('Home');
              }}
              style={({ pressed }) => [profileStyles.headerBack, pressed && styles.pressed]}
            >
              <Ionicons name="chevron-back" size={24} color="#183225" />
            </Pressable>
          )}
          <Image source={require('../assets/CvSU_Logo.png')} style={styles.mainLogo} />
          <Text style={styles.mainTitle}>CvSU Admission</Text>
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
            <Text style={profileStyles.guestModeCopy}>Your saved applicant profile is hidden.</Text>
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
          <GuestProfileSetup
            step={guestSetupStep}
            profile={guestProfile}
            track={guestTrack}
            program={guestProgram}
            onProfileChange={setGuestProfile}
            onTrackChange={setGuestTrack}
            onProgramChange={setGuestProgram}
            onBack={() => setGuestSetupStep((current) => Math.max(1, current - 1))}
            onNext={() => setGuestSetupStep((current) => Math.min(3, current + 1))}
            onComplete={() => {
              setShowGuestSetup(false);
              setActiveTab('Home');
            }}
          />
        ) : showProfile ? (
          <ApplicantProfilePage
            profile={displayedProfile}
            track={displayedTrack}
            program={displayedProgram}
            photo={profilePhoto}
            nickname={nickname}
            isGuest={guestMode}
            onPhotoChange={onProfilePhotoChange}
            onNicknameChange={onNicknameChange}
            onEdit={onRestart}
            onEditGuest={() => {
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
          <StatusPage
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
            onProgramChange={guestMode ? setGuestProgram : setActiveProgram}
          />
        ) : activeTab === 'Journey' ? (
          <JourneyPage
            displayName={displayName}
            program={displayedProgram}
            profilePhoto={guestMode ? null : profilePhoto}
            steps={steps}
            currentStatusIndex={displayedStatusIndex}
            examinationAttempt={displayedExaminationAttempt}
            onOpenStep={openStep}
          />
        ) : activeTab === 'Home' ? (
          <HomePage
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
          <MapPage profilePhoto={guestMode ? null : profilePhoto} />
        ) : (
          <FAQPage />
        )}
      </ScrollView>
      {!showProfile && !showGuestSetup && (
        <View style={styles.bottomNav}>
          {mainTabs.map((tab) => (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={({ pressed }) => [
                styles.navItem,
                activeTab === tab && styles.activeNavItem,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name={tabIcons[tab]} size={27} color={activeTab === tab ? '#009c29' : '#698073'} />
              <Text style={[styles.navLabel, activeTab === tab && styles.activeNavText]}>{tab}</Text>
            </Pressable>
          ))}
        </View>
      )}
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
    const [failedProgram, setFailedProgram] = useState('');
    const [reapplicationProgram, setReapplicationProgram] = useState('');
    const [guestFailedProgram, setGuestFailedProgram] = useState('');
    const [guestReapplicationProgram, setGuestReapplicationProgram] = useState('');
    const displayedFailedProgram = guestMode ? guestFailedProgram : failedProgram;
    const displayedReapplicationProgram = guestMode ? guestReapplicationProgram : reapplicationProgram;
  return <View style={[styles.mainApp, { paddingTop: androidTopInset, backgroundColor: '#fff' }]}>
    <View style={styles.mainHeader}><View style={profileStyles.headerBrand}>{showProfile && <Pressable accessibilityLabel="Back to home" onPress={() => { setShowProfile(false); setActiveTab('Home'); }} style={({ pressed }) => [profileStyles.headerBack, pressed && styles.pressed]}><Ionicons name="chevron-back" size={24} color="#183225" /></Pressable>}<Image source={require('../assets/CvSU_Logo.png')} style={styles.mainLogo} /><Text style={styles.mainTitle}>CvSU Admission</Text></View><Pressable accessibilityLabel="Open applicant profile" onPress={() => setShowProfile(true)} style={({ pressed }) => [styles.profileButton, pressed && styles.pressed]}><Image source={!guestMode && profilePhoto ? { uri: profilePhoto } : require('../assets/Profile.png')} style={styles.profileImage} /></Pressable></View>
    {guestMode && (showGuestSetup || showProfile || activeTab === 'Home') && <Pressable accessibilityLabel="Exit guest mode" onPress={exitGuestMode} style={({ pressed }) => [profileStyles.guestModeBar, pressed && styles.pressed]}><View><Text style={profileStyles.guestModeLabel}>GUEST MODE</Text><Text style={profileStyles.guestModeCopy}>Your saved applicant profile is hidden.</Text></View><View style={profileStyles.exitGuestAction}><Ionicons name="log-out-outline" size={18} color="#075b31" /><Text style={profileStyles.exitGuestText}>Exit Guest Mode</Text></View></Pressable>}
    <ScrollView style={styles.mainContent} contentContainerStyle={[styles.mainContentInner, (activeTab === 'Home' || showProfile) && homeStyles.content, showGuestSetup && guestSetupStyles.content]} keyboardShouldPersistTaps="handled">{showGuestSetup ? <GuestProfileSetup step={guestSetupStep} profile={guestProfile} track={guestTrack} program={guestProgram} onProfileChange={setGuestProfile} onTrackChange={setGuestTrack} onProgramChange={setGuestProgram} onBack={() => setGuestSetupStep((current) => Math.max(1, current - 1))} onNext={() => setGuestSetupStep((current) => Math.min(3, current + 1))} onComplete={() => { setShowGuestSetup(false); setActiveTab('Home'); }} /> : showProfile ? <ApplicantProfilePage profile={displayedProfile} track={displayedTrack} program={displayedProgram} photo={profilePhoto} nickname={nickname} isGuest={guestMode} onPhotoChange={onProfilePhotoChange} onNicknameChange={onNicknameChange} onEdit={onRestart} onEditGuest={() => { setShowProfile(false); setShowGuestSetup(true); }} onBack={() => { setShowProfile(false); setActiveTab('Home'); }} onGuest={viewAsGuest} onReset={resetJourney} /> : activeTab === 'Status' ? <StatusPage displayName={displayName} profile={displayedProfile} program={displayedProgram} track={displayedTrack} steps={steps} currentStatusIndex={displayedStatusIndex} onStatusChange={guestMode ? setGuestStatusIndex : setCurrentStatusIndex} selectedStepIndex={displayedSelectedStepIndex} onSelectStep={guestMode ? setGuestSelectedStepIndex : setSelectedStepIndex} checkedRequirements={displayedCheckedRequirements} onRequirementsChange={guestMode ? setGuestCheckedRequirements : setCheckedRequirements} examinationAttempt={displayedExaminationAttempt} onExaminationAttemptChange={guestMode ? setGuestExaminationAttempt : setExaminationAttempt} /> : activeTab === 'Journey' ? <JourneyPage displayName={displayName} program={displayedProgram} profilePhoto={guestMode ? null : profilePhoto} steps={steps} currentStatusIndex={displayedStatusIndex} examinationAttempt={displayedExaminationAttempt} onOpenStep={openStep} /> : activeTab === 'Home' ? <HomePage displayName={displayName} profile={displayedProfile} program={displayedProgram} track={displayedTrack} steps={steps} currentStatusIndex={displayedStatusIndex} examinationAttempt={displayedExaminationAttempt} onOpenStep={openStep} onRestart={() => setShowProfile(true)} onOpenTab={setActiveTab} /> : activeTab === 'Map' ? <MapPage profilePhoto={guestMode ? null : profilePhoto} /> : <FAQPage />}</ScrollView>
    {!showProfile && !showGuestSetup && <View style={styles.bottomNav}>{mainTabs.map((tab) => <Pressable key={tab} onPress={() => setActiveTab(tab)} style={({ pressed }) => [styles.navItem, activeTab === tab && styles.activeNavItem, pressed && styles.pressed]}><Ionicons name={tabIcons[tab]} size={27} color={activeTab === tab ? '#009c29' : '#698073'} /><Text style={[styles.navLabel, activeTab === tab && styles.activeNavText]}>{tab}</Text></Pressable>)}</View>}
  </View>;
}
function ProfilePhotoEditor({ photo, onChange }) {
  const choosePhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!result.canceled) onChange(result.assets[0].uri);
  };
  return <View style={profileStyles.photoEditor}><Image source={photo ? { uri: photo } : require('../assets/Profile.png')} style={profileStyles.photoPreview} /><View style={profileStyles.photoActions}><Text style={profileStyles.photoTitle}>Profile Picture</Text><Pressable accessibilityLabel={photo ? 'Change profile picture' : 'Upload profile picture'} onPress={choosePhoto} style={({ pressed }) => [profileStyles.photoButton, pressed && styles.pressed]}><Ionicons name="camera-outline" size={18} color="#075b31" /><Text style={profileStyles.photoButtonText}>{photo ? 'Change Picture' : 'Upload Picture'}</Text></Pressable>{photo && <Pressable accessibilityLabel="Remove profile picture" onPress={() => onChange(null)} style={({ pressed }) => [profileStyles.removePhotoButton, pressed && styles.pressed]}><Text style={profileStyles.removePhotoText}>Remove</Text></Pressable>}</View></View>;
}
function GuestProfileSetup({ step, profile, track, program, onProfileChange, onTrackChange, onProgramChange, onBack, onNext, onComplete }) {
  const [query, setQuery] = useState('');
  const filteredPrograms = programs.filter((item) => item.toLowerCase().includes(query.trim().toLowerCase()));
  const selection = step === 1 ? profile : step === 2 ? track : program;
  return <View style={guestSetupStyles.page}><Text style={guestSetupStyles.eyebrow}>TEMPORARY GUEST PROFILE · {step} / 3</Text><Text style={guestSetupStyles.title}>{step === 1 ? 'Choose your academic status.' : step === 2 ? 'Choose your track or strand.' : 'Choose a program.'}</Text><Text style={guestSetupStyles.copy}>These choices apply only to this guest session and will not change the saved applicant profile.</Text>{step === 1 && <View style={styles.list}>{profiles.map(([value, label, caption]) => <Option key={value} label={label} caption={caption} value={value} selected={profile === value} onPress={() => onProfileChange(value)} profileCard />)}</View>}{step === 2 && <View style={styles.list}>{tracks.map(([label, caption]) => <Option key={label} label={label} caption={caption} value={label} selected={track === label} onPress={() => onTrackChange(label)} profileCard />)}</View>}{step === 3 && <><View style={styles.search}><Ionicons name="search" size={20} color="#075b31" /><TextInput value={query} onChangeText={setQuery} placeholder="Search programs" placeholderTextColor="#8aa294" style={styles.input} />{query.length > 0 && <Pressable accessibilityLabel="Clear program search" onPress={() => setQuery('')} style={styles.clear}><Ionicons name="close" size={16} color="#078743" /></Pressable>}</View><View style={styles.list}>{filteredPrograms.map((item) => <Option key={item} label={item} value="→" selected={program === item} onPress={() => onProgramChange(item)} compact />)}</View></>}<View style={guestSetupStyles.actions}>{step > 1 && <Back onPress={onBack} />}<Action label={step === 3 ? 'Start as Guest' : 'Continue'} disabled={!selection} onPress={step === 3 ? onComplete : onNext} /></View></View>;
}
function ApplicantProfilePage({ profile, track, program, photo, nickname, isGuest = false, onPhotoChange, onNicknameChange, onEdit, onEditGuest, onBack, onGuest, onReset }) {
  const profileLabel = profiles.find(([value]) => value === profile)?.[1] || profile;
  return <View style={profileStyles.page}>
    <Text style={profileStyles.title}>{isGuest ? 'Guest Profile' : 'Applicant Profile'}</Text>
    <Text style={profileStyles.subtitle}>{isGuest ? 'This is a temporary profile. Your saved applicant details and progress remain private.' : 'Your application profile is saved. You can update it anytime.'}</Text>
    {!isGuest && <ProfilePhotoEditor photo={photo} onChange={onPhotoChange} />}
    {!isGuest && <View style={profileStyles.nicknameEditor}><Text style={profileStyles.nicknameLabel}>NICKNAME</Text><TextInput value={nickname} onChangeText={onNicknameChange} maxLength={30} placeholder="Enter your nickname" placeholderTextColor="#8aa294" style={profileStyles.nicknameInput} /></View>}
    <View style={profileStyles.summary}>{!isGuest && nickname.trim().length > 0 && <ProfileSummaryItem label="NICKNAME" value={nickname.trim()} />}<ProfileSummaryItem label="APPLICANT TYPE" value={profileLabel} /><ProfileSummaryItem label="TRACK / STRAND" value={track} /><ProfileSummaryItem label="PROGRAM" value={program} last /></View>
    <Pressable onPress={() => Linking.openURL('http://admission.cvsu.edu.ph')} style={({ pressed }) => [homeStyles.profilePortal, pressed && styles.pressed]}><View style={homeStyles.actionIcon}><Ionicons name="open-outline" size={22} color="#4c4a12" /></View><View style={homeStyles.actionCopy}><Text style={homeStyles.actionEyebrow}>OFFICIAL PORTAL</Text><Text style={homeStyles.portalTitle}>Open CvSU Admission</Text><Text style={homeStyles.portalSubtitle}>admission.cvsu.edu.ph</Text></View><Ionicons name="arrow-forward" size={22} color="#183225" /></Pressable>
    <View style={profileStyles.primaryActions}><Pressable onPress={isGuest ? onEditGuest : onEdit} style={({ pressed }) => [profileStyles.editButton, pressed && styles.pressed]}><Text style={profileStyles.editButtonText}>{isGuest ? 'Edit Guest Profile' : 'Edit Profile'}</Text></Pressable><Pressable onPress={onBack} style={({ pressed }) => [profileStyles.backButton, pressed && styles.pressed]}><Text style={profileStyles.backButtonText}>Back to Home</Text></Pressable></View>
    {!isGuest && <Pressable onPress={onGuest} style={({ pressed }) => [profileStyles.guestButton, pressed && styles.pressed]}><Text style={profileStyles.guestTitle}>View App as Guest</Text><Text style={profileStyles.guestCopy}>View procedures without showing or saving your profile progress.</Text></Pressable>}
    <Pressable onPress={onReset} style={({ pressed }) => [profileStyles.resetButton, pressed && styles.pressed]}><Text style={profileStyles.resetTitle}>{isGuest ? 'Reset Temporary Journey' : 'Reset Admission Journey'}</Text><Text style={profileStyles.resetCopy}>{isGuest ? 'Start this guest session again' : 'Keep your profile, start progress again'}</Text></Pressable>
  </View>;
}
function ProfileSummaryItem({ label, value, last = false }) { return <View style={!last && profileStyles.summaryItem}><Text style={profileStyles.summaryLabel}>{label}</Text><Text style={profileStyles.summaryValue}>{value}</Text></View>; }
function HomePage({ displayName, profile, program, track, steps, currentStatusIndex, examinationAttempt, onOpenStep, onRestart, onOpenTab }) {
  const profileLabel = profiles.find(([value]) => value === profile)?.[1] || profile;
  const applicationStopped = examinationAttempt === 'stopped';
  const isFinished = currentStatusIndex === steps.length;
  const progress = Math.round((currentStatusIndex / steps.length) * 100);
  const currentStep = applicationStopped ? 'Application ended' : isFinished ? 'Enrollment complete' : steps[currentStatusIndex];
  const stage = currentStep.replace('Admission ', '');
  const openCurrentStep = () => {
    if (applicationStopped || isFinished) {
      onOpenTab('Status');
      return;
    }
    onOpenStep(currentStatusIndex);
  };
  return <HomePageReordered displayName={displayName} profile={profile} track={track} program={program} steps={steps} currentStatusIndex={currentStatusIndex} progress={progress} applicationStopped={applicationStopped} isFinished={isFinished} stage={stage} onOpenStep={openCurrentStep} onRestart={onRestart} onOpenTab={onOpenTab} />;
  return <View style={homeStyles.page}><View style={homeStyles.welcome}><View style={homeStyles.welcomeCopy}><Text style={homeStyles.kicker}>CVSU VIRTUAL ADMISSION GUIDE</Text><Text style={homeStyles.title}>Welcome Back, {displayName}!</Text><Text style={homeStyles.subtitle}>{applicationStopped ? 'Thank you for applying to Cavite State University, ' + displayName + '.' : isFinished ? 'Your admission journey is complete, ' + displayName + '. Welcome to CvSU!' : 'Your admissions journey looks strong, ' + displayName + '. Keep moving through each step with confidence.'}</Text></View><View style={homeStyles.progressBadge}><Text style={homeStyles.progressBadgeText}>{progress}%</Text></View></View><Pressable onPress={() => Linking.openURL('http://admission.cvsu.edu.ph')} style={({ pressed }) => [homeStyles.portal, pressed && styles.pressed]}><View style={homeStyles.actionIcon}><Ionicons name="open-outline" size={22} color="#4c4a12" /></View><View style={homeStyles.actionCopy}><Text style={homeStyles.actionEyebrow}>OFFICIAL PORTAL</Text><Text style={homeStyles.portalTitle}>Open CvSU Admission</Text><Text style={homeStyles.portalSubtitle}>admission.cvsu.edu.ph</Text></View><Ionicons name="arrow-forward" size={22} color="#183225" /></Pressable><Pressable onPress={onRestart} style={({ pressed }) => [homeStyles.card, pressed && styles.pressed]}><Text style={homeStyles.cardEyebrow}>APPLICANT TYPE</Text><Text style={homeStyles.cardTitle}>{profileLabel}</Text><Text style={homeStyles.profileLine}>Track: {track}</Text><Text style={homeStyles.profileLine}>Program: {program}</Text><Text style={homeStyles.cardHint}>Tap to update your applicant profile and personalize your journey.</Text></Pressable><View style={homeStyles.card}><Text style={homeStyles.cardEyebrow}>YOUR PROGRESS</Text><View style={homeStyles.progressTrack}><View style={[homeStyles.progressFill, { width: `${progress}%` }]} /></View><Text style={homeStyles.progressLabel}>{progress}% Complete</Text><Text style={homeStyles.cardHint}>{currentStatusIndex} of {steps.length} admission steps completed</Text></View><Pressable onPress={openCurrentStep} style={({ pressed }) => [homeStyles.card, homeStyles.stageCard, pressed && styles.pressed]}><Text style={homeStyles.cardEyebrow}>{applicationStopped ? 'APPLICATION STATUS' : isFinished ? 'FINAL STAGE' : 'CURRENT STAGE'}</Text><Text style={homeStyles.cardTitle}>{stage}</Text><Text style={homeStyles.cardHint}>{applicationStopped || isFinished ? 'Tap Status to review your admission journey.' : 'Tap to see details and continue your progress.'}</Text></Pressable><Pressable onPress={openCurrentStep} style={({ pressed }) => [homeStyles.nextAction, pressed && styles.pressed]}><View style={homeStyles.actionIcon}><Ionicons name={applicationStopped ? 'information-circle-outline' : isFinished ? 'checkmark-circle-outline' : 'navigate-outline'} size={23} color="#4c4a12" /></View><View style={homeStyles.actionCopy}><Text style={homeStyles.actionEyebrow}>NEXT ACTION</Text><Text style={homeStyles.nextTitle}>{applicationStopped ? 'Review application status' : isFinished ? 'Review completed journey' : `Continue with ${stage}`}</Text><Text style={homeStyles.nextSubtitle}>Open Status to continue your progress.</Text></View><Ionicons name="chevron-forward" size={23} color="#183225" /></Pressable><View style={homeStyles.sectionTitle}><View style={homeStyles.sectionAccent} /><Text style={homeStyles.sectionTitleText}>Quick Actions</Text></View><HomeAction icon="person-outline" title="Application Profile" subtitle="Update your applicant type" onPress={onRestart} /><HomeAction icon="map-outline" title="Campus Map" subtitle="Open map tab" onPress={() => onOpenTab('Map')} /><HomeAction icon="help-circle-outline" title="FAQ & Help" subtitle="Find answers fast" onPress={() => onOpenTab('FAQ')} /><View style={homeStyles.tip}><Text style={homeStyles.tipTitle}>Did you know?</Text><Text style={homeStyles.tipText}>Your progress stays available while this app remains open, so Status, Journey, and Home always show the same stage.</Text></View></View>;
}
function HomePageReordered({ displayName, profile, track, program, steps, currentStatusIndex, progress, applicationStopped, isFinished, stage, onOpenStep, onRestart, onOpenTab }) {
  const profileLabel = profiles.find(([value]) => value === profile)?.[1] || profile;
  return <View style={homeStyles.page}><View style={homeStyles.welcome}><View style={homeStyles.welcomeCopy}><Text style={homeStyles.kicker}>CVSU VIRTUAL ADMISSION GUIDE</Text><Text style={homeStyles.title}>Welcome Back, {displayName}!</Text><Text style={homeStyles.subtitle}>{applicationStopped ? 'Thank you for applying to Cavite State University, ' + displayName + '.' : isFinished ? 'Your admission journey is complete, ' + displayName + '. Welcome to CvSU!' : 'Your admissions journey looks strong, ' + displayName + '. Keep moving through each step with confidence.'}</Text></View><View style={homeStyles.progressBadge}><Text style={homeStyles.progressBadgeText}>{progress}%</Text></View></View><Pressable onPress={onRestart} style={({ pressed }) => [homeStyles.card, pressed && styles.pressed]}><Text style={homeStyles.cardEyebrow}>APPLICANT TYPE</Text><Text style={homeStyles.cardTitle}>{profileLabel}</Text><Text style={homeStyles.profileLine}>Track: {track}</Text><Text style={homeStyles.profileLine}>Program: {program}</Text><Text style={homeStyles.cardHint}>Tap to update your applicant profile and personalize your journey.</Text></Pressable><Pressable onPress={onOpenStep} style={({ pressed }) => [homeStyles.card, homeStyles.stageCard, pressed && styles.pressed]}><Text style={homeStyles.cardEyebrow}>{applicationStopped ? 'APPLICATION STATUS' : isFinished ? 'FINAL STAGE' : 'CURRENT STAGE'}</Text><Text style={homeStyles.cardTitle}>{stage}</Text><Text style={homeStyles.cardHint}>{applicationStopped || isFinished ? 'Tap Status to review your admission journey.' : 'Tap to see details and continue your progress.'}</Text></Pressable><Pressable onPress={onOpenStep} style={({ pressed }) => [homeStyles.nextAction, pressed && styles.pressed]}><View style={homeStyles.actionIcon}><Ionicons name={applicationStopped ? 'information-circle-outline' : isFinished ? 'checkmark-circle-outline' : 'navigate-outline'} size={23} color="#4c4a12" /></View><View style={homeStyles.actionCopy}><Text style={homeStyles.actionEyebrow}>NEXT ACTION</Text><Text style={homeStyles.nextTitle}>{applicationStopped ? 'Review application status' : isFinished ? 'Review completed journey' : `Continue with ${stage}`}</Text><Text style={homeStyles.nextSubtitle}>Open Status to continue your progress.</Text></View><Ionicons name="chevron-forward" size={23} color="#183225" /></Pressable><View style={homeStyles.card}><Text style={homeStyles.cardEyebrow}>YOUR PROGRESS</Text><View style={homeStyles.progressTrack}><View style={[homeStyles.progressFill, { width: `${progress}%` }]} /></View><Text style={homeStyles.progressLabel}>{progress}% Complete</Text><Text style={homeStyles.cardHint}>{currentStatusIndex} of {steps.length} admission steps completed</Text></View><View style={homeStyles.sectionTitle}><View style={homeStyles.sectionAccent} /><Text style={homeStyles.sectionTitleText}>Quick Actions</Text></View><HomeAction icon="person-outline" title="Application Profile" subtitle="Update your applicant type" onPress={onRestart} /><HomeAction icon="map-outline" title="Campus Map" subtitle="Open map tab" onPress={() => onOpenTab('Map')} /><HomeAction icon="help-circle-outline" title="FAQ & Help" subtitle="Find answers fast" onPress={() => onOpenTab('FAQ')} /><View style={homeStyles.tip}><Text style={homeStyles.tipTitle}>Did you know?</Text><Text style={homeStyles.tipText}>Your profile and progress remain available on this device after you close the app, and the guide can be reviewed offline. Internet access is still required to open the official admission portal and submit or update an application.</Text></View></View>;
}
function HomeAction({ icon, title, subtitle, onPress }) { return <Pressable onPress={onPress} style={({ pressed }) => [homeStyles.quickAction, pressed && styles.pressed]}><View style={homeStyles.quickIcon}><Ionicons name={icon} size={23} color="#52695b" /></View><View style={homeStyles.actionCopy}><Text style={homeStyles.quickTitle}>{title}</Text><Text style={homeStyles.quickSubtitle}>{subtitle}</Text></View><Ionicons name="chevron-forward" size={20} color="#698073" /></Pressable>; }
function FAQPage() {
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
  const filteredItems = faqItems.filter(([itemCategory, question, answer]) => (category === 'All' || itemCategory === category) && (!normalizedQuery || question.toLowerCase().includes(normalizedQuery) || answer.toLowerCase().includes(normalizedQuery)));
  const guideStyle = { transform: [{ translateY: guideMotion.interpolate({ inputRange: [0, 1], outputRange: [3, -8] }) }, { rotate: guideMotion.interpolate({ inputRange: [0, 1], outputRange: ['-2deg', '2deg'] }) }] };
  return <View style={faqStyles.page}><View style={[journeyStyles.hero, faqStyles.hero]}><View style={journeyStyles.heroTop}><Text style={journeyStyles.heroTag}>ADMISSION GUIDE</Text></View><Text style={journeyStyles.heroTitle}>Frequently Asked Questions</Text><Text style={journeyStyles.heroCopy}>Ask, explore, and find your next answer.</Text></View><Pressable accessibilityLabel="Show another campus fact" onPress={() => setTriviaIndex((current) => (current + 1) % faqTrivia.length)} style={({ pressed }) => [faqStyles.guideCard, pressed && styles.pressed]}><View style={faqStyles.triviaBubble}><Text style={faqStyles.triviaEyebrow}>CAMPUS TRIVIA</Text><Text style={faqStyles.triviaText}>{faqTrivia[triviaIndex]}</Text><Text style={faqStyles.triviaHint}>Tap the avatar for another fact.</Text></View><View style={faqStyles.guideStage}><Animated.Image source={faqGuideImage} style={[faqStyles.guideImage, guideStyle]} resizeMode="contain" /><View style={faqStyles.guideBadge}><Text style={faqStyles.guideBadgeText}>GUIDE</Text></View></View></Pressable><View style={faqStyles.findHeader}><View><Text style={faqStyles.findTitle}>Find your answer</Text><Text style={faqStyles.findCopy}>Search by topic or browse a category.</Text></View><Text style={faqStyles.resultCount}>{filteredItems.length} {filteredItems.length === 1 ? 'answer' : 'answers'}</Text></View><View style={faqStyles.search}><Ionicons name="search" size={20} color="#075b31" /><TextInput value={query} onChangeText={(value) => { setQuery(value); setOpenQuestion(null); }} placeholder="Search questions or answers" placeholderTextColor="#819187" style={faqStyles.searchInput} />{query.length > 0 && <Pressable accessibilityLabel="Clear FAQ search" onPress={() => setQuery('')} style={faqStyles.clearSearch}><Ionicons name="close" size={17} color="#52695b" /></Pressable>}</View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={faqStyles.categories}>{['All', 'Application', 'Enrollment', 'Examination', 'Medical', 'General'].map((item) => <Pressable key={item} onPress={() => { setCategory(item); setOpenQuestion(null); }} style={({ pressed }) => [faqStyles.category, category === item && faqStyles.categoryActive, pressed && styles.pressed]}><Text style={[faqStyles.categoryText, category === item && faqStyles.categoryTextActive]}>{item}</Text></Pressable>)}</ScrollView><View style={faqStyles.answers}>{filteredItems.map(([itemCategory, question, answer]) => { const itemKey = `${itemCategory}:${question}`; const isOpen = openQuestion === itemKey; return <Pressable key={itemKey} accessibilityRole="button" accessibilityState={{ expanded: isOpen }} onPress={() => setOpenQuestion(isOpen ? null : itemKey)} style={({ pressed }) => [faqStyles.answerCard, isOpen && faqStyles.answerCardOpen, pressed && styles.pressed]}><View style={faqStyles.questionRow}><View style={faqStyles.questionCopy}><Text style={faqStyles.question}>{question}</Text>{isOpen && <Text style={faqStyles.answer}>{answer}</Text>}</View><Ionicons name={isOpen ? 'chevron-up' : 'chevron-forward'} size={18} color="#009c29" /></View>{isOpen && <View style={faqStyles.answerMeta}><View style={faqStyles.answerDot} /><Text style={faqStyles.answerCategory}>{itemCategory}</Text></View>}</Pressable>; })}{filteredItems.length === 0 && <View style={faqStyles.empty}><Ionicons name="search-outline" size={30} color="#698073" /><Text style={faqStyles.emptyTitle}>No answers found</Text><Text style={faqStyles.emptyCopy}>Try another phrase or choose a different category.</Text></View>}</View></View>;
}
const admissionLocations = [
  { number: 1, name: 'Office of Student Affairs and Services (OSAS) - Registrar', purpose: 'Validation and assessment of requirements', description: 'Submit your required documents here for validation and assessment before moving to the next admission step.', guide: 'Start at the southern entrance and follow the road to marker 1 beside the oval.', image: require('../assets/OSAS.jpg'), guideVideos: [{ label: 'From Gate 1', source: require('../assets/Gate1-OSAS.mp4') }, { label: 'From Gate 2', source: require('../assets/Gate2-OSAS.mp4') }, { label: 'From Gate 3', source: require('../assets/Gate3-OSAS.mp4') }] },
  { number: 2, name: 'International Convention Center (ICON)', purpose: 'Admission examination', description: 'Proceed to the International Convention Center for your scheduled admission examination. Bring your appointment details and valid identification.', guide: 'From marker 1, walk north past the oval, then turn left toward marker 2.', image: require('../assets/ICON.jpg'), guideVideos: [{ label: 'From Gate 1', source: require('../assets/Gate1-ICON.mp4') }, { label: 'From Gate 2', source: require('../assets/Gate2-ICON.mp4') }, { label: 'From Gate 3', source: require('../assets/Gate3-ICON.mp4') }] },
  { number: 3, name: 'University Clinic (Infirmary)', purpose: 'Medical examination', description: 'Visit the University Clinic for your required medical examination and follow the clinic staff instructions for your assessment.', guide: 'Return to the southern road and continue east from marker 1 to marker 3.', image: require('../assets/INFIRMARY.jpg'), guideVideos: [{ label: 'Watch infirmary guide', source: require('../assets/GoingToInfirmary.mp4') }] }
];
const campusGates = [
  { number: 1, name: 'Gate 1', purpose: 'Campus entrance', description: 'Use Gate 1 as your campus entry point when it is indicated on your admission appointment or by campus personnel.', image: require('../assets/Gate_1.jpg'), guideVideos: [{ label: 'To OSAS', source: require('../assets/Gate1-OSAS.mp4') }, { label: 'To ICON', source: require('../assets/Gate1-ICON.mp4') }] },
  { number: 2, name: 'Gate 2', purpose: 'Campus entrance', description: 'Use Gate 2 as your campus entry point when it is indicated on your admission appointment or by campus personnel.', image: require('../assets/Gate_2.jpg'), guideVideos: [{ label: 'To OSAS', source: require('../assets/Gate2-OSAS.mp4') }, { label: 'To ICON', source: require('../assets/Gate2-ICON.mp4') }] },
  { number: 3, name: 'Gate 3', purpose: 'Campus entrance', description: 'Use Gate 3 as your campus entry point when it is indicated on your admission appointment or by campus personnel.', image: require('../assets/Gate_3.jpg'), guideVideos: [{ label: 'To OSAS', source: require('../assets/Gate3-OSAS.mp4') }, { label: 'To ICON', source: require('../assets/Gate3-ICON.mp4') }] }
];
const campusTips = [
  ['Arrive Early', 'Expect traffic, especially during peak hours. Allow extra travel time so you can enter the campus, find the correct building, and arrive before your scheduled appointment.'],
  ['Getting Around', 'If you are not sure how to get to a building, you can ride a tricycle for around 15 pesos. Ask the driver or campus personnel for directions to your destination.'],
  ['Prepare for Inspection', 'Security personnel may check your attire, identification, bags, and other requirements before allowing entry. Keep your documents ready and follow campus guidelines.']
];
function MapPage({ profilePhoto }) {
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedGate, setSelectedGate] = useState(null);
  const [activeGuideRoute, setActiveGuideRoute] = useState(null);
  const guideRouteClicks = useRef({ 1: 0, 2: 0 });
  const [showLocationPreview, setShowLocationPreview] = useState(false);
  const [showLocationDetailsButton, setShowLocationDetailsButton] = useState(false);
  const [showLocationImage, setShowLocationImage] = useState(false);
  const [attireImage, setAttireImage] = useState(null);
  const [guideVideo, setGuideVideo] = useState(null);
  const [showAttireGuide, setShowAttireGuide] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);
  const tip = campusTips[tipIndex];
  const selected = selectedGate !== null ? campusGates[selectedGate] : selectedLocation !== null ? admissionLocations[selectedLocation] : null;
  const startGuideRoute = (index) => {
    const buildingNumber = index + 1;
    if (buildingNumber === 3) {
      setActiveGuideRoute({ buildingNumber: 3, gateNumber: 0, runId: Date.now() });
      return;
    }
    const gateOrders = { 1: [3, 2, 1], 2: [2, 3, 1] };
    const gateOrder = gateOrders[buildingNumber];
    if (!gateOrder) {
      setActiveGuideRoute(null);
      return;
    }
    const clickCount = guideRouteClicks.current[buildingNumber] || 0;
    guideRouteClicks.current[buildingNumber] = clickCount + 1;
    setActiveGuideRoute({ buildingNumber, gateNumber: gateOrder[clickCount % gateOrder.length], runId: Date.now() });
  };
  const selectLocation = (index) => {
    setSelectedLocation(index);
    setSelectedGate(null);
    setGuideVideo(null);
    startGuideRoute(index);
    setShowLocationPreview(true);
    setShowLocationDetailsButton(false);
  };
  const selectMarker = (index) => {
    setSelectedLocation(index);
    setSelectedGate(null);
    setGuideVideo(null);
    startGuideRoute(index);
    setShowLocationPreview(false);
    setShowLocationDetailsButton(true);
  };
  const selectGate = (index) => {
    setSelectedGate(index);
    setGuideVideo(null);
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
      <MapCanvas zoom={zoom} selected={selected} guideRoute={activeGuideRoute} selectedBuildingNumber={selectedGate === null && selectedLocation !== null ? selected.number : null} selectedGateNumber={selectedGate !== null ? selected.number : null} showLocationPreview={showLocationPreview} showLocationDetailsButton={showLocationDetailsButton} onCloseLocationPreview={() => { setShowLocationPreview(false); setShowLocationDetailsButton(true); }} onOpenLocationPreview={() => setShowLocationPreview(true)} onOpenLocationImage={() => setShowLocationImage(true)} onOpenGuideVideo={setGuideVideo} onSelectMarker={selectMarker} onSelectGate={selectGate} onZoomIn={zoomIn} onZoomOut={zoomOut} onReset={resetMap} onFullscreen={() => setIsFullscreen(true)} profilePhoto={profilePhoto} />
    </View>
    <View style={mapStyles.locationsCard}><View style={mapStyles.locationsHeader}><Text style={mapStyles.locationsTitle}>Admission Locations</Text><Text style={mapStyles.locationsCount}>3 stops</Text></View>{admissionLocations.map((location, index) => <Pressable key={location.number} onPress={() => selectLocation(index)} style={({ pressed }) => [mapStyles.locationRow, selectedGate === null && index === selectedLocation && mapStyles.locationRowSelected, index === admissionLocations.length - 1 && mapStyles.locationRowLast, pressed && styles.pressed]}><View style={[mapStyles.locationNumber, selectedGate === null && index === selectedLocation && mapStyles.locationNumberSelected]}><Text style={mapStyles.locationNumberText}>{location.number}</Text></View><View style={mapStyles.locationCopy}><Text style={mapStyles.locationName}>{location.name}</Text><Text style={mapStyles.locationPurpose}>{location.purpose}</Text></View><Ionicons name="chevron-forward" size={20} color="#075b31" /></Pressable>)}</View>
    <Pressable accessibilityRole="button" accessibilityLabel="Show next campus tip" onPress={() => setTipIndex((current) => (current + 1) % campusTips.length)} style={({ pressed }) => [mapStyles.tip, pressed && styles.pressed]}><View style={mapStyles.tipBadge}><Text style={mapStyles.tipBadgeText}>TIP</Text></View><View style={mapStyles.tipCopy}><Text style={mapStyles.tipTitle}>{tip[0]}</Text><Text style={mapStyles.tipText}>{tip[1]}</Text><Text style={mapStyles.tipHint}>Tap for another tip</Text></View><Ionicons name="chevron-forward-circle-outline" size={23} color="#8a7412" /></Pressable>
    <Modal visible={isFullscreen} animationType="fade" onRequestClose={() => setIsFullscreen(false)}><SafeAreaView style={mapStyles.fullscreen}><View style={mapStyles.fullscreenHeader}><View><Text style={mapStyles.fullscreenEyebrow}>CVSU MAIN CAMPUS</Text><Text style={mapStyles.fullscreenTitle}>Campus Map</Text></View><Pressable accessibilityLabel="Close full screen map" onPress={() => setIsFullscreen(false)} style={({ pressed }) => [mapStyles.closeControl, pressed && styles.pressed]}><Ionicons name="close" size={24} color="#183225" /></Pressable></View><MapLegend fullscreen /><MapCanvas fullscreen zoom={zoom} selected={selected} guideRoute={activeGuideRoute} selectedBuildingNumber={selectedGate === null && selectedLocation !== null ? selected.number : null} selectedGateNumber={selectedGate !== null ? selected.number : null} showLocationPreview={showLocationPreview} showLocationDetailsButton={showLocationDetailsButton} onCloseLocationPreview={() => { setShowLocationPreview(false); setShowLocationDetailsButton(true); }} onOpenLocationPreview={() => setShowLocationPreview(true)} onOpenLocationImage={() => setShowLocationImage(true)} onOpenGuideVideo={setGuideVideo} onSelectMarker={selectMarker} onSelectGate={selectGate} onZoomIn={zoomIn} onZoomOut={zoomOut} onReset={resetMap} onFullscreen={() => setIsFullscreen(false)} profilePhoto={profilePhoto} /></SafeAreaView></Modal>
    <Modal visible={showLocationImage && !!selected} transparent animationType="fade" statusBarTranslucent hardwareAccelerated onRequestClose={() => setShowLocationImage(false)}><View style={mapStyles.imageModal}><Pressable accessibilityLabel="Close location image" onPress={() => setShowLocationImage(false)} style={mapStyles.imageModalBackdrop} /><View style={mapStyles.imageModalContent}>{selected && <Image source={selected.image} style={mapStyles.imageModalImage} resizeMode="contain" />}<Pressable accessibilityLabel="Close location image" onPress={() => setShowLocationImage(false)} style={({ pressed }) => [mapStyles.imageModalClose, pressed && styles.pressed]}><Ionicons name="close" size={24} color="#183225" /></Pressable></View></View></Modal>
    <Modal visible={!!attireImage} transparent animationType="fade" statusBarTranslucent hardwareAccelerated onRequestClose={() => setAttireImage(null)}><View style={mapStyles.imageModal}><Pressable accessibilityLabel="Close attire image" onPress={() => setAttireImage(null)} style={mapStyles.imageModalBackdrop} /><View style={mapStyles.imageModalContent}>{attireImage && <Image source={attireImage.source} style={mapStyles.imageModalImage} resizeMode="contain" />}<Pressable accessibilityLabel="Close attire image" onPress={() => setAttireImage(null)} style={({ pressed }) => [mapStyles.imageModalClose, pressed && styles.pressed]}><Ionicons name="close" size={24} color="#183225" /></Pressable></View></View></Modal>
    <Modal visible={!!guideVideo} transparent animationType="fade" statusBarTranslucent hardwareAccelerated onRequestClose={() => setGuideVideo(null)}><View style={mapStyles.videoModal}><Pressable accessibilityLabel="Close guide video" onPress={() => setGuideVideo(null)} style={mapStyles.imageModalBackdrop} /><View style={mapStyles.videoModalContent}><GuideVideo source={guideVideo} /><Pressable accessibilityLabel="Close guide video" onPress={() => setGuideVideo(null)} style={({ pressed }) => [mapStyles.imageModalClose, pressed && styles.pressed]}><Ionicons name="close" size={24} color="#183225" /></Pressable></View></View></Modal>
  </View>;
}
function AttireGuide({ expanded, onToggle, onOpenImage }) {
  const [tab, setTab] = useState('visit');
  return <View style={mapStyles.attireSection}><Pressable accessibilityLabel={`${expanded ? 'Collapse' : 'Expand'} campus attire and uniform guide`} onPress={onToggle} style={({ pressed }) => [mapStyles.attireHeader, pressed && styles.pressed]}><Text style={mapStyles.attireHeaderText}>Campus attire & uniform guide</Text><Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={22} color="#f7d521" /></Pressable>{expanded && <View style={mapStyles.attireCard}><Text style={mapStyles.attireEyebrow}>CAMPUS READY</Text><Text style={mapStyles.attireGuideTitle}>Dress for your next stop</Text><View style={mapStyles.attireTabs}><Pressable onPress={() => setTab('visit')} style={({ pressed }) => [mapStyles.attireTab, tab === 'visit' && mapStyles.attireTabActive, pressed && styles.pressed]}><Text style={[mapStyles.attireTabText, tab === 'visit' && mapStyles.attireTabTextActive]}>Admission visit</Text></Pressable><Pressable onPress={() => setTab('classes')} style={({ pressed }) => [mapStyles.attireTab, tab === 'classes' && mapStyles.attireTabActive, pressed && styles.pressed]}><Text style={[mapStyles.attireTabText, tab === 'classes' && mapStyles.attireTabTextActive]}>During classes</Text></Pressable></View>{tab === 'visit' ? <><Text style={mapStyles.attireIntro}>No school uniform is needed for admission visits. Neat, decent casual attire is acceptable any day, including regular office days.</Text><View style={mapStyles.attireNote}><Text style={mapStyles.attireNoteTitle}>Keep it neat and presentable</Text><Text style={mapStyles.attireNoteText}>No shorts, sandals or sleeveless tops, slippers, bare midriff, spaghetti straps, tube or backless tops, tight-fit blouses, jerseys, leggings, or ripped jeans that expose skin.</Text><Text style={mapStyles.attireNoteText}>Clean clothing and a neat hairstyle make campus transactions more comfortable.</Text></View><Pressable accessibilityLabel="View dress code image" onPress={() => onOpenImage({ source: require('../assets/Dresscode.jpg') })} style={({ pressed }) => [mapStyles.attireImageButton, pressed && styles.pressed]}><Image source={require('../assets/Dresscode.jpg')} style={mapStyles.attireDresscodeImage} resizeMode="contain" /></Pressable><Text style={mapStyles.attireCaption}>Student policy reference. Uniform rules apply after enrollment and class start.</Text></> : <><Text style={mapStyles.attireIntro}>Prescribed school uniforms for male and female students apply during classes. Confirm program-specific details with your college or department.</Text><View style={mapStyles.attireNote}><Text style={mapStyles.attireNoteTitle}>Wash Day: Wednesday and Saturday</Text><Text style={mapStyles.attireNoteText}>Students may wear appropriate civilian attire during Wash Days or declared field and special days.</Text><Text style={mapStyles.attireNoteText}>Civilian attire must be neat, decent, and not revealing. Avoid slippers or sandals, shorts or skirts more than three inches above the knee, sleeveless tops, bare midriff, spaghetti straps, tube or backless tops, tight-fit blouses, jerseys, leggings, and ripped jeans that expose skin.</Text><Text style={mapStyles.attireNoteText}>Long hair should be tied in a ponytail. Bright hair colors are prohibited.</Text></View><Text style={mapStyles.attireCaption}>Source: Office Memorandum No. PHDR-129-19 and Office Memorandum No. 32, s. 2023.</Text><View style={mapStyles.attireNote}><Text style={mapStyles.attireNoteTitle}>Daily reminder</Text><Text style={mapStyles.attireNoteText}>Always wear your student ID or bring your registration form when entering campus or attending classes.</Text></View><View style={mapStyles.uniformRow}><Pressable accessibilityLabel="View female uniform image" onPress={() => onOpenImage({ source: require('../assets/Female_Uniform.jpg') })} style={({ pressed }) => [mapStyles.uniformCard, pressed && styles.pressed]}><Image source={require('../assets/Female_Uniform.jpg')} style={mapStyles.uniformImage} resizeMode="contain" /><Text style={mapStyles.uniformLabel}>Female uniform</Text></Pressable><Pressable accessibilityLabel="View male uniform image" onPress={() => onOpenImage({ source: require('../assets/Male_Uniform.jpg') })} style={({ pressed }) => [mapStyles.uniformCard, pressed && styles.pressed]}><Image source={require('../assets/Male_Uniform.jpg')} style={mapStyles.uniformImage} resizeMode="contain" /><Text style={mapStyles.uniformLabel}>Male uniform</Text></Pressable></View></>}</View>}</View>;
}
function MapLegend({ fullscreen = false }) { return <View style={[mapStyles.legendImageFrame, fullscreen && mapStyles.fullscreenLegend]}><Image source={require('../assets/CvSU_Map_Legends.png')} style={mapStyles.legendImage} resizeMode="contain" /></View>; }
function LocationPreview({ location, onClose, onOpenImage, onOpenVideo }) { return <View style={mapStyles.locationPreview}><Pressable accessibilityLabel={`View ${location.name} image`} onPress={onOpenImage}><Image source={location.image} style={mapStyles.locationPreviewImage} resizeMode="cover" /><View style={mapStyles.locationPreviewImageHint}><Ionicons name="expand-outline" size={15} color="#fff" /><Text style={mapStyles.locationPreviewImageHintText}>View image</Text></View></Pressable><Pressable accessibilityLabel="Close location details" onPress={onClose} style={({ pressed }) => [mapStyles.locationPreviewClose, pressed && styles.pressed]}><Ionicons name="close" size={18} color="#183225" /></Pressable><View style={mapStyles.locationPreviewCopy}><Text style={mapStyles.locationPreviewEyebrow}>{location.name.startsWith('Gate') ? location.name.toUpperCase() : `LOCATION ${location.number}`}</Text><Text numberOfLines={2} style={mapStyles.locationPreviewTitle}>{location.name}</Text><Text style={mapStyles.locationPreviewPurpose}>{location.purpose}</Text><View style={mapStyles.videoList}>{location.guideVideos.map((video) => <Pressable key={video.label} accessibilityLabel={`${video.label} guide video`} onPress={() => onOpenVideo(video.source)} style={({ pressed }) => [mapStyles.videoButton, pressed && styles.pressed]}><Ionicons name="play-circle-outline" size={18} color="#fff" /><Text style={mapStyles.videoButtonText}>{video.label}</Text></Pressable>)}</View></View></View>; }
function GuideVideo({ source }) { const player = useVideoPlayer(source, (videoPlayer) => { videoPlayer.play(); }); return <VideoView player={player} style={mapStyles.videoPlayer} nativeControls contentFit="contain" />; }
const mapMarkerPositions = {
  1: { left: '53.5%', top: '60%' },
  2: { left: '60%', top: '25%' },
  3: { left: '17%', top: '67%' }
};
const gateMarkerPositions = {
  1: { left: '37%', top: '72%' },
  2: { left: '25%', top: '45%' },
  3: { left: '56%', top: '71.5%' }
};
const guideRoutes = {
  1: {
    3: [{ x: 55, y: 80 }, { x: 50, y: 65 }, { x: 53.5, y: 65 }],
    2: [{ x: 24, y: 52 }, { x: 27, y: 55 }, { x: 47, y: 58 }, { x: 51, y: 65 }, { x: 53.5, y: 65 }],
    1: [{ x: 35, y: 81 }, { x: 55, y: 78 }, { x: 50, y: 65 }, { x: 53.5, y: 65 }]
  },
  2: {
    2: [{ x: 24, y: 52 }, { x: 22, y: 47 }, { x: 70, y: 40 }, { x: 68, y: 28 }, { x: 60, y: 28 }],
    3: [{ x: 55, y: 80 }, { x: 77, y: 80 }, { x: 82, y: 78 }, { x: 68, y: 28 },{ x: 60, y: 28 }],
    1: [{ x: 35, y: 81 }, { x: 77, y: 80 }, { x: 82, y: 78 }, { x: 68, y: 28 },{ x: 60, y: 28 }]
  },
  3: {
    0: [{ x: 26, y: 80 }, { x: 20, y: 67 }, { x: 17, y: 67 }]
  }
};
const guideRestingPoint = { x: 43, y: 98 };
function percentToPoint(point, size) {
  return { x: (point.x / 100) * size.width, y: (point.y / 100) * size.height };
}
function GuideCharacter({ routeRequest, mapSize, profilePhoto }) {
  const progress = useRef(new Animated.Value(0)).current;
  const route = routeRequest ? guideRoutes[routeRequest.buildingNumber]?.[routeRequest.gateNumber] : null;
  const [standbyMessage, setStandbyMessage] = useState('I can guide you...');
  useEffect(() => {
    progress.setValue(0);
    if (!route || !mapSize.width || !mapSize.height) return;
    Animated.timing(progress, { toValue: route.length - 1, duration: 6000, useNativeDriver: true }).start();
  }, [mapSize.width, mapSize.height, progress, route, routeRequest?.runId]);
  useEffect(() => {
    if (route) return;
    setStandbyMessage('I can guide you...');
    const messageTimer = setInterval(() => setStandbyMessage((current) => current === 'I can guide you...' ? 'Click a location...' : 'I can guide you...'), 4000);
    return () => clearInterval(messageTimer);
  }, [route, routeRequest?.runId]);
  if (!mapSize.width || !mapSize.height) return null;
  if (!route) {
    const point = percentToPoint(guideRestingPoint, mapSize);
    return <Animated.View pointerEvents="none" style={[mapStyles.guideCharacter, { transform: [{ translateX: point.x - 14 }, { translateY: point.y - 30 }] }]}><View style={mapStyles.guideStandbyCloud}><Text style={mapStyles.guideStandbyText}>{standbyMessage}</Text></View><Image source={profilePhoto ? { uri: profilePhoto } : require('../assets/Profile.png')} style={mapStyles.guideAvatarImage} /></Animated.View>;
  }
  const points = route.map((point) => percentToPoint(point, mapSize));
  const inputRange = points.map((_, index) => index);
  const translateX = progress.interpolate({ inputRange, outputRange: points.map((point) => point.x - 14) });
  const translateY = progress.interpolate({ inputRange, outputRange: points.map((point) => point.y - 30) });
  return <Animated.View pointerEvents="none" style={[mapStyles.guideCharacter, { transform: [{ translateX }, { translateY }] }]}><Image source={profilePhoto ? { uri: profilePhoto } : require('../assets/Profile.png')} style={mapStyles.guideAvatarImage} /></Animated.View>;
}
function GateMarkers({ selectedNumber, onSelect }) {
  return <View pointerEvents="box-none" style={mapStyles.mapMarkerLayer}>{[1, 2, 3].map((number) => <Pressable key={number} accessibilityLabel={`Show Gate ${number}`} onPress={() => onSelect(number - 1)} style={[mapStyles.gateMarker, gateMarkerPositions[number], number === selectedNumber && mapStyles.gateMarkerSelected]}><Text style={mapStyles.gateMarkerText}>{number}</Text></Pressable>)}</View>;
}
function MapMarkers({ selectedNumber, onSelect }) {
  return <View pointerEvents="box-none" style={mapStyles.mapMarkerLayer}>{[1, 2, 3].map((number) => <Pressable key={number} accessibilityLabel={`Show location ${number}`} onPress={() => onSelect(number - 1)} style={[mapStyles.mapMarker, mapMarkerPositions[number], number === selectedNumber && mapStyles.mapMarkerSelected]}><Text style={mapStyles.mapMarkerText}>{number}</Text></Pressable>)}</View>;
}
function MapCanvas({ zoom, selected, guideRoute, selectedBuildingNumber, selectedGateNumber, showLocationPreview, showLocationDetailsButton, onCloseLocationPreview, onOpenLocationPreview, onOpenLocationImage, onOpenGuideVideo, onSelectMarker, onSelectGate, onZoomIn, onZoomOut, onReset, onFullscreen, profilePhoto, fullscreen = false }) {
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 });
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
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
  return <View onLayout={({ nativeEvent }) => setMapSize(nativeEvent.layout)} style={[mapStyles.mapFrame, fullscreen && mapStyles.fullscreenMap]} {...panResponder.panHandlers}><View style={[mapStyles.mapZoomLayer, { transform: [{ translateX: boundedPanOffset.x }, { translateY: boundedPanOffset.y }, { scale: zoom }] }]}><Image source={require('../assets/CvSU_Map.png')} style={mapStyles.mapImage} resizeMode="contain" /><GuideCharacter routeRequest={guideRoute} mapSize={mapSize} profilePhoto={profilePhoto} /><MapMarkers selectedNumber={selectedBuildingNumber} onSelect={onSelectMarker} /><GateMarkers selectedNumber={selectedGateNumber} onSelect={onSelectGate} /></View>{!showLocationPreview && !showLocationDetailsButton && selected?.guide && <View style={mapStyles.guideBubble}><Text style={mapStyles.guideLabel}>STOP {selected.number}</Text><Text style={mapStyles.guideText}>{selected.guide}</Text></View>}{selected && showLocationDetailsButton && !showLocationPreview && <Pressable accessibilityLabel={`Show details for ${selected.name}`} onPress={onOpenLocationPreview} style={({ pressed }) => [mapStyles.locationDetailsButton, pressed && styles.pressed]}><Ionicons name="information" size={20} color="#fff" /></Pressable>}{selected && showLocationPreview && <LocationPreview location={selected} onClose={onCloseLocationPreview} onOpenImage={onOpenLocationImage} onOpenVideo={onOpenGuideVideo} />}<View style={mapStyles.mapControls}><MapControl icon={fullscreen ? 'contract-outline' : 'scan-outline'} label={fullscreen ? 'Exit full screen' : 'Full screen'} onPress={onFullscreen} /><MapControl icon="add" label="Zoom in" onPress={onZoomIn} disabled={zoom === 3} /><MapControl icon="remove" label="Zoom out" onPress={onZoomOut} disabled={zoom === 1} /><Pressable accessibilityLabel="Reset map zoom" onPress={resetMapPosition} style={({ pressed }) => [mapStyles.resetControl, pressed && styles.pressed]}><Text style={mapStyles.resetText}>Reset</Text></Pressable></View><View style={mapStyles.zoomBadge}><Text style={mapStyles.zoomText}>{zoom.toFixed(1)}x</Text></View></View>;
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
  return <View style={mapStyles.page}><View style={mapStyles.hero}><Text style={mapStyles.heroEyebrow}>CAMPUS TRAIL</Text><Text style={mapStyles.heroTitle}>Campus Map</Text><Text style={mapStyles.heroCopy}>Follow the guided route from the road to your admission stop.</Text></View><Pressable onPress={() => setShowAttire((current) => !current)} style={({ pressed }) => [mapStyles.attireButton, pressed && styles.pressed]}><Text style={mapStyles.attireTitle}>Campus attire & uniform guide</Text><Ionicons name={showAttire ? 'chevron-up' : 'chevron-down'} size={20} color="#f7d521" /></Pressable>{showAttire && <View style={mapStyles.attirePanel}>{['Wear proper school or smart-casual attire.', 'Bring a valid school or government-issued ID.', 'Follow the dress requirements stated on your appointment slip.'].map((item) => <View key={item} style={mapStyles.attireRow}><Ionicons name="checkmark-circle" size={17} color="#009c29" /><Text style={mapStyles.attireText}>{item}</Text></View>)}</View>}<View style={mapStyles.mapCard}><View style={mapStyles.mapHeader}><View><Text style={mapStyles.mapTitle}>CvSU Main Campus</Text><Text style={mapStyles.mapSubtitle}>Select a location below to start the guide</Text></View><View style={mapStyles.guidedBadge}><View style={mapStyles.guidedDot} /><Text style={mapStyles.guidedText}>GUIDED</Text></View></View><View style={mapStyles.legend}>{[['#f7d521', 'Admission'], ['#c7d4c5', 'Buildings'], ['#000', 'Roads'], ['#fff', 'Walkway']].map(([color, label]) => <View key={label} style={mapStyles.legendItem}><View style={[mapStyles.legendSwatch, { backgroundColor: color }]} /><Text style={mapStyles.legendLabel}>{label}</Text></View>)}</View><View style={mapStyles.mapFrame}><Image source={require('../assets/CvSU_Map.png')} style={mapStyles.mapImage} resizeMode="contain" /><View style={mapStyles.guideBubble}><Text style={mapStyles.guideLabel}>STOP {selected.number}</Text><Text style={mapStyles.guideText}>{selected.guide}</Text></View></View></View><View style={mapStyles.locationsCard}><View style={mapStyles.locationsHeader}><Text style={mapStyles.locationsTitle}>Admission Locations</Text><Text style={mapStyles.locationsCount}>3 stops</Text></View>{admissionLocations.map((location, index) => <Pressable key={location.number} onPress={() => setSelectedLocation(index)} style={({ pressed }) => [mapStyles.locationRow, index === selectedLocation && mapStyles.locationRowSelected, index === admissionLocations.length - 1 && mapStyles.locationRowLast, pressed && styles.pressed]}><View style={[mapStyles.locationNumber, index === selectedLocation && mapStyles.locationNumberSelected]}><Text style={mapStyles.locationNumberText}>{location.number}</Text></View><View style={mapStyles.locationCopy}><Text style={mapStyles.locationName}>{location.name}</Text><Text style={mapStyles.locationPurpose}>{location.purpose}</Text></View><Ionicons name="chevron-forward" size={20} color="#075b31" /></Pressable>)}</View><Pressable onPress={() => setTipIndex((current) => (current + 1) % campusTips.length)} style={({ pressed }) => [mapStyles.tip, pressed && styles.pressed]}><View style={mapStyles.tipBadge}><Text style={mapStyles.tipBadgeText}>TIP</Text></View><View style={mapStyles.tipCopy}><Text style={mapStyles.tipTitle}>{tip[0]}</Text><Text style={mapStyles.tipText}>{tip[1]}</Text><Text style={mapStyles.tipHint}>Tap for another tip</Text></View><Ionicons name="chevron-forward" size={20} color="#735f37" /></Pressable></View>;
}
function StatusPage({ displayName, profile, program, track, steps, currentStatusIndex, onStatusChange, selectedStepIndex, onSelectStep, checkedRequirements, onRequirementsChange, examinationAttempt, onExaminationAttemptChange, failedProgram, reapplicationProgram, onFailedProgramChange, onReapplicationProgramChange, onProgramChange }) {
  const isFinished = currentStatusIndex === steps.length;
  const applicationStopped = examinationAttempt === 'stopped';
  const selectedStep = selectedStepIndex === null ? null : steps[selectedStepIndex];
  const selectedDetails = selectedStep ? statusStepDetails[selectedStep] : null;
  const selectedChecks = selectedStep ? checkedRequirements[selectedStep] || [] : [];
  const [localFailedProgram, setLocalFailedProgram] = useState(failedProgram || '');
  const [localReapplicationProgram, setLocalReapplicationProgram] = useState(reapplicationProgram || '');
  const failedProgramValue = failedProgram || localFailedProgram;
  const profileLabel = profiles.find(([value]) => value === profile)?.[1] || profile;
  const toggleRequirement = (index) => onRequirementsChange((current) => {
    const stepChecks = current[selectedStep] || [];
    return { ...current, [selectedStep]: stepChecks.includes(index) ? stepChecks.filter((item) => item !== index) : [...stepChecks, index] };
  });
  const completeSelectedStep = () => {
    if (selectedStepIndex !== currentStatusIndex) return;
    onStatusChange(currentStatusIndex + 1);
    onSelectStep(null);
  };
  const passExamination = () => {
    if (selectedStep !== 'Admission Examination' || selectedStepIndex !== currentStatusIndex) return;
    onExaminationAttemptChange('passed');
    onStatusChange(currentStatusIndex + 1);
    onSelectStep(null);
  };
  const failExamination = () => { setLocalFailedProgram(program); onFailedProgramChange?.(program); onExaminationAttemptChange((attempt) => attempt === 'reapplication' ? 'stopped' : 'failed'); };
  const startReapplication = (selectedProgram) => { setLocalReapplicationProgram(selectedProgram); onReapplicationProgramChange?.(selectedProgram); onExaminationAttemptChange('reapplication'); };
  const undoLatestCompletedStep = () => {
    if (selectedStepIndex !== currentStatusIndex - 1) return;
    onRequirementsChange((current) => {
      const next = { ...current };
      delete next[selectedStep];
      return next;
    });
    if (selectedStep === 'Admission Examination') onExaminationAttemptChange('initial');
    onStatusChange(currentStatusIndex - 1);
    onSelectStep(null);
  };
  return <><View><View style={journeyStyles.hero}><View style={journeyStyles.heroTop}><Text style={journeyStyles.heroTag}>ADMISSION TRAIL</Text><Text style={journeyStyles.heroCount}>{currentStatusIndex}/{steps.length}</Text></View><Text style={journeyStyles.heroCopy}>See how far you are in the admission process and which step needs your attention next.</Text></View><Text style={journeyStyles.heroTitle}>Admission Process for {displayName}</Text><Text style={journeyStyles.heroCopy}>Track your admission journey, one station at a time.</Text></View><View style={statusInfoStyles.card}><Text style={statusInfoStyles.eyebrow}>CVSU MAIN CAMPUS ONLINE ADMISSION</Text><Text style={statusInfoStyles.body}>Access the main campus portal using a Gmail account, then complete and save your online application.</Text><Text style={statusInfoStyles.remember}>Remember:</Text>{['Your declared track or strand must match your documentary requirements.', 'Choose the correct applicant category.', 'Review all entries carefully before submitting.', 'Save your application every time you make a change.'].map((item) => <View key={item} style={statusInfoStyles.reminderRow}><View style={statusInfoStyles.bullet} /><Text style={statusInfoStyles.reminderText}>{item}</Text></View>)}<Pressable onPress={() => Linking.openURL('http://admission.cvsu.edu.ph')} style={({ pressed }) => [statusInfoStyles.portalButton, pressed && styles.pressed]}><Ionicons name="open-outline" size={18} color="#fff" /><Text style={statusInfoStyles.portalButtonText}>Open admission portal</Text></Pressable></View><View style={statusInfoStyles.card}><Text style={statusInfoStyles.eyebrow}>YOUR APPLICANT PROFILE</Text><ProfileRow label="Type" value={profileLabel} /><ProfileRow label="Track / Strand" value={track} /><ProfileRow label="Program" value={program} last /></View><View style={[styles.statusCard, { borderRadius: 8 }]}><Text style={styles.cardEyebrow}>CURRENT APPLICATION</Text><Text style={styles.statusHeading}>{applicationStopped ? 'Application process ended' : isFinished ? 'Admission journey complete' : 'Track your progress'}</Text><Text style={styles.statusCaption}>{applicationStopped ? 'Thank you for applying to Cavite State University. The admission process has ended after the re-application examination result.' : isFinished ? 'All admission steps have been marked as completed.' : `${currentStatusIndex} of ${steps.length} steps completed. Tap a step to update your progress.`}</Text>{steps.map((item, index) => {
    const isComplete = index < currentStatusIndex;
    const isCurrent = index === currentStatusIndex;
    const state = item === 'Admission Examination' && applicationStopped ? 'Application ended' : applicationStopped && index > currentStatusIndex ? 'Unavailable' : isComplete ? 'Completed' : isCurrent ? 'In progress' : 'Upcoming';
    const requirementCount = statusStepDetails[item].requirements.length;
    const checkedCount = checkedRequirements[item]?.length || 0;
    return <Pressable key={item} onPress={() => onSelectStep(index)} style={({ pressed }) => [styles.statusStep, pressed && styles.pressed]}><View style={[styles.statusDot, isComplete && styles.currentStatusDot, isCurrent && { backgroundColor: '#fff7d6', borderColor: '#f7d521', borderWidth: 3 }]}>{isCurrent ? <Ionicons name="time" size={18} color="#8a5e12" /> : <Text style={[styles.statusNumber, isComplete && { color: '#fff' }]}>{isComplete ? '✓' : index + 1}</Text>}</View><View style={styles.statusStepCopy}><Text style={styles.statusStepTitle}>{item}</Text><Text style={[styles.statusStepState, isComplete && { color: '#009c29', fontWeight: '700' }, isCurrent && { color: '#8a5e12', fontWeight: '800' }]}>{state}</Text><Text style={styles.statusStepDescription}>{statusStepDetails[item].description}</Text><Text style={{ color: checkedCount === requirementCount ? '#009c29' : '#698073', fontSize: 11, fontWeight: '700', marginTop: 5 }}>{checkedCount} / {requirementCount} requirements ready</Text></View>{index < steps.length - 1 && <View style={[styles.statusConnector, isComplete && { backgroundColor: '#009c29' }]} />}</Pressable>;
  })}{isFinished && <Pressable onPress={() => onStatusChange(0)} style={({ pressed }) => [styles.back, { marginTop: 8, alignItems: 'center' }, pressed && styles.pressed]}><Text style={styles.backText}>Reset progress</Text></Pressable>}</View><Modal visible={selectedStep !== null} transparent animationType="slide" onRequestClose={() => onSelectStep(null)}><View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(8, 35, 21, 0.55)' }}><View style={{ maxHeight: '88%', backgroundColor: '#fff', borderTopLeftRadius: 12, borderTopRightRadius: 12, paddingTop: 8 }}><View style={{ alignItems: 'center', paddingBottom: 4 }}><View style={{ width: 42, height: 4, borderRadius: 2, backgroundColor: '#b8d3bc' }} /></View><ScrollView contentContainerStyle={{ padding: 22, paddingBottom: 30 }}><View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}><View style={{ flex: 1, paddingRight: 14 }}><Text style={styles.cardEyebrow}>ADMISSION STEP {selectedStepIndex + 1}</Text><Text style={[styles.statusHeading, { marginTop: 8 }]}>{selectedStep}</Text></View><Pressable accessibilityLabel="Close details" onPress={() => onSelectStep(null)} style={({ pressed }) => [{ width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 19, backgroundColor: '#e4eee4' }, pressed && styles.pressed]}><Ionicons name="close" size={22} color="#075b31" /></Pressable></View><Text style={[styles.statusCaption, { fontSize: 14, marginBottom: 20 }]}>{selectedDetails?.description}</Text><DetailSection title="Instructions" items={selectedDetails?.instructions} numbered /><RequirementChecklist items={selectedDetails?.requirements} checked={selectedChecks} onToggle={toggleRequirement} />{selectedDetails?.location && <DetailSection title="Location" items={[selectedDetails.location]} />}{selectedDetails?.details && <DetailSection title="Medical details" items={selectedDetails.details} />}{selectedStepIndex < currentStatusIndex ? selectedStepIndex === currentStatusIndex - 1 && !applicationStopped ? <Pressable onPress={undoLatestCompletedStep} style={({ pressed }) => [styles.back, { marginTop: 4, alignItems: 'center' }, pressed && styles.pressed]}><Text style={styles.backText}>Undo completion</Text></Pressable> : <View style={{ padding: 14, borderRadius: 8, backgroundColor: '#dff5df', alignItems: 'center' }}><Text style={{ color: '#075b31', fontWeight: '700' }}>Completed</Text></View> : selectedStepIndex > currentStatusIndex ? <View style={{ padding: 14, borderRadius: 8, backgroundColor: '#eef3ee', alignItems: 'center' }}><Text style={{ color: '#52695b', fontWeight: '700', textAlign: 'center' }}>{applicationStopped ? 'The application process has ended' : 'Complete the previous step first'}</Text></View> : selectedStep === 'Admission Examination' ? <ExaminationResultActions attempt={examinationAttempt} onPassed={passExamination} onFailed={failExamination} onReapply={() => onExaminationAttemptChange('reapplication')} /> : <Pressable onPress={completeSelectedStep} style={({ pressed }) => [styles.action, { flex: 0, marginTop: 4 }, pressed && styles.pressed]}><Text style={styles.actionText}>Mark as completed</Text></Pressable>}</ScrollView></View></View></Modal></>;
}
function JourneyPage({ displayName, program, profilePhoto, steps, currentStatusIndex, examinationAttempt, onOpenStep }) {
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
  const currentStep = applicationStopped ? 'Application ended' : isFinished ? 'Finish line reached' : steps[currentStatusIndex];
  return <View style={journeyStyles.page}><View style={journeyStyles.hero}><View style={journeyStyles.heroTop}><Text style={journeyStyles.heroTag}>ADMISSION TRAIL</Text><Text style={journeyStyles.heroCount}>{currentStatusIndex}/{steps.length}</Text></View><Text style={journeyStyles.heroTitle}>CvSU Journey for {displayName}</Text><Text style={journeyStyles.heroCopy}>{applicationStopped ? 'Your trail has ended, ' + displayName + '. Thank you for applying.' : 'Follow the trail from application to enrollment, ' + displayName + '.'}</Text><View style={[journeyStyles.currentStop, applicationStopped && journeyStyles.stoppedStop]}><Text style={journeyStyles.stopLabel}>{applicationStopped ? 'TRAIL STATUS' : isFinished ? 'DESTINATION REACHED' : 'CURRENT STOP'}</Text><Text style={journeyStyles.stopTitle}>{currentStep}</Text><Text style={journeyStyles.stopCopy}>{applicationStopped ? 'The re-application result ended this application.' : isFinished ? 'Every admission mission is complete.' : 'Tap the open station on the trail to continue.'}</Text></View></View><View style={journeyStyles.progressCard}><View style={journeyStyles.progressTrack}><View style={[journeyStyles.progressFill, { width: `${progress}%` }]} /></View><Text style={journeyStyles.progressCopy}>{currentStatusIndex} of {steps.length} stations reached</Text></View><View style={journeyStyles.trailCard}><View style={journeyStyles.trailHeading}><View><Text style={journeyStyles.trailEyebrow}>CAMPUS TRAIL</Text><Text style={journeyStyles.trailTitle}>Admission Journey</Text></View><Ionicons name="map" size={28} color="#f4bf32" /></View><View style={journeyStyles.legend}><LegendItem color="#078743" icon="checkmark" label="Completed" /><LegendItem color="#fff" border="#078743" label="Open" /><LegendItem color="#dfe7e1" icon="lock-closed" label="Locked" /></View><View style={journeyStyles.trail}>{steps.map((step, index) => {
    const completed = index < currentStatusIndex;
    const current = index === currentStatusIndex && !applicationStopped;
    const stopped = step === 'Admission Examination' && applicationStopped;
    const locked = !completed && !current && !stopped;
    const icon = completed ? 'checkmark' : stopped ? 'close' : 'lock-closed';
    const stateLabel = completed ? 'Mission complete' : stopped ? 'Trail ended' : current ? 'Open mission' : 'Locked';
    return <View key={step} style={journeyStyles.stationRow}>{index < steps.length - 1 && <GlowRoad glow={roadGlow} direction={index % 2 === 0 ? 'right' : 'left'} completed={completed} />}<Pressable accessibilityLabel={`${step}, ${stateLabel}`} onPress={() => onOpenStep(index)} style={({ pressed }) => [journeyStyles.station, index % 2 === 0 ? journeyStyles.stationLeft : journeyStyles.stationRight, pressed && styles.pressed]}>{current && <View style={journeyStyles.currentMarker}><Image source={profilePhoto ? { uri: profilePhoto } : require('../assets/Profile.png')} style={journeyStyles.avatarImage} /></View>}<View style={[journeyStyles.node, completed && journeyStyles.nodeComplete, current && journeyStyles.nodeCurrent, locked && journeyStyles.nodeLocked, stopped && journeyStyles.nodeStopped]}>{current ? <Text style={journeyStyles.nodeNumber}>{index + 1}</Text> : <Ionicons name={icon} size={completed ? 28 : 21} color={completed || stopped ? '#fff' : '#829489'} />}</View><Text style={[journeyStyles.nodeLabel, current && journeyStyles.nodeLabelCurrent, stopped && journeyStyles.nodeLabelStopped]} numberOfLines={2}>{step}</Text></Pressable></View>;
  })}<View style={journeyStyles.finish}><View style={journeyStyles.finishFlag}><Ionicons name="flag" size={26} color="#f7d521" /></View><View style={journeyStyles.finishCopy}><Text style={journeyStyles.finishLabel}>FINAL DESTINATION</Text>{isFinished && <><Text style={journeyStyles.finishTitle}>WELCOME TO CvSU</Text><View style={journeyStyles.finishProgram}><View style={journeyStyles.finishProgramCopy}><Text style={journeyStyles.finishProgramLabel}>YOUR ADMISSION PATH</Text><Text style={journeyStyles.program} numberOfLines={3}>{program}</Text></View></View></>}</View><View style={journeyStyles.finishFlag}><Ionicons name="flag" size={26} color="#f7d521" /></View></View></View></View></View>;
}
function GlowRoad({ direction, completed, glow }) {
  const borderColor = glow.interpolate({ inputRange: [0, 1], outputRange: completed ? ['#e0bd16', '#fff2a3'] : ['#aebbb3', '#d9fff0'] });
  return <Animated.View pointerEvents="none" style={[journeyStyles.road, direction === 'right' ? journeyStyles.roadRight : journeyStyles.roadLeft, completed && journeyStyles.roadComplete, { zIndex: completed ? 2 : 1, borderColor, opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.78, 1] }), shadowColor: completed ? '#f7d521' : '#8ef0c1', shadowOpacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.1, 0.75] }), shadowRadius: glow.interpolate({ inputRange: [0, 1], outputRange: [2, 12] }), shadowOffset: { width: 0, height: 0 } }]} />;
}
function LegendItem({ color, border, icon, label }) { return <View style={journeyStyles.legendItem}><View style={[journeyStyles.legendDot, { backgroundColor: color, borderColor: border || color }]}>{icon && <Ionicons name={icon} size={11} color={color === '#009c29' ? '#fff' : '#829489'} />}</View><Text style={journeyStyles.legendText}>{label}</Text></View>; }
function ProfileRow({ label, value, last }) { return <View style={[statusInfoStyles.profileRow, last && { marginBottom: 0 }]}><Text style={statusInfoStyles.profileLabel}>{label}</Text><Text style={statusInfoStyles.profileValue}>{value}</Text></View>; }
function DetailSection({ title, items = [], numbered = false }) { return <View style={{ marginBottom: 22 }}><Text style={{ color: '#075b31', fontSize: 14, fontWeight: '700', marginBottom: 10 }}>{title}</Text>{items.map((item, index) => <View key={item} style={{ flexDirection: 'row', marginBottom: 9 }}><Text style={{ width: 24, color: '#078743', fontWeight: '700' }}>{numbered ? `${index + 1}.` : '•'}</Text><Text style={{ flex: 1, color: '#52695b', fontSize: 13, lineHeight: 19 }}>{item}</Text></View>)}</View>; }
function ExaminationResultActions({ attempt, onPassed, onFailed, onReapply, failedProgram, reapplicationProgram }) {
  const availablePrograms = programs.filter((item) => item !== failedProgram);
  if (attempt === 'stopped') return <View style={{ padding: 18, borderRadius: 8, backgroundColor: '#eef3ee' }}><Text style={{ color: '#183225', fontSize: 16, fontWeight: '700', textAlign: 'center' }}>Thank you for applying</Text><Text style={{ color: '#52695b', fontSize: 13, lineHeight: 19, marginTop: 7, textAlign: 'center' }}>The re-application was not passed, so the admission process has ended.</Text></View>;
  if (attempt === 'failed') return <View><View style={{ padding: 14, borderRadius: 8, backgroundColor: '#fffde8', borderWidth: 1, borderColor: '#f7d521', marginBottom: 12 }}><Text style={{ color: '#183225', fontWeight: '700', textAlign: 'center' }}>Admission examination failed</Text><Text style={{ color: '#52695b', fontSize: 12, textAlign: 'center', marginTop: 6 }}>Select the program for your re-application.</Text><Text style={{ color: '#645f18', fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 8 }}>Note: Follow the official re-application instructions in the online admission portal.</Text></View>{availablePrograms.map((item) => <Pressable key={item} onPress={() => onReapply(item)} style={({ pressed }) => [{ padding: 10, borderBottomWidth: 1, borderBottomColor: '#e5ebe5' }, pressed && styles.pressed]}><Text style={{ color: '#183225', fontSize: 12 }}>{item}</Text></Pressable>)}</View>;
  return <View><Text style={{ color: '#075b31', fontSize: 14, fontWeight: '700', textAlign: 'center', marginBottom: 12 }}>{attempt === 'reapplication' ? 'Re-application result' : 'Admission examination result'}</Text>{attempt === 'reapplication' && <Text style={{ color: '#645f18', fontSize: 12, lineHeight: 18, textAlign: 'center', marginBottom: 12 }}>Follow the official re-application instructions in the online admission portal.</Text>}{attempt === 'reapplication' && reapplicationProgram && <Text style={{ color: '#52695b', fontSize: 12, textAlign: 'center', marginBottom: 12 }}>Guide program: {reapplicationProgram}</Text>}<View style={{ flexDirection: 'row', gap: 10 }}><Pressable onPress={onFailed} style={({ pressed }) => [styles.back, { flex: 1, alignItems: 'center', borderColor: '#f7d521', backgroundColor: '#fffde8' }, pressed && styles.pressed]}><Text style={{ color: '#183225', fontWeight: '700' }}>Failed</Text></Pressable><Pressable onPress={onPassed} style={({ pressed }) => [styles.action, pressed && styles.pressed]}><Text style={styles.actionText}>Passed</Text></Pressable></View></View>;
}
function RequirementChecklist({ items = [], checked, onToggle }) { return <View style={{ marginBottom: 22 }}><View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}><Text style={{ color: '#075b31', fontSize: 14, fontWeight: '700' }}>Requirements</Text><Text style={{ color: checked.length === items.length ? '#078743' : '#698073', fontSize: 12, fontWeight: '700' }}>{checked.length} / {items.length} ready</Text></View>{items.map((item, index) => { const isChecked = checked.includes(index); return <Pressable key={item} accessibilityRole="checkbox" accessibilityState={{ checked: isChecked }} onPress={() => onToggle(index)} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8 }, pressed && styles.pressed]}><View style={{ width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: isChecked ? '#078743' : '#b8d3bc', backgroundColor: isChecked ? '#078743' : '#fff', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>{isChecked && <Ionicons name="checkmark" size={16} color="#fff" />}</View><Text style={{ flex: 1, color: isChecked ? '#698073' : '#52695b', fontSize: 13, lineHeight: 20, textDecorationLine: isChecked ? 'line-through' : 'none' }}>{item}</Text></Pressable>; })}</View>; }
const faqStyles = StyleSheet.create({
  page: { paddingBottom: 18 },
  hero: { backgroundColor: '#009c29', borderWidth: 1, borderColor: '#f7d521', borderRadius: 8, padding: 18, marginBottom: 14 },
  heroEyebrow: { color: '#f7d521', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  heroTitle: { color: '#fff', fontSize: 28, lineHeight: 33, fontWeight: '800', marginTop: 14, maxWidth: 280 },
  heroCopy: { color: '#f2fff4', fontSize: 14, lineHeight: 20, marginTop: 8 },
  guideCard: { minHeight: 330, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#d8e2d9', padding: 14, marginBottom: 18, overflow: 'hidden' },
  triviaBubble: { borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#d8e2d9', padding: 14, zIndex: 2 },
  triviaEyebrow: { color: '#698073', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  triviaText: { color: '#183225', fontSize: 13, lineHeight: 19, fontWeight: '700', marginTop: 9 },
  triviaHint: { color: '#75877b', fontSize: 10, marginTop: 12 },
  guideStage: { flex: 1, minHeight: 150, alignItems: 'center', justifyContent: 'flex-end', paddingTop: 14 },
  guideImage: { width: 142, height: 142 },
  guideBadge: { position: 'absolute', top: 10, right: 64, borderRadius: 12, backgroundColor: '#f7d521', paddingHorizontal: 10, paddingVertical: 5 },
  guideBadgeText: { color: '#564f0e', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  findHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 10 },
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
  mapZoomLayer: { ...StyleSheet.absoluteFillObject },
  mapImage: { width: '100%', height: '100%' },
  mapMarkerLayer: { ...StyleSheet.absoluteFillObject },
  mapMarker: { position: 'absolute', width: 44, height: 30, marginLeft: -22, marginTop: -15, borderRadius: 8, backgroundColor: '#f7d521', borderWidth: 3, borderColor: '#fff', alignItems: 'center', justifyContent: 'center', elevation: 4, zIndex: 2 },
  mapMarkerSelected: { borderColor: '#075b31', borderWidth: 4, transform: [{ scale: 1.12 }] },
  mapMarkerText: { color: '#183225', fontSize: 17, fontWeight: '800' },
  gateMarker: { position: 'absolute', width: 34, height: 24, marginLeft: -17, marginTop: -12, borderRadius: 7, backgroundColor: '#075b31', borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center', elevation: 4, zIndex: 3 },
  gateMarkerSelected: { borderColor: '#f7d521', borderWidth: 3, transform: [{ scale: 1.12 }] },
  gateMarkerText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  guideCharacter: { position: 'absolute', left: 0, top: 0, width: 28, height: 34, alignItems: 'center', zIndex: 20, elevation: 20 },
  guideAvatarImage: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: '#f7d521', backgroundColor: '#fff' },
  guideStandbyCloud: { position: 'absolute', bottom: 34, left: -62, width: 150, minHeight: 38, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: '#d8e2d9', alignItems: 'center', justifyContent: 'center', elevation: 5 },
  guideStandbyText: { color: '#183225', fontSize: 11, lineHeight: 15, fontWeight: '800', textAlign: 'center' },
  guideHead: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#f7d521', borderWidth: 2, borderColor: '#fff' },
  guideBody: { width: 30, height: 28, borderRadius: 8, backgroundColor: '#075b31', borderWidth: 2, borderColor: '#dff5df', alignItems: 'center', justifyContent: 'center', marginTop: -2 },
  guideBubble: { position: 'absolute', left: 14, right: 14, top: 14, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.9)', borderLeftWidth: 4, borderLeftColor: '#f7d521', padding: 11 },
  guideLabel: { color: '#009c29', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  guideText: { color: '#183225', fontSize: 11, lineHeight: 16, marginTop: 3 },
  locationDetailsButton: { position: 'absolute', top: 14, left: 14, width: 42, height: 42, borderRadius: 8, backgroundColor: '#075b31', borderWidth: 2, borderColor: '#f7d521', alignItems: 'center', justifyContent: 'center', elevation: 5, zIndex: 4 },
  locationPreview: { position: 'absolute', top: 14, left: 14, width: '52%', maxWidth: 260, backgroundColor: '#fff', borderWidth: 1, borderColor: '#d8e2d9', borderRadius: 8, overflow: 'hidden', elevation: 6, zIndex: 4 },
  locationPreviewImage: { width: '100%', height: 68, backgroundColor: '#d8e2d9' },
  locationPreviewImageHint: { position: 'absolute', left: 8, right: 8, bottom: 7, borderRadius: 6, backgroundColor: 'rgba(7,91,49,0.92)', paddingVertical: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  locationPreviewImageHintText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  locationPreviewClose: { position: 'absolute', top: 7, right: 7, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.92)', alignItems: 'center', justifyContent: 'center' },
  locationPreviewCopy: { padding: 8 },
  locationPreviewEyebrow: { color: '#009c29', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  locationPreviewTitle: { color: '#183225', fontSize: 12, lineHeight: 16, fontWeight: '800', marginTop: 4 },
  locationPreviewPurpose: { color: '#075b31', fontSize: 10, lineHeight: 14, fontWeight: '700', marginTop: 3 },
  locationPreviewDescription: { color: '#52695b', fontSize: 10, lineHeight: 14, marginTop: 5 },
  videoList: { marginTop: 9, gap: 5 },
  videoButton: { minHeight: 32, borderRadius: 6, backgroundColor: '#075b31', paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 5 },
  videoButtonText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  imageModal: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  imageModalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(4,24,13,0.86)' },
  imageModalContent: { width: '100%', maxWidth: 520, aspectRatio: 1.25, backgroundColor: '#fff', borderRadius: 8, overflow: 'hidden', elevation: 8 },
  imageModalImage: { width: '100%', height: '100%' },
  imageModalClose: { position: 'absolute', top: 10, right: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.94)', alignItems: 'center', justifyContent: 'center' },
  videoModal: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 14 },
  videoModalContent: { width: '100%', maxWidth: 420, maxHeight: '88%', aspectRatio: 9 / 16, backgroundColor: '#000', borderRadius: 8, overflow: 'hidden', elevation: 8 },
  videoPlayer: { width: '100%', height: '100%' },
  locationsCard: { borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#d8e2d9', padding: 14, marginBottom: 14 },
  locationsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  locationsTitle: { color: '#183225', fontSize: 17, fontWeight: '800' },
  locationsCount: { color: '#009c29', fontSize: 11, fontWeight: '800' },
  locationRow: { minHeight: 78, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#e5ebe5', paddingHorizontal: 6, paddingVertical: 10 },
  locationRowSelected: { backgroundColor: '#fffbe5', borderLeftWidth: 4, borderLeftColor: '#f7d521', paddingLeft: 8 },
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
  zoomBadge: { position: 'absolute', right: 12, bottom: 12, borderRadius: 12, backgroundColor: 'rgba(7,91,49,0.92)', paddingHorizontal: 9, paddingVertical: 5 },
  zoomText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  fullscreen: { flex: 1, backgroundColor: '#075b31' },
  fullscreenHeader: { height: 72, backgroundColor: '#fff', paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fullscreenEyebrow: { color: '#009c29', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  fullscreenTitle: { color: '#183225', fontSize: 20, fontWeight: '800', marginTop: 3 },
  closeControl: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f2f5f2', borderWidth: 1, borderColor: '#d8e2d9', alignItems: 'center', justifyContent: 'center' },
  fullscreenMap: { width: '100%', height: undefined, aspectRatio: 1080 / 1350, borderRadius: 0 }
});
const profileStyles = StyleSheet.create({
  headerBrand: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
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
  backButton: { flex: 1, minHeight: 52, alignItems: 'flex-end', justifyContent: 'center', paddingHorizontal: 8 },
  backButtonText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  guestButton: { minHeight: 76, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#d8e2d9', alignItems: 'center', justifyContent: 'center', padding: 13, marginBottom: 12 },
  guestTitle: { color: '#183225', fontSize: 12, fontWeight: '800', textAlign: 'center' },
  guestCopy: { color: '#75877b', fontSize: 10, lineHeight: 15, textAlign: 'center', marginTop: 5, maxWidth: 310 },
  resetButton: { minHeight: 68, borderRadius: 8, backgroundColor: '#fffde8', borderWidth: 1, borderColor: '#f7d521', justifyContent: 'center', padding: 14 },
  resetTitle: { color: '#183225', fontSize: 13, fontWeight: '800' },
  resetCopy: { color: '#698073', fontSize: 10, marginTop: 5 }
});
const guestSetupStyles = StyleSheet.create({
  content: { backgroundColor: '#f2fbf0', paddingTop: 24 },
  page: { paddingBottom: 24 },
  eyebrow: { color: '#078743', fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 10 },
  title: { color: '#075b31', fontSize: 28, lineHeight: 34, fontWeight: '800' },
  copy: { color: '#698073', fontSize: 13, lineHeight: 19, marginTop: 9, marginBottom: 22 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 22 }
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
const styles = StyleSheet.create({ safe: { flex: 1, backgroundColor: '#075b31' }, screen: { padding: 23, paddingBottom: 110, backgroundColor: '#f2fbf0', minHeight: '100%' }, greenWash: { position: 'absolute', top: 0, left: 0, right: 0, height: 150, backgroundColor: '#075b31' }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 12, backgroundColor: '#dff5df' }, brand: { flexDirection: 'row', alignItems: 'center' }, logo: { width: 51, height: 51, marginRight: 11 }, eyebrow: { color: '#698073', fontSize: 10, fontWeight: '700', letterSpacing: 1 }, brandName: { color: '#075b31', fontSize: 18, fontWeight: '700' }, help: { color: '#075b31', borderWidth: 1, borderColor: '#b8d3bc', borderRadius: 20, width: 32, height: 32, textAlign: 'center', paddingTop: 5, fontWeight: '700', backgroundColor: '#fff' }, progress: { marginTop: 34, marginBottom: 42 }, progressTrack: { flexDirection: 'row', alignItems: 'center' }, progressSegment: { flex: 1, flexDirection: 'row', alignItems: 'center' }, progressDot: { width: 10, height: 10, borderRadius: 6, borderWidth: 2, borderColor: '#b8d3bc', backgroundColor: '#f2fbf0' }, activeProgressDot: { width: 14, height: 14, borderRadius: 8, borderWidth: 3, borderColor: '#078743' }, completeProgressDot: { borderColor: '#078743', backgroundColor: '#078743' }, progressLine: { height: 2, flex: 1, backgroundColor: '#cfe1d0' }, completeProgressLine: { backgroundColor: '#078743' }, progressText: { color: '#698073', fontSize: 12, fontWeight: '700', marginTop: 8 }, kicker: { color: '#078743', fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 10 }, title: { color: '#075b31', fontSize: 38, fontWeight: '700', lineHeight: 42 }, intro: { color: '#698073', fontSize: 15, lineHeight: 23, marginTop: 15, marginBottom: 30 }, list: { gap: 12 }, option: { minHeight: 68, padding: 15, borderWidth: 1, borderColor: '#d9e7da', borderRadius: 10, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center' }, compact: { minHeight: 58, padding: 11 }, profileOption: { minHeight: 112, padding: 20, alignItems: 'flex-start' }, selected: { borderWidth: 2, borderColor: '#078743', backgroundColor: '#dff5df' }, pressed: { opacity: 0.78, transform: [{ scale: 0.985 }] }, icon: { width: 38, height: 38, borderRadius: 20, backgroundColor: '#dff5df', color: '#078743', textAlign: 'center', paddingTop: 10, marginRight: 12, fontWeight: '700' }, selectedIcon: { backgroundColor: '#078743', color: '#fff' }, optionCopy: { flex: 1 }, optionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, optionText: { flex: 1, color: '#183225', fontSize: 14, fontWeight: '700' }, profileOptionText: { fontSize: 18, lineHeight: 23 }, profileOptionTextSelected: { color: '#078743' }, selectedLabel: { color: '#078743', fontSize: 11, fontWeight: '800', marginLeft: 12 }, optionCaption: { color: '#698073', fontSize: 14, lineHeight: 21, marginTop: 10 }, check: { color: '#078743', fontSize: 18 }, actions: { flexDirection: 'row', gap: 12, marginTop: 28, alignItems: 'center' }, fixedActions: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 18, paddingHorizontal: 23, flexDirection: 'row', gap: 12, backgroundColor: '#e5f6e3', borderTopWidth: 1, borderTopColor: '#b8d3bc' }, action: { flex: 1, minHeight: 48, borderRadius: 8, backgroundColor: '#075b31', justifyContent: 'center', alignItems: 'center' }, actionText: { color: '#fff', fontWeight: '700' }, disabled: { backgroundColor: '#9fbaaa' }, back: { minHeight: 48, paddingHorizontal: 16, borderWidth: 1, borderColor: '#b8d3bc', borderRadius: 8, justifyContent: 'center', backgroundColor: '#fff' }, backText: { color: '#075b31', fontWeight: '700' }, search: { height: 48, borderWidth: 1, borderColor: '#b8d3bc', borderRadius: 8, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, marginBottom: 15 }, searchIcon: { color: '#078743', fontSize: 24, marginRight: 9 }, input: { flex: 1, color: '#183225' }, clear: { width: 24, height: 24, borderRadius: 13, backgroundColor: '#dff5df', alignItems: 'center', justifyContent: 'center' }, clearText: { color: '#078743', fontSize: 18 }, muted: { color: '#698073', fontSize: 13 }, welcome: { borderWidth: 1, borderColor: '#d9e7da', backgroundColor: '#fff', padding: 21 }, welcomeTitle: { color: '#075b31', fontSize: 23, fontWeight: '700' }, tiles: { flexDirection: 'row', gap: 10, marginVertical: 12 }, tile: { flex: 1, padding: 17, backgroundColor: '#dff5df', borderWidth: 1, borderColor: '#d9e7da' }, tileLabel: { color: '#075b31', fontSize: 16, fontWeight: '700', marginBottom: 5 }, mainApp: { flex: 1, backgroundColor: '#078743' }, mainHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, backgroundColor: '#fff' }, mainLogo: { width: 42, height: 42 }, mainTitle: { color: '#075b31', fontSize: 19, fontWeight: '700' }, profileButton: { padding: 2, borderRadius: 24, backgroundColor: '#e6f6e4' }, profileImage: { width: 42, height: 42, borderRadius: 22 }, mainContent: { flex: 1 }, mainContentInner: { padding: 23, paddingBottom: 100 }, statusTitle: { color: '#fff', fontSize: 30, fontWeight: '700', lineHeight: 35 }, statusIntro: { color: '#dff5df', fontSize: 14, marginTop: 8, marginBottom: 22 }, statusCard: { padding: 18, borderWidth: 1, borderColor: '#b8d3bc', borderRadius: 12, backgroundColor: '#fff' }, cardEyebrow: { color: '#078743', fontSize: 10, fontWeight: '700', letterSpacing: 1 }, statusHeading: { color: '#183225', fontSize: 21, fontWeight: '700', marginTop: 6 }, statusCaption: { color: '#698073', fontSize: 13, lineHeight: 19, marginTop: 5, marginBottom: 20 }, statusStep: { minHeight: 104, flexDirection: 'row', alignItems: 'flex-start', position: 'relative' }, statusDot: { width: 34, height: 34, borderRadius: 18, backgroundColor: '#e4eee4', alignItems: 'center', justifyContent: 'center', zIndex: 1 }, currentStatusDot: { backgroundColor: '#078743' }, statusNumber: { color: '#698073', fontSize: 13, fontWeight: '700' }, statusStepCopy: { flex: 1, marginLeft: 12, paddingBottom: 18 }, statusStepTitle: { color: '#183225', fontSize: 14, fontWeight: '700' }, statusStepState: { color: '#8aa294', fontSize: 11, marginTop: 2 }, statusStepDescription: { color: '#52695b', fontSize: 12, lineHeight: 18, marginTop: 6 }, statusConnector: { position: 'absolute', left: 16, top: 34, bottom: 0, width: 2, backgroundColor: '#d9e7da' }, bottomNav: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', justifyContent: 'space-around', paddingTop: 13, paddingBottom: 8, borderTopWidth: 1, borderTopColor: '#b8d3bc', backgroundColor: '#fff' }, navItem: { alignItems: 'center', minWidth: 49, paddingVertical: 5, borderRadius: 8 }, activeNavItem: { borderTopWidth: 2, borderTopColor: '#078743', backgroundColor: '#dff5df' }, navLabel: { color: '#698073', fontSize: 10, marginTop: 3 }, activeNavText: { color: '#075b31', fontWeight: '700' } });
