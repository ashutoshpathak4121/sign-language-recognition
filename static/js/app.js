/**
 * SignalFrame AI — Modern Application Controller
 * Handles Webcam Stream Processing, Live ASL Sequence Tracking & Drag-Drop Inference
 */

$(document).ready(function () {
  "use strict";

  // Cache UI elements
  const $stageFrame = $("#stageFrame");
  const $stageImage = $("#stageImage");
  const $stageVideo = $("#stageVideo");
  const $stageStandby = $("#stageStandby");
  const $stageLoading = $("#stageLoading");
  const $stageTag = $("#stageTag");
  const $stageTagText = $("#stageTagText");
  const $hudScanline = $("#hudScanline");
  const $fileInput = $("#fileInput");
  const $dropzone = $("#dropzone");
  const $btnChooseImage = $("#btnChooseImage");
  const $btnDetectSigns = $("#btnDetectSigns");
  const $btnStartCamera = $("#btnStartCamera");
  const $btnStopCamera = $("#btnStopCamera");
  const $livePill = $("#livePill");
  const $livePillText = $("#livePillText");
  const $noticeBox = $("#noticeBox");
  const $noticeTitle = $("#noticeTitle");
  const $noticeMessage = $("#noticeMessage");
  const $btnCloseNotice = $("#btnCloseNotice");
  const $readoutLetter = $("#readoutLetter");
  const $confidenceBar = $("#confidenceBar");
  const $confidenceVal = $("#confidenceVal");
  const $readoutMeta = $("#readoutMeta");
  const $sequenceChips = $("#sequenceChips");
  const $btnClearReel = $("#btnClearReel");
  const $detectionsList = $("#detectionsList");
  const $inferenceBadge = $("#inferenceBadge");
  const captureCanvas = document.getElementById("captureCanvas");
  const captureCtx = captureCanvas ? captureCanvas.getContext("2d") : null;

  // Runtime State
  let selectedBase64 = null;
  let mediaStream = null;
  let isLiveActive = false;
  let isRequestInFlight = false;
  let recentSigns = [];
  const LIVE_INTERVAL_MS = 600;

  // =========================================================================
  // Notification Utility
  // =========================================================================
  function showNotice(title, message) {
    $noticeTitle.text(title);
    $noticeMessage.text(message);
    $noticeBox.removeClass("d-none");
  }

  function hideNotice() {
    $noticeBox.addClass("d-none");
  }

  $btnCloseNotice.on("click", hideNotice);

  function setLoading(loading) {
    if (loading) {
      $stageLoading.removeClass("d-none");
      $btnDetectSigns.prop("disabled", true);
    } else {
      $stageLoading.addClass("d-none");
      if (selectedBase64) {
        $btnDetectSigns.prop("disabled", false);
      }
    }
  }

  // =========================================================================
  // Sequence History Reel (Live Mode)
  // =========================================================================
  function appendSequenceLetter(letter) {
    if (!letter || letter === "—") return;
    
    // Avoid spamming duplicate letter if it was just added in the last second
    const last = recentSigns[recentSigns.length - 1];
    if (last === letter && recentSigns.length > 0) return;

    recentSigns.push(letter);
    if (recentSigns.length > 12) recentSigns.shift(); // keep max 12 items

    renderSequenceReel();
  }

  function renderSequenceReel() {
    if (!$sequenceChips.length) return;
    $sequenceChips.empty();

    if (recentSigns.length === 0) {
      $sequenceChips.html('<span class="chip-placeholder">No signs detected yet</span>');
      return;
    }

    recentSigns.forEach((char) => {
      const $chip = $("<span>").addClass("seq-chip").text(char);
      $sequenceChips.append($chip);
    });
  }

  $btnClearReel.on("click", function () {
    recentSigns = [];
    renderSequenceReel();
  });

  // =========================================================================
  // Display Results
  // =========================================================================
  function displayResults(data, isLiveMode = false) {
    hideNotice();

    if (!isLiveMode && data.image) {
      $stageImage
        .attr("src", "data:image/jpeg;base64," + data.image)
        .removeClass("d-none");
      if ($stageStandby.length) $stageStandby.addClass("d-none");
    }

    const detections = data.detections || [];

    if (detections.length > 0) {
      const top = detections[0];
      const score = Math.round(top.confidence * 100);

      $stageFrame.addClass("has-target");
      $stageTag.addClass("detected");
      $stageTagText.text(`DETECTED: ${top.label} (${score}%)`);

      $readoutLetter.text(top.label);
      $confidenceBar.css("width", score + "%");
      $confidenceVal.text(score + "%");

      $readoutMeta.html(`Identified ASL sign for letter <strong style="color:#FFF;">"${top.label}"</strong> with <span style="color:#06B6D4;">${score}%</span> confidence.`);
      if ($inferenceBadge.length) $inferenceBadge.text("Sign Identified");

      if (isLiveMode) {
        appendSequenceLetter(top.label);
      }

      if ($detectionsList.length) {
        $detectionsList.empty();
        if (detections.length > 1) {
          $detectionsList.removeClass("d-none");
          detections.slice(1).forEach((d) => {
            const pct = Math.round(d.confidence * 100);
            $detectionsList.append(`<li><span>Sign ${d.label}</span><strong>${pct}%</strong></li>`);
          });
        } else {
          $detectionsList.addClass("d-none");
        }
      }
    } else {
      $stageFrame.removeClass("has-target");
      $stageTag.removeClass("detected");
      $stageTagText.text(isLiveMode ? "SCANNING FEED..." : "STAGE READY");

      $readoutLetter.text("—");
      $confidenceBar.css("width", "0%");
      $confidenceVal.text("0%");
      $readoutMeta.text(isLiveMode ? "Scanning webcam for hand signs..." : "No hand sign detected in image.");
      if ($detectionsList.length) $detectionsList.addClass("d-none");
    }
  }

  // =========================================================================
  // Upload Handler
  // =========================================================================
  function handleFile(file) {
    if (!file) return;

    if (!file.type.match("image/(jpeg|png|jpg)")) {
      showNotice("Invalid File Type", "Please select a standard JPEG or PNG image.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showNotice("File Exceeds Limit", "Images must be 5 MB or smaller.");
      return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
      const dataUrl = e.target.result;
      selectedBase64 = dataUrl.split(",")[1];

      $stageImage.attr("src", dataUrl).removeClass("d-none");
      if ($stageStandby.length) $stageStandby.addClass("d-none");
      $stageFrame.removeClass("has-target");
      $stageTag.removeClass("detected");
      $stageTagText.text("IMAGE LOADED");

      $btnDetectSigns.prop("disabled", false);
      $readoutLetter.text("—");
      $confidenceBar.css("width", "0%");
      $confidenceVal.text("0%");
      $readoutMeta.text("Image loaded. Click 'Detect Signs' to run neural network inference.");
      if ($inferenceBadge.length) $inferenceBadge.text("Ready to Detect");
      hideNotice();
    };

    reader.onerror = function () {
      showNotice("Read Error", "Could not read the selected image file.");
    };

    reader.readAsDataURL(file);
  }

  $btnChooseImage.on("click", () => $fileInput.trigger("click"));
  $dropzone.on("click", (e) => {
    if (e.target !== $fileInput[0]) $fileInput.trigger("click");
  });

  $fileInput.on("change", (e) => handleFile(e.target.files[0]));

  $dropzone.on("dragover dragenter", (e) => {
    e.preventDefault();
    e.stopPropagation();
    $dropzone.addClass("is-dragover");
  });

  $dropzone.on("dragleave dragend drop", (e) => {
    e.preventDefault();
    e.stopPropagation();
    $dropzone.removeClass("is-dragover");
  });

  $dropzone.on("drop", (e) => {
    const files = e.originalEvent.dataTransfer.files;
    if (files && files.length > 0) handleFile(files[0]);
  });

  // Run Upload Prediction
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
        let errorMsg = "Detection failed. Check server logs or try another image.";
        try {
          const errData = JSON.parse(xhr.responseText);
          if (errData && errData.error) errorMsg = errData.error;
        } catch (e) {}
        showNotice("Inference Failed", errorMsg);
      },
    });
  });

  // =========================================================================
  // Live Webcam Handler
  // =========================================================================
  async function startCamera() {
    hideNotice();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showNotice("Webcam Unavailable", "Your browser does not support webcam access or needs HTTPS/localhost.");
      return;
    }

    try {
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch (constraintErr) {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      const videoElement = $stageVideo[0];
      videoElement.srcObject = mediaStream;
      await videoElement.play();

      $stageVideo.removeClass("d-none");
      if ($stageStandby.length) $stageStandby.addClass("d-none");
      if ($hudScanline.length) $hudScanline.removeClass("d-none");

      $btnStartCamera.addClass("d-none");
      $btnStopCamera.removeClass("d-none");
      $livePill.addClass("active");
      $livePillText.text("LIVE");
      $stageTagText.text("STREAM ACTIVE");
      $readoutMeta.text("Camera streaming. Hold your ASL hand sign steadily in front of the lens.");

      isLiveActive = true;
      requestLiveFrame();
    } catch (err) {
      console.error("Camera access error:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        showNotice("Camera Blocked", "Please grant camera permission in your browser's address bar settings, then click Turn On Camera.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        showNotice("No Webcam Found", "No video input device found. Please connect a webcam.");
      } else {
        showNotice("Camera Locked", "Could not start video stream. Ensure no other application (Zoom, Teams, Camera app) is using the webcam.");
      }
    }
  }

  function stopCamera() {
    isLiveActive = false;
    isRequestInFlight = false;

    if (mediaStream) {
      mediaStream.getTracks().forEach((t) => t.stop());
      mediaStream = null;
    }

    const videoElement = $stageVideo[0];
    if (videoElement) {
      videoElement.srcObject = null;
    }

    $stageVideo.addClass("d-none");
    if ($stageStandby.length) $stageStandby.removeClass("d-none");
    if ($hudScanline.length) $hudScanline.addClass("d-none");
    $stageFrame.removeClass("has-target");
    $stageTag.removeClass("detected");
    $stageTagText.text("STAGE READY");

    $btnStopCamera.addClass("d-none");
    $btnStartCamera.removeClass("d-none");
    $livePill.removeClass("active");
    $livePillText.text("OFFLINE");
    $readoutLetter.text("—");
    $confidenceBar.css("width", "0%");
    $confidenceVal.text("0%");
    $readoutMeta.text("Webcam is off. Click 'Turn On Camera' above.");
  }

  function requestLiveFrame() {
    if (!isLiveActive || isRequestInFlight) return;

    const video = $stageVideo[0];
    if (!video || video.readyState < 2 || video.videoWidth === 0) {
      setTimeout(requestLiveFrame, 100);
      return;
    }

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

    $.ajax({
      url: "/predict",
      type: "POST",
      contentType: "application/json",
      data: JSON.stringify({ image: frameBase64 }),
      success: function (response) {
        isRequestInFlight = false;
        if (isLiveActive) {
          displayResults(response, true);
          setTimeout(requestLiveFrame, LIVE_INTERVAL_MS);
        }
      },
      error: function () {
        isRequestInFlight = false;
        if (isLiveActive) {
          setTimeout(requestLiveFrame, LIVE_INTERVAL_MS * 2);
        }
      },
    });
  }

  // Event Listeners
  $btnStartCamera.on("click", startCamera);
  $btnStopCamera.on("click", stopCamera);

  // Auto clean up
  window.addEventListener("beforeunload", stopCamera);
  window.addEventListener("pagehide", stopCamera);
  document.addEventListener("visibilitychange", function () {
    if (document.hidden && isLiveActive) {
      stopCamera();
    }
  });

  // Auto-init camera if in /live mode
  const isLivePage = $("body").attr("data-mode") === "live" || window.location.pathname.endsWith("/live");
  if (isLivePage) {
    startCamera();
  }

  // =========================================================================
  // Day / Night Theme Controller
  // =========================================================================
  const $themeToggleBtn = $("#themeToggleBtn");
  const $themeText = $("#themeText");

  function updateThemeUI(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("signalframe_theme", theme);
    if (theme === "light") {
      $themeText.text("Day");
      $themeToggleBtn.attr("title", "Switch to Night Mode (Dark)");
    } else {
      $themeText.text("Night");
      $themeToggleBtn.attr("title", "Switch to Day Mode (Light)");
    }
  }

  // Initialize theme UI matching active theme
  const currentTheme = document.documentElement.getAttribute("data-theme") || "dark";
  updateThemeUI(currentTheme);

  $themeToggleBtn.on("click", function () {
    const active = document.documentElement.getAttribute("data-theme") || "dark";
    const nextTheme = active === "light" ? "dark" : "light";
    updateThemeUI(nextTheme);
  });
});

