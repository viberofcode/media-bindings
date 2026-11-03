async function sendMessage(message) {
  const status = document.querySelector("#status");

  try {
    const [tab] = await browser.tabs.query({
      active: true,
      currentWindow: true
    });

    if (!tab.id) {
      throw new Error("No active tab found.");
    }

    const result = await browser.tabs.sendMessage(tab.id, message);
    if (result !== undefined) {
      status.textContent = "";
      return result;
    }

    status.textContent = "No video found on this page.";
  } catch (error) {
    status.textContent = "This page cannot receive media key bindings.";
    console.warn("Unable to send media key binding.", error);
  }
}

function formatTime(seconds) {
  const hundredths = Math.floor(seconds * 100 + Number.EPSILON);
  const minutes = Math.floor(hundredths / 6000);
  const remainingSeconds = String(Math.floor(hundredths / 100) % 60).padStart(2, "0");
  const fractionalSeconds = String(hundredths % 100).padStart(2, "0");

  return `${minutes}:${remainingSeconds}.${fractionalSeconds}`;
}

function formatPercent(currentTime, duration) {
  if (!Number.isFinite(duration) || duration <= 0) {
    return "Unavailable";
  }

  const percent = Math.min(100, Math.max(0, currentTime / duration * 100));
  return `${percent.toFixed(1)}%`;
}

function parseTime(value) {
  const trimmedValue = value.trim();
  const parts = trimmedValue.split(":");

  if (parts.length === 1 && /^\d+(\.\d+)?$/.test(trimmedValue)) {
    return Number(trimmedValue);
  }

  if (parts.length === 2 &&
      /^\d+$/.test(parts[0]) &&
      /^\d+(\.\d+)?$/.test(parts[1])) {
    const seconds = Number(parts[1]);

    if (seconds < 60) {
      return Number(parts[0]) * 60 + seconds;
    }
  }
}

const loopTimeSlider = document.querySelector("#loop-time");
const loopTimeValue = document.querySelector("#loop-time-value");
const loopTimeNow = document.querySelector("#loop-time-now");
const loopEndTimeSlider = document.querySelector("#loop-end-time");
const loopEndTimeValue = document.querySelector("#loop-end-time-value");
const loopEndTimeNow = document.querySelector("#loop-end-time-now");

async function updateVideoInfo() {
  const videoTime = document.querySelector("#video-time");
  const videoDuration = document.querySelector("#video-duration");
  const videoSpeed = document.querySelector("#video-speed");
  const videoPercent = document.querySelector("#video-percent");
  const videoLoop = document.querySelector("#video-loop");
  const videoLoopState = document.querySelector("#video-loop-state");

  try {
    const [tab] = await browser.tabs.query({
      active: true,
      currentWindow: true
    });

    if (!tab.id) {
      throw new Error("No active tab found.");
    }

    const result = await browser.tabs.sendMessage(tab.id, {
      type: "get-video-time"
    });

    if (!result || !Number.isFinite(result.currentTime)) {
      videoTime.textContent = "Unavailable";
      videoDuration.textContent = "Unavailable";
      videoSpeed.textContent = "Unavailable";
      videoPercent.textContent = "Unavailable";
      videoLoopState.textContent = "Unavailable";
      videoLoop.disabled = true;
      loopTimeSlider.disabled = true;
      loopTimeSlider.max = "0";
      loopTimeValue.value = "Unavailable";
      loopTimeValue.disabled = true;
      loopTimeNow.disabled = true;
      loopEndTimeSlider.disabled = true;
      loopEndTimeSlider.max = "0";
      loopEndTimeValue.value = "Unavailable";
      loopEndTimeValue.disabled = true;
      loopEndTimeNow.disabled = true;
      return;
    }

    videoTime.textContent = formatTime(result.currentTime);
    videoDuration.textContent = Number.isFinite(result.duration)
      ? formatTime(result.duration)
      : "Unavailable";
    videoSpeed.textContent = Number.isFinite(result.playbackRate)
      ? `${result.playbackRate.toFixed(1)}x`
      : "Unavailable";
    videoPercent.textContent = formatPercent(
      result.currentTime,
      result.duration
    );
    videoLoopState.textContent = result.loop ? "On" : "Off";
    videoLoop.disabled = false;
    if (Number.isFinite(result.duration)) {
      loopTimeSlider.disabled = false;
      loopTimeValue.disabled = false;
      loopTimeNow.disabled = false;
      loopTimeSlider.max = String(result.duration);
      if (document.activeElement !== loopTimeSlider &&
          document.activeElement !== loopTimeValue) {
        loopTimeSlider.value = String(Math.min(result.loopTime, result.duration));
        loopTimeValue.value = formatTime(Number(loopTimeSlider.value));
      }
      loopEndTimeSlider.disabled = false;
      loopEndTimeValue.disabled = false;
      loopEndTimeNow.disabled = false;
      loopEndTimeSlider.max = String(result.duration);
      loopEndTimeSlider.min = "0";
      if (document.activeElement !== loopEndTimeSlider &&
          document.activeElement !== loopEndTimeValue) {
        loopEndTimeSlider.value = String(
          Math.min(result.loopEndTime, result.duration)
        );
        loopEndTimeValue.value = formatTime(Number(loopEndTimeSlider.value));
      }
    } else {
      loopTimeSlider.disabled = true;
      loopTimeValue.disabled = true;
      loopTimeValue.value = "Unavailable";
      loopTimeNow.disabled = true;
      loopEndTimeSlider.disabled = true;
      loopEndTimeSlider.min = "0";
      loopEndTimeValue.disabled = true;
      loopEndTimeValue.value = "Unavailable";
      loopEndTimeNow.disabled = true;
    }
  } catch (error) {
    videoTime.textContent = "Unavailable";
    videoDuration.textContent = "Unavailable";
    videoSpeed.textContent = "Unavailable";
    videoLoopState.textContent = "Unavailable";
    videoLoop.disabled = true;
    loopTimeSlider.disabled = true;
    loopTimeValue.disabled = true;
    loopTimeValue.value = "Unavailable";
    loopTimeNow.disabled = true;
    loopEndTimeSlider.disabled = true;
    loopEndTimeSlider.min = "0";
    loopEndTimeValue.disabled = true;
    loopEndTimeValue.value = "Unavailable";
    loopEndTimeNow.disabled = true;
    console.warn("Unable to get current video information.", error);
  }
}

document.querySelector("#video-loop").addEventListener("click", async () => {
  const result = await sendMessage({
    type: "toggle-video-loop"
  });

  if (result && typeof result.loop === "boolean") {
    document.querySelector("#video-loop-state").textContent = result.loop ? "On" : "Off";
  }
});

async function setLoopTimeToCurrentTime(slider, value, messageType) {
  const result = await sendMessage({ type: "get-video-time" });

  if (!result || !Number.isFinite(result.currentTime) ||
      !Number.isFinite(result.duration)) {
    return;
  }

  slider.value = String(result.currentTime);
  value.value = formatTime(result.currentTime);
  await sendMessage({
    type: messageType,
    time: result.currentTime
  });
}

loopTimeNow.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  setLoopTimeToCurrentTime(loopTimeSlider, loopTimeValue, "set-loop-time");
});

loopEndTimeNow.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  setLoopTimeToCurrentTime(
    loopEndTimeSlider,
    loopEndTimeValue,
    "set-loop-end-time"
  );
});

loopTimeSlider.addEventListener("input", async () => {
  const time = Number(loopTimeSlider.value);
  loopTimeValue.value = formatTime(time);
  await sendMessage({
    type: "set-loop-time",
    time
  });
});

loopEndTimeSlider.addEventListener("input", async () => {
  const time = Number(loopEndTimeSlider.value);
  loopEndTimeValue.value = formatTime(time);
  await sendMessage({
    type: "set-loop-end-time",
    time
  });
});

loopTimeValue.addEventListener("change", async () => {
  const time = parseTime(loopTimeValue.value);
  const duration = Number(loopTimeSlider.max);

  if (!Number.isFinite(time) || !Number.isFinite(duration) || time < 0 || time > duration) {
    loopTimeValue.value = formatTime(Number(loopTimeSlider.value));
    return;
  }

  loopTimeSlider.value = String(time);
  loopTimeValue.value = formatTime(time);
  await sendMessage({
    type: "set-loop-time",
    time
  });
});

loopEndTimeValue.addEventListener("change", async () => {
  const time = parseTime(loopEndTimeValue.value);
  const duration = Number(loopEndTimeSlider.max);

  if (!Number.isFinite(time) || !Number.isFinite(duration) || time < 0 || time > duration) {
    loopEndTimeValue.value = formatTime(Number(loopEndTimeSlider.value));
    return;
  }

  loopEndTimeSlider.value = String(time);
  loopEndTimeValue.value = formatTime(time);
  await sendMessage({
    type: "set-loop-end-time",
    time
  });
});

document.querySelectorAll("button[data-key]").forEach((button) => {
  button.addEventListener("click", () => {
    sendMessage({
      type: "media-key",
      key: button.dataset.key
    });
  });
});

document.addEventListener("keydown", (event) => {
  if (event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement ||
      event.target instanceof HTMLSelectElement ||
      event.target instanceof HTMLElement && event.target.isContentEditable) {
    return;
  }

  const key = event.key === " " ? " " : event.key.toLowerCase();
  const isBindingKey = /^[0-9a-z.,=`-]$/.test(key) ||
    ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key) ||
    event.code === "Space";

  if (!isBindingKey) {
    return;
  }

  event.preventDefault();
  sendMessage({
    type: "media-key",
    key
  });
});

updateVideoInfo();
window.setInterval(updateVideoInfo, 100);
