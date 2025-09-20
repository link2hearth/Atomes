
(() => {
const LayeredNumber = window.LayeredNumber;

if (!LayeredNumber) {
  console.error('LayeredNumber introuvable, impossible de démarrer le jeu.');
  return;
}

const state = {
  atoms: LayeredNumber.zero(),
  apcBase: LayeredNumber.from(1),
  apcMultiplier: LayeredNumber.from(1),
  apsBase: LayeredNumber.zero(),
  apsMultiplier: LayeredNumber.from(1),
};

const shopConfigs = [
  {
    id: 'apc-plus',
    title: '+1 Atome par Clic',
    description: 'Renforce votre interaction quantique manuelle.',
    baseCost: 15,
    costScaling: 1.25,
    onPurchase: () => {
      state.apcBase = state.apcBase.add(1);
    },
  },
  {
    id: 'aps-plus',
    title: '+1 Atome par Seconde',
    description: 'Installe un micro réacteur qui produit en continu.',
    baseCost: 35,
    costScaling: 1.3,
    onPurchase: () => {
      state.apsBase = state.apsBase.add(1);
    },
  },
  {
    id: 'apc-mult',
    title: 'Multiplicateur de Clics',
    description: 'Augmente la puissance de chaque clic via une résonance cosmique.',
    baseCost: 120,
    costScaling: 1.6,
    onPurchase: () => {
      state.apcMultiplier = state.apcMultiplier.multiply(2);
    },
  },
  {
    id: 'aps-mult',
    title: 'Champs de Production',
    description: 'Amplifie toutes vos productions passives.',
    baseCost: 180,
    costScaling: 1.65,
    onPurchase: () => {
      state.apsMultiplier = state.apsMultiplier.multiply(1.5);
    },
  },
];

const shopState = shopConfigs.map((config) => ({
  config,
  count: 0,
}));

const elements = {
  atomsTotal: document.getElementById('atoms-total'),
  aps: document.getElementById('atoms-per-sec'),
  apc: document.getElementById('atoms-per-click'),
  navButtons: Array.from(document.querySelectorAll('.nav-btn')),
  views: Array.from(document.querySelectorAll('.view')),
  atomButton: document.getElementById('atom-button'),
  atomView: document.getElementById('view-atomes'),
  shopContainer: document.getElementById('shop-items'),
  clickSound: document.getElementById('click-sound'),
};

elements.navButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.target;
    switchView(target);
  });
});

function switchView(target) {
  elements.navButtons.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.target === target);
  });
  elements.views.forEach((view) => {
    view.classList.toggle('active', view.id === `view-${target}`);
  });
}

function getAPC() {
  return state.apcBase.multiply(state.apcMultiplier);
}

function getAPS() {
  return state.apsBase.multiply(state.apsMultiplier);
}

function playClickSound() {
  const audio = elements.clickSound;
  if (!audio) return;
  audio.currentTime = 0;
  const playPromise = audio.play();
  if (playPromise && typeof playPromise.then === 'function') {
    playPromise.catch(() => {});
  }
}

function triggerAtomShake() {
  const atom = elements.atomButton;
  atom.classList.remove('shake');
  void atom.offsetWidth;
  atom.classList.add('shake');
}

function handleManualClick() {
  const gain = getAPC();
  state.atoms = state.atoms.add(gain);
  triggerAtomShake();
  playClickSound();
  updateStats();
}

elements.atomView.addEventListener('click', (event) => {
  if (!elements.atomView.classList.contains('active')) return;
  if (!event.target.closest('.atom-playground')) return;
  handleManualClick();
});

elements.atomButton.addEventListener('mousedown', (event) => {
  event.preventDefault();
});

function updateStats() {
  elements.atomsTotal.textContent = state.atoms.format();
  elements.apc.textContent = getAPC().format();
  elements.aps.textContent = getAPS().format();
  updateShopUI();
}

function calculateCost(entry) {
  const { config, count } = entry;
  const base = LayeredNumber.from(config.baseCost);
  const multiplier = Math.pow(config.costScaling, count);
  return base.multiplyScalar(multiplier);
}

function attemptPurchase(entry) {
  const cost = calculateCost(entry);
  if (!state.atoms.greaterOrEqual(cost)) return;
  state.atoms = state.atoms.subtract(cost);
  entry.count += 1;
  entry.config.onPurchase();
  updateStats();
}

function createShopCard(entry) {
  const card = document.createElement('div');
  card.className = 'shop-card';

  const title = document.createElement('div');
  title.className = 'title';
  title.textContent = entry.config.title;

  const description = document.createElement('div');
  description.className = 'description';
  description.textContent = entry.config.description;

  const owned = document.createElement('div');
  owned.className = 'owned';
  owned.textContent = 'Niveau : 0';

  const cost = document.createElement('div');
  cost.className = 'cost';

  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = 'Acheter';
  button.addEventListener('click', () => attemptPurchase(entry));

  card.appendChild(title);
  card.appendChild(description);
  card.appendChild(owned);
  card.appendChild(cost);
  card.appendChild(button);

  entry.elements = { card, owned, cost, button };
  return card;
}

function updateShopUI() {
  shopState.forEach((entry) => {
    if (!entry.elements) return;
    const cost = calculateCost(entry);
    entry.elements.cost.textContent = `Coût : ${cost.format()}`;
    entry.elements.owned.textContent = `Niveau : ${entry.count}`;
    entry.elements.button.disabled = !state.atoms.greaterOrEqual(cost);
  });
}

function renderShop() {
  elements.shopContainer.innerHTML = '';
  shopState.forEach((entry) => {
    const card = createShopCard(entry);
    elements.shopContainer.appendChild(card);
  });
  updateShopUI();
}

function gameLoop(time) {
  if (!gameLoop.last) {
    gameLoop.last = time;
  }
  const delta = Math.min(0.5, (time - gameLoop.last) / 1000);
  gameLoop.last = time;

  if (delta > 0) {
    const apsGain = getAPS().multiplyScalar(delta);
    state.atoms = state.atoms.add(apsGain);
    updateStats();
  }

  requestAnimationFrame(gameLoop);
}

renderShop();
updateStats();
requestAnimationFrame(gameLoop);
})();
