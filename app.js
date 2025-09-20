const formatNumber = (value) => {
  if (value === 0) return "0";

  if (Math.abs(value) >= 1e12) {
    return value.toExponential(2).replace("e+", "e");
  }

  if (Math.abs(value) >= 1e6) {
    const units = [
      { threshold: 1e12, suffix: "T" },
      { threshold: 1e9, suffix: "G" },
      { threshold: 1e6, suffix: "M" }
    ];
    for (const unit of units) {
      if (Math.abs(value) >= unit.threshold) {
        return `${(value / unit.threshold).toFixed(2)}${unit.suffix}`;
      }
    }
  }

  if (Math.abs(value) >= 1e3) {
    return Math.round(value).toLocaleString("fr-FR");
  }

  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(2);
};

const state = {
  atoms: 0,
  aps: 0,
  apc: 1,
  multiplier: 1
};

const catalog = [
  {
    id: "apc-plus",
    name: "Amplificateur de clic",
    description: "+1 atome par clic."
  },
  {
    id: "aps-plus",
    name: "Réacteur pulsar",
    description: "+1 atome par seconde."
  },
  {
    id: "multiplier",
    name: "Chambre de fusion",
    description: "Multiplie APC et APS par 1,25."
  }
];

const shopState = {
  "apc-plus": { level: 0, baseCost: 15, costFactor: 1.35 },
  "aps-plus": { level: 0, baseCost: 25, costFactor: 1.3 },
  multiplier: { level: 0, baseCost: 120, costFactor: 1.6 }
};

const navButtons = document.querySelectorAll(".nav-btn");
const views = document.querySelectorAll(".view");
const clickZone = document.getElementById("click-zone");
const atomIcon = document.getElementById("atom-icon");
const atomCount = document.getElementById("atom-count");
const apsCount = document.getElementById("aps-count");
const apcCount = document.getElementById("apc-count");
const clickSound = document.getElementById("click-sound");
const shopContainer = document.getElementById("shop-items");

const getCost = (id) => {
  const { level, baseCost, costFactor } = shopState[id];
  return Math.ceil(baseCost * Math.pow(costFactor, level));
};

const refreshShopButtons = () => {
  if (!shopContainer) return;
  const buttons = shopContainer.querySelectorAll("button[data-item-id]");
  buttons.forEach((btn) => {
    const id = btn.dataset.itemId;
    btn.disabled = state.atoms < getCost(id);
  });
};

const updateCounters = () => {
  atomCount.textContent = formatNumber(state.atoms);
  apsCount.textContent = formatNumber(state.aps * state.multiplier);
  apcCount.textContent = formatNumber(state.apc * state.multiplier);
  refreshShopButtons();
};

const renderShop = () => {
  if (!shopContainer) return;
  shopContainer.innerHTML = "";

  catalog.forEach((item) => {
    const card = document.createElement("article");
    card.className = "shop-card";

    const title = document.createElement("h2");
    title.textContent = `${item.name} (Niv. ${shopState[item.id].level})`;

    const description = document.createElement("p");
    description.textContent = item.description;

    const costLabel = document.createElement("p");
    costLabel.textContent = `Coût : ${formatNumber(getCost(item.id))} atomes`;

    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Acheter";
    button.dataset.itemId = item.id;
    button.addEventListener("click", () => purchaseUpgrade(item.id));

    card.append(title, description, costLabel, button);
    shopContainer.append(card);
  });

  refreshShopButtons();
};

const purchaseUpgrade = (id) => {
  const cost = getCost(id);
  if (state.atoms < cost) return;

  state.atoms -= cost;
  shopState[id].level += 1;

  switch (id) {
    case "apc-plus":
      state.apc += 1;
      break;
    case "aps-plus":
      state.aps += 1;
      break;
    case "multiplier":
      state.multiplier = Math.round(state.multiplier * 125) / 100;
      break;
    default:
      break;
  }

  updateCounters();
  renderShop();
};

const handleMainClick = () => {
  const gain = state.apc * state.multiplier;
  state.atoms += gain;
  updateCounters();

  if (clickZone) {
    clickZone.setAttribute("aria-pressed", "true");
    setTimeout(() => clickZone.setAttribute("aria-pressed", "false"), 160);
  }

  if (atomIcon) {
    atomIcon.classList.remove("shake");
    void atomIcon.offsetWidth;
    atomIcon.classList.add("shake");
  }

  if (clickSound) {
    clickSound.currentTime = 0;
    const playPromise = clickSound.play();
    if (playPromise) {
      playPromise.catch(() => {});
    }
  }
};

if (clickZone) {
  clickZone.addEventListener("click", handleMainClick);
  clickZone.addEventListener("keydown", (event) => {
    if (event.code === "Space" || event.code === "Enter") {
      event.preventDefault();
      handleMainClick();
    }
  });
}

navButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    navButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    const target = btn.dataset.target;

    views.forEach((view) => {
      view.classList.toggle("active", view.id === `section-${target}`);
    });
  });
});

renderShop();
updateCounters();

setInterval(() => {
  if (state.aps > 0) {
    state.atoms += state.aps * state.multiplier;
    updateCounters();
  }
}, 1000);

setInterval(() => {
  if (!clickZone || !document.hasFocus() || state.aps <= 0) return;
  const pulse = document.createElement("span");
  pulse.className = "ambient-pulse";
  clickZone.append(pulse);
  requestAnimationFrame(() => {
    pulse.classList.add("visible");
  });
  setTimeout(() => pulse.remove(), 1200);
}, 8000);
