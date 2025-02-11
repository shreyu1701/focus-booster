let timerEnd = null;
let interval;
let timerStopped = false;

chrome.runtime.onMessage.addListener((message) => {
  switch (message.action) {
    case "startTimer":
      startTimer(message.endTime);
      break;
    case "stopTimer":
      stopTimer();
      break;
  }
});

async function startTimer(endTime) {
  timerEnd = endTime;
  await chrome.storage.local.set({ timerEnd });
  timerStopped = false;

  if (interval) clearInterval(interval);
  runTimer();
}

function runTimer() {
  interval = setInterval(async () => {
    if (!timerEnd) return;

    let remainingSeconds = Math.max(
      0,
      Math.floor((timerEnd - Date.now()) / 1000)
    );
    if (remainingSeconds <= 0) {
      clearInterval(interval);
      await chrome.storage.local.remove("timerEnd");
      timerEnd = null;

      if (!timerStopped) showNotification(); // Notify if not manually stopped
    }
  }, 1000);
}

async function stopTimer() {
  clearInterval(interval);
  await chrome.storage.local.remove("timerEnd");
  timerEnd = null;
  timerStopped = true;
}

function showNotification() {
  chrome.notifications.create({
    type: "basic",
    iconUrl: "/icons/icon128.png",
    title: "Focus Session Completed!",
    message: "Great job! Time for a break!",
    priority: 2,
  });
}

async function updateBlockedSites() {
  let { blockedSites = [] } = await chrome.storage.local.get("blockedSites");

  let rules = blockedSites.map((site, index) => ({
    id: index + 1,
    priority: 1,
    action: { type: "redirect", redirect: { extensionPath: "/focus.html" } },
    condition: { urlFilter: site, resourceTypes: ["main_frame"] },
  }));

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: rules.map((rule) => rule.id),
    addRules: rules,
  });
}

updateBlockedSites();

chrome.runtime.onMessage.addListener(async (message) => {
  if (message.action === "updateRules") {
    await updateBlockedSites();
  }
});
