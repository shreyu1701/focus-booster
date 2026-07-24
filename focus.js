import { randomQuote } from "./lib/quotes.js";
import { formatTime } from "./lib/storage.js";

document.getElementById("focus-quote").textContent = randomQuote();

const note = document.getElementById("session-note");

async function paintSessionNote() {
  const { sessionActive, sessionType, timerEnd } =
    await chrome.storage.local.get({
      sessionActive: false,
      sessionType: null,
      timerEnd: null,
    });

  if (sessionActive && sessionType === "focus" && timerEnd) {
    const remaining = Math.max(0, Math.floor((timerEnd - Date.now()) / 1000));
    note.textContent = `Focus time left: ${formatTime(remaining)}`;
  } else {
    note.textContent =
      "Blocking is active (Always block is on, or a focus session just ended).";
  }
}

paintSessionNote();
setInterval(paintSessionNote, 1000);

document.getElementById("back-to-work").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // Prefer closing the blocked tab. chrome:// URLs cannot be used with tabs.update.
  if (tab?.id != null) {
    try {
      await chrome.tabs.remove(tab.id);
      return;
    } catch (error) {
      console.warn("Could not close tab", error);
    }

    try {
      // Last-tab / policy fallback: leave the interstitial without chrome:// URLs.
      await chrome.tabs.update(tab.id, { url: "about:blank" });
      return;
    } catch (error) {
      console.warn("Could not navigate tab", error);
    }
  }

  window.location.replace("about:blank");
});

document.getElementById("open-popup-hint").addEventListener("click", () => {
  note.textContent =
    "Click the Focus Booster icon in the toolbar to manage your session.";
});
