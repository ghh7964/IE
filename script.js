(() => {
  "use strict";

  const CANVAS_WIDTH = 1600;
  const CANVAS_HEIGHT = 900;
  const visualDelayMs = 110;
  const sectionNames = [
    "문서 상단",
    "주제 선정 이유",
    "주제 선정 이유",
    "학교 선정 이유 · 한민고",
    "학교 선정 이유 · 경기북과학고",
    "학교 선정 이유 · 비교 가능성",
    "비교 준거 1",
    "비교 준거 2",
    "비교 준거 3"
  ];

  const deck = document.getElementById("deckFrame");
  const reportScroll = document.getElementById("reportScroll");
  const reportLocation = document.getElementById("reportLocation");
  const focusSentences = Array.from(document.querySelectorAll(".report-focus[data-step]"));
  const visualSlides = Array.from(document.querySelectorAll(".visual-slide[data-step]"));
  const prevButton = document.getElementById("prevButton");
  const nextButton = document.getElementById("nextButton");
  const fullscreenButton = document.getElementById("fullscreenButton");
  const currentSlide = document.getElementById("currentSlide");
  const totalSlides = document.getElementById("totalSlides");
  const progressBar = document.getElementById("progressBar");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let currentStep = 0;
  let visualTimer = 0;

  const twoDigits = (value) => String(value).padStart(2, "0");
  const clampStep = (value) => Math.max(0, Math.min(value, visualSlides.length - 1));

  function fitDeck() {
    const scale = Math.min(window.innerWidth / CANVAS_WIDTH, window.innerHeight / CANVAS_HEIGHT);
    deck.style.transform = `translate(-50%, -50%) scale(${scale})`;
  }

  function centerReportTargets(targets, instant) {
    if (!targets.length) {
      reportScroll.scrollTo({ top: 0, behavior: instant || reducedMotion.matches ? "auto" : "smooth" });
      return;
    }

    window.requestAnimationFrame(() => {
      const scrollRect = reportScroll.getBoundingClientRect();
      const firstRect = targets[0].getBoundingClientRect();
      const lastRect = targets[targets.length - 1].getBoundingClientRect();
      const focusCenter = (firstRect.top + lastRect.bottom) / 2;
      const renderedScale = scrollRect.height / reportScroll.clientHeight;
      const viewportCenter = scrollRect.top + scrollRect.height / 2;
      const desiredTop = reportScroll.scrollTop + (focusCenter - viewportCenter) / renderedScale;
      const maxTop = Math.max(0, reportScroll.scrollHeight - reportScroll.clientHeight);

      reportScroll.scrollTo({
        top: Math.max(0, Math.min(desiredTop, maxTop)),
        behavior: instant || reducedMotion.matches ? "auto" : "smooth"
      });
    });
  }

  function updateReport(step, instant) {
    const targets = focusSentences.filter((sentence) => Number(sentence.dataset.step) === step);
    reportScroll.classList.toggle("is-tracking", step > 0);

    focusSentences.forEach((sentence) => {
      const isActive = targets.includes(sentence);
      sentence.classList.toggle("is-active", isActive);
      if (isActive) sentence.setAttribute("aria-current", "true");
      else sentence.removeAttribute("aria-current");
    });

    reportLocation.textContent = sectionNames[step];
    centerReportTargets(targets, instant);
  }

  function updateVisual(step, instant) {
    window.clearTimeout(visualTimer);
    const activate = () => {
      visualSlides.forEach((slide) => {
        const isActive = Number(slide.dataset.step) === step;
        slide.classList.toggle("is-active", isActive);
        slide.setAttribute("aria-hidden", String(!isActive));
      });
    };

    if (instant || reducedMotion.matches) activate();
    else visualTimer = window.setTimeout(activate, visualDelayMs);
  }

  function updateControls(step) {
    currentSlide.textContent = twoDigits(step + 1);
    totalSlides.textContent = twoDigits(visualSlides.length);
    progressBar.style.width = `${((step + 1) / visualSlides.length) * 100}%`;
    prevButton.disabled = step === 0;
    nextButton.disabled = step === visualSlides.length - 1;
  }

  function updateHash(step) {
    const nextHash = `#step-${step + 1}`;
    if (window.location.hash !== nextHash) window.history.replaceState(null, "", nextHash);
  }

  function showStep(step, options = {}) {
    const nextStep = clampStep(step);
    const instant = Boolean(options.instant);
    currentStep = nextStep;
    updateReport(nextStep, instant);
    updateControls(nextStep);
    updateHash(nextStep);
    updateVisual(nextStep, instant);

    const heading = visualSlides[nextStep].querySelector("h2")?.textContent.trim() ?? "발표";
    document.title = `${nextStep + 1}/${visualSlides.length} · ${heading}`;
  }

  function next() { showStep(currentStep + 1); }
  function previous() { showStep(currentStep - 1); }

  prevButton.addEventListener("click", previous);
  nextButton.addEventListener("click", next);

  document.addEventListener("keydown", (event) => {
    if (["ArrowRight", "PageDown", " "].includes(event.key)) {
      event.preventDefault();
      next();
    } else if (["ArrowLeft", "PageUp"].includes(event.key)) {
      event.preventDefault();
      previous();
    } else if (event.key === "Home") {
      event.preventDefault();
      showStep(0);
    } else if (event.key === "End") {
      event.preventDefault();
      showStep(visualSlides.length - 1);
    } else if (event.key.toLowerCase() === "f") {
      event.preventDefault();
      toggleFullscreen();
    }
  });

  async function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch (error) {
      console.warn("전체 화면을 전환할 수 없습니다.", error);
    } finally {
      window.setTimeout(syncFullscreenUi, 180);
    }
  }

  fullscreenButton.addEventListener("click", toggleFullscreen);
  function syncFullscreenUi() {
    const isFullscreen = Boolean(document.fullscreenElement);
    document.body.classList.toggle("is-fullscreen", isFullscreen);
    fullscreenButton.textContent = isFullscreen ? "전체 화면 종료" : "전체 화면";
    fitDeck();
  }

  document.addEventListener("fullscreenchange", syncFullscreenUi);

  window.addEventListener("resize", fitDeck);
  window.addEventListener("hashchange", () => {
    const match = window.location.hash.match(/^#step-(\d+)$/);
    if (match) showStep(Number(match[1]) - 1, { instant: true });
  });

  const initialMatch = window.location.hash.match(/^#step-(\d+)$/);
  const initialStep = initialMatch ? Number(initialMatch[1]) - 1 : 0;

  fitDeck();
  showStep(initialStep, { instant: true });
  window.addEventListener("load", () => {
    window.setTimeout(() => showStep(currentStep, { instant: true }), 180);
  }, { once: true });
  if (document.fonts?.ready) {
    document.fonts.ready.then(() => showStep(currentStep, { instant: true }));
  }
  document.body.classList.add("show-hint");
  window.setTimeout(() => document.body.classList.remove("show-hint"), 3200);
})();
