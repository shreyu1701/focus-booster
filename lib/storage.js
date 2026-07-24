import { STORAGE_DEFAULTS } from "./constants.js";

export async function getSettings() {
  const data = await chrome.storage.local.get(STORAGE_DEFAULTS);
  return { ...STORAGE_DEFAULTS, ...data };
}

export async function getSession() {
  const data = await chrome.storage.local.get({
    sessionActive: false,
    sessionType: null,
    timerEnd: null,
    durationSeconds: null,
    pendingBreak: false,
  });
  return data;
}

export function formatTime(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}:${remaining.toString().padStart(2, "0")}`;
}

export function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function computeStreakUpdate(prev) {
  const today = todayKey();
  const yesterday = todayKey(new Date(Date.now() - 86400000));
  let streak = prev.streak || 0;

  if (prev.lastCompletedDate === today) {
    // already counted today — keep streak
  } else if (prev.lastCompletedDate === yesterday) {
    streak += 1;
  } else {
    streak = 1;
  }

  return {
    completedSessions: (prev.completedSessions || 0) + 1,
    streak,
    lastCompletedDate: today,
  };
}
