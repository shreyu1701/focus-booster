let timerEnd = null;
let interval;

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "startTimer") {
    timerEnd = message.endTime;
    chrome.storage.local.set({ timerEnd });

    if (interval) clearInterval(interval);
    startTimer();
  }
});

function startTimer() {
  interval = setInterval(() => {
    if (!timerEnd) return;

    let remainingSeconds = Math.max(
      0,
      Math.floor((timerEnd - Date.now()) / 1000)
    );
    if (remainingSeconds <= 0) {
      clearInterval(interval);
      chrome.storage.local.remove("timerEnd");
      timerEnd = null;
      showNotification();
    }
  }, 1000);
}

// Show Chrome notification when timer ends
function showNotification() {
  chrome.notifications.create({
    type: "basic",
    iconUrl: "icon.png", // Make sure you have an icon in your extension
    title: "Focus Session Completed!",
    message: "Great job! Time for a break!",
    priority: 2,
  });
}
