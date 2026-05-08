/**
 * Image Areas sliders + Maneno ya Mungu — mzunguko wa sekunde 10, fade, fallback za Unsplash.
 */
(function () {
  var ROTATE_MS = 10000;

  var SWAHILI_VERSES = [
    "Ninaweza mambo yote katika yeye anitiaye nguvu. — Wafilipi 4:13",
    "Bwana ndiye mchungaji wangu, sitapungukiwa na kitu. — Zaburi 23:1",
    "Kwa maana jinsi hii Mungu aliupenda ulimwengu, hata akamtoa Mwana wake wa pekee. — Yohana 3:16",
    "Kwa maana hakuna lisilowezekana kwa Mungu. — Luka 1:37",
    "Amini kwa Bwana kwa moyo wako wote. — Mithali 3:5",
    "Neno lako ni taa ya miguu yangu, na mwanga wa njia yangu. — Zaburi 119:105",
    "Nami nitawapa moyo mpya, nami nitatia roho mpya ndani yenu. — Ezekieli 36:26",
    "Msiogope, kwa maana mimi ni pamoja nanyi. — Isaya 41:10",
    "Mwenyezi-Bwana ni mwema; fadhili zake ni za milele. — Zaburi 100:5",
    "Furahini katika Bwana sikuzote. — Wafilipi 4:4",
  ];

  /** Picha ya mtandani (src) inapatikana kila wakati; jaribu data-local kimya — badili ikiwa faili ipo. */
  function upgradeFromLocal(img) {
    var local = img.getAttribute("data-local");
    if (!local) return;
    var probe = new Image();
    probe.onload = function () {
      img.src = local;
      img.removeAttribute("data-local");
    };
    probe.onerror = function () {};
    probe.decoding = "async";
    probe.src = local;
  }

  /** Remote ikiisha faili (nadra), jaribu local kama bado ipo. */
  function bindRemoteErrorFallback(img) {
    img.addEventListener(
      "error",
      function () {
        var local = img.getAttribute("data-local");
        if (local && img.src.indexOf(local) === -1) {
          img.src = local;
          img.removeAttribute("data-local");
        }
      },
      { once: true }
    );
  }

  function hydrateImages(root) {
    root.querySelectorAll(".premium-slider-slide img").forEach(function (img) {
      upgradeFromLocal(img);
      bindRemoteErrorFallback(img);
    });
  }

  function syncCaption(card, slide) {
    var cap = card.querySelector(".premium-slider-caption");
    var titleEl = card.querySelector(".premium-slider-title");
    var subEl = card.querySelector(".premium-slider-sub");
    if (!slide || !titleEl || !subEl) return;
    titleEl.textContent = slide.getAttribute("data-title") || "";
    subEl.textContent = slide.getAttribute("data-sub") || "";
    if (cap) {
      cap.setAttribute("aria-label", (titleEl.textContent + ". " + subEl.textContent).trim());
    }
  }

  function initCard(card) {
    var slides = card.querySelectorAll(".premium-slider-slide");
    if (!slides.length) return;

    var idx = 0;
    slides.forEach(function (s, i) {
      s.classList.toggle("is-active", i === 0);
    });
    syncCaption(card, slides[0]);

    function next() {
      slides[idx].classList.remove("is-active");
      idx = (idx + 1) % slides.length;
      slides[idx].classList.add("is-active");
      syncCaption(card, slides[idx]);
    }

    var timer = setInterval(next, ROTATE_MS);
    card.addEventListener(
      "mouseenter",
      function () {
        clearInterval(timer);
      },
      { passive: true }
    );
    card.addEventListener(
      "mouseleave",
      function () {
        clearInterval(timer);
        timer = setInterval(next, ROTATE_MS);
      },
      { passive: true }
    );
  }

  function initVerseRotator() {
    var verseText = document.getElementById("verseText");
    var verseCountdown = document.getElementById("verseCountdown");
    if (!verseText) return;

    var index = 0;
    var secondsLeft = 10;
    var verseInterval;
    var countdownInterval;
    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function setVerse(nextIndex) {
      index = nextIndex % SWAHILI_VERSES.length;
      verseText.style.opacity = "0";
      window.setTimeout(function () {
        verseText.textContent = "“" + SWAHILI_VERSES[index] + "”";
        verseText.style.opacity = "1";
      }, reduced ? 0 : 300);
    }

    setVerse(0);
    if (verseCountdown) verseCountdown.textContent = secondsLeft + " sekunde";

    if (!reduced) {
      verseInterval = window.setInterval(function () {
        setVerse(index + 1);
        secondsLeft = 10;
        if (verseCountdown) verseCountdown.textContent = secondsLeft + " sekunde";
      }, ROTATE_MS);

      if (verseCountdown) {
        countdownInterval = window.setInterval(function () {
          secondsLeft -= 1;
          if (secondsLeft < 1) secondsLeft = 10;
          verseCountdown.textContent = secondsLeft + " sekunde";
        }, 1000);
      }
    }

    window.addEventListener(
      "pagehide",
      function () {
        clearInterval(verseInterval);
        clearInterval(countdownInterval);
      },
      { passive: true }
    );
  }

  function init() {
    initVerseRotator();
    document.querySelectorAll("[data-premium-slider]").forEach(function (card) {
      hydrateImages(card);
      initCard(card);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
