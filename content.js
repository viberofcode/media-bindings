(function () {
  "use strict";

  const FRAME_DURATION = 1 / 30;
  const PLAYBACK_RATE_STEP = 0.1;
  const MIN_PLAYBACK_RATE = 0.1;
  const MAX_PLAYBACK_RATE = 3;
  const KEY_BINDINGS = new Set([
    "j",
    "k",
    "l",
    "m",
    "arrowleft",
    "arrowright",
    "arrowup",
    "arrowdown",
    ",",
    ".",
    "f",
    "-",
    "=",
    "`"
  ]);

  let selectedVideo = null;
  let suppressSpaceKeyup = false;
  const loopSettings = new WeakMap();

  function isEditableTarget(target) {
    return target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      target instanceof HTMLElement && target.isContentEditable;
  }

  function isPercentageKey(key) {
    return /^\d$/.test(key);
  }

  function isPlayPauseKey(key, event) {
    return key === "k" || key === " " || event?.code === "Space";
  }

  function normalizeKey(key, event) {
    if (event?.code === "Minus") {
      return "-";
    }

    if (event?.code === "Equal") {
      return "=";
    }

    if (event?.code === "Backquote") {
      return "`";
    }

    return key.toLowerCase();
  }

  function getVideoRoots() {
    const roots = [document];

    for (let index = 0; index < roots.length; index += 1) {
      roots[index].querySelectorAll("*").forEach((element) => {
        if (element.shadowRoot) {
          roots.push(element.shadowRoot);
        }
      });
    }

    return roots;
  }

  function getVideos() {
    return getVideoRoots().flatMap((root) => [...root.querySelectorAll("video")]);
  }

  function getLargestVideo(videos) {
    return videos.sort((first, second) => {
      const firstRect = first.getBoundingClientRect();
      const secondRect = second.getBoundingClientRect();
      const firstArea = firstRect.width * firstRect.height ||
        first.videoWidth * first.videoHeight;
      const secondArea = secondRect.width * secondRect.height ||
        second.videoWidth * second.videoHeight;

      return secondArea - firstArea;
    })[0];
  }

  function getVideo(event) {
    const videos = getVideos();
    const eventVideo = event?.composedPath().find(
      (element) => element instanceof HTMLVideoElement
    );

    if (eventVideo) {
      return eventVideo;
    }

    if (document.activeElement instanceof HTMLVideoElement) {
      return document.activeElement;
    }

    if (selectedVideo && videos.includes(selectedVideo)) {
      return selectedVideo;
    }

    return videos.find((video) => !video.paused && !video.ended) ||
      getLargestVideo(videos);
  }

  function setPlaybackRate(video, rate) {
    video.defaultPlaybackRate = rate;
    video.playbackRate = rate;
  }

  function seek(video, seconds) {
    video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
  }

  function toggleFullscreen(video) {
    const fullscreenAction = document.fullscreenElement
      ? document.exitFullscreen()
      : video.requestFullscreen();

    fullscreenAction.catch((error) => {
      console.warn("Unable to toggle video fullscreen from the f key binding.", error);
    });
  }

  function togglePlayPause(video) {
    if (!video.paused && !video.ended) {
      video.pause();
      return;
    }

    if (video.ended) {
      video.currentTime = 0;
    }

    video.play().catch((error) => {
      console.warn("Unable to play the video from the k key binding.", error);
    });
  }

  function getCurrentVideoTime() {
    const video = getVideo();

    if (!video || !Number.isFinite(video.currentTime)) {
      return;
    }

    const settings = loopSettings.get(video);

    return {
      currentTime: video.currentTime,
      duration: Number.isFinite(video.duration) ? video.duration : undefined,
      playbackRate: Number.isFinite(video.playbackRate)
        ? video.playbackRate
        : undefined,
      loop: settings?.enabled || video.loop,
      loopTime: settings?.time || 0,
      loopEndTime: settings?.endTime ?? video.duration
    };
  }

  function getLoopSettings(video) {
    let settings = loopSettings.get(video);

    if (!settings) {
      settings = {
        enabled: false,
        time: 0,
        endTime: Number.isFinite(video.duration) ? video.duration : 0,
        timeupdateHandler: null,
        endedHandler: null,
        wrapped: false
      };
      loopSettings.set(video, settings);
    }

    return settings;
  }

  function setCustomLoop(video, enabled) {
    const settings = getLoopSettings(video);
    settings.enabled = enabled;
    video.loop = false;

    if (settings.timeupdateHandler) {
      video.removeEventListener("timeupdate", settings.timeupdateHandler);
      settings.timeupdateHandler = null;
    }

    if (settings.endedHandler) {
      video.removeEventListener("ended", settings.endedHandler);
      settings.endedHandler = null;
    }

    settings.wrapped = false;

    if (enabled) {
      settings.timeupdateHandler = () => {
        if (video.paused || settings.endTime <= settings.time && !settings.wrapped) {
          return;
        }

        if (video.currentTime < settings.endTime) {
          return;
        }

        video.currentTime = settings.time;
        settings.wrapped = false;
        video.play().catch((error) => {
          console.warn("Unable to resume the video from the custom loop.", error);
        });
      };
      video.addEventListener("timeupdate", settings.timeupdateHandler);

      settings.endedHandler = () => {
        if (settings.time <= settings.endTime) {
          video.currentTime = settings.time;
          settings.wrapped = false;
        } else {
          video.currentTime = 0;
          settings.wrapped = true;
        }

        video.play().catch((error) => {
          console.warn("Unable to resume the video from the custom loop.", error);
        });
      };
      video.addEventListener("ended", settings.endedHandler);
    }
  }

  function toggleVideoLoop() {
    const video = getVideo();

    if (!video) {
      return;
    }

    selectedVideo = video;
    const settings = getLoopSettings(video);
    setCustomLoop(video, !(settings.enabled || video.loop));
    if (settings.enabled) {
      video.currentTime = settings.time;
    }

    return {
      loop: getLoopSettings(video).enabled
    };
  }

  function setLoopTime(time) {
    const video = getVideo();

    if (!video || !Number.isFinite(video.duration) || !Number.isFinite(time)) {
      return;
    }

    selectedVideo = video;
    const settings = getLoopSettings(video);
    if (video.loop && !settings.enabled) {
      setCustomLoop(video, true);
    }
    settings.time = Math.max(0, Math.min(video.duration, time));

    return {
      loopTime: settings.time
    };
  }

  function setLoopEndTime(time) {
    const video = getVideo();

    if (!video || !Number.isFinite(video.duration) || !Number.isFinite(time)) {
      return;
    }

    selectedVideo = video;
    const settings = getLoopSettings(video);
    if (video.loop && !settings.enabled) {
      setCustomLoop(video, true);
    }
    settings.endTime = Math.max(0, Math.min(video.duration, time));

    return {
      loopEndTime: settings.endTime
    };
  }

  function handleKey(key, event) {
    const normalizedKey = normalizeKey(key, event);
    const percentageKey = isPercentageKey(normalizedKey);
    const playPauseKey = isPlayPauseKey(normalizedKey, event);
    const bindingKey = KEY_BINDINGS.has(normalizedKey) || percentageKey || playPauseKey;

    if (!bindingKey || event && isEditableTarget(event.target)) {
      return;
    }

    const video = getVideo(event);
    if (!video) {
      return;
    }

    selectedVideo = video;
    event?.preventDefault();
    event?.stopImmediatePropagation();

    if (normalizedKey === "m") {
      video.muted = !video.muted;
    } else if (normalizedKey === "j") {
      seek(video, -5);
    } else if (normalizedKey === "l") {
      seek(video, 5);
    } else if (normalizedKey === "arrowleft") {
      seek(video, -2);
    } else if (normalizedKey === "arrowright") {
      seek(video, 2);
    } else if (normalizedKey === "arrowup") {
      video.volume = Math.min(1, video.volume + 0.1);
    } else if (normalizedKey === "arrowdown") {
      video.volume = Math.max(0, video.volume - 0.1);
    } else if (normalizedKey === ",") {
      seek(video, FRAME_DURATION);
    } else if (normalizedKey === ".") {
      seek(video, -FRAME_DURATION);
    } else if (normalizedKey === "-") {
      setPlaybackRate(video, Math.max(
        MIN_PLAYBACK_RATE,
        video.playbackRate - PLAYBACK_RATE_STEP
      ));
    } else if (normalizedKey === "=") {
      setPlaybackRate(video, Math.min(
        MAX_PLAYBACK_RATE,
        video.playbackRate + PLAYBACK_RATE_STEP
      ));
    } else if (normalizedKey === "`") {
      setPlaybackRate(video, 1);
    } else if (percentageKey) {
      video.currentTime = video.duration * Number(normalizedKey) / 10;
    } else if (normalizedKey === "f") {
      toggleFullscreen(video);
    } else if (playPauseKey) {
      togglePlayPause(video);
    }

    return true;
  }

  function handleKeydown(event) {
    const handled = handleKey(event.key, event);

    if (handled && event.code === "Space") {
      suppressSpaceKeyup = true;
    }
  }

  function handleKeyup(event) {
    if (event.code !== "Space" || !suppressSpaceKeyup) {
      return;
    }

    suppressSpaceKeyup = false;
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  function handleRuntimeMessage(message) {
    if (message.type === "media-key") {
      return handleKey(message.key);
    }

    if (message.type === "get-video-time") {
      const currentVideoTime = getCurrentVideoTime();

      if (currentVideoTime === undefined) {
        return;
      }

      return Promise.resolve(currentVideoTime);
    }

    if (message.type === "toggle-video-loop") {
      const videoLoop = toggleVideoLoop();

      if (videoLoop === undefined) {
        return;
      }

      return Promise.resolve(videoLoop);
    }

    if (message.type === "set-loop-time") {
      const loopTime = setLoopTime(message.time);

      if (loopTime === undefined) {
        return;
      }

      return Promise.resolve(loopTime);
    }

    if (message.type === "set-loop-end-time") {
      const loopEndTime = setLoopEndTime(message.time);

      if (loopEndTime === undefined) {
        return;
      }

      return Promise.resolve(loopEndTime);
    }
  }

  window.addEventListener("keydown", handleKeydown, true);
  window.addEventListener("keyup", handleKeyup, true);
  browser.runtime.onMessage.addListener(handleRuntimeMessage);
})();
