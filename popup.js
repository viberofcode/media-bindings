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

const loopTimeSlider = document.querySelector("#loop-time");
const loopTimeValue = document.querySelector("#loop-time-value");
const loopEndTimeSlider = document.querySelector("#loop-end-time");
const loopEndTimeValue = document.querySelector("#loop-end-time-value");

async function updateVideoInfo() {
  const videoTime = document.querySelector("#video-time");
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
      videoLoopState.textContent = "Unavailable";
      videoLoop.disabled = true;
      loopTimeSlider.disabled = true;
      loopTimeSlider.max = "0";
      loopTimeValue.textContent = "Unavailable";
      loopEndTimeSlider.disabled = true;
      loopEndTimeSlider.max = "0";
      loopEndTimeValue.textContent = "Unavailable";
      return;
    }

    videoTime.textContent = formatTime(result.currentTime);
    videoLoopState.textContent = result.loop ? "On" : "Off";
    videoLoop.disabled = false;
    if (Number.isFinite(result.duration)) {
      loopTimeSlider.disabled = false;
      loopTimeSlider.max = String(result.duration);
      if (document.activeElement !== loopTimeSlider) {
        loopTimeSlider.value = String(Math.min(result.loopTime, result.duration));
        loopTimeValue.textContent = formatTime(Number(loopTimeSlider.value));
      }
      loopEndTimeSlider.disabled = false;
      loopEndTimeSlider.max = String(result.duration);
      loopEndTimeSlider.min = "0";
      if (document.activeElement !== loopEndTimeSlider) {
        loopEndTimeSlider.value = String(
          Math.min(result.loopEndTime, result.duration)
        );
        loopEndTimeValue.textContent = formatTime(Number(loopEndTimeSlider.value));
      }
    } else {
      loopTimeSlider.disabled = true;
      loopTimeValue.textContent = "Unavailable";
      loopEndTimeSlider.disabled = true;
      loopEndTimeSlider.min = "0";
      loopEndTimeValue.textContent = "Unavailable";
    }
  } catch (error) {
    videoTime.textContent = "Unavailable";
    videoLoopState.textContent = "Unavailable";
    videoLoop.disabled = true;
    loopTimeSlider.disabled = true;
    loopTimeValue.textContent = "Unavailable";
    loopEndTimeSlider.disabled = true;
    loopEndTimeSlider.min = "0";
    loopEndTimeValue.textContent = "Unavailable";
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

loopTimeSlider.addEventListener("input", async () => {
  const time = Number(loopTimeSlider.value);
  loopTimeValue.textContent = formatTime(time);
  await sendMessage({
    type: "set-loop-time",
    time
  });
});

loopEndTimeSlider.addEventListener("input", async () => {
  const time = Number(loopEndTimeSlider.value);
  loopEndTimeValue.textContent = formatTime(time);
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
