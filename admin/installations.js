const path = require('node:path');
const { mkdir, readFile, rename, writeFile } = require('node:fs/promises');

const day = 24 * 60 * 60 * 1000;
const activeInstallationDays = 30;
const activeWindow = activeInstallationDays * day;

async function openInstallations(file) {
  const lastSeen = new Map();
  try {
    const stored = JSON.parse(await readFile(file, 'utf8'));
    for (const [id, time] of Object.entries(stored)) {
      if (/^[a-f0-9]{32}$/.test(id) && Number.isFinite(time) && time > Date.now() - activeWindow) lastSeen.set(id, time);
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  let pending = Promise.resolve();
  return {
    count() {
      const cutoff = Date.now() - activeWindow;
      return Array.from(lastSeen.values()).filter((time) => time > cutoff).length;
    },
    record(id) {
      const operation = pending.then(async () => {
        const now = Date.now();
        if (lastSeen.has(id) && now - lastSeen.get(id) < day) return;
        const next = new Map(lastSeen);
        for (const [key, time] of next) {
          if (time <= now - activeWindow) next.delete(key);
        }
        next.set(id, now);
        await mkdir(path.dirname(file), { recursive: true });
        await writeFile(`${file}.tmp`, JSON.stringify(Object.fromEntries(next)), { mode: 0o600 });
        await rename(`${file}.tmp`, file);
        lastSeen.clear();
        for (const [key, time] of next) lastSeen.set(key, time);
      });
      pending = operation.catch(() => {});
      return operation;
    }
  };
}

module.exports = { activeInstallationDays, openInstallations };
