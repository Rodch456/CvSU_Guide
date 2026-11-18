const { isDeepStrictEqual } = require('node:util');
const { examVenueNames, getAdmissionStepOrder, getCampusTrivia, getExamVenueSettings } = require('../src/content-schema');

function summarizeChanges(previous, next) {
  const groups = [];

  function compare(section, before, after, identify, label) {
    const oldItems = new Map(before.map((item) => [identify(item), item]));
    const newItems = new Map(after.map((item) => [identify(item), item]));
    const changes = [];
    for (const [id, item] of oldItems) {
      if (!newItems.has(id)) changes.push(`Removed ${label(item)}`);
    }
    for (const [id, item] of newItems) {
      if (!oldItems.has(id)) changes.push(`Added ${label(item)}`);
      else if (!isDeepStrictEqual(oldItems.get(id), item)) changes.push(`Updated ${label(item)}`);
    }
    const previousOrder = [...oldItems.keys()].filter((id) => newItems.has(id));
    const currentOrder = [...newItems.keys()].filter((id) => oldItems.has(id));
    if (!isDeepStrictEqual(previousOrder, currentOrder)) {
      changes.push('Changed the display order');
    }
    if (changes.length) groups.push({ section, changes });
  }

  const name = ([value]) => value;
  const value = (item) => item;
  compare('Academic statuses', previous.academicStatuses, next.academicStatuses, ({ id }) => id, ({ label }) => label);
  compare('Tracks and strands', previous.tracks, next.tracks, name, name);
  compare('Programs', previous.programs, next.programs, value, value);
  compare('Interview program keywords', previous.exceptionProgramKeywords, next.exceptionProgramKeywords, value, value);
  const beforeReapplication = previous.reapplicationPrograms ?? null;
  const afterReapplication = next.reapplicationPrograms ?? null;
  if (beforeReapplication === null && afterReapplication !== null) {
    groups.push({
      section: 'Reapplication programs',
      changes: ['Limited reapplication to selected programs', ...afterReapplication.map((program) => `Allowed ${program}`)]
    });
  } else if (beforeReapplication !== null && afterReapplication === null) {
    groups.push({ section: 'Reapplication programs', changes: ['Allowed all eligible programs for reapplication'] });
  } else if (beforeReapplication !== null) {
    compare('Reapplication programs', beforeReapplication, afterReapplication, value, value);
  }
  const beforeTracks = previous.reapplicationTracks ?? null;
  const afterTracks = next.reapplicationTracks ?? null;
  if (!isDeepStrictEqual(beforeTracks, afterTracks)) {
    const changes = afterTracks === 'all' ? ['Opened reapplication to all tracks and strands']
      : afterTracks === null ? ['Restored regular track and strand eligibility for reapplication']
      : ['Opened reapplication only to these tracks and strands', ...afterTracks];
    groups.push({ section: 'Reapplication track access', changes });
  }
  const orderedSteps = (content) => getAdmissionStepOrder(content).map((key) => [key, content.statusStepDetails[key]]);
  compare('Admission steps', orderedSteps(previous), orderedSteps(next), name, ([, step]) => step.title);
  const translatedFaqs = (content) => content.faqItems.map((entry, index) => [...entry, content.faqTranslations?.[index] ?? null]);
  compare('FAQs', translatedFaqs(previous), translatedFaqs(next), ([category, question]) => JSON.stringify([category, question]), ([category, question]) => `${question} (${category})`);
  compare('Campus trivia', getCampusTrivia(previous), getCampusTrivia(next), value, value);
  const beforeVenue = getExamVenueSettings(previous);
  const afterVenue = getExamVenueSettings(next);
  const venueChanges = [];
  if (beforeVenue.selected !== afterVenue.selected) venueChanges.push(`Set the examination venue to ${examVenueNames[afterVenue.selected]}`);
  for (const id of ['rolle', 'ccj']) {
    if (!isDeepStrictEqual(beforeVenue.locations[id], afterVenue.locations[id])) venueChanges.push(`Updated map details for ${examVenueNames[id]}`);
  }
  if (venueChanges.length) groups.push({ section: 'Examination venue', changes: venueChanges });
  return groups;
}

module.exports = { summarizeChanges };
