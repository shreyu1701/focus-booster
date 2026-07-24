import { PRESETS, SHORT_BREAK_SECONDS } from "./lib/constants.js";
import { normalizeHostname } from "./lib/hostname.js";
import { randomQuote } from "./lib/quotes.js";
import { formatTime } from "./lib/storage.js";

const els = {
  quote: document.getElementById("quote"),
  newQuote: document.getElementById("new-quote"),
  timer: document.getElementById("timer"),
  sessionLabel: document.getElementById("session-label"),
  customMinutes: document.getElementById("custom-minutes"),
  startFocus: document.getElementById("start-focus"),
  startBreak: document.getElementById("start-break"),
  stopSession: document.getElementById("stop-session"),
  statSessions: document.getElementById("stat-sessions"),
  statStreak: document.getElementById("stat-streak"),
  alwaysBlock: document.getElementById("always-block"),
  siteInput: document.getElementById("site-input"),
  addSite: document.getElementById("add-site"),
  siteError: document.getElementById("site-error"),
  siteList: document.getElementById("blocked-sites-list"),
  status: document.getElementById("status"),
};

let tickId = null;
let selectedPreset = "25";

init();

async function init() {
  els.quote.textContent = randomQuote();
  els.newQuote.addEventListener("click", () => {
    els.quote.textContent = randomQuote();
  });

  document.querySelectorAll(".chip[data-preset]").forEach((chip) => {
    chip.addEventListener("click", async () => {
      selectedPreset = chip.dataset.preset;
      document
        .querySelectorAll(".chip[data-preset]")
        .forEach((c) => c.classList.toggle("is-active", c === chip));
      const preset = PRESETS.find((p) => p.id === selectedPreset);
      if (preset) {
        els.customMinutes.value = String(preset.seconds / 60);
        els.timer.textContent = formatTime(preset.seconds);
      }
      await chrome.storage.local.set({
        selectedPreset,
        customMinutes: Number(els.customMinutes.value),
      });
    });
  });

  els.customMinutes.addEventListener("change", async () => {
    selectedPreset = "custom";
    document
      .querySelectorAll(".chip[data-preset]")
      .forEach((c) => c.classList.remove("is-active"));
    const minutes = clampMinutes(els.customMinutes.value);
    els.customMinutes.value = String(minutes);
    els.timer.textContent = formatTime(minutes * 60);
    await chrome.storage.local.set({
      selectedPreset: "custom",
      customMinutes: minutes,
    });
  });

  els.startFocus.addEventListener("click", onStartFocus);
  els.startBreak.addEventListener("click", onStartBreak);
  els.stopSession.addEventListener("click", onStop);
  els.addSite.addEventListener("click", onAddSite);
  els.siteInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") onAddSite();
  });
  els.alwaysBlock.addEventListener("change", async () => {
    await chrome.storage.local.set({ alwaysBlock: els.alwaysBlock.checked });
    await send("syncRules");
  });
  els.siteList.addEventListener("click", onSiteListClick);

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local") refresh();
  });

  await refresh();
}

async function refresh() {
  const state = await send("getState");
  if (!state?.ok) return;

  selectedPreset = state.selectedPreset || "25";
  els.alwaysBlock.checked = Boolean(state.alwaysBlock);
  els.statSessions.textContent = String(state.completedSessions || 0);
  els.statStreak.textContent = String(state.streak || 0);
  els.customMinutes.value = String(
    state.customMinutes || PRESETS.find((p) => p.id === "25").seconds / 60,
  );

  document.querySelectorAll(".chip[data-preset]").forEach((chip) => {
    chip.classList.toggle(
      "is-active",
      selectedPreset !== "custom" && chip.dataset.preset === selectedPreset,
    );
  });

  renderSites(state.blockedSites || []);
  updateSessionUi(state);
}

function updateSessionUi(state) {
  clearInterval(tickId);
  tickId = null;

  if (state.sessionActive && state.timerEnd) {
    const label =
      state.sessionType === "break" ? "Break in progress" : "Focus in progress";
    els.sessionLabel.textContent = label;
    els.startFocus.disabled = true;
    els.startBreak.disabled = true;

    const paint = () => {
      const remaining = Math.max(
        0,
        Math.floor((state.timerEnd - Date.now()) / 1000),
      );
      els.timer.textContent = formatTime(remaining);
      if (remaining <= 0) {
        clearInterval(tickId);
        refresh();
      }
    };
    paint();
    tickId = setInterval(paint, 250);
    return;
  }

  els.startFocus.disabled = false;
  els.startBreak.disabled = false;

  if (state.pendingBreak) {
    els.sessionLabel.textContent = "Focus done — take a break?";
  } else {
    els.sessionLabel.textContent = "Idle";
  }

  const minutes = clampMinutes(els.customMinutes.value);
  els.timer.textContent = formatTime(minutes * 60);
}

function renderSites(sites) {
  els.siteList.innerHTML = "";
  if (!sites.length) {
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = "No blocked sites yet.";
    els.siteList.appendChild(empty);
    return;
  }

  for (const site of sites) {
    const li = document.createElement("li");
    li.innerHTML = `<span>${site}</span><button type="button" class="link-btn" data-remove="${site}">Remove</button>`;
    els.siteList.appendChild(li);
  }
}

async function onStartFocus() {
  setStatus("");
  const minutes = clampMinutes(els.customMinutes.value);
  const result = await send("startFocus", { seconds: minutes * 60 });
  if (!result.ok) {
    setStatus(result.error || "Could not start focus session.", true);
    return;
  }
  setStatus("Focus session started. Distractions sites are blocked.");
  await refresh();
}

async function onStartBreak() {
  setStatus("");
  const result = await send("startBreak", { seconds: SHORT_BREAK_SECONDS });
  if (!result.ok) {
    setStatus(result.error || "Could not start break.", true);
    return;
  }
  await chrome.storage.local.set({ pendingBreak: false });
  setStatus("Break started. Sites are unblocked.");
  await refresh();
}

async function onStop() {
  await send("stopSession");
  await chrome.storage.local.set({ pendingBreak: false });
  setStatus("Session stopped.");
  await refresh();
}

async function onAddSite() {
  setSiteError("");
  const parsed = normalizeHostname(els.siteInput.value);
  if (parsed.error) {
    setSiteError(parsed.error);
    return;
  }

  const { host } = parsed;
  const access = await send("requestHostAccess", { host });
  if (!access.ok || !access.granted) {
    setSiteError("Permission needed to block this site.");
    return;
  }

  const { blockedSites = [] } = await chrome.storage.local.get({
    blockedSites: [],
  });
  if (blockedSites.includes(host)) {
    setSiteError("That site is already on your list.");
    return;
  }

  blockedSites.push(host);
  await chrome.storage.local.set({ blockedSites });
  els.siteInput.value = "";
  setStatus(`Added ${host}.`);
  await refresh();
}

async function onSiteListClick(event) {
  const button = event.target.closest("[data-remove]");
  if (!button) return;
  const host = button.getAttribute("data-remove");
  const { blockedSites = [] } = await chrome.storage.local.get({
    blockedSites: [],
  });
  await chrome.storage.local.set({
    blockedSites: blockedSites.filter((site) => site !== host),
  });
  setStatus(`Removed ${host}.`);
  await refresh();
}

function clampMinutes(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 25;
  return Math.min(180, Math.max(1, Math.round(n)));
}

function setStatus(message, isError = false) {
  els.status.textContent = message;
  els.status.classList.toggle("is-error", isError);
}

function setSiteError(message) {
  els.siteError.hidden = !message;
  els.siteError.textContent = message;
}

function send(action, payload = {}) {
  return chrome.runtime.sendMessage({ action, ...payload });
}
