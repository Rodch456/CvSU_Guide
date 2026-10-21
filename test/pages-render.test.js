const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const babel = require('@babel/core');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

// Render the actual page components against React Native Web, including Animated.
const filename = path.resolve(__dirname, '../src/ExpoApp.js');
const source = fs.readFileSync(filename, 'utf8') + '\nexport { FAQPage, JourneyPage, StatusPage };';
const compiled = babel.transformSync(source, {
  filename,
  babelrc: false,
  configFile: false,
  plugins: [['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }], '@babel/plugin-transform-modules-commonjs'],
}).code;
const app = new Module(filename, module);
app.filename = filename;
app.paths = Module._nodeModulePaths(path.dirname(filename));
let hookState = null;
let hookIndex = 0;
app.require = (id) => {
  if (id === 'react') return {
    ...React,
    useState(initial) {
      if (!hookState) return React.useState(initial);
      const index = hookIndex++;
      if (!(index in hookState)) hookState[index] = initial;
      return [hookState[index], value => { hookState[index] = value; }];
    },
    useEffect(...args) { if (!hookState) return React.useEffect(...args); },
  };
  if (id === 'react-native') return require('react-native-web');
  if (id.startsWith('../assets/')) return { uri: '/test-asset.png', width: 100, height: 100 };
  if (id === '@expo/vector-icons/Ionicons') return () => null;
  if (id === 'react-native-gesture-handler') return {};
  if (id.startsWith('expo-') || id.startsWith('@react-native-')) return {};
  return require(id);
};
app._compile(compiled, filename);
const { FAQPage, JourneyPage } = app.exports;
const faq = renderToStaticMarkup(React.createElement(FAQPage));
assert.match(faq, /Frequently Asked Questions/);
assert.match(faq, /Find your answer/);
console.log('PASS: FAQ renders questions and animated guide');
const steps = ['Online Application', 'Validation Appointment', 'Admission Examination', 'Medical Examination', 'Enrollment'];
for (const [currentStatusIndex, examinationAttempt] of [[0, 'initial'], [2, 'initial'], [2, 'stopped'], [5, 'initial']]) {
  const journey = renderToStaticMarkup(React.createElement(JourneyPage, {
    displayName: 'Test Applicant', steps, currentStatusIndex, examinationAttempt, onOpenStep() {},
  }));
  assert.match(journey, /CvSU Journey for/);
  assert.match(journey, /Admission Journey/);
  console.log(`PASS: Journey renders at step ${currentStatusIndex}, ${examinationAttempt}`);
}

// Inspect the modal's actual child tree through the unchecked/review/confirm flow.
// Hook state is retained between direct renders; effects need no native host.
hookState = [];
let status = 4, selection = 4, checks = {};
function renderStatus() {
  hookIndex = 0;
  return app.exports.StatusPage({
    displayName: 'Test Applicant', profile: 'SH', program: 'Computer Science', track: 'STEM',
    steps, currentStatusIndex: status, selectedStepIndex: selection, checkedRequirements: checks,
    examinationAttempt: 'initial', onStatusChange: value => { status = value; },
    onSelectStep: value => { selection = value; },
    onRequirementsChange: update => { checks = update(checks); },
  });
}
function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!React.isValidElement(tree)) return [];
  return [tree, ...nodes(tree.props.children)];
}
function text(tree) {
  if (Array.isArray(tree)) return tree.map(text).join('');
  if (React.isValidElement(tree)) return text(tree.props.children);
  return typeof tree === 'string' ? tree : '';
}
function button(tree, label) {
  return nodes(tree).find(node => node.props.onPress && text(node) === label);
}
let tree = renderStatus();
button(tree, 'Mark as completed').props.onPress();
tree = renderStatus();
assert.match(text(tree), /Requirements still unchecked/);
assert.ok(!nodes(tree).some(node => node.type.name === 'RequirementChecklist'));
assert.ok(!nodes(tree).some(node => node.type.name === 'StepDetailsHandle'));
assert.equal(status, 4);
button(tree, 'Review requirements').props.onPress();
tree = renderStatus();
assert.ok(nodes(tree).some(node => node.type.name === 'RequirementChecklist'));
assert.doesNotMatch(text(tree), /Requirements still unchecked/);
button(tree, 'Mark as completed').props.onPress();
tree = renderStatus();
const modal = nodes(tree).find(node => node.props.visible === true && node.props.onRequestClose);
modal.props.onRequestClose();
tree = renderStatus();
assert.ok(nodes(tree).some(node => node.type.name === 'RequirementChecklist'));
assert.equal(selection, 4);
button(tree, 'Mark as completed').props.onPress();
tree = renderStatus();
button(tree, 'All requirements are done — complete step').props.onPress();
assert.equal(status, 5);
assert.equal(selection, null);
assert.equal(checks.Enrollment.length, 7);
console.log('PASS: warning replaces checklist; review and Android Back restore it; confirmation completes step');
