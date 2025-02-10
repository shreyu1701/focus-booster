document.getElementById("new-quote").addEventListener("click", function () {
  const quotes = [
    "Focus on the goal, not the obstacle.",
    "Small steps lead to big achievements.",
    "Your focus determines your reality.",
    "Stay disciplined, stay ahead.",
  ];
  document.getElementById("quote").innerText =
    quotes[Math.floor(Math.random() * quotes.length)];
});

document.addEventListener("DOMContentLoaded", () => {
  const startButton = document.getElementById("start-timer");
  const stopButton = document.getElementById("stop-timer");
  const resetButton = document.getElementById("reset-timer");
  const timerDisplay = document.getElementById("timer");
  let timerInterval;

  const updateTimerDisplay = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    timerDisplay.innerText = `${minutes}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  };

  chrome.storage.local.get(["timerEnd"], (data) => {
    if (data.timerEnd) {
      const remainingSeconds = Math.max(
        0,
        Math.floor((data.timerEnd - Date.now()) / 1000)
      );
      updateTimerDisplay(remainingSeconds);
      if (remainingSeconds > 0) startBackgroundTimer();
    }
  });

  startButton.addEventListener("click", () => {
    const duration = 1500;
    const endTime = Date.now() + duration * 1000;

    chrome.storage.local.set({ timerEnd: endTime });
    chrome.runtime.sendMessage({ action: "startTimer", endTime });

    startBackgroundTimer();
  });

  const startBackgroundTimer = () => {
    if (timerInterval) return;
    timerInterval = setInterval(() => {
      chrome.storage.local.get(["timerEnd"], (data) => {
        const remainingSeconds = Math.max(
          0,
          Math.floor((data.timerEnd - Date.now()) / 1000)
        );
        updateTimerDisplay(remainingSeconds);
        if (remainingSeconds <= 0) stopTimer();
      });
    }, 1000);
  };

  const stopTimer = () => {
    clearInterval(timerInterval);
    timerInterval = null;
    chrome.storage.local.remove("timerEnd");
  };

  stopButton.addEventListener("click", stopTimer);

  resetButton.addEventListener("click", () => {
    stopTimer();
    updateTimerDisplay(1500);
  });
});

function showNotification() {
  chrome.notifications.create({
    type: "basic",
    iconUrl: "./icons/icon128.png",
    title: "Focus Session Completed!",
    message: "Great job! Time for a break!",
    priority: 2,
  });
}

function loadBlockedSites() {
  chrome.storage.local.get("blockedSites", (data) => {
    const blockedSitesList = document.getElementById("blocked-sites-list");
    blockedSitesList.innerHTML = "";
    (data.blockedSites || []).forEach((site) => {
      const listItem = document.createElement("li");
      listItem.innerHTML = `${site} <button class="delete-btn" data-site="${site}">Remove</button>`;
      blockedSitesList.appendChild(listItem);
    });
  });
}

document.getElementById("add-site-btn").addEventListener("click", function () {
  const siteInput = document.getElementById("site-input").value.trim();
  if (siteInput) {
    chrome.storage.local.get("blockedSites", (data) => {
      let blockedSites = data.blockedSites || [];
      if (!blockedSites.includes(siteInput)) {
        blockedSites.push(siteInput);
        chrome.storage.local.set({ blockedSites }, () => {
          chrome.runtime.sendMessage({ action: "updateRules" });
          loadBlockedSites();
          document.getElementById("site-input").value = ""; // Clear input field
        });
      }
    });
  }
});

document
  .getElementById("blocked-sites-list")
  .addEventListener("click", function (event) {
    if (event.target.classList.contains("delete-btn")) {
      const site = event.target.getAttribute("data-site");

      chrome.storage.local.get("blockedSites", (data) => {
        let blockedSites = data.blockedSites || [];
        blockedSites = blockedSites.filter(
          (blockedSite) => blockedSite !== site
        );

        chrome.storage.local.set({ blockedSites }, () => {
          chrome.runtime.sendMessage({ action: "updateRules" });
          loadBlockedSites();
        });
      });
    }
  });

document
  .getElementById("view-sites-btn")
  .addEventListener("click", function () {
    const siteList = document.getElementById("blocked-sites-list");
    siteList.style.display =
      siteList.style.display === "none" ? "block" : "none";
  });

document.addEventListener("DOMContentLoaded", loadBlockedSites);
