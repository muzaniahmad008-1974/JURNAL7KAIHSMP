// lib/driveStore.js
//
// A small key-value "database" backed by Google Drive. Each key becomes one
// JSON file inside a single Drive folder that a Google Cloud service account
// has been given Editor access to (see README.md for setup). This keeps the
// storage contract identical to the one the original SI-7KAIH AI prototype
// used (get/set/delete/list by string key), so the rest of the app can stay
// simple.
//
// IMPORTANT: this file must only ever be imported from server-side code
// (API routes / route handlers). It reads a service-account private key from
// an environment variable and must never be bundled into client JavaScript.

import { google } from "googleapis";

let driveClientPromise = null;

function getServiceAccountCredentials() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_KEY is not set. Paste the full service-account JSON key (as one line) into your environment variables. See README.md."
    );
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_KEY could not be parsed as JSON. Make sure you pasted the entire key file contents, not a file path."
    );
  }
}

function getDriveClient() {
  if (!driveClientPromise) {
    const credentials = getServiceAccountCredentials();
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/drive"],
    });
    driveClientPromise = Promise.resolve(google.drive({ version: "v3", auth }));
  }
  return driveClientPromise;
}

function getFolderId() {
  const id = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!id) {
    throw new Error(
      "GOOGLE_DRIVE_FOLDER_ID is not set. Create a folder in Google Drive, share it with your service account's email (Editor access), and put its folder ID here. See README.md."
    );
  }
  return id;
}

// Drive filenames can't contain "/" and get unwieldy with special characters,
// so keys are sanitised into a safe filename before hitting the API.
function keyToFilename(key) {
  const safe = String(key).replace(/[^a-zA-Z0-9:_.-]/g, "_");
  return `${safe}.json`;
}

async function findFile(drive, folderId, filename) {
  const escaped = filename.replace(/'/g, "\\'");
  const res = await drive.files.list({
    q: `'${folderId}' in parents and name = '${escaped}' and trashed = false`,
    fields: "files(id, name)",
    spaces: "drive",
    pageSize: 1,
  });
  return res.data.files && res.data.files[0] ? res.data.files[0] : null;
}

/**
 * Read one key. Returns `fallback` if the key has never been written.
 */
export async function driveGet(key, fallback = null) {
  const drive = await getDriveClient();
  const folderId = getFolderId();
  const filename = keyToFilename(key);
  const file = await findFile(drive, folderId, filename);
  if (!file) return fallback;

  const res = await drive.files.get(
    { fileId: file.id, alt: "media" },
    { responseType: "text" }
  );
  try {
    return JSON.parse(typeof res.data === "string" ? res.data : JSON.stringify(res.data));
  } catch (e) {
    return fallback;
  }
}

/**
 * Write one key, creating the backing file the first time and updating its
 * content afterwards.
 */
export async function driveSet(key, value) {
  const drive = await getDriveClient();
  const folderId = getFolderId();
  const filename = keyToFilename(key);
  const body = JSON.stringify(value);
  const media = { mimeType: "application/json", body };

  const existing = await findFile(drive, folderId, filename);
  if (existing) {
    await drive.files.update({ fileId: existing.id, media });
  } else {
    await drive.files.create({
      requestBody: { name: filename, parents: [folderId] },
      media,
      fields: "id",
    });
  }
  return value;
}

/**
 * Delete one key. A no-op if the key doesn't exist.
 */
export async function driveDelete(key) {
  const drive = await getDriveClient();
  const folderId = getFolderId();
  const filename = keyToFilename(key);
  const existing = await findFile(drive, folderId, filename);
  if (existing) {
    await drive.files.delete({ fileId: existing.id });
  }
  return { deleted: true };
}

/**
 * List keys whose filename starts with `prefix` (a plain string prefix on
 * the ORIGINAL key, matched against the sanitised filename).
 */
export async function driveList(prefix = "") {
  const drive = await getDriveClient();
  const folderId = getFolderId();
  const safePrefix = keyToFilename(prefix).replace(/\.json$/, "");
  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false and name contains '${safePrefix.replace(/'/g, "\\'")}'`,
    fields: "files(id, name)",
    spaces: "drive",
    pageSize: 1000,
  });
  const files = res.data.files || [];
  return files
    .map((f) => f.name.replace(/\.json$/, ""))
    .filter((name) => name.startsWith(safePrefix));
}
