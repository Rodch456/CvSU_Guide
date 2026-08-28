const content = document.querySelector('#app-content');
const stepNumber = document.querySelector('#step-number');
const dots = [...document.querySelectorAll('[data-step-dot]')];

const answers = { profile: '', track: '', program: '' };
let currentStep = 1;

const tracks = ['STEM', 'ABM', 'HUMSS', 'GAS', 'TVL', 'Arts and Design', 'Sports'];
const programCatalog = [
  { college: 'CAFENR · Agriculture, Food, Environment and Natural Resources', department: 'Animal Science', programs: ['Bachelor of Science in Agriculture — Animal Science'] },
  { college: 'CAFENR · Agriculture, Food, Environment and Natural Resources', department: 'Agricultural Entrepreneurship', programs: ['Bachelor of Science in Agricultural Entrepreneurship'] },
  { college: 'CAFENR · Agriculture, Food, Environment and Natural Resources', department: 'Crop Science', programs: ['Bachelor of Science in Agriculture — Crop Science'] },
  { college: 'CAFENR · Agriculture, Food, Environment and Natural Resources', department: 'Forestry and Environmental Science', programs: ['Bachelor of Science in Environmental Science'] },
  { college: 'CAFENR · Agriculture, Food, Environment and Natural Resources', department: 'Institute of Food Science and Technology', programs: ['Bachelor of Science in Food Technology'] },
  { college: 'CAS · Arts and Sciences', department: 'Biological Sciences', programs: ['Bachelor of Science in Biology'] },
  { college: 'CAS · Arts and Sciences', department: 'Communication', programs: ['Bachelor of Arts in Communication', 'Bachelor of Science in Development Communication'] },
  { college: 'CAS · Arts and Sciences', department: 'Humanities', programs: ['Bachelor of Arts in English Language Studies', 'Bachelor of Arts in Journalism'] },
  { college: 'CAS · Arts and Sciences', department: 'Physical Sciences', programs: ['Bachelor of Science in Applied Mathematics'] },
  { college: 'CAS · Arts and Sciences', department: 'Social Sciences', programs: ['Bachelor of Arts in Political Science', 'Bachelor of Science in Psychology', 'Bachelor of Science in Social Work'] },
  { college: 'CCJ · Criminal Justice', department: 'Criminology', programs: ['Bachelor of Science in Criminology'] },
  { college: 'CCJ · Criminal Justice', department: 'Industrial Security Management', programs: ['Bachelor of Science in Industrial Security Management'] },
  { college: 'CEMDS · Economics, Management and Development Studies', department: 'Accountancy', programs: ['Bachelor of Science in Accountancy'] },
  { college: 'CEMDS · Economics, Management and Development Studies', department: 'Economics', programs: ['Bachelor of Science in Economics'] },
  { college: 'CEMDS · Economics, Management and Development Studies', department: 'Management', programs: ['Bachelor of Science in Business Management'] },
  { college: 'CEMDS · Economics, Management and Development Studies', department: 'Development Studies', programs: ['Bachelor of Science in Development Management', 'Bachelor of Science in International Studies'] },
  { college: 'CEMDS · Economics, Management and Development Studies', department: 'Office Administration', programs: ['Bachelor of Science in Office Administration'] },
  { college: 'CED · Education', department: 'Teacher Education', programs: ['Bachelor of Early Childhood Education', 'Bachelor of Elementary Education', 'Bachelor of Secondary Education', 'Bachelor of Special Needs Education', 'Bachelor of Technology and Livelihood Education', 'Teacher Certificate Program'] },
  { college: 'CEIT · Engineering and Information Technology', department: 'Agriculture and Food Engineering', programs: ['Bachelor of Science in Agricultural and Biosystems Engineering'] },
  { college: 'CEIT · Engineering and Information Technology', department: 'Civil Engineering', programs: ['Bachelor of Science in Civil Engineering'] },
  { college: 'CEIT · Engineering and Information Technology', department: 'Computer, Electronics, and Electrical Engineering', programs: ['Bachelor of Science in Computer Engineering', 'Bachelor of Science in Electrical Engineering', 'Bachelor of Science in Electronics Engineering'] },
  { college: 'CEIT · Engineering and Information Technology', department: 'Industrial Engineering and Technology', programs: ['Bachelor of Science in Industrial Engineering', 'Bachelor of Science in Industrial Technology'] },
  { college: 'CEIT · Engineering and Information Technology', department: 'Information Technology', programs: ['Bachelor of Science in Computer Science', 'Bachelor of Science in Information Technology'] },
  { college: 'CEIT · Engineering and Information Technology', department: 'Architecture', programs: ['Bachelor of Science in Architecture'] },
  { college: 'CON · Nursing', department: 'Nursing', programs: ['Bachelor of Science in Nursing'] },
  { college: 'CON · Nursing', department: 'Medical Technology', programs: ['Bachelor of Science in Medical Technology'] },
  { college: 'CON · Nursing', department: 'Midwifery', programs: ['Bachelor of Science in Midwifery', 'Diploma in Midwifery'] },
  { college: 'COM · Medicine', department: 'Basic, Clinical, and Public Health Sciences', programs: ['Doctor of Medicine'] },
  { college: 'CSPEAR · Sports, Physical Education and Recreation', department: 'Physical Education', programs: ['Bachelor of Physical Education'] },
  { college: 'CSPEAR · Sports, Physical Education and Recreation', department: 'Physical Education, Exercise and Sports Science', programs: ['Bachelor of Exercise and Sports Sciences'] },
  { college: 'CVMBS · Veterinary Medicine and Biomedical Sciences', department: 'Basic Veterinary Sciences', programs: ['Doctor of Veterinary Medicine', 'Bachelor of Science in Animal Health and Management'] },
  { college: 'CVMBS · Veterinary Medicine and Biomedical Sciences', department: 'Immunopathology and Microbiology', programs: ['Doctor of Veterinary Medicine', 'Bachelor of Science in Veterinary Technology'] },
  { college: 'CVMBS · Veterinary Medicine and Biomedical Sciences', department: 'Clinical and Population Health', programs: ['Doctor of Veterinary Medicine', 'Master in Veterinary Studies', 'Master in Veterinary Science'] },
  { college: 'CVMBS · Veterinary Medicine and Biomedical Sciences', department: 'Biomedical Science and Biotechnology', programs: ['Bachelor of Science in Biomedical Science'] },
  { college: 'CTHM · Tourism and Hospitality Management', department: 'Hospitality Management', programs: ['Bachelor of Science in Hospitality Management'] },
  { college: 'CTHM · Tourism and Hospitality Management', department: 'Tourism Management', programs: ['Bachelor of Science in Tourism Management'] }
];

const profiles = [
  ['12', 'Current Grade 12 Student', 'Currently enrolled in Senior High School'],
  ['SH', 'SHS Graduate', 'Finished Senior High School'],
  ['A', 'ALS Completer', 'Completed the Alternative Learning System']
];

function optionCard(value, title, caption, icon) {
  const selected = Object.values(answers).includes(value);
  return `<button class="option-card ${selected ? 'is-selected' : ''}" type="button" data-value="${value}" aria-pressed="${selected}">
    <span class="option-icon">${icon}</span><span class="option-copy"><span class="option-title">${title}</span><span class="option-caption">${caption}</span></span><span class="option-check">&#10003;</span>
  </button>`;
}

function render() {
  stepNumber.textContent = currentStep;
  dots.forEach((dot, index) => {
    dot.classList.toggle('is-active', index + 1 === currentStep);
    dot.classList.toggle('is-complete', index + 1 < currentStep);
  });

  if (currentStep === 1) renderProfile();
  if (currentStep === 2) renderTrack();
  if (currentStep === 3) renderProgram();
  if (currentStep === 4) renderHome();
}

function renderProfile() {
  content.innerHTML = `<p class="kicker">Let’s get started</p><h1>Tell us about your journey.</h1><p class="intro">Choose the description that best matches your current academic status.</p><div class="option-list">${profiles.map((item) => optionCard(item[0], item[1], item[2], item[0])).join('')}</div><div class="actions"><button class="primary-button" type="button" disabled>Continue</button></div><p class="small-note">Your answers help us show the most relevant admission steps.</p>`;
  bindChoice('profile');
}

function renderTrack() {
  content.innerHTML = `<p class="kicker">Step 2 · Academic background</p><h1>What was your track or strand?</h1><p class="intro">This helps us recommend programs that fit what you already enjoy.</p><div class="option-list">${tracks.map((track) => optionCard(track, track, track === 'TVL' ? 'Technical-Vocational-Livelihood' : 'Senior High School track', track.slice(0, 1))).join('')}</div><div class="actions"><button class="back-button" type="button" data-back>Back</button><button class="primary-button" type="button" disabled>Continue</button></div>`;
  bindChoice('track');
}

function renderProgram() {
  const catalogMarkup = programCatalog.map((group) => `<div class="catalog-group"><p class="college-name">${group.college}</p><p class="department-name">${group.department}</p><div class="option-list">${group.programs.map((program) => optionCard(program, program, 'Available at CvSU', '→')).join('')}</div></div>`).join('');
  content.innerHTML = `<p class="kicker">Step 3 · Your direction</p><h1>Which program feels like you?</h1><p class="intro">Your ${answers.track} background is a great starting point. Choose a first-choice program from the CvSU catalog.</p><label class="search-box"><span aria-hidden="true">⌕</span><input type="text" placeholder="Search programs, colleges, or departments" aria-label="Search programs, colleges, or departments" data-program-search /><button type="button" data-clear-search aria-label="Clear program search">×</button></label><p class="search-empty" data-search-empty>No matching programs found.</p><div class="catalog">${catalogMarkup}</div><div class="actions"><button class="back-button" type="button" data-back>Back</button><button class="primary-button" type="button" disabled>Continue</button></div>`;
  bindChoice('program');
  const searchInput = content.querySelector('[data-program-search]');
  const clearSearch = content.querySelector('[data-clear-search]');
  const emptyMessage = content.querySelector('[data-search-empty]');
  const catalogGroups = [...content.querySelectorAll('.catalog-group')];
  const catalog = content.querySelector('.catalog');
  catalogGroups.forEach((group) => [...group.querySelectorAll('.option-card')].forEach((card, index) => { card.dataset.catalogIndex = index; }));
  const matchScore = (text, query) => {
    if (!query) return 0;
    const normalizedText = text.toLowerCase();
    if (normalizedText === query) return 0;
    if (normalizedText.startsWith(query)) return 1;
    const wordStart = normalizedText.indexOf(` ${query}`);
    if (wordStart >= 0) return 2 + wordStart / 1000;
    const matchIndex = normalizedText.indexOf(query);
    return matchIndex >= 0 ? 4 + matchIndex / 1000 : 100;
  };
  const filterCatalog = () => {
    const query = searchInput.value.trim().toLowerCase();
    let visibleGroups = 0;
    catalogGroups.forEach((group) => {
      const groupText = `${group.querySelector('.college-name').textContent} ${group.querySelector('.department-name').textContent}`;
      const groupMatch = query.length > 0 && groupText.toLowerCase().includes(query);
      const programCards = [...group.querySelectorAll('.option-card')];
      programCards.sort((firstCard, secondCard) => matchScore(firstCard.textContent, query) - matchScore(secondCard.textContent, query) || Number(firstCard.dataset.catalogIndex) - Number(secondCard.dataset.catalogIndex));
      programCards.forEach((card) => group.querySelector('.option-list').append(card));
      programCards.forEach((card) => {
        card.hidden = query.length > 0 && !groupMatch && !card.textContent.toLowerCase().includes(query);
      });
      const hasVisiblePrograms = programCards.some((card) => !card.hidden);
      group.hidden = !hasVisiblePrograms;
      group.dataset.matchScore = groupMatch ? matchScore(groupText, query) : Math.min(...programCards.filter((card) => !card.hidden).map((card) => matchScore(card.textContent, query)), 100);
      if (hasVisiblePrograms) visibleGroups += 1;
    });
    catalogGroups.sort((firstGroup, secondGroup) => Number(firstGroup.dataset.matchScore) - Number(secondGroup.dataset.matchScore));
    catalogGroups.forEach((group) => catalog.append(group));
    clearSearch.hidden = query.length === 0;
    emptyMessage.hidden = visibleGroups !== 0;
  };
  searchInput.addEventListener('input', filterCatalog);
  clearSearch.addEventListener('click', () => { searchInput.value = ''; searchInput.focus(); filterCatalog(); });
  filterCatalog();
}

function renderHome() {
  content.innerHTML = `<p class="kicker">You’re ready to explore</p><h1>Welcome to your CvSU guide.</h1><p class="intro">Here’s a starting point for your admission journey, tailored to your answers.</p><div class="welcome-panel"><h2>${answers.program}</h2><p>${answers.track} pathway · ${answers.profile === '12' ? 'Grade 12 student' : answers.profile === 'SH' ? 'SHS graduate' : 'ALS completer'}</p></div><div class="home-grid"><div class="home-tile"><strong>Admission steps</strong><span>See what to prepare next</span></div><div class="home-tile"><strong>Requirements</strong><span>Keep your documents ready</span></div></div><div class="actions"><button class="primary-button" type="button" data-restart>Review answers</button></div>`;
  content.querySelector('[data-restart]').addEventListener('click', () => { currentStep = 1; render(); });
}

function bindChoice(key) {
  const cards = [...content.querySelectorAll('.option-card')];
  const continueButton = content.querySelector('.primary-button');
  cards.forEach((card) => card.addEventListener('click', () => {
    answers[key] = card.dataset.value;
    cards.forEach((item) => item.classList.toggle('is-selected', item === card));
    continueButton.disabled = false;
  }));
  continueButton.addEventListener('click', () => { if (answers[key]) { currentStep += 1; render(); } });
  const backButton = content.querySelector('[data-back]');
  if (backButton) backButton.addEventListener('click', () => { currentStep -= 1; render(); });
}

render();
