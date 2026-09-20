/**
 * Sign Language Detection — Application Logic
 * Implements Upload and Fullscreen Live Camera modes with AJAX POST /predict
 */

$(document).ready(function () {
  "use strict";

  // Elements
  const $stage = $("#stage");
  const $stageContainer = $("#stageContainer");
  const $stageImage = $("#stageImage");
  const $stageVideo = $("#stageVideo");
  const $stageEmpty = $("#stageEmpty");
  const $stageLoading = $("#stageLoading");
  const $stageTab = $("#stageTab");
  const $fileInput = $("#fileInput");
  const $dropzone = $("#dropzone");
  const $btnChooseImage = $("#btnChooseImage");
  const $btnDetectSigns = $("#btnDetectSigns");
  const $btnStartCamera = $("#btnStartCamera");
  const $btnStopCamera = $("#btnStopCamera");
  const $btnToggleFullscreen = $("#btnToggleFullscreen");
  const $cameraStatusText = $("#cameraStatusText");
  const $liveIndicator = $("#liveIndicator");
  const $liveStatusText = $("#liveStatusText");
  const $liveReadoutLetter = $("#liveReadoutLetter");
  const $liveReadoutConf = $("#liveReadoutConf");
  const $noticeBox = $("#noticeBox");
  const $noticeTitle = $("#noticeTitle");
  const $noticeMessage = $("#noticeMessage");
  const $readoutLetter = $("#readoutLetter");
  const $readoutMeta = $("#readoutMeta");
  const $detectionsList = $("#detectionsList");
  const $btnHeroStartCamera = $("#btnHeroStartCamera");
  const $btnRetryCamera = $("#btnRetryCamera");
  const $liveStandbyHero = $("#liveStandbyHero");
  const $liveErrorCard = $("#liveErrorCard");
  const $liveErrorTitle = $("#liveErrorTitle");
  const $liveErrorDesc = $("#liveErrorDesc");
  const captureCanvas = document.getElementById("captureCanvas");
  const captureCtx = captureCanvas ? captureCanvas.getContext("2d") : null;

  // State
  let selectedBase64 = null;
  let mediaStream = null;
  let isLiveActive = false;
  let isRequestInFlight = false;
  let lastLiveRequestTime = 0;
  const LIVE_INTERVAL_MS = 500;
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

  // =========================================================================
  // Notice & Notification Utilities
  // =========================================================================
  function showNotice(type, title, message) {
    $noticeBox
      .removeClass("d-none notice--error notice--success")
      .addClass(type === "error" ? "notice--error" : "notice--success");
    $noticeTitle.text(title);
    $noticeMessage.text(message);
  }

  function hideNotice() {
    $noticeBox.addClass("d-none");
  }

  function setLoading(loading) {
    if (loading) {
      $stageLoading.removeClass("d-none");
      $btnDetectSigns.prop("disabled", true).attr("aria-disabled", "true");
    } else {
      $stageLoading.addClass("d-none");
      if (selectedBase64) {
        $btnDetectSigns.prop("disabled", false).removeAttr("aria-disabled");
      }
    }
  }

  // =========================================================================
  // Result Display Logic
  // =========================================================================
  function displayResults(data, isLiveMode = false) {
    hideNotice();

    // 1. Update image view
    if (isLiveMode) {
      $stageVideo.removeClass("d-none");
      $stageImage.addClass("d-none");
      $stageEmpty.addClass("d-none");
    } else if (data.image) {
      $stageImage
        .attr("src", "data:image/jpeg;base64," + data.image)
        .removeClass("d-none");
      $stageVideo.addClass("d-none");
      $stageEmpty.addClass("d-none");
    }

    const detections = data.detections || [];

    if (detections.length > 0) {
      const top = detections[0];
      const confidencePercent = Math.round(top.confidence * 100);

      // Trigger stage bracket motion and label tab
      $stage.addClass("has-result");
      $stageTab.text(`Letter ${top.label} ${confidencePercent}%`);

      // Update Live Floating HUD
      $liveReadoutLetter.text(top.label);
      $liveReadoutConf.text(`${confidencePercent}% Confident`);

      // Update Standard Readout (Upload mode)
      $readoutLetter.text(top.label);
      $readoutMeta.html(
        `Letter <strong style="color: var(--ink);">${top.label}</strong>. <span class="tabular-nums">${confidencePercent}%</span> confident.`
      );

      // Additional detections list
      $detectionsList.empty();
      if (detections.length > 1) {
        $detectionsList.removeClass("d-none");
        detections.slice(1).forEach(function (det) {
          const score = Math.round(det.confidence * 100);
          const $item = $("<li>")
            .addClass("readout__detections-item")
            .html(`<span>Sign ${det.label}</span><strong class="tabular-nums">${score}%</strong>`);
          $detectionsList.append($item);
        });
      } else {
        $detectionsList.addClass("d-none");
      }
    } else {
      // No signs detected
      $stage.removeClass("has-result");
      $stageTab.text("Letter —");
      $liveReadoutLetter.text("—");
      $liveReadoutConf.text("Scanning...");
      $readoutLetter.text("—");
      $readoutMeta.text("No sign found.");
      $detectionsList.addClass("d-none");
    }
  }

  // =========================================================================
  // Upload Mode Handler
  // =========================================================================
  function handleFile(file) {
    if (!file) return;

    hideNotice();

    // Validate type
    if (!file.type.match("image/jpeg") && !file.type.match("image/png")) {
      showNotice("error", "Wrong file type", "That file is not an image. Choose a JPG or PNG.");
      return;
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      showNotice("error", "File too large", "That image is larger than 5 MB. Choose a smaller one.");
      return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
      const dataUrl = e.target.result;
      selectedBase64 = dataUrl.split(",")[1];

      // Preview in stage
      $stageImage.attr("src", dataUrl).removeClass("d-none");
      $stageVideo.addClass("d-none");
      $stageEmpty.addClass("d-none");
      $stage.removeClass("has-result");

      $readoutLetter.text("—");
      $readoutMeta.text("Image loaded. Click Detect signs to analyze.");
      $detectionsList.addClass("d-none");

      $btnDetectSigns.prop("disabled", false).removeAttr("aria-disabled");
    };
    reader.readAsDataURL(file);
  }

  // Dropzone click and keyboard trigger
  $btnChooseImage.on("click", function () {
    $fileInput.trigger("click");
  });

  $dropzone.on("click", function (e) {
    if (e.target !== $fileInput[0]) {
      $fileInput.trigger("click");
    }
  });

  $dropzone.on("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      $fileInput.trigger("click");
    }
  });

  $fileInput.on("change", function (e) {
    const file = e.target.files[0];
    handleFile(file);
  });

  // Drag and drop events
  $dropzone.on("dragover dragenter", function (e) {
    e.preventDefault();
    e.stopPropagation();
    $dropzone.addClass("is-dragover");
  });

  $dropzone.on("dragleave dragend drop", function (e) {
    e.preventDefault();
    e.stopPropagation();
    $dropzone.removeClass("is-dragover");
  });

  $dropzone.on("drop", function (e) {
    const files = e.originalEvent.dataTransfer.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  });

  // Execute Detection API Call
  $btnDetectSigns.on("click", function () {
    if (!selectedBase64) return;

    setLoading(true);
    hideNotice();

    $.ajax({
      url: "/predict",
      type: "POST",
      contentType: "application/json",
      data: JSON.stringify({ image: selectedBase64 }),
      success: function (response) {
        setLoading(false);
        displayResults(response, false);
      },
      error: function (xhr) {
        setLoading(false);
        let errorMsg = "Detection did not finish. Check your connection and choose Detect signs again.";
        try {
          const errData = JSON.parse(xhr.responseText);
          if (errData && errData.error) {
            errorMsg = errData.error;
          }
        } catch (e) {}
        showNotice("error", "Server error", errorMsg);
      },
    });
  });

  // =========================================================================
  // Live Camera Mode Handler
  // =========================================================================
  async function startCamera() {
    hideNotice();
    $liveErrorCard.addClass("d-none");

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      $liveStandbyHero.addClass("d-none");
      $liveErrorCard.removeClass("d-none");
      $liveErrorTitle.text("Camera Not Supported");
      $liveErrorDesc.text("Your browser or URL cannot access webcams. Please make sure you are opening http://localhost:8080 or http://127.0.0.1:8080 in Google Chrome, Microsoft Edge, or Firefox.");
      return;
    }

    try {
      // First attempt with user-facing ideal resolution
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch (constraintErr) {
        console.warn("Retrying getUserMedia with basic constraints...", constraintErr);
        // Fallback to basic unconstrained video for broader PC/webcam driver compatibility
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      const videoElement = $stageVideo[0];
      videoElement.srcObject = mediaStream;
      await videoElement.play();

      $stageVideo.removeClass("d-none");
      $stageImage.addClass("d-none");
      $stageEmpty.addClass("d-none");
      $liveStandbyHero.addClass("d-none");
      $liveErrorCard.addClass("d-none");

      $btnStartCamera.addClass("d-none");
      $btnStopCamera.removeClass("d-none");
      $liveIndicator.addClass("is-live");
      $liveStatusText.text("LIVE DETECTING");
      $liveReadoutConf.text("Scanning...");

      isLiveActive = true;
      requestLiveFrame();
    } catch (err) {
      console.error("Camera access error:", err);
      let errorTitle = "Camera access error";
      let errorMsg = "Could not start video stream. Check camera permissions or browser settings.";

      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        errorTitle = "Camera Permission Blocked";
        errorMsg = "Your browser blocked camera access. Click the lock/tune icon on the left of your URL bar (top-left), set Camera to 'Allow', and click 'Retry Camera'.";
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        errorTitle = "No Webcam Detected";
        errorMsg = "No webcam was found on your PC. Please check that your webcam is plugged in or use Upload mode.";
      } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        errorTitle = "Camera In Use By Another App";
        errorMsg = "Your camera is currently locked by another app (e.g. Zoom, Teams, Skype, OBS, or another tab). Close those apps and click 'Retry Camera'.";
      } else if (err.name === "OverconstrainedError") {
        errorTitle = "Webcam Resolution Unsupported";
        errorMsg = "Your webcam could not satisfy the video resolution constraints. Please reconnect your webcam.";
      }

      $liveStandbyHero.addClass("d-none");
      $liveErrorCard.removeClass("d-none");
      $liveErrorTitle.text(errorTitle);
      $liveErrorDesc.text(errorMsg);
    }
  }

  function stopCamera() {
    isLiveActive = false;
    isRequestInFlight = false;

    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      mediaStream = null;
    }

    const videoElement = $stageVideo[0];
    if (videoElement) {
      videoElement.srcObject = null;
    }

    $stageVideo.addClass("d-none");
    $stage.removeClass("has-result");
    $liveStandbyHero.removeClass("d-none");
    $liveErrorCard.addClass("d-none");

    $btnStopCamera.addClass("d-none");
    $btnStartCamera.removeClass("d-none");
    $liveIndicator.removeClass("is-live");
    $liveStatusText.text("Camera Off");
    $liveReadoutLetter.text("—");
    $liveReadoutConf.text("Stopped");
  }

  function requestLiveFrame() {
    if (!isLiveActive || isRequestInFlight) return;

    const now = Date.now();
    const timeSinceLast = now - lastLiveRequestTime;
    if (timeSinceLast < LIVE_INTERVAL_MS) {
      setTimeout(requestLiveFrame, LIVE_INTERVAL_MS - timeSinceLast);
      return;
    }

    const video = $stageVideo[0];
    if (!video || video.readyState !== 4) {
      setTimeout(requestLiveFrame, 100);
      return;
    }

    // Capture frame scaled down to max 640 px for fast detection
    let targetWidth = video.videoWidth || 640;
    let targetHeight = video.videoHeight || 480;
    const maxDimension = 640;

    if (targetWidth > maxDimension || targetHeight > maxDimension) {
      if (targetWidth > targetHeight) {
        targetHeight = Math.round((targetHeight * maxDimension) / targetWidth);
        targetWidth = maxDimension;
      } else {
        targetWidth = Math.round((targetWidth * maxDimension) / targetHeight);
        targetHeight = maxDimension;
      }
    }

    captureCanvas.width = targetWidth;
    captureCanvas.height = targetHeight;
    captureCtx.drawImage(video, 0, 0, targetWidth, targetHeight);

    const frameDataUrl = captureCanvas.toDataURL("image/jpeg", 0.8);
    const frameBase64 = frameDataUrl.split(",")[1];

    isRequestInFlight = true;
    lastLiveRequestTime = Date.now();

    $.ajax({
      url: "/predict",
      type: "POST",
      contentType: "application/json",
      data: JSON.stringify({ image: frameBase64 }),
      success: function (response) {
        isRequestInFlight = false;
        if (isLiveActive) {
          displayResults(response, true);
          requestLiveFrame();
        }
      },
      error: function (xhr) {
        isRequestInFlight = false;
        if (isLiveActive) {
          console.warn("Live frame predict error, pausing live stream:", xhr.statusText);
          showNotice(
            "error",
            "Live detection paused",
            "Detection did not finish. Click Start camera to resume."
          );
          stopCamera();
        }
      },
    });
  }

  // Fullscreen Toggle using Browser Fullscreen API
  function toggleFullscreen() {
    const isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement);
    const targetElement = document.documentElement;

    if (!isFullscreen) {
      if (targetElement.requestFullscreen) {
        targetElement.requestFullscreen();
      } else if (targetElement.webkitRequestFullscreen) {
        targetElement.webkitRequestFullscreen();
      }
      $btnToggleFullscreen.find(".hud-btn-text").text("Exit Full Screen");
      $btnToggleFullscreen.find(".fullscreen-icon-expand").addClass("d-none");
      $btnToggleFullscreen.find(".fullscreen-icon-compress").removeClass("d-none");
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
      $btnToggleFullscreen.find(".hud-btn-text").text("Full Screen");
      $btnToggleFullscreen.find(".fullscreen-icon-expand").removeClass("d-none");
      $btnToggleFullscreen.find(".fullscreen-icon-compress").addClass("d-none");
    }
  }

  $btnToggleFullscreen.on("click", toggleFullscreen);

  function handleFullscreenChange() {
    const isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement);
    if (isFullscreen) {
      $btnToggleFullscreen.find(".hud-btn-text").text("Exit Full Screen");
      $btnToggleFullscreen.find(".fullscreen-icon-expand").addClass("d-none");
      $btnToggleFullscreen.find(".fullscreen-icon-compress").removeClass("d-none");
    } else {
      $btnToggleFullscreen.find(".hud-btn-text").text("Full Screen");
      $btnToggleFullscreen.find(".fullscreen-icon-expand").removeClass("d-none");
      $btnToggleFullscreen.find(".fullscreen-icon-compress").addClass("d-none");
    }
  }

  document.addEventListener("fullscreenchange", handleFullscreenChange);
  document.addEventListener("webkitfullscreenchange", handleFullscreenChange);

  $btnStartCamera.on("click", startCamera);
  $btnHeroStartCamera.on("click", startCamera);
  $btnRetryCamera.on("click", startCamera);
  $btnStopCamera.on("click", stopCamera);

  // Auto-release tracks on page unload or visibility change
  window.addEventListener("beforeunload", stopCamera);
  window.addEventListener("pagehide", stopCamera);
  document.addEventListener("visibilitychange", function () {
    if (document.hidden && isLiveActive) {
      stopCamera();
    }
  });
});
