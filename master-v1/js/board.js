// ============================================================
// board.js — talks to the shared leaderboard (Firestore) with plain fetch calls, no Firebase SDK,
// so the game stays dependency-free and still runs offline (the leaderboard just switches off).
//   Sign in:  anonymous account via the Identity Toolkit REST API; the token is kept in localStorage.
//   Write:    one document per finished year in `scores`, with the server's time stamped in `ts`.
//   Read:     the newest 1000 scores, newest first.
// The rules in ../firestore.rules check every field, so a write that doesn't match is refused.
// ============================================================

import { BOARD } from "./board-config.js";

export const boardEnabled = () => !!BOARD.apiKey;

const AUTH_KEY = "buildcraft-board-auth";
const DB = () => `projects/${BOARD.projectId}/databases/(default)`;
const FS = () => `https://firestore.googleapis.com/v1/${DB()}/documents`;

function loadAuth() { try { return JSON.parse(localStorage.getItem(AUTH_KEY) || "null"); } catch (e) { return null; } }
function saveAuth(a) { try { localStorage.setItem(AUTH_KEY, JSON.stringify(a)); } catch (e) { /* private mode: sign in again next time */ } }

async function post(url, body, headers = {}) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data.error && data.error.message) || `HTTP ${res.status}`);
  return data;
}

// A signed-in anonymous user: { uid, token, refresh, exp }. Reuses and refreshes the saved one.
async function signIn() {
  const a = loadAuth();
  if (a && a.exp > Date.now() + 60000) return a;
  let d;
  if (a && a.refresh) {
    const res = await fetch(`https://securetoken.googleapis.com/v1/token?key=${BOARD.apiKey}`, {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(a.refresh)}`,
    });
    d = await res.json().catch(() => ({}));
    if (res.ok) d = { localId: d.user_id, idToken: d.id_token, refreshToken: d.refresh_token, expiresIn: d.expires_in };
    else d = null;
  }
  if (!d) d = await post(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${BOARD.apiKey}`, { returnSecureToken: true });
  const out = { uid: d.localId, token: d.idToken, refresh: d.refreshToken, exp: Date.now() + Number(d.expiresIn || 3600) * 1000 };
  saveAuth(out);
  return out;
}

// ---- Firestore's typed JSON ----
function encode(v) {
  if (typeof v === "string") return { stringValue: v };
  if (typeof v === "boolean") return { booleanValue: v };
  if (Number.isInteger(v)) return { integerValue: String(v) };
  if (typeof v === "number") return { doubleValue: v };
  return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, encode(x)])) } };
}
function decode(v) {
  if ("stringValue" in v) return v.stringValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("timestampValue" in v) return Date.parse(v.timestampValue);
  if ("mapValue" in v) return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, decode(x)]));
  return null;
}

// entry: { name, site, score, grade, eco, ghosts, passed, choices }. `name` must already be cleaned.
export async function submitScore(entry) {
  const a = await signIn();
  const id = (crypto.randomUUID && crypto.randomUUID().replace(/-/g, "")) || `${Date.now()}${Math.random().toString(36).slice(2)}`;
  const fields = Object.fromEntries(Object.entries({ ...entry, uid: a.uid }).map(([k, v]) => [k, encode(v)]));
  await post(`https://firestore.googleapis.com/v1/${DB()}/documents:commit?key=${BOARD.apiKey}`, {
    writes: [{
      update: { name: `${DB()}/documents/scores/${id}`, fields },
      updateTransforms: [{ fieldPath: "ts", setToServerValue: "REQUEST_TIME" }],
      currentDocument: { exists: false },
    }],
  }, { Authorization: `Bearer ${a.token}` });
  return a.uid;
}

export async function fetchScores(limit = 1000) {
  const rows = await post(`${FS()}:runQuery?key=${BOARD.apiKey}`, {
    structuredQuery: { from: [{ collectionId: "scores" }], orderBy: [{ field: { fieldPath: "ts" }, direction: "DESCENDING" }], limit },
  });
  return rows.filter(r => r.document).map(r => decode({ mapValue: { fields: r.document.fields } }));
}

export const myUid = () => (loadAuth() || {}).uid || null;
