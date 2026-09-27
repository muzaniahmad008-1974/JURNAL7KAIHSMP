// lib/clientStorage.js
//
// Browser-safe helpers for reading/writing app data. These call the
// /api/storage route, which is the only thing allowed to talk to Google
// Drive (see lib/driveStore.js). Never import lib/driveStore.js or
// lib/gemini.js directly from client components — always go through here
// (storage) or lib/clientAi.js (Gemini).

export async function getData(key, fallback = null) {
  try {
    const res = await fetch(`/api/storage?key=${encodeURIComponent(key)}`);
    if (!res.ok) return fallback;
    const { value } = await res.json();
    return value === null || value === undefined ? fallback : value;
  } catch (e) {
    console.error("getData failed for key", key, e);
    return fallback;
  }
}

export async function setData(key, value) {
  try {
    const res = await fetch("/api/storage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
    if (!res.ok) throw new Error("Storage write failed");
    const data = await res.json();
    return data.value;
  } catch (e) {
    console.error("setData failed for key", key, e);
    throw e;
  }
}

export async function deleteData(key) {
  try {
    await fetch(`/api/storage?key=${encodeURIComponent(key)}`, { method: "DELETE" });
  } catch (e) {
    console.error("deleteData failed for key", key, e);
  }
}

export async function listKeys(prefix = "") {
  try {
    const res = await fetch(`/api/storage?prefix=${encodeURIComponent(prefix)}`);
    if (!res.ok) return [];
    const { keys } = await res.json();
    return keys || [];
  } catch (e) {
    console.error("listKeys failed for prefix", prefix, e);
    return [];
  }
}
