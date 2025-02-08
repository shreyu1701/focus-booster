document.getElementById("back-to-work").addEventListener("click", () => {
  window.close(); // Closes the tab
});

// Random motivational quotes
const quotes = [
  "Stay focused and never give up!",
  "Your goals are worth it!",
  "Work now, enjoy later!",
  "Discipline creates freedom!",
];

document.getElementById("focus-quote").innerText =
  quotes[Math.floor(Math.random() * quotes.length)];
