const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const React = require('react');
const babel = require('@babel/core');

// Load real internal components without changing the application's public API.
// Native services are stubbed; hook state is retained across explicit rerenders.
const filename = path.resolve(__dirname, '../src/ExpoApp.js');
const exported = 'Option, Action, RequirementChecklist, getStatusStepDetails, documentaryExamples, JourneyPage, FAQPage, faqItems, percentToPoint, markerPoint, GateMarkers, MapMarkers, defaultStatusSteps';
const compiled = babel.transformSync(fs.readFileSync(filename, 'utf8') + `\nexport { ${exported} };`, {
  filename, babelrc: false, configFile: false,
  plugins: [['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }], '@babel/plugin-transform-modules-commonjs'],
}).code;
let state = [], cursor = 0;
const app = new Module(filename, module);
app.filename = filename;
app.paths = Module._nodeModulePaths(path.dirname(filename));
app.require = id => {
  if (id === 'react') return { ...React,
    useState(initial) {
      const index = cursor++;
      if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial;
      return [state[index], value => { state[index] = typeof value === 'function' ? value(state[index]) : value; }];
    },
    useEffect() {}, useRef: value => ({ current: value }),
  };
  if (id === 'react-native') return require('react-native-web');
  if (id.startsWith('../assets/')) return { uri: '/test-asset.png', width: 100, height: 100 };
  if (id === '@expo/vector-icons/Ionicons') return () => null;
  if (id.startsWith('expo-') || id.startsWith('@react-native-') || id === 'react-native-gesture-handler') return {};
  return require(id);
};
app._compile(compiled, filename);
const api = app.exports;
function render(component, props = {}) { cursor = 0; return component(props); }
function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return React.isValidElement(tree) ? [tree, ...nodes(tree.props.children)] : [];
}
function text(tree) {
  if (Array.isArray(tree)) return tree.map(text).join('');
  if (React.isValidElement(tree)) return text(tree.props.children);
  return typeof tree === 'string' || typeof tree === 'number' ? String(tree) : '';
}
const label = (tree, value) => nodes(tree).find(n => n.props.accessibilityLabel === value);
const buttons = tree => nodes(tree).filter(n => n.props.accessibilityState?.expanded !== undefined);

test('APM-U01: applicant option exposes its selected state', () => {
  assert.equal(api.Option({ label: 'Grade 12', selected: true }).props.accessibilityState.checked, true);
  assert.equal(api.Option({ label: 'Grade 12', selected: false }).props.accessibilityState.checked, false);
});
test('APM-U02: choosing an academic option invokes the supplied handler once', () => {
  let calls = 0;
  api.Option({ label: 'STEM', onPress: () => calls++ }).props.onPress();
  assert.equal(calls, 1);
});
test('APM-U03: Continue reflects required-selection validation', () => {
  assert.equal(api.Action({ disabled: true }).props.disabled, true);
  assert.equal(api.Action({ disabled: false }).props.disabled, false);
});
for (const [profile, expected] of [['12', /Grade 11 Report Card/], ['SH', /Non-Issuance/], ['A', /Certificate of Rating/]]) {
  test(`ART-U-${profile}: document requirements match applicant category`, () => {
    assert.match(api.getStatusStepDetails('Online Application', profile).requirements.join(' '), expected);
  });
}
test('ART-U04: missing applicant category requests a selection', () => {
  assert.match(api.getStatusStepDetails('Online Application', '').requirements.join(' '), /Select your applicant type/);
});
test('ART-U05: checklist toggles the requested document index', () => {
  let selected;
  const tree = render(api.RequirementChecklist, { items: ['Document A', 'Document B'], checked: [0], onToggle: index => { selected = index; } });
  const checks = nodes(tree).filter(n => n.props.accessibilityRole === 'checkbox');
  assert.deepEqual(checks.map(n => n.props.accessibilityState.checked), [true, false]);
  checks[1].props.onPress();
  assert.equal(selected, 1);
  assert.match(text(tree), /1 \/ 2 ready/);
});
test('ART-U06: completed checklist offers deselect all', () => {
  let calls = 0;
  const tree = render(api.RequirementChecklist, { items: ['A'], checked: [0], onToggleAll: () => calls++ });
  label(tree, 'Deselect all requirements').props.onPress();
  assert.equal(calls, 1);
});
test('ART-U07: read-only checklist disables document controls', () => {
  const tree = render(api.RequirementChecklist, { items: ['A'], checked: [], disabled: true });
  assert.equal(nodes(tree).find(n => n.props.accessibilityRole === 'checkbox').props.disabled, true);
  assert.equal(label(tree, 'Select all requirements'), undefined);
});
test('ART-U08: supplied document examples expand from their matching requirements', () => {
  const matchingRequirements = [
    ['Chest X-ray result taken within the last 3 to 6 months', 'Roentgenological Report'],
    ['Official Medical Clearance issued by CvSU Health Services Unit', 'Medical Clearance'],
    ['Complete Blood Count result', 'Hematology Report'],
    ['Printed Test Permit or Examination Permit', 'Exam Permit'],
    ['Original Certificate of Good Moral Character', 'Good Moral'],
    ['Original Form 138 or Senior High School Report Card', 'Report Card'],
    ['Certificate from the Principal or Adviser confirming current Grade 12 enrollment', 'Certificate of Enrollment'],
    ['Original PSA Birth Certificate', 'Birth Certificate']
  ];
  assert.equal(api.documentaryExamples.length, matchingRequirements.length);
  for (const [requirement, title] of matchingRequirements) {
    state = [];
    let tree = render(api.RequirementChecklist, { items: [requirement], checked: [] });
    const exampleButton = label(tree, `View example: ${title}`);
    assert.ok(exampleButton, `${title} example should be available for its requirement`);
    exampleButton.props.onPress();
    tree = render(api.RequirementChecklist, { items: [requirement], checked: [] });
    assert.ok(label(tree, `Hide example: ${title}`));
    assert.ok(nodes(tree).some(node => node.props.accessibilityLabel === `Example document: ${title}`));
    assert.match(text(tree), /Check the official admission instructions/);
  }
});
const journey = overrides => render(api.JourneyPage, {
  displayName: 'Test Applicant', steps: api.defaultStatusSteps,
  currentStatusIndex: 0, examinationAttempt: 'initial', onOpenStep() {}, ...overrides,
});
test('ARM-U01: roadmap distinguishes completed, current, and locked stages', () => {
  const tree = journey({ currentStatusIndex: 1 });
  assert.ok(label(tree, 'Online Application, Mission complete'));
  assert.ok(label(tree, 'Validation Appointment, Open mission'));
  assert.ok(label(tree, 'Admission Examination, Locked'));
});
test('ARM-U02: selecting a station passes the correct stage index', () => {
  let selected;
  const tree = journey({ onOpenStep: index => { selected = index; } });
  label(tree, 'Online Application, Open mission').props.onPress();
  assert.equal(selected, 0);
});
test('ARM-U03: completed roadmap reports full progress', () => {
  const tree = journey({ currentStatusIndex: 5 });
  assert.match(text(tree), /100%/);
  assert.match(text(tree), /WELCOME TO CvSU/);
  assert.equal(nodes(tree).find(n => n.props.accessibilityRole === 'progressbar').props.accessibilityValue.now, 5);
});
test('ARM-U04: stopped examination is identified as trail ended', () => {
  assert.ok(label(journey({ currentStatusIndex: 2, examinationAttempt: 'stopped' }), 'Admission Examination, Trail ended'));
});
test('VCN-U01: percentage coordinates scale to viewport dimensions', () => {
  assert.deepEqual(api.percentToPoint({ x: 25, y: 75 }, { width: 400, height: 600 }), { x: 100, y: 450 });
  assert.deepEqual(api.percentToPoint({ x: 0, y: 100 }, { width: 400, height: 600 }), { x: 0, y: 600 });
});
test('VCN-U02: marker position converts percentage strings', () => {
  assert.deepEqual(api.markerPoint({ left: '12.5%', top: '50%' }, { width: 400, height: 600 }), { left: 50, top: 300 });
});
for (const [component, prefix] of [[api.GateMarkers, 'Gate'], [api.MapMarkers, 'location']]) {
  test(`VCN-U-${prefix}: marker selection maps display numbers to array indices`, () => {
    const selections = [];
    const tree = component({ selectedNumber: 1, mapSize: { width: 400, height: 600 }, onSelect: index => selections.push(index) });
    for (let i = 1; i <= 3; i++) label(tree, `Show ${prefix} ${i}`).props.onPress();
    assert.deepEqual(selections, [0, 1, 2]);
  });
}
test('FAQ-U01: search ignores case and surrounding whitespace', () => {
  state = [];
  let tree = render(api.FAQPage);
  nodes(tree).find(n => n.props.onChangeText).props.onChangeText('  APPLICATION  ');
  tree = render(api.FAQPage);
  const expected = api.faqItems.filter(([, q, a]) => `${q} ${a}`.toLowerCase().includes('application'));
  assert.equal(buttons(tree).length, expected.length);
  assert.ok(expected.length > 0);
  for (const [, question] of expected) assert.ok(text(tree).includes(question));
});
test('FAQ-U02: unmatched search and clear restore the FAQ list', () => {
  state = [];
  let tree = render(api.FAQPage);
  nodes(tree).find(n => n.props.onChangeText).props.onChangeText('ZZZ999');
  tree = render(api.FAQPage);
  assert.equal(buttons(tree).length, 0);
  assert.match(text(tree), /No answers found/);
  label(tree, 'Clear FAQ search').props.onPress();
  assert.equal(buttons(render(api.FAQPage)).length, api.faqItems.length);
});
test('FAQ-U03: category filter returns only matching questions', () => {
  state = [];
  const tree = render(api.FAQPage);
  nodes(tree).find(n => n.props.onPress && text(n) === 'Medical').props.onPress();
  const filtered = render(api.FAQPage);
  const expected = api.faqItems.filter(([category]) => category === 'Medical');
  assert.equal(buttons(filtered).length, expected.length);
  assert.ok(expected.length > 0);
  for (const [, question] of expected) assert.ok(text(filtered).includes(question));
});
test('FAQ-U04: question opens and closes its answer', () => {
  state = [];
  buttons(render(api.FAQPage))[0].props.onPress();
  let tree = render(api.FAQPage);
  assert.equal(buttons(tree)[0].props.accessibilityState.expanded, true);
  assert.ok(text(tree).includes(api.faqItems[0][2]));
  buttons(tree)[0].props.onPress();
  assert.equal(buttons(render(api.FAQPage))[0].props.accessibilityState.expanded, false);
});
