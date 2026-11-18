const defaults = require('./admission-content.json');
const alsTrack = 'ALS Passer';
const coreAdmissionSteps = Object.keys(defaults.statusStepDetails);
const examVenueNames = {
  icon: 'International Convention Center (ICON)',
  rolle: 'Rolle Hall',
  ccj: 'College of Criminal Justice (CCJ)'
};
const defaultExamVenue = {
  selected: 'icon',
  locations: { rolle: { directions: '', pin: null }, ccj: { directions: '', pin: null } }
};

function getExamVenueSettings(content) {
  return content.examVenue ?? defaultExamVenue;
}

function getExamVenue(content) {
  const { selected, locations } = getExamVenueSettings(content);
  const location = selected === 'icon' ? null : locations[selected];
  return { id: selected, name: examVenueNames[selected], directions: location?.directions || '', pin: location?.pin ?? null };
}

function getAdmissionStepOrder(content) {
  return content.admissionStepOrder ?? coreAdmissionSteps;
}

function getCampusTrivia(content) {
  return content.faqTrivia ?? defaults.faqTrivia;
}

function getAcademicStatuses(content) {
  return content.academicStatuses ?? defaults.academicStatuses;
}

function getAcademicStatus(content, profile) {
  return getAcademicStatuses(content).find(({ id }) => id === profile);
}

function getTrackOptions(content, profile) {
  const status = getAcademicStatus(content, profile);
  if (!status) return [];
  return content.tracks.filter(([name]) => status.tracks === null ? name !== alsTrack : status.tracks.includes(name));
}

function getApplicantTrack(content, profile, track) {
  const options = getTrackOptions(content, profile);
  const match = options.find(([name]) => name === track);
  if (match) return match;
  // Earlier app versions saved a regular strand for some ALS profiles.
  return profile === 'A' && options.length === 1 && options[0][0] === alsTrack ? options[0] : undefined;
}

function getEligiblePrograms(content, profile, track) {
  return getApplicantTrack(content, profile, track)?.[2] ?? [];
}

function getReapplicationPrograms(content, profile, track, failedProgram) {
  const applicantTrack = getApplicantTrack(content, profile, track);
  if (!applicantTrack) return [];
  const [trackName, , regularPrograms] = applicantTrack;
  const trackScope = content.reapplicationTracks;
  if (Array.isArray(trackScope) && !trackScope.includes(trackName)) return [];
  const choices = trackScope == null ? regularPrograms : content.programs;
  const failed = (failedProgram || '').toLowerCase();
  const allowed = content.reapplicationPrograms == null ? null : new Set(content.reapplicationPrograms);
  return choices.filter((program) =>
    program.toLowerCase() !== failed && (!allowed || allowed.has(program))
  );
}

function getStepRequirements(content, profile, step) {
  return getAcademicStatus(content, profile)?.requirements[step] ?? content.statusStepDetails[step].requirements;
}

const isText = (value) => typeof value === 'string' && value.trim() === value && value.length > 0 && value.length <= 4000;
const isList = (value, itemCheck, min = 0) => Array.isArray(value) && value.length >= min && value.length <= 500 && value.every(itemCheck);
const unique = (values) => new Set(values.map((value) => value.toLowerCase())).size === values.length;
const textList = (value, min = 0) => isList(value, isText, min) && unique(value);
const row = (value, width) => Array.isArray(value) && value.length === width && value.every(isText);

function validateContent(content) {
  if (!content || typeof content !== 'object') return 'Admission content is missing.';
  if (!textList(content.programs, 1)) return 'Enter at least one program. Program names must be unique.';
  const catalog = new Set(content.programs);
  if (content.reapplicationPrograms != null &&
      (!textList(content.reapplicationPrograms) || !content.reapplicationPrograms.every((program) => catalog.has(program)))) {
    return 'Reapplication choices must be unique programs from the catalog.';
  }
  if (!isList(content.tracks, (entry) => Array.isArray(entry) && entry.length === 3 &&
      row(entry.slice(0, 2), 2) && textList(entry[2]) && entry[2].every((program) => catalog.has(program)), 2) ||
      !unique(content.tracks.map(([name]) => name)) || !content.tracks.some(([name]) => name === alsTrack)) {
    return 'Keep ALS Passer and at least one other track or strand. Each needs a unique name, a description and valid program assignments.';
  }
  if (!textList(content.exceptionProgramKeywords)) return 'Interview keywords must be unique.';
  if (!isList(content.faqItems, (entry) => row(entry, 3) && entry[0].toLowerCase() !== 'all') ||
      !unique(content.faqItems.map(([category, question]) => JSON.stringify([category, question])))) {
    return 'Each FAQ needs a category, question and answer. Questions must be unique within a category. “All” is reserved.';
  }
  if (content.faqTranslations !== undefined &&
      (!isList(content.faqTranslations, (translation) => translation === null || row(translation, 2)) ||
       content.faqTranslations.length !== content.faqItems.length)) {
    return 'Enter both the Tagalog question and answer for each translated FAQ, or leave both blank.';
  }
  const steps = getAdmissionStepOrder(content);
  const detailsByStep = content.statusStepDetails || {};
  if (!textList(steps, coreAdmissionSteps.length) || Object.keys(detailsByStep).length !== steps.length ||
      steps.some((step) => !Object.hasOwn(detailsByStep, step) || (!coreAdmissionSteps.includes(step) && !/^step-[a-f0-9-]{36}$/.test(step))) ||
      steps.filter((step) => coreAdmissionSteps.includes(step)).join('|') !== coreAdmissionSteps.join('|')) {
    return 'Keep the built-in admission steps in their original sequence. Place each added step once.';
  }
  for (const step of steps) {
    const details = detailsByStep[step];
    if (!details || !isText(details.title) || !isText(details.description) ||
        !textList(details.instructions) || !textList(details.requirements) ||
        (details.details !== undefined && !textList(details.details)) ||
        (details.location !== undefined && details.location !== '' && !isText(details.location))) {
      return `Check ${details?.title || (coreAdmissionSteps.includes(step) ? step : 'the new admission step')}. Enter a title, summary, and unique, non-empty list entries.`;
    }
  }
  const statuses = getAcademicStatuses(content);
  const trackNames = new Set(content.tracks.map(([name]) => name));
  if (content.reapplicationTracks != null && content.reapplicationTracks !== 'all' &&
      (!textList(content.reapplicationTracks, 1) || !content.reapplicationTracks.every((name) => trackNames.has(name)))) {
    return 'Select at least one existing track or strand for reapplication.';
  }
  const validStatus = (status) => status && isText(status.id) && /^[a-z0-9-]{1,50}$/i.test(status.id) &&
    isText(status.label) && isText(status.description) &&
    (status.tracks === null || (textList(status.tracks, 1) && status.tracks.every((name) => trackNames.has(name)))) &&
    status.requirements && typeof status.requirements === 'object' && !Array.isArray(status.requirements) &&
    Object.entries(status.requirements).every(([step, items]) => steps.includes(step) && textList(items));
  if (!isList(statuses, validStatus, 1) || !unique(statuses.map(({ id }) => id)) || !unique(statuses.map(({ label }) => label))) {
    return 'Each academic status needs a unique name, a description, and at least one available track. Remove duplicate requirements.';
  }
  if (!textList(getCampusTrivia(content))) return 'Campus trivia must contain unique, non-empty facts.';
  const venue = getExamVenueSettings(content);
  const validPinCoordinate = (value) => Number.isFinite(value) && value >= 0 && value <= 100;
  const validVenue = (location) => location &&
    (location.directions === '' || isText(location.directions)) &&
    (location.pin === null || (location.pin && validPinCoordinate(location.pin.x) && validPinCoordinate(location.pin.y)));
  if (!Object.hasOwn(examVenueNames, venue.selected) || !['rolle', 'ccj'].every((id) => validVenue(venue.locations?.[id]))) {
    return 'Select a known examination venue and place map pins within the campus map.';
  }
  return null;
}

module.exports = { alsTrack, examVenueNames, getAcademicStatuses, getAcademicStatus, getAdmissionStepOrder, getCampusTrivia, getEligiblePrograms, getExamVenue, getExamVenueSettings, getReapplicationPrograms, getStepRequirements, getTrackOptions, validateContent };
