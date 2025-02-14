document.addEventListener("DOMContentLoaded", async () => {
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

  let { timerEnd } = await chrome.storage.local.get("timerEnd");
  if (timerEnd) {
    const remainingSeconds = Math.max(
      0,
      Math.floor((timerEnd - Date.now()) / 1000)
    );
    updateTimerDisplay(remainingSeconds);
    if (remainingSeconds > 0) startBackgroundTimer();
  }

  startButton.addEventListener("click", () => {
    const duration = 10; // 25 minutes
    const endTime = Date.now() + duration * 1000;

    chrome.storage.local.set({ timerEnd: endTime });
    chrome.runtime.sendMessage({ action: "startTimer", endTime });

    startBackgroundTimer();
  });

  function startBackgroundTimer() {
    if (timerInterval) return;

    timerInterval = setInterval(async () => {
      let { timerEnd } = await chrome.storage.local.get("timerEnd");
      const remainingSeconds = Math.max(
        0,
        Math.floor((timerEnd - Date.now()) / 1000)
      );

      updateTimerDisplay(remainingSeconds);
      if (remainingSeconds <= 0) stopTimer();
    }, 1000);
  }

  function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    chrome.storage.local.remove("timerEnd");
    chrome.runtime.sendMessage({ action: "stopTimer" });
  }

  stopButton.addEventListener("click", stopTimer);

  resetButton.addEventListener("click", () => {
    stopTimer();
    updateTimerDisplay(10); // Default 25 min
  });

  document.getElementById("new-quote").addEventListener("click", () => {
    const quotes = [
      "Focus on the goal, not the obstacle.",
      "Small steps lead to big achievements.",
      "Your focus determines your reality.",
      "Stay disciplined, stay ahead.",
    ];
    document.getElementById("quote").innerText =
      quotes[Math.floor(Math.random() * quotes.length)];
  });

  async function loadBlockedSites() {
    let { blockedSites = [] } = await chrome.storage.local.get("blockedSites");
    const blockedSitesList = document.getElementById("blocked-sites-list");
    blockedSitesList.innerHTML = "";

    blockedSites.forEach((site) => {
      const listItem = document.createElement("li");
      listItem.innerHTML = `${site} <button class="delete-btn" data-site="${site}">Remove</button>`;
      blockedSitesList.appendChild(listItem);
    });
  }

  document
    .getElementById("add-site-btn")
    .addEventListener("click", async () => {
      const siteInput = document.getElementById("site-input").value.trim();
      if (!siteInput) return;

      let { blockedSites = [] } = await chrome.storage.local.get(
        "blockedSites"
      );
      if (!blockedSites.includes(siteInput)) {
        blockedSites.push(siteInput);
        await chrome.storage.local.set({ blockedSites });
        chrome.runtime.sendMessage({ action: "updateRules" });
        loadBlockedSites();
        document.getElementById("site-input").value = "";
      }
    });

  document
    .getElementById("blocked-sites-list")
    .addEventListener("click", async (event) => {
      if (event.target.classList.contains("delete-btn")) {
        const site = event.target.getAttribute("data-site");
        let { blockedSites = [] } = await chrome.storage.local.get(
          "blockedSites"
        );

        blockedSites = blockedSites.filter(
          (blockedSite) => blockedSite !== site
        );
        await chrome.storage.local.set({ blockedSites });
        chrome.runtime.sendMessage({ action: "updateRules" });
        loadBlockedSites();
      }
    });

  document.getElementById("view-sites-btn").addEventListener("click", () => {
    const siteList = document.getElementById("blocked-sites-list");
    siteList.style.display =
      siteList.style.display === "none" ? "block" : "none";
  });

  loadBlockedSites();
});

document.getElementById("save-reward-btn").addEventListener("click", () => {
  const customReward = document
    .getElementById("custom-reward-input")
    .value.trim();
  if (customReward) {
    chrome.storage.local.set({ customReward });
    alert("Custom reward saved!");
  }
});

function showReward() {
  const rewardModal = document.getElementById("reward-modal");
  const rewardMessage = document.getElementById("reward-message");

  // Default messages
  const messages = [
    "Great job! You're unstoppable!",
    "Another session down. Keep it up!",
    "You're building an incredible focus habit!",
    "Keep going—you’re crushing it!",
  ];

  chrome.storage.local.get(["customReward", "completedSessions"], (data) => {
    const customReward = data.customReward;
    rewardMessage.innerText =
      customReward || messages[Math.floor(Math.random() * messages.length)];

    let sessions = data.completedSessions || 0;
    sessions++;
    chrome.storage.local.set({ completedSessions: sessions });

    document.getElementById(
      "badge"
    ).innerText = `Sessions Completed: ${sessions}`;
    rewardModal.style.display = "block";
  });
}
