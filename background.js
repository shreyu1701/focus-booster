chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "focus_timer") {
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icons/icon128.png",
      title: "Time's up!",
      message: "Take a short break and recharge!",
    });
  }
});
