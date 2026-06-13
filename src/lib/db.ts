import { BaseDirectory, readTextFile, writeTextFile, exists } from '@tauri-apps/plugin-fs';

export interface AppDb {
  subscriptions: string[];
  watchProgress: Record<string, number>;
}

const DB_FILE = 'db.json';

const defaultDb: AppDb = { subscriptions: [], watchProgress: {} };

export async function readDb(): Promise<AppDb> {
  try {
    const hasDb = await exists(DB_FILE, { baseDir: BaseDirectory.AppData });
    if (!hasDb) {
      await writeTextFile(DB_FILE, JSON.stringify(defaultDb), { baseDir: BaseDirectory.AppData });
      return { ...defaultDb };
    }
    const text = await readTextFile(DB_FILE, { baseDir: BaseDirectory.AppData });
    const parsed = JSON.parse(text);
    return {
      subscriptions: Array.isArray(parsed.subscriptions) ? parsed.subscriptions : [],
      watchProgress: parsed.watchProgress && typeof parsed.watchProgress === 'object' ? parsed.watchProgress : {},
    };
  } catch (e) {
    console.error('Failed to read database:', e);
    return { ...defaultDb };
  }
}

export async function writeDb(db: AppDb): Promise<void> {
  try {
    await writeTextFile(DB_FILE, JSON.stringify(db, null, 2), { baseDir: BaseDirectory.AppData });
  } catch (e) {
    console.error('Failed to write database:', e);
  }
}

export async function getSubscriptions(): Promise<string[]> {
  const db = await readDb();
  return db.subscriptions;
}

export async function addSubscription(channelId: string): Promise<boolean> {
  const db = await readDb();
  if (db.subscriptions.includes(channelId)) return false;
  db.subscriptions.push(channelId);
  await writeDb(db);
  return true;
}

export async function removeSubscription(channelId: string): Promise<void> {
  const db = await readDb();
  db.subscriptions = db.subscriptions.filter((id) => id !== channelId);
  await writeDb(db);
}

export async function getWatchProgress(videoId: string): Promise<number> {
  const db = await readDb();
  return db.watchProgress[videoId] ?? 0;
}

export async function saveWatchProgress(videoId: string, time: number): Promise<void> {
  const db = await readDb();
  if (!db.watchProgress) db.watchProgress = {};
  db.watchProgress[videoId] = time;
  await writeDb(db);
}
