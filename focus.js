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
  if (tab?.id) {
    await chrome.tabs.update(tab.id, { url: "chrome://newtab/" });
    return;
  }
  window.location.href = "chrome://newtab/";
});

document.getElementById("open-popup-hint").addEventListener("click", () => {
  note.textContent =
    "Click the Focus Booster icon in the toolbar to manage your session.";
});
