const aboutVerseLine = document.getElementById("aboutVerseLine");
const aboutVerses = [
  "Bwana ndiye mchungaji wangu, sitapungukiwa na kitu – Zaburi 23:1",
  "Nitaweza yote katika yeye anitiaye nguvu – Wafilipi 4:13",
  "Mungu ni kimbilio letu na nguvu zetu – Zaburi 46:1",
];

if (aboutVerseLine) {
  let aboutIndex = 0;
  setInterval(() => {
    aboutIndex = (aboutIndex + 1) % aboutVerses.length;
    aboutVerseLine.style.opacity = "0.2";
    setTimeout(() => {
      aboutVerseLine.textContent = aboutVerses[aboutIndex];
      aboutVerseLine.style.opacity = "1";
    }, 280);
  }, 10000);
}

const menuToggle = document.getElementById("menuToggle");
const mainNav = document.getElementById("mainNav");

if (menuToggle && mainNav) {
  menuToggle.addEventListener("click", () => {
    mainNav.classList.toggle("open");
  });

  mainNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      mainNav.classList.remove("open");
    });
  });
}

const navLinks = document.querySelectorAll('#mainNav a[href^="#"]');
const sections = Array.from(document.querySelectorAll("main section[id]"));

const setActiveNav = () => {
  const scrollY = window.scrollY + 120;
  let currentId = "";
  sections.forEach((section) => {
    if (scrollY >= section.offsetTop) {
      currentId = section.id;
    }
  });
  navLinks.forEach((link) => {
    const href = link.getAttribute("href");
    link.classList.toggle("active", href === `#${currentId}`);
  });
};

if (navLinks.length > 0 && sections.length > 0) {
  setActiveNav();
  window.addEventListener("scroll", setActiveNav, { passive: true });
}

const heroMainImage = document.getElementById("heroMainImage");
if (heroMainImage) {
  heroMainImage.style.opacity = "1";
}

document.querySelectorAll(".about-card").forEach((card) => {
  card.addEventListener("mouseenter", () => {
    document.querySelectorAll(".about-card.active").forEach((activeCard) => activeCard.classList.remove("active"));
    card.classList.add("active");
  });
});

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if (!prefersReducedMotion && "IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.18 }
  );

  document.querySelectorAll("main .section").forEach((section) => {
    section.classList.add("reveal-on-scroll");
    revealObserver.observe(section);
  });
}

document.querySelectorAll("button[data-route]").forEach((button) => {
  button.addEventListener("click", () => {
    const route = button.getAttribute("data-route");
    if (route) {
      window.location.href = route;
    }
  });
});

const contactForm = document.getElementById("contactForm");
if (contactForm) {
  contactForm.addEventListener("submit", (event) => {
    event.preventDefault();
    alert("Asante! Ujumbe wako umepokelewa. Timu itawasiliana nawe hivi karibuni.");
    contactForm.reset();
  });
}
