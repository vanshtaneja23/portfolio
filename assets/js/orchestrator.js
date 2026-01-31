const navToggle = document.querySelector(".nav-toggle");
const nav = document.querySelector(".nav");
const navLinks = document.querySelectorAll(".nav a");

if (navToggle && nav) {
  navToggle.addEventListener("click", () => {
    nav.classList.toggle("open");
  });
}

navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    nav.classList.remove("open");
  });
});

const sections = Array.from(document.querySelectorAll("main section"));
const setActiveLink = () => {
  const scrollY = window.scrollY + 120;
  let activeId = sections[0]?.id;

  sections.forEach((section) => {
    if (scrollY >= section.offsetTop) {
      activeId = section.id;
    }
  });

  navLinks.forEach((link) => {
    link.classList.toggle("active", link.getAttribute("href") === `#${activeId}`);
  });
};

window.addEventListener("scroll", setActiveLink);
window.addEventListener("load", setActiveLink);

const typingTarget = document.querySelector(".typing-text");
if (typingTarget && window.Typed) {
  new Typed(".typing-text", {
    strings: [
      "distributed systems",
      "backend infrastructure",
      "event-driven platforms",
      "applied ML systems",
      "data engineering",
    ],
    typeSpeed: 45,
    backSpeed: 25,
    backDelay: 1200,
    loop: true,
  });
}

const chipContainer = document.querySelector("[data-rotate]");
if (chipContainer) {
  const chips = Array.from(chipContainer.querySelectorAll(".chip"));
  let chipIndex = 0;
  const setActiveChip = () => {
    chips.forEach((chip, index) => {
      chip.classList.toggle("active", index === chipIndex);
    });
    chipIndex = (chipIndex + 1) % chips.length;
  };
  setActiveChip();
  setInterval(setActiveChip, 1200);
}

const tabButtons = Array.from(document.querySelectorAll(".tab"));
const tabPanels = Array.from(document.querySelectorAll(".tab-panel"));
if (tabButtons.length && tabPanels.length) {
  const setActiveTab = (target) => {
    tabButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.tab === target));
    tabPanels.forEach((panel) => panel.classList.toggle("active", panel.dataset.panel === target));
  };

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => setActiveTab(btn.dataset.tab));
  });

  let autoTabIndex = 0;
  setInterval(() => {
    autoTabIndex = (autoTabIndex + 1) % tabButtons.length;
    setActiveTab(tabButtons[autoTabIndex].dataset.tab);
  }, 5000);
}

const linkCards = Array.from(document.querySelectorAll(".link-card[data-link]"));
linkCards.forEach((card) => {
  card.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      return;
    }
    const url = card.dataset.link;
    if (url) {
      window.open(url, "_blank", "noopener");
    }
  });

  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const url = card.dataset.link;
      if (url) {
        window.open(url, "_blank", "noopener");
      }
    }
  });
});
