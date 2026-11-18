const defaults = require('./admission-content.json');
const alsTrack = 'ALS Passer';
const coreAdmissionSteps = Object.keys(defaults.statusStepDetails);

function getAdmissionStepOrder(content) {
  return content.admissionStepOrder ?? coreAdmissionSteps;
}

function getCampusTrivia(content) {
  return content.faqTrivia ?? defaults.faqTrivia;
}

function getAttireGuide(content) {
  return content.attireGuide ?? defaults.attireGuide;
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

function validGuideImage(image) {
  if (!image || !isText(image.label)) return false;
  if (image.url === null || image.url === '') return true;
  if (!isText(image.url)) return false;
  const authority = /^https:\/\/([^/?#]+)/.exec(image.url)?.[1];
  if (!authority || /[@\s\\]/.test(authority)) return false;
  try {
    return Boolean(new URL(image.url).hostname);
  } catch {
    return false;
  }
}

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
  const guide = getAttireGuide(content);
  const validNote = (note) => Array.isArray(note) && note.length === 2 && isText(note[0]) && textList(note[1], 1);
  for (const tab of ['visit', 'classes']) {
    const section = guide[tab];
    if (!section || !isText(section.label) || !isText(section.intro) ||
        (section.caption !== '' && !isText(section.caption)) || !isList(section.notes, validNote)) {
      return 'Each attire section needs a tab label and introduction. Give each note a heading and at least one paragraph.';
    }
  }
  if (!isText(guide.title) || !Object.keys(defaults.attireGuide.images).every((key) => validGuideImage(guide.images?.[key]))) {
    return 'Enter an attire guide title and image labels. Use HTTPS URLs for replacement images.';
  }
  return null;
}

module.exports = { alsTrack, getAcademicStatuses, getAcademicStatus, getAdmissionStepOrder, getAttireGuide, getCampusTrivia, getEligiblePrograms, getReapplicationPrograms, getStepRequirements, getTrackOptions, validateContent };
