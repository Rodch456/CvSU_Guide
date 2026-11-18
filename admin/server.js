const http = require('node:http');
const { createHash, timingSafeEqual } = require('node:crypto');
const { mkdir, readFile, rename, writeFile } = require('node:fs/promises');
const path = require('node:path');
const defaults = require('../src/admission-content.json');
const { examVenueNames, getAcademicStatuses, getAdmissionStepOrder, getCampusTrivia, getExamVenueSettings, getTrackOptions, validateContent } = require('../src/content-schema');
const { summarizeChanges } = require('./change-history');
const { activeInstallationDays, openInstallations } = require('./installations');

try {
  process.loadEnvFile(path.join(__dirname, '.env.local'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
const username = process.env.ADMISSION_ADMIN_USERNAME || 'Admin';
const password = process.env.ADMISSION_ADMIN_PASSWORD;
if (!password || username.includes(':')) {
  throw new Error('Set ADMISSION_ADMIN_PASSWORD and use an admin username without a colon.');
}

const dataFile = path.resolve(process.env.ADMISSION_DATA_FILE || path.join(__dirname, 'data', 'published.json'));
const digest = (value) => createHash('sha256').update(value).digest();
const credential = digest(`Basic ${Buffer.from(`${username}:${password}`, 'utf8').toString('base64')}`);
const maxBytes = 512 * 1024;
const assets = {
  '/': ['index.html', 'text/html'],
  '/admin.js': ['admin.js', 'text/javascript'],
  '/admin.css': ['admin.css', 'text/css'],
  '/logo.png': ['../assets/CvSU_Logo.png', 'image/png']
};

function countAvailablePrograms(content) {
  const programs = new Set();
  for (const { id } of getAcademicStatuses(content)) {
    for (const [, , choices] of getTrackOptions(content, id)) {
      for (const program of choices) programs.add(program);
    }
  }
  return programs.size;
}

function send(res, status, detail) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(detail));
}

async function readBody(req, limit = maxBytes) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size <= limit) chunks.push(chunk);
    else throw Object.assign(new Error('Request body is too large.'), { status: 413 });
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw Object.assign(new Error('Invalid JSON.'), { status: 400 });
  }
}

async function loadState() {
  try {
    const stored = JSON.parse(await readFile(dataFile, 'utf8'));
    const isVersioned = stored?.format === 'cvsu-publication-v1';
    let content = isVersioned ? stored.content : stored;
    const history = isVersioned ? stored.history : [];
    if (!Array.isArray(history)) throw new Error('Invalid change history.');
    if (Array.isArray(content?.tracks) && content.tracks.every((track) => Array.isArray(track) && track.length === 2)) {
      const oldDescriptions = new Map(content.tracks);
      const mappedNames = new Set(defaults.tracks.map(([name]) => name));
      const additionalTracks = content.tracks
        .filter(([name]) => name !== 'TVL' && !mappedNames.has(name))
        .map(([name, description]) => [name, description, []]);
      content = {
        ...content,
        programs: defaults.programs,
        tracks: [
          ...defaults.tracks.map(([name, description, programs]) => [name, oldDescriptions.get(name) || description, programs]),
          ...additionalTracks
        ]
      };
    }
    const error = validateContent(content);
    if (error) throw new Error(error);
    const { attireGuide, ...guideContent } = content;
    return { content: {
      ...guideContent,
      academicStatuses: getAcademicStatuses(content),
      admissionStepOrder: getAdmissionStepOrder(content),
      faqTrivia: getCampusTrivia(content),
      examVenue: getExamVenueSettings(content)
    }, history };
  } catch (error) {
    if (error.code === 'ENOENT') return { content: { ...defaults, admissionStepOrder: getAdmissionStepOrder(defaults), examVenue: getExamVenueSettings(defaults) }, history: [] };
    throw error;
  }
}

async function start() {
  let { content: published, history } = await loadState();
  const installations = await openInstallations(`${dataFile}.installations.json`);
  const dashboard = () => ({ availableProgramCount: countAvailablePrograms(published), activeInstallationCount: installations.count(), activeInstallationDays });
  let version = digest(JSON.stringify(published)).toString('hex');
  let writing = false;
  const server = http.createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    const route = req.url.split('?')[0];
    try {
      if (req.method === 'GET' && route === '/api/content') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        return send(res, 200, published);
      }
      if (req.method === 'POST' && route === '/api/installations/check-in') {
        const { installationId } = (await readBody(req, 256)) ?? {};
        if (typeof installationId !== 'string' || !/^[a-f0-9]{32}$/.test(installationId)) {
          return send(res, 400, { error: 'Invalid installation identifier.' });
        }
        await installations.record(installationId);
        res.writeHead(204);
        return res.end();
      }
      if (route === '/api/admin/content' && ['GET', 'PUT'].includes(req.method)) {
        if (!timingSafeEqual(digest(req.headers.authorization || ''), credential)) {
          return send(res, 401, { error: 'Enter a valid admin username and password.' });
        }
        if (req.method === 'GET') return send(res, 200, { content: published, version, history, examVenueNames, ...dashboard() });
        if (writing || req.headers['if-match'] !== `"${version}"`) {
          return send(res, 409, { error: 'Another publish is in progress or the content changed. Reload the latest content before publishing.' });
        }
        writing = true;
        try {
          const payload = await readBody(req);
          const { attireGuide, ...editableContent } = payload ?? {};
          const content = {
            ...editableContent,
            academicStatuses: payload?.academicStatuses ?? published.academicStatuses,
            admissionStepOrder: payload?.admissionStepOrder ?? published.admissionStepOrder,
            reapplicationPrograms: payload?.reapplicationPrograms === undefined ? published.reapplicationPrograms ?? null : payload.reapplicationPrograms,
            reapplicationTracks: payload?.reapplicationTracks === undefined ? published.reapplicationTracks ?? null : payload.reapplicationTracks,
            faqTrivia: payload?.faqTrivia ?? published.faqTrivia,
            examVenue: payload?.examVenue ?? published.examVenue
          };
          const error = validateContent(content);
          if (error) return send(res, 400, { error });
          const groups = summarizeChanges(published, content);
          if (!groups.length) {
            return send(res, 200, { version, history, changed: false, ...dashboard() });
          }
          const nextHistory = [{ publishedAt: new Date().toISOString(), groups }, ...history];
          await mkdir(path.dirname(dataFile), { recursive: true });
          await writeFile(`${dataFile}.tmp`, JSON.stringify({
            format: 'cvsu-publication-v1', content, history: nextHistory
          }, null, 2), { mode: 0o600 });
          await rename(`${dataFile}.tmp`, dataFile);
          published = content;
          history = nextHistory;
          version = digest(JSON.stringify(content)).toString('hex');
          return send(res, 200, { version, history, changed: true, ...dashboard() });
        } finally {
          writing = false;
        }
      }
      if (req.method === 'GET' && Object.hasOwn(assets, route)) {
        const [filename, type] = assets[route];
        const body = await readFile(path.join(__dirname, filename));
        res.writeHead(200, { 'Content-Type': type.startsWith('text/') ? `${type}; charset=utf-8` : type });
        return res.end(body);
      }
      return send(res, 404, { error: 'Page not found.' });
    } catch (error) {
      if (!error.status) console.error(error);
      return send(res, error.status || 500, { error: error.status ? error.message : 'The server could not complete the request.' });
    }
  });
  const host = process.env.HOST || '127.0.0.1';
  server.listen(Number(process.env.PORT || 4100), host, () => {
    console.log(`CvSU Admission Admin listening on http://${host}:${server.address().port}`);
  });
}

start().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
