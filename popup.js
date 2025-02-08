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

document.getElementById("start-timer").addEventListener("click", function () {
  let timeLeft = 5;
  const timerDisplay = document.getElementById("timer");
  const historyList = document.getElementById("history");
  const timerInterval = setInterval(() => {
    let minutes = Math.floor(timeLeft / 60);
    let seconds = timeLeft % 60;
    timerDisplay.innerText = `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      chrome.alarms.create("focus_timer", { delayInMinutes: 0.1 });
      let listItem = document.createElement("li");
      listItem.innerText = "Completed a 25 min session!";
      historyList.appendChild(listItem);
    }
    timeLeft--;
  }, 1000);
});

document
  .getElementById("toggle-dark-mode")
  .addEventListener("click", function () {
    document.body.classList.toggle("dark-mode");
    const isDarkMode = document.body.classList.contains("dark-mode");
    localStorage.setItem("darkMode", isDarkMode);
  });

// Load dark mode setting
if (localStorage.getItem("darkMode") === "true") {
  document.body.classList.add("dark-mode");
}
