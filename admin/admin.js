const find = (selector) => document.querySelector(selector);
const fields = find('#fields');
const editor = find('.editor');
const publish = find('#publish');
const reload = find('#reload');
const signOut = find('#sign-out');
const status = find('#status');
const loginStatus = find('#login-status');
const passwordInput = find('#password');
const passwordVisibility = find('#password-visibility');
const loginSubmit = find('#login-submit');
const draftState = find('#draft-state');
const nav = [...document.querySelectorAll('[data-section]')];
const sections = {
  dashboard: ['Dashboard', 'Overview of the published admission guide.'],
  history: ['Change history', 'Review what was published and when. Newest changes appear first.'],
  campusGuide: ['Campus trivia', 'Edit the campus trivia shown in the applicant guide.'],
  faqItems: ['FAQs', 'Manage the questions, answers and categories in the guide.'],
  statusStepDetails: ['Admission steps', 'Add steps and arrange where they appear in the applicant journey.'],
  programs: ['Programs', 'Manage the program choices shown to applicants.'],
  academicStatuses: ['Academic statuses', 'Set the first choices applicants see, the tracks offered next, and the requirements for each status.'],
  tracks: ['Tracks and strands', 'Manage the academic backgrounds applicants can select.']
};
let section = 'dashboard';
let selectedStep = '';
let selectedStatus = '';
let authorization = '';
let content;
let version;
let availableProgramCount;
let examVenueNames;
let history = [];
let historySection = '';
let historyFrom = '';
let historyTo = '';
let dirty = false;
const alsTrack = 'ALS Passer';

function notify(message = '', error = false) {
  status.textContent = message;
  status.classList.toggle('error', error);
}

function showLoginMessage(message = '') {
  loginStatus.textContent = message;
  loginStatus.hidden = !message;
}

function setPasswordVisible(visible) {
  passwordInput.type = visible ? 'text' : 'password';
  passwordVisibility.textContent = visible ? 'Hide' : 'Show';
  passwordVisibility.setAttribute('aria-label', visible ? 'Hide password' : 'Show password');
}

function markDirty(value = true) {
  dirty = value;
  publish.disabled = !dirty;
  draftState.hidden = !dirty;
}

async function request(method, secret, body) {
  const headers = { Authorization: secret };
  if (method === 'PUT') {
    headers['Content-Type'] = 'application/json';
    headers['If-Match'] = '"' + version + '"';
  }
  const response = await fetch('/api/admin/content', { method, headers, body });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error);
  return result;
}

function field(labelText, value, update, rows = 0) {
  const label = document.createElement('label');
  label.textContent = labelText;
  const control = document.createElement(rows ? 'textarea' : 'input');
  if (rows) control.rows = rows;
  control.value = value;
  control.addEventListener('input', () => {
    update(control.value);
    markDirty();
  });
  label.append(control);
  return label;
}

function listField(label, values, update, rows = 5) {
  return field(label + ' (one per line)', values.join('\n'), (value) => {
    update(value.split('\n').map((item) => item.trim()).filter(Boolean));
  }, rows);
}

function button(label, action, className = '') {
  const control = document.createElement('button');
  control.type = 'button';
  control.textContent = label;
  control.className = className;
  control.addEventListener('click', action);
  return control;
}

function requirementEditor(title, requirements) {
  const group = document.createElement('fieldset');
  group.className = 'requirements-editor';
  const legend = document.createElement('legend');
  legend.textContent = title;
  const list = document.createElement('ol');
  const empty = document.createElement('p');
  empty.textContent = 'No requirements added.';
  const add = button('Add requirement', () => {
    requirements.push('');
    markDirty();
    draw(requirements.length - 1);
  }, 'secondary');

  function draw(focusIndex) {
    list.replaceChildren();
    empty.hidden = requirements.length > 0;
    requirements.forEach((requirement, index) => {
      const row = document.createElement('li');
      const position = index + 1;
      const edit = field('Requirement ' + position, requirement, (value) => {
        requirements[index] = value.trim();
      }, 2);
      const actions = document.createElement('div');
      actions.className = 'actions';

      function moveTo(destination) {
        [requirements[index], requirements[destination]] = [requirements[destination], requirements[index]];
        markDirty();
        draw(destination);
      }

      const up = button('Move up', () => moveTo(index - 1), 'secondary');
      up.disabled = index === 0;
      up.setAttribute('aria-label', 'Move requirement ' + position + ' up');
      const down = button('Move down', () => moveTo(index + 1), 'secondary');
      down.disabled = index === requirements.length - 1;
      down.setAttribute('aria-label', 'Move requirement ' + position + ' down');
      const remove = button('Remove', () => {
        requirements.splice(index, 1);
        markDirty();
        draw(Math.min(index, requirements.length - 1));
      }, 'danger');
      remove.setAttribute('aria-label', 'Remove requirement ' + position);
      actions.append(up, down, remove);
      row.append(edit, actions);
      list.append(row);
    });
    if (focusIndex !== undefined) {
      const target = list.children[focusIndex]?.querySelector('textarea') || add;
      target.focus();
    }
  }

  group.append(legend, empty, list, add);
  draw();
  return group;
}

function editRows(key, labels, titleIndex, noun, openIndex = -1) {
  const rows = content[key];
  rows.forEach((values, index) => {
    const card = document.createElement('details');
    card.open = index === openIndex;
    const summary = document.createElement('summary');
    const updateTitle = () => {
      summary.textContent = values[titleIndex] || 'New ' + noun;
    };
    updateTitle();
    const editable = document.createElement('div');
    editable.className = 'stack';
    const isTrack = key === 'tracks';
    const isFaq = key === 'faqItems';
    const isAls = isTrack && values[0] === alsTrack;
    labels.forEach((label, column) => {
      if (isAls && column === 0) return;
      editable.append(field(label, values[column], (value) => {
        values[column] = value.trim();
        updateTitle();
      }, label.endsWith('answer') || label === 'Description' ? 3 : 0));
    });
    if (isTrack) editable.append(assignmentChoices('Eligible programs', content.programs, values[2]));
    if (isFaq) {
      const translation = [...(content.faqTranslations[index] || ['', ''])];
      const updateTranslation = (column, value) => {
        translation[column] = value.trim();
        content.faqTranslations[index] = translation.some(Boolean) ? translation : null;
      };
      editable.append(
        field('Tagalog question (optional)', translation[0], (value) => updateTranslation(0, value)),
        field('Tagalog answer (optional)', translation[1], (value) => updateTranslation(1, value), 3)
      );
    }
    if (!isAls) {
      editable.append(button('Remove ' + noun, () => {
        rows.splice(index, 1);
        if (isFaq) content.faqTranslations.splice(index, 1);
        markDirty();
        render();
      }, 'danger'));
    }
    card.append(summary, editable);
    fields.append(card);
  });
  fields.append(button('Add ' + noun, () => {
    rows.push(key === 'tracks' ? ['', '', []] : labels.map(() => ''));
    if (key === 'faqItems') content.faqTranslations.push(null);
    markDirty();
    render(rows.length - 1);
    fields.querySelector('details[open] input')?.focus();
  }, 'secondary'));
}

function assignmentChoices(title, choices, assignments) {
  const group = document.createElement('fieldset');
  group.className = 'program-assignments';
  const legend = document.createElement('legend');
  legend.textContent = title;
  group.append(legend);
  for (const choice of choices) {
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = assignments.includes(choice);
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) assignments.push(choice);
      else assignments.splice(assignments.indexOf(choice), 1);
      markDirty();
    });
    label.append(checkbox, choice);
    group.append(label);
  }
  return group;
}

function toggleField(text, checked, onChange) {
  const label = document.createElement('label');
  label.className = 'toggle';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = checked;
  input.addEventListener('change', () => {
    onChange(input.checked);
    markDirty();
  });
  label.append(input, text);
  return label;
}

function reapplicationTrackSettings() {
  const section = document.createElement('div');
  section.className = 'stack';
  const label = document.createElement('label');
  label.textContent = 'Tracks and strands allowed to reapply';
  const select = document.createElement('select');
  select.replaceChildren(
    new Option('Follow regular track eligibility', 'regular'),
    new Option('Open to all tracks and strands', 'all'),
    new Option('Open only to selected tracks and strands', 'selected')
  );
  select.value = Array.isArray(content.reapplicationTracks) ? 'selected' : content.reapplicationTracks ?? 'regular';
  label.append(select);
  const choices = document.createElement('div');
  function drawChoices() {
    choices.replaceChildren();
    if (Array.isArray(content.reapplicationTracks)) {
      choices.append(assignmentChoices('Allowed tracks and strands', content.tracks.map(([name]) => name), content.reapplicationTracks));
    }
  }
  select.addEventListener('change', () => {
    content.reapplicationTracks = select.value === 'selected' ? [] : select.value === 'all' ? 'all' : null;
    drawChoices();
    markDirty();
  });
  drawChoices();
  const explanation = document.createElement('p');
  explanation.textContent = 'All and selected tracks can access the reapplication program list even if a program falls outside their regular track eligibility.';
  section.append(label, choices, explanation);
  return section;
}

function editAcademicStatuses() {
  const statuses = content.academicStatuses;
  const status = statuses.find(({ id }) => id === selectedStatus) || statuses[0];
  selectedStatus = status.id;
  const picker = document.createElement('label');
  picker.textContent = 'Academic status';
  const select = document.createElement('select');
  select.replaceChildren(...statuses.map(({ id, label }) => new Option(label || 'New academic status', id)));
  select.value = selectedStatus;
  select.addEventListener('change', () => {
    selectedStatus = select.value;
    render();
    fields.querySelector('select').focus();
  });
  picker.append(select);
  const settings = document.createElement('div');
  settings.className = 'panel stack';
  const tracks = content.tracks.map(([name]) => name);
  const trackOptions = document.createElement('div');
  function updateTrackOptions() {
    trackOptions.replaceChildren();
    if (status.tracks !== null) trackOptions.append(assignmentChoices('Tracks offered next', tracks, status.tracks));
  }
  updateTrackOptions();
  settings.append(
    field('Name', status.label, (value) => {
      status.label = value.trim();
      select.selectedOptions[0].textContent = status.label || 'New academic status';
    }),
    field('Description', status.description, (value) => { status.description = value.trim(); }, 3),
    toggleField('Offer all standard tracks and strands', status.tracks === null, (checked) => {
      status.tracks = checked ? null : tracks.filter((name) => name !== alsTrack);
      updateTrackOptions();
    }),
    trackOptions
  );
  const heading = document.createElement('h2');
  heading.textContent = 'Requirements by admission step';
  settings.append(heading);
  for (const key of content.admissionStepOrder) {
    const step = content.statusStepDetails[key];
    const checklist = document.createElement('div');
    function updateChecklist() {
      checklist.replaceChildren();
      if (Object.hasOwn(status.requirements, key)) {
        checklist.append(requirementEditor(step.title + ' requirements', status.requirements[key]));
      }
    }
    updateChecklist();
    settings.append(toggleField('Customize ' + step.title + ' requirements', Object.hasOwn(status.requirements, key), (checked) => {
      if (checked) status.requirements[key] = [...step.requirements];
      else delete status.requirements[key];
      updateChecklist();
    }), checklist);
  }
  const actions = document.createElement('div');
  actions.className = 'actions';
  const add = button('Add academic status', () => {
    const id = crypto.randomUUID();
    statuses.push({ id, label: '', description: '', tracks: null, requirements: {} });
    selectedStatus = id;
    markDirty();
    render();
    fields.querySelector('input').focus();
  }, 'secondary');
  const remove = button('Delete academic status', () => {
    if (statuses.length <= 1) return;
    const label = status.label || 'New academic status';
    if (!window.confirm(`Delete “${label}”? It will be removed from applicant choices when you publish.`)) return;
    const index = statuses.indexOf(status);
    statuses.splice(index, 1);
    selectedStatus = statuses[Math.min(index, statuses.length - 1)].id;
    markDirty();
    render();
    fields.querySelector('select').focus();
    notify('Academic status removed from the draft. Publish changes to apply.');
  }, 'danger');
  remove.disabled = statuses.length <= 1;
  actions.append(add, remove);
  fields.append(picker, actions);
  if (remove.disabled) {
    const note = document.createElement('p');
    note.textContent = 'Keep at least one academic status available to applicants.';
    fields.append(note);
  }
  fields.append(settings);
}

function editExamVenue() {
  const settings = content.examVenue;
  const panel = document.createElement('section');
  panel.className = 'panel stack';
  const title = document.createElement('h2');
  title.textContent = 'Examination venue';
  const label = document.createElement('label');
  label.textContent = 'Venue shown to applicants';
  const select = document.createElement('select');
  select.replaceChildren(...Object.entries(examVenueNames).map(([id, name]) => new Option(name, id)));
  select.value = settings.selected;
  label.append(select);
  select.addEventListener('change', () => {
    settings.selected = select.value;
    markDirty();
  });
  panel.append(title, label);
  return panel;
}

function editSteps() {
  const order = content.admissionStepOrder;
  if (!order.includes(selectedStep)) selectedStep = order[0];
  const chooserLabel = document.createElement('label');
  chooserLabel.textContent = 'Admission step';
  const chooser = document.createElement('select');
  chooser.replaceChildren(...order.map((key, index) => new Option(
    (index + 1) + '. ' + (content.statusStepDetails[key].title || 'New admission step'), key
  )));
  chooser.value = selectedStep;
  const addStep = button('Add admission step', () => {
    const key = 'step-' + crypto.randomUUID();
    content.statusStepDetails[key] = { title: '', description: '', instructions: [], requirements: [] };
    order.push(key);
    selectedStep = key;
    markDirty();
    render();
    fields.querySelector('input').focus();
  }, 'secondary');
  const panel = document.createElement('div');
  panel.className = 'panel stack';
  function editSelected() {
    const step = content.statusStepDetails[selectedStep];
    const position = order.indexOf(selectedStep);
    panel.replaceChildren(
      field('Displayed title', step.title, (value) => {
        step.title = value.trim();
        chooser.selectedOptions[0].textContent = (position + 1) + '. ' + (step.title || 'New admission step');
      }),
      field('Summary', step.description, (value) => { step.description = value.trim(); }, 3),
      listField('Instructions', step.instructions, (value) => { step.instructions = value; }),
      requirementEditor('Requirements and documents', step.requirements),
      ...(selectedStep === 'Admission Examination' ? [] : [
        field('Location (optional)', step.location || '', (value) => { step.location = value.trim(); })
      ]),
      listField('Additional details', step.details || [], (value) => { step.details = value; }, 3)
    );
    if (selectedStep === 'Admission Examination') {
      panel.prepend(editExamVenue());
      const settings = document.createElement('div');
      settings.className = 'stack';
      const title = document.createElement('h2');
      title.textContent = 'Programs for reapplication';
      const explanation = document.createElement('p');
      explanation.textContent = 'Choose which programs to offer after a failed exam. The applicant’s original program is always excluded.';
      const options = document.createElement('div');
      function renderOptions() {
        options.replaceChildren();
        if (content.reapplicationPrograms != null) {
          options.append(assignmentChoices('Allowed reapplication programs', content.programs, content.reapplicationPrograms));
        }
      }
      const limit = toggleField('Limit reapplication to selected programs', content.reapplicationPrograms != null, (checked) => {
        content.reapplicationPrograms = checked ? [] : null;
        renderOptions();
      });
      renderOptions();
      settings.append(title, explanation, limit, options, reapplicationTrackSettings());
      panel.append(settings);
    }
    if (selectedStep.startsWith('step-')) {
      function moveStep(destination) {
        [order[position], order[destination]] = [order[destination], order[position]];
        markDirty();
        render();
        fields.querySelector('select').focus();
      }
      const actions = document.createElement('div');
      actions.className = 'actions';
      const up = button('Move step earlier', () => moveStep(position - 1), 'secondary');
      up.disabled = position === 0;
      const down = button('Move step later', () => moveStep(position + 1), 'secondary');
      down.disabled = position === order.length - 1;
      const remove = button('Delete step', () => {
        if (!window.confirm(`Delete “${step.title || 'New admission step'}”? This also removes its academic status checklists when you publish.`)) return;
        order.splice(position, 1);
        delete content.statusStepDetails[selectedStep];
        for (const status of content.academicStatuses) delete status.requirements[selectedStep];
        selectedStep = order[Math.min(position, order.length - 1)];
        markDirty();
        render();
        fields.querySelector('select').focus();
      }, 'danger');
      actions.append(up, down, remove);
      panel.prepend(actions);
    }
  }
  chooser.addEventListener('change', () => {
    selectedStep = chooser.value;
    editSelected();
  });
  chooserLabel.append(chooser);
  fields.append(chooserLabel, addStep, panel);
  editSelected();
}

function openSection(key) {
  if (section === key) return;
  section = key;
  render();
  editor.scrollTop = 0;
  find('#section-title').focus({ preventScroll: true });
}

function renderDashboard() {
  const card = document.createElement('section');
  card.className = 'dashboard-programs';
  const title = document.createElement('h2');
  title.textContent = 'Programs open to applicants';
  const count = document.createElement('p');
  count.className = 'dashboard-count';
  count.textContent = availableProgramCount.toLocaleString();
  const detail = document.createElement('p');
  detail.textContent = 'Each program is counted once across all published academic statuses, tracks and strands.';
  card.append(title, count, detail);

  const shortcuts = document.createElement('div');
  shortcuts.className = 'dashboard-shortcuts';
  const shortcutTitle = document.createElement('h2');
  shortcutTitle.textContent = 'Quick actions';
  shortcuts.append(
    button('Manage academic statuses', () => openSection('academicStatuses'), 'secondary'),
    button('Edit track eligibility', () => openSection('tracks'), 'secondary'),
    button('Manage programs', () => openSection('programs'), 'secondary'),
    button('View change history', () => openSection('history'), 'secondary')
  );
  fields.append(card, shortcutTitle, shortcuts);
}

function renderHistory() {
  if (!history.length) {
    const empty = document.createElement('p');
    empty.className = 'panel';
    empty.textContent = 'No published changes have been recorded yet.';
    fields.append(empty);
    return;
  }
  const availableSections = [...new Set(history.flatMap(({ groups }) => groups.map(({ section }) => section)))].sort((a, b) => a.localeCompare(b));
  if (!availableSections.includes(historySection)) historySection = '';
  const filters = document.createElement('div');
  filters.className = 'history-filters';
  const filterLabel = document.createElement('label');
  filterLabel.textContent = 'Filter by section';
  const filter = document.createElement('select');
  filter.replaceChildren(new Option('All sections', ''), ...availableSections.map((section) => new Option(section, section)));
  filter.value = historySection;
  filterLabel.append(filter);
  const from = historyDateField('From date', historyFrom);
  const to = historyDateField('To date', historyTo);
  const feedback = document.createElement('p');
  feedback.setAttribute('role', 'status');
  const entries = document.createElement('div');
  entries.className = 'fields';
  const timeZone = 'Asia/Manila';
  const formatDate = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone });
  const formatDay = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone });
  const datedHistory = history.map((entry) => {
    const date = new Date(entry.publishedAt);
    const parts = Object.fromEntries(formatDay.formatToParts(date).map(({ type, value }) => [type, value]));
    return { ...entry, date, day: parts.year + '-' + parts.month + '-' + parts.day };
  });

  function applyFilters() {
    historySection = filter.value;
    historyFrom = from.input.value;
    historyTo = to.input.value;
    entries.replaceChildren();
    const invalid = historyFrom && historyTo && historyFrom > historyTo;
    if (invalid) {
      feedback.hidden = false;
      feedback.textContent = 'From date must be on or before To date.';
      return;
    }
    const matching = datedHistory.flatMap((entry) => {
      if ((historyFrom && entry.day < historyFrom) || (historyTo && entry.day > historyTo)) return [];
      const groups = historySection ? entry.groups.filter(({ section }) => section === historySection) : entry.groups;
      return groups.length ? [{ ...entry, groups }] : [];
    });
    feedback.hidden = matching.length > 0;
    feedback.textContent = matching.length ? '' : 'No publishes match these filters.';
    renderHistoryEntries(entries, matching, formatDate);
  }

  for (const control of [filter, from.input, to.input]) control.addEventListener('change', applyFilters);
  const clearDates = button('Clear dates', () => {
    from.input.value = '';
    to.input.value = '';
    applyFilters();
  }, 'secondary');
  filters.append(filterLabel, from.label, to.label, clearDates);
  fields.append(filters, feedback, entries);
  applyFilters();
}

function historyDateField(title, value) {
  const label = document.createElement('label');
  label.textContent = title;
  const input = document.createElement('input');
  input.type = 'date';
  input.value = value;
  label.append(input);
  return { label, input };
}

function renderHistoryEntries(container, matchingHistory, formatDate) {
  matchingHistory.forEach(({ publishedAt, date, groups }, index) => {
    const entry = document.createElement('details');
    entry.className = 'history-entry';
    entry.open = index === 0;
    const summary = document.createElement('summary');
    const time = document.createElement('time');
    time.dateTime = publishedAt;
    time.textContent = formatDate.format(date);
    summary.append(time);
    const sections = document.createElement('span');
    sections.textContent = groups.map(({ section }) => section).join(' · ');
    summary.append(sections);
    entry.append(summary);
    for (const { section, changes } of groups) {
      const title = document.createElement('h2');
      title.textContent = section;
      const list = document.createElement('ul');
      for (const change of changes) {
        const row = document.createElement('li');
        row.textContent = change;
        list.append(row);
      }
      entry.append(title, list);
    }
    container.append(entry);
  });
}

function editCampusGuide() {
  const trivia = document.createElement('section');
  trivia.className = 'panel stack';
  trivia.append(listField('Campus trivia facts', content.faqTrivia, (value) => { content.faqTrivia = value; }, 8));
  fields.append(trivia);
}

function render(openIndex) {
  const [title, description] = sections[section];
  find('#section-title').textContent = title;
  find('#section-description').textContent = description;
  nav.forEach((item) => item.setAttribute('aria-current', String(item.dataset.section === section)));
  fields.replaceChildren();
  if (section === 'dashboard') renderDashboard();
  if (section === 'history') renderHistory();
  if (section === 'campusGuide') editCampusGuide();
  if (section === 'faqItems') editRows(section, ['Category', 'English question', 'English answer'], 1, 'FAQ', openIndex);
  if (section === 'tracks') editRows(section, ['Name', 'Description'], 0, 'track or strand', openIndex);
  if (section === 'academicStatuses') editAcademicStatuses();
  if (section === 'statusStepDetails') editSteps();
  if (section === 'programs') {
    const panel = document.createElement('div');
    panel.className = 'panel stack';
    panel.append(
      listField('Program names', content.programs, (value) => { content.programs = value; }, 14),
      listField('Interview program keywords', content.exceptionProgramKeywords, (value) => { content.exceptionProgramKeywords = value; }),
    );
    const hint = document.createElement('p');
    hint.textContent = 'The Interview step appears when a program name contains one of these keywords.';
    const assignmentsHint = document.createElement('p');
    assignmentsHint.textContent = 'Assign new or renamed programs under Tracks and strands. Publishing removes assignments to programs deleted from this catalog.';
    panel.append(hint, assignmentsHint);
    fields.append(panel);
  }
}

async function load(secret) {
  ({ content, version, availableProgramCount, history, examVenueNames } = await request('GET', secret));
  content.faqTranslations ??= content.faqItems.map(() => null);
  markDirty(false);
  render();
}

nav.forEach((item) => item.addEventListener('click', () => openSection(item.dataset.section)));

passwordVisibility.addEventListener('click', () => setPasswordVisible(passwordInput.type === 'password'));

find('#login-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (loginSubmit.disabled) return;
  const username = find('#username').value.trim();
  loginSubmit.disabled = true;
  loginSubmit.textContent = 'Signing in…';
  showLoginMessage();
  try {
    const credentials = new TextEncoder().encode(username + ':' + passwordInput.value);
    const encoded = 'Basic ' + btoa(String.fromCharCode(...credentials));
    await load(encoded);
    authorization = encoded;
    passwordInput.value = '';
    setPasswordVisible(false);
    find('#login').hidden = true;
    find('#workspace').hidden = false;
    signOut.hidden = false;
    notify();
    find('#section-title').focus({ preventScroll: true });
  } catch (error) {
    showLoginMessage(error instanceof TypeError ? 'Could not reach the admin server. Try again.' : error.message);
  } finally {
    loginSubmit.disabled = false;
    loginSubmit.textContent = 'Sign in';
  }
});

function busy(value) {
  fields.inert = value;
  nav.forEach((item) => { item.disabled = value; });
  publish.disabled = value || !dirty;
  reload.disabled = value;
  signOut.disabled = value;
}

publish.addEventListener('click', async () => {
  if (!window.confirm('Publish all pending changes? Applicants will receive the updated guide the next time they open it or check for content updates.')) return;
  busy(true);
  notify('Publishing…');
  try {
    const catalog = new Set(content.programs);
    const publication = {
      ...content,
      tracks: content.tracks.map(([name, description, programs]) => [
        name, description, programs.filter((program) => catalog.has(program))
      ]),
      reapplicationPrograms: content.reapplicationPrograms?.filter((program) => catalog.has(program)) ?? null
    };
    const result = await request('PUT', authorization, JSON.stringify(publication));
    ({ version, availableProgramCount, history } = result);
    content = publication;
    render();
    markDirty(false);
    notify(result.changed ? 'Published. Applicants receive these updates when they next open the guide.' : 'The published guide is already up to date.');
  } catch (error) {
    notify(error.message, true);
  } finally {
    busy(false);
  }
});

reload.addEventListener('click', async () => {
  if (dirty && !window.confirm('Discard your unpublished changes and reload?')) return;
  busy(true);
  try {
    await load(authorization);
    notify('Loaded the latest published content.');
  } catch (error) {
    notify(error.message, true);
  } finally {
    busy(false);
  }
});

signOut.addEventListener('click', () => {
  if (dirty && !window.confirm('Discard your unpublished changes and sign out?')) return;
  authorization = '';
  content = undefined;
  version = undefined;
  availableProgramCount = undefined;
  history = [];
  historySection = '';
  historyFrom = '';
  historyTo = '';
  section = 'dashboard';
  markDirty(false);
  fields.replaceChildren();
  find('#workspace').hidden = true;
  signOut.hidden = true;
  find('#login').hidden = false;
  notify();
  find('#username').focus();
});

window.addEventListener('beforeunload', (event) => {
  if (dirty) event.preventDefault();
});
