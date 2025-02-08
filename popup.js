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

  // Function to update timer display
  const updateTimerDisplay = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    timerDisplay.innerText = `${minutes}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  };

  // Load and resume timer from storage
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

  // Start Timer
  startButton.addEventListener("click", () => {
    const duration = 1500; // 25 minutes in seconds
    const endTime = Date.now() + duration * 1000;

    chrome.storage.local.set({ timerEnd: endTime });
    chrome.runtime.sendMessage({ action: "startTimer", endTime });

    startBackgroundTimer();
  });

  // Function to run the background timer
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

  // Stop Timer
  const stopTimer = () => {
    clearInterval(timerInterval);
    timerInterval = null;
    chrome.storage.local.remove("timerEnd");
  };

  stopButton.addEventListener("click", stopTimer);

  // Reset Timer
  resetButton.addEventListener("click", () => {
    stopTimer();
    updateTimerDisplay(1500); // Reset to 25:00
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

// Storage for blocked sites
let blockedSites = JSON.parse(localStorage.getItem("blockedSites")) || [];

// Function to load and display blocked sites
function loadBlockedSites() {
  const siteList = document.getElementById("blocked-sites-list");
  siteList.innerHTML = "";
  blockedSites.forEach((site) => {
    const listItem = document.createElement("li");
    listItem.innerHTML = `${site} <button class="delete-btn" data-site="${site}">Delete</button>`;
    siteList.appendChild(listItem);
  });
}

// Add site to block list
document.getElementById("add-site-btn").addEventListener("click", function () {
  const siteInput = document.getElementById("site-input").value;
  if (siteInput && !blockedSites.includes(siteInput)) {
    blockedSites.push(siteInput);
    localStorage.setItem("blockedSites", JSON.stringify(blockedSites));
    loadBlockedSites();
    document.getElementById("site-input").value = "";
  }
});

// Delete site from block list
document
  .getElementById("blocked-sites-list")
  .addEventListener("click", function (event) {
    if (event.target.classList.contains("delete-btn")) {
      const site = event.target.getAttribute("data-site");
      blockedSites = blockedSites.filter((blockedSite) => blockedSite !== site);
      localStorage.setItem("blockedSites", JSON.stringify(blockedSites));
      loadBlockedSites();
    }
  });

// Redirect blocked websites during the session
function checkBlockedSites() {
  const currentUrl = window.location.hostname;
  if (blockedSites.includes(currentUrl)) {
    window.location.href = "./focus.html"; // Redirect to a focus-friendly page
  }
}

// Run check on page load
checkBlockedSites();
