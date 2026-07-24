export const ALARM_FOCUS = "focus-session-end";
export const ALARM_BREAK = "break-session-end";

export const PRESETS = [
  { id: "15", label: "15m", seconds: 15 * 60 },
  { id: "25", label: "25m", seconds: 25 * 60 },
  { id: "50", label: "50m", seconds: 50 * 60 },
];

export const SHORT_BREAK_SECONDS = 5 * 60;
export const DEFAULT_FOCUS_SECONDS = 25 * 60;

/** Soft review ask after this many completed focus sessions. */
export const REVIEW_PROMPT_MIN_SESSIONS = 1;

/** Hide “Rate us” for this many more completed sessions after Not now. */
export const REVIEW_PROMPT_SNOOZE_SESSIONS = 2;

export const STORE_REVIEWS_URL =
  "https://chromewebstore.google.com/detail/focus-booster/plnffembcfidgbmkfhoajmifkdbbnahd/reviews";

export const STORAGE_DEFAULTS = {
  blockedSites: [],
  alwaysBlock: false,
  completedSessions: 0,
  streak: 0,
  lastCompletedDate: null,
  selectedPreset: "25",
  customMinutes: 25,
  reviewPromptDismissed: false,
  reviewPromptSnoozeUntil: 0,
};
