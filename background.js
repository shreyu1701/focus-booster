import {
  ALARM_BREAK,
  ALARM_FOCUS,
  SHORT_BREAK_SECONDS,
} from "./lib/constants.js";
import { originsForHost, allocateRuleIds } from "./lib/hostname.js";
import { computeStreakUpdate, getSession, getSettings } from "./lib/storage.js";

chrome.runtime.onInstalled.addListener(async () => {
  await syncBlockingRules();
});

chrome.runtime.onStartup.addListener(async () => {
  await syncBlockingRules();
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_FOCUS) {
    await completeFocusSession();
  } else if (alarm.name === ALARM_BREAK) {
    await completeBreakSession();
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (
    changes.blockedSites ||
    changes.alwaysBlock ||
    changes.sessionActive ||
    changes.sessionType
  ) {
    // Always go through the serialized helper (fire-and-forget is fine here).
    void syncBlockingRules();
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message)
    .then((result) => sendResponse({ ok: true, ...result }))
    .catch((error) =>
      sendResponse({ ok: false, error: error?.message || String(error) }),
    );
  return true;
});

async function handleMessage(message) {
  switch (message?.action) {
    case "startFocus":
      return startFocus(message.seconds);
    case "startBreak":
      return startBreak(message.seconds ?? SHORT_BREAK_SECONDS);
    case "stopSession":
      return stopSession();
    case "syncRules":
      await syncBlockingRules();
      return {};
    case "requestHostAccess":
      return requestHostAccess(message.host);
    case "getState":
      return getFullState();
    default:
      throw new Error("Unknown action");
  }
}

async function getFullState() {
  const settings = await getSettings();
  const session = await getSession();
  return { ...settings, ...session };
}

async function startFocus(seconds) {
  const duration = Number(seconds);
  if (!Number.isFinite(duration) || duration < 60) {
    throw new Error("Focus sessions must be at least 1 minute.");
  }

  const settings = await getSettings();
  if (settings.blockedSites.length > 0) {
    const granted = await ensureHostsAccess(settings.blockedSites);
    if (!granted) {
      throw new Error(
        "Allow site access when prompted so Focus Booster can block distractions during your session.",
      );
    }
  }

  await chrome.alarms.clear(ALARM_FOCUS);
  await chrome.alarms.clear(ALARM_BREAK);

  const timerEnd = Date.now() + duration * 1000;
  await chrome.storage.local.set({
    sessionActive: true,
    sessionType: "focus",
    timerEnd,
    durationSeconds: duration,
  });

  await chrome.alarms.create(ALARM_FOCUS, { when: timerEnd });
  await syncBlockingRules();
  return { timerEnd, sessionType: "focus" };
}

async function startBreak(seconds) {
  const duration = Number(seconds);
  if (!Number.isFinite(duration) || duration < 60) {
    throw new Error("Breaks must be at least 1 minute.");
  }

  await chrome.alarms.clear(ALARM_FOCUS);
  await chrome.alarms.clear(ALARM_BREAK);

  const timerEnd = Date.now() + duration * 1000;
  await chrome.storage.local.set({
    sessionActive: true,
    sessionType: "break",
    timerEnd,
    durationSeconds: duration,
  });

  await chrome.alarms.create(ALARM_BREAK, { when: timerEnd });
  await syncBlockingRules();
  return { timerEnd, sessionType: "break" };
}

async function stopSession() {
  await chrome.alarms.clear(ALARM_FOCUS);
  await chrome.alarms.clear(ALARM_BREAK);
  await chrome.storage.local.set({
    sessionActive: false,
    sessionType: null,
    timerEnd: null,
    durationSeconds: null,
  });
  await syncBlockingRules();
  return {};
}

async function completeFocusSession() {
  const settings = await getSettings();
  const streakUpdate = computeStreakUpdate(settings);

  await chrome.storage.local.set({
    ...streakUpdate,
    sessionActive: false,
    sessionType: null,
    timerEnd: null,
    durationSeconds: null,
    pendingBreak: true,
  });

  await syncBlockingRules();
  await showNotification(
    "Focus session complete",
    `Great work. Streak: ${streakUpdate.streak} day${streakUpdate.streak === 1 ? "" : "s"}. Ready for a short break?`,
  );
}

async function completeBreakSession() {
  await chrome.storage.local.set({
    sessionActive: false,
    sessionType: null,
    timerEnd: null,
    durationSeconds: null,
    pendingBreak: false,
  });
  await syncBlockingRules();
  await showNotification(
    "Break over",
    "You're refreshed. Start another focus session when ready.",
  );
}

async function showNotification(title, message) {
  try {
    await chrome.notifications.create(`fb-${Date.now()}`, {
      type: "basic",
      iconUrl: "icons/icon128.png",
      title,
      message,
      priority: 2,
    });
  } catch (error) {
    console.warn("Notification failed", error);
  }
}

async function ensureHostsAccess(hosts) {
  const origins = hosts.flatMap((host) => originsForHost(host));
  const have = await chrome.permissions.contains({ origins });
  if (have) return true;
  return chrome.permissions.request({ origins });
}

async function requestHostAccess(host) {
  const origins = originsForHost(host);
  const granted = await chrome.permissions.request({ origins });
  return { granted };
}

/**
 * Install DNR redirect rules only while focusing (or alwaysBlock).
 * Clears orphan rules by removing every dynamic rule first.
 *
 * Serialized so overlapping callers (storage.onChanged + start/stop) cannot
 * race on getDynamicRules / updateDynamicRules.
 */
let syncBlockingRulesChain = Promise.resolve();

async function syncBlockingRules() {
  const run = () => applyBlockingRules();
  // Keep the chain alive even if a run fails.
  const scheduled = syncBlockingRulesChain.then(run, run);
  syncBlockingRulesChain = scheduled.then(
    () => undefined,
    () => undefined,
  );
  return scheduled;
}

async function applyBlockingRules() {
  const settings = await getSettings();
  const session = await getSession();
  const shouldBlock =
    settings.alwaysBlock ||
    (session.sessionActive && session.sessionType === "focus");

  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = existing.map((rule) => rule.id);

  // requestDomains matches the listed host and its subdomains
  // (e.g. youtube.com also matches www.youtube.com). See Chrome DNR docs.
  const addRules = shouldBlock
    ? allocateRuleIds(settings.blockedSites).map(({ host, id }) => ({
        id,
        priority: 1,
        action: {
          type: "redirect",
          redirect: { extensionPath: "/focus.html" },
        },
        condition: {
          requestDomains: [host],
          resourceTypes: ["main_frame"],
        },
      }))
    : [];

  try {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds,
      addRules,
    });
  } catch (error) {
    console.warn("Failed to sync blocking rules", error);
    throw error;
  }
}
