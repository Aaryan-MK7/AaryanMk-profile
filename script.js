(() => {
  "use strict";

  document.querySelector("#year").textContent = new Date().getFullYear();

  const projects = [...document.querySelectorAll(".project")];
  const artworks = [...document.querySelectorAll("[data-art]")];
  projects.forEach((project, index) => {
    project.addEventListener("toggle", () => {
      if (!project.open) return;
      projects.forEach((other) => {
        if (other !== project) other.open = false;
      });
      artworks.forEach((art) => {
        art.toggleAttribute("hidden", art.dataset.art !== project.dataset.project);
      });
      document.querySelector("#project-category").textContent = project.dataset.category;
      document.querySelector("#project-caption").textContent = project.dataset.caption;
      document.querySelector("#project-counter").textContent = `${String(index + 1).padStart(2, "0")} / 06`;
    });
  });

  const audio = document.querySelector("#soundtrack-audio");
  const controls = document.querySelector("#audio-controls");
  const toggle = document.querySelector("#audio-toggle");
  const mute = document.querySelector("#audio-mute");
  const volume = document.querySelector("#audio-volume");
  const seek = document.querySelector("#audio-seek");
  const time = document.querySelector("#audio-time");
  const state = document.querySelector("#soundtrack-state");
  const notice = document.querySelector("#audio-notice");
  let playRequested = false;
  let loading = false;
  let attempt = 0;
  let lastVolume = Number(volume.value);

  function formatTime(seconds) {
    if (!Number.isFinite(seconds)) return "--:--";
    const value = Math.max(0, Math.floor(seconds));
    return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
  }

  function updatePlayback() {
    const active = playRequested || !audio.paused;
    toggle.classList.toggle("is-playing", active);
    toggle.setAttribute("aria-label", `${active ? "Pause" : "Play"} In the Air Tonight`);
    state.textContent = audio.error ? "Unavailable"
      : active && loading ? "Loading…"
      : !audio.paused ? audio.muted || audio.volume === 0 ? "Playing · muted" : "Playing"
      : audio.currentTime > 0 ? "Paused" : "Sound off";
  }

  function updateTimeline() {
    const durationKnown = Number.isFinite(audio.duration) && audio.duration > 0;
    seek.disabled = !durationKnown;
    seek.value = durationKnown ? String(audio.currentTime / audio.duration * 100) : "0";
    seek.setAttribute("aria-valuetext", `${formatTime(audio.currentTime)} of ${formatTime(audio.duration)}`);
    time.textContent = `${formatTime(audio.currentTime)} / ${formatTime(audio.duration)}`;
  }

  function updateVolume() {
    const silent = audio.muted || audio.volume === 0;
    mute.classList.toggle("is-muted", silent);
    mute.setAttribute("aria-label", silent ? "Unmute soundtrack" : "Mute soundtrack");
    mute.setAttribute("aria-pressed", String(silent));
    volume.value = String(audio.muted ? 0 : audio.volume);
    volume.setAttribute("aria-valuetext", `${Math.round(Number(volume.value) * 100)} percent`);
    updatePlayback();
  }

  function showError(message) {
    playRequested = false;
    loading = false;
    notice.textContent = message;
    notice.hidden = false;
    updatePlayback();
  }

  toggle.addEventListener("click", async () => {
    const currentAttempt = ++attempt;
    notice.hidden = true;
    if (playRequested || !audio.paused) {
      playRequested = false;
      loading = false;
      audio.pause();
      updatePlayback();
      return;
    }

    if (audio.error) audio.load();
    playRequested = true;
    loading = true;
    updatePlayback();
    try {
      // Playback is requested only from this explicit user interaction.
      await audio.play();
      if (currentAttempt !== attempt) return;
      playRequested = false;
      loading = false;
      updatePlayback();
    } catch (error) {
      if (currentAttempt !== attempt) return;
      if (error.name === "AbortError") {
        playRequested = false;
        loading = false;
        updatePlayback();
        return;
      }
      showError(error.name === "NotAllowedError"
        ? "Playback was blocked by your browser. Press play to try again."
        : "The soundtrack couldn't load. Check your connection and press play to retry.");
    }
  });

  audio.addEventListener("playing", () => {
    playRequested = false;
    loading = false;
    notice.hidden = true;
    updatePlayback();
  });
  audio.addEventListener("pause", () => {
    // A queued pause from an earlier click must not cancel a newer request.
    if (playRequested) return;
    loading = false;
    updatePlayback();
  });
  audio.addEventListener("waiting", () => {
    if (audio.paused) return;
    loading = true;
    updatePlayback();
  });
  audio.addEventListener("error", () => {
    ++attempt;
    audio.pause();
    showError("The soundtrack couldn't load. Check your connection and press play to retry.");
  });
  audio.addEventListener("ended", updatePlayback);
  ["loadedmetadata", "durationchange", "timeupdate", "emptied"].forEach((event) => {
    audio.addEventListener(event, updateTimeline);
  });

  seek.addEventListener("input", () => {
    if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
    audio.currentTime = Number(seek.value) / 100 * audio.duration;
    updateTimeline();
  });
  volume.addEventListener("input", () => {
    const value = Number(volume.value);
    audio.volume = value;
    audio.muted = value === 0;
    if (value > 0) lastVolume = value;
    updateVolume();
  });
  mute.addEventListener("click", () => {
    if (audio.muted || audio.volume === 0) {
      if (audio.volume === 0) audio.volume = lastVolume;
      audio.muted = false;
    } else {
      lastVolume = audio.volume;
      audio.muted = true;
    }
    updateVolume();
  });
  audio.addEventListener("volumechange", updateVolume);
  addEventListener("pagehide", () => {
    ++attempt;
    playRequested = false;
    audio.pause();
    updatePlayback();
  });

  audio.volume = lastVolume;
  updatePlayback();
  updateTimeline();
  updateVolume();
  // Preserve native controls as a no-JavaScript fallback.
  audio.controls = false;
  audio.hidden = true;
  controls.hidden = false;
})();
