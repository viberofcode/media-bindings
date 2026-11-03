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
