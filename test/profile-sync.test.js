const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'ExpoApp.js'), 'utf8')
  .replace(/\r\n/g, '\n');

const hasProgramSync = /useEffect\(\(\) => \{\s*setActiveProgram\(program\);\s*\}, \[program\]\);/.test(source);
const hasGuestInterviewStepSelection = /const selectedProgramForSteps = guestMode \? guestProgram : activeProgram;\s*const hasInterview = exceptionProgramKeywords\.some\(\(keyword\) => String\(selectedProgramForSteps \|\| ''\)\.toLowerCase\(\)\.includes\(keyword\.toLowerCase\(\)\)\);\s*const steps = hasInterview \? exceptionStatusSteps : defaultStatusSteps;/.test(source);
const hasGuestSetupFixedActionRow = source.includes('<View style={guestSetupStyles.actions}>')
  && source.includes("borderTopWidth: 1, borderTopColor: '#d8e2d9'");
const hasGuestProfileEditRestart = /setGuestSetupStep\(1\);\s*setGuestSetupIsEditing\(true\);/.test(source);

if (!hasProgramSync || !hasGuestInterviewStepSelection || !hasGuestSetupFixedActionRow || !hasGuestProfileEditRestart) {
  console.error('Missing guest profile edit flow behavior', { hasProgramSync, hasGuestInterviewStepSelection, hasGuestSetupFixedActionRow, hasGuestProfileEditRestart });
  process.exit(1);
}

console.log('PASS: guest profile editing restarts at step one with a fixed action row');
