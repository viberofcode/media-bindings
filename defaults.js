(function () {
  "use strict";

  function observeMedia(applyStyles) {
    const observer = new MutationObserver(applyStyles);
    observer.observe(document, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["controls"]
    });
    applyStyles();
  }

  function scaleImageDocument() {
    const applyStyles = () => {
      const image = document.body?.querySelector("img");

      if (!image) {
        return;
      }

      document.documentElement.style.width = "100%";
      document.documentElement.style.height = "100%";
      document.documentElement.style.overflow = "hidden";
      document.body.style.width = "100%";
      document.body.style.height = "100%";
      document.body.style.margin = "0";
      document.body.style.overflow = "hidden";
      image.style.display = "block";
      image.style.width = "100%";
      image.style.height = "100%";
      image.style.objectFit = "contain";
      image.style.objectPosition = "center";
    };

    observeMedia(applyStyles);
  }

  function scaleVideoDocument() {
    const initializedVideos = new WeakSet();
    const applyStyles = () => {
      const video = document.body?.querySelector("video");

      if (!video) {
        return;
      }

      if (!initializedVideos.has(video)) {
        video.controls = false;
        initializedVideos.add(video);
      }

      document.documentElement.style.width = "100%";
      document.documentElement.style.height = "100%";
      document.documentElement.style.overflow = "hidden";
      document.body.style.width = "100%";
      document.body.style.height = "100%";
      document.body.style.margin = "0";
      document.body.style.overflow = "hidden";
      video.style.display = "block";
      video.style.setProperty("object-fit", "contain", "important");
      video.style.setProperty("object-position", "center", "important");
      video.style.setProperty("position", "fixed", "important");
      video.style.setProperty("inset", "0", "important");
      video.style.setProperty("width", "100vw", "important");
      video.style.setProperty("height", "100vh", "important");
      video.style.setProperty("max-width", "none", "important");
      video.style.setProperty("max-height", "none", "important");
      video.muted = true;
      video.loop = true;
    };

    observeMedia(applyStyles);
    window.addEventListener("load", applyStyles);
    window.addEventListener("resize", applyStyles);
  }

  if (document.contentType?.startsWith("image/")) {
    scaleImageDocument();
  } else if (document.contentType?.startsWith("video/")) {
    scaleVideoDocument();
  }
})();
