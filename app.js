const defaultState = {
  weekStart: "wednesday",
  recipes: [
    { id: 1, name: "Curry de pois chiches", time: 25, portions: 4, veggie: true, emoji: "🍛", color: "yellow", tags: ["Végétarien", "Express"] },
    { id: 2, name: "Saumon, riz & brocoli", time: 30, portions: 4, veggie: false, emoji: "🍣", color: "sage", tags: ["Équilibré"] },
    { id: 3, name: "Lasagnes aux légumes", time: 55, portions: 6, veggie: true, emoji: "🍅", color: "rose", tags: ["Végétarien", "À partager"] },
    { id: 4, name: "Poulet rôti du dimanche", time: 75, portions: 4, veggie: false, emoji: "🍗", color: "orange", tags: ["Familial"] },
    { id: 5, name: "Tacos de poisson", time: 25, portions: 4, veggie: false, emoji: "🌮", color: "orange", tags: ["Express"] },
    { id: 6, name: "Omelette du frigo", time: 15, portions: 2, veggie: true, emoji: "🍳", color: "yellow", tags: ["Anti-gaspi", "Express"] }
  ],
  meals: {
    "0-lunch": 3, "2-dinner": 5, "4-lunch": 4, "5-lunch": 1, "6-dinner": 2
  },
  shopping: [
    { id: 1, group: "Fruits & légumes", name: "Brocoli", qty: "2 têtes", checked: false },
    { id: 2, group: "Fruits & légumes", name: "Citrons verts", qty: "3", checked: false },
    { id: 3, group: "Fruits & légumes", name: "Tomates concassées", qty: "2 boîtes", checked: false },
    { id: 4, group: "Épicerie", name: "Pois chiches", qty: "400 g", checked: false },
    { id: 5, group: "Épicerie", name: "Riz basmati", qty: "500 g", checked: false },
    { id: 6, group: "Crèmerie", name: "Crème fraîche", qty: "20 cl", checked: false },
    { id: 7, group: "Poissonnerie", name: "Filets de saumon", qty: "4", checked: false },
    { id: 8, group: "Boucherie", name: "Poulet fermier", qty: "1,5 kg", checked: false }
  ],
  fridge: [
    { id: 1, name: "Œufs", qty: "6 pièces", expiry: "5 jours", soon: false, emoji: "🥚" },
    { id: 2, name: "Courgettes", qty: "2 pièces", expiry: "2 jours", soon: true, emoji: "🥒" },
    { id: 3, name: "Feta", qty: "150 g", expiry: "3 jours", soon: true, emoji: "🧀" },
    { id: 4, name: "Épinards", qty: "1 sachet", expiry: "Aujourd’hui", soon: true, emoji: "🌿" },
    { id: 5, name: "Yaourts", qty: "4 pots", expiry: "9 jours", soon: false, emoji: "🥛" },
    { id: 6, name: "Carottes", qty: "5 pièces", expiry: "12 jours", soon: false, emoji: "🥕" },
    { id: 7, name: "Comté", qty: "200 g", expiry: "18 jours", soon: false, emoji: "🧀" }
  ]
};

let state;
try { state = JSON.parse(localStorage.getItem("mijote-state")) || structuredClone(defaultState); }
catch { state = structuredClone(defaultState); }

// Migration des anciennes semaines lundi–dimanche vers mercredi–mardi.
if (state.weekStart !== "wednesday") {
  const oldToNewDay = { 0: 5, 1: 6, 2: 0, 3: 1, 4: 2, 5: 3, 6: 4 };
  state.meals = Object.fromEntries(Object.entries(state.meals || {}).map(([key, recipeId]) => {
    const [day, slot] = key.split("-");
    return [`${oldToNewDay[day]}-${slot}`, recipeId];
  }));
  state.weekStart = "wednesday";
  localStorage.setItem("mijote-state", JSON.stringify(state));
}

// Temporaire : on remplacera complètement ce tableau.
let currentDate = new Date();

// Ancien calendrier (conservé quelques minutes pendant la transition)
// const days = [
//   ["Mer.", "24"], ["Jeu.", "25"], ["Ven.", "26"], ["Sam.", "27"], ["Dim.", "28"], ["Lun.", "29"], ["Mar.", "30"]
// ];

const slotNames = { lunch: "DÉJEUNER", dinner: "DÎNER" };
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const save = () => localStorage.setItem("mijote-state", JSON.stringify(state));
function getWeekDays() {
  const dayNames = ["Dim.", "Lun.", "Mar.", "Mer.", "Jeu.", "Ven.", "Sam."];

  const start = new Date(currentDate);

  // Jour souhaité : mercredi = 3
  const wantedDay = 3;

  const diff = (start.getDay() - wantedDay + 7) % 7;
  start.setDate(start.getDate() - diff);

  const days = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);

    days.push({
    name: dayNames[d.getDay()],
    day: d.getDate(),
    date: new Date(d)
    });
  }

  return days;
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2200);
}

function navigate(view) {
  $$(".view").forEach(el => el.classList.toggle("active", el.id === view));
  $$("[data-view]").forEach(el => el.classList.toggle("active", el.dataset.view === view));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderWeek() {
  updateWeekTitle();
  updateTodayDate();

 const days = getWeekDays();
 const today = new Date();

$("#weekGrid").innerHTML = days.map((dayInfo, day) => `
    <article class="day-column ${
    dayInfo.date.toDateString() === today.toDateString()
      ? "today"
      : ""
  }">
      <header class="day-header">
      <strong>${dayInfo.name}</strong>
      <span>${dayInfo.day}</span>
      </header>
      ${["lunch", "dinner"].map(slot => renderSlot(day, slot)).join("")}
    </article>`).join("");
  $("#plannedCount").textContent = Object.keys(state.meals).length;
}

function updateWeekTitle() {
  const months = [
    "JANVIER", "FÉVRIER", "MARS", "AVRIL", "MAI", "JUIN",
    "JUILLET", "AOÛT", "SEPTEMBRE", "OCTOBRE", "NOVEMBRE", "DÉCEMBRE"
  ];

  const firstDay = new Date(currentDate);
  const diff = (firstDay.getDay() - 3 + 7) % 7;
  firstDay.setDate(firstDay.getDate() - diff);

  const lastDay = new Date(firstDay);
  lastDay.setDate(firstDay.getDate() + 6);

  $("#weekTitle").textContent =
    `DU ${firstDay.getDate()} AU ${lastDay.getDate()} ${months[lastDay.getMonth()]}`;
}

function updateTodayDate() {

  const today = new Date();

  const days = [
    "Dimanche", "Lundi", "Mardi",
    "Mercredi", "Jeudi", "Vendredi", "Samedi"
  ];

  const months = [
    "janvier", "février", "mars", "avril", "mai", "juin",
    "juillet", "août", "septembre", "octobre", "novembre", "décembre"
  ];

  $("#todayDate").textContent =
    `${days[today.getDay()]} ${today.getDate()} ${months[today.getMonth()]}`;

    const firstDay = new Date(currentDate);
    const diff = (firstDay.getDay() - 3 + 7) % 7;
    firstDay.setDate(firstDay.getDate() - diff);

    const todayIndex = Math.floor(
    (today - firstDay) / (1000 * 60 * 60 * 24)
    );

    if (todayIndex < 0 || todayIndex > 6) {
    $("#todayMeals").innerHTML = "";
    return;
    }

    const lunchKey = `${todayIndex}-lunch`;
    const dinnerKey = `${todayIndex}-dinner`;

    const lunchRecipe = state.recipes.find(
    r => r.id === state.meals[lunchKey]
    );

    const dinnerRecipe = state.recipes.find(
    r => r.id === state.meals[dinnerKey]
    );

    $("#todayMeals").innerHTML = `
    <div class="today-meal">
      <h3>🌞 Déjeuner</h3>
      ${
        lunchRecipe
          ? `
            <div class="meal-card ${lunchRecipe.color}">
              <strong>${lunchRecipe.name}</strong>
              <small>${lunchRecipe.emoji} ${lunchRecipe.time} min · ${lunchRecipe.portions} pers.</small>
            </div>
          `
          : "<p>Aucun repas prévu</p>"
      }
    </div>

    <div class="today-meal">
      <h3>🌙 Dîner</h3>
      ${
        dinnerRecipe
          ? `
            <div class="meal-card ${dinnerRecipe.color}">
              <strong>${dinnerRecipe.name}</strong>
              <small>${dinnerRecipe.emoji} ${dinnerRecipe.time} min · ${dinnerRecipe.portions} pers.</small>
            </div>
          `
          : "<p>Aucun repas prévu</p>"
      }
    </div>
  `;
}

function renderSlot(day, slot) {
  const key = `${day}-${slot}`;
  const recipe = state.recipes.find(r => r.id === state.meals[key]);
  return `<div class="meal-slot ${slot}" data-drop-meal="${key}">
  <div class="slot-label">
    ${slotNames[slot]}
    <span>${slot === "lunch" ? "☀" : "☾"}</span>
  </div>

  ${
    recipe
      ? `
        <button
          class="remove-meal"
          data-remove-meal="${key}"
          aria-label="Retirer"
        >×</button>

        ${renderMealCard(recipe)}
      `
      : `
        <button
          class="add-meal"
          data-add-meal="${key}"
          aria-label="Ajouter un repas"
        >＋</button>
      `
  }
</div>`;

}

function renderMealCard(recipe) {
  if (!recipe) {
    return `<p>Aucun repas prévu</p>`;
  }
 return `
<div class="meal-card ${recipe.color === "sage" ? "" : recipe.color}">
    <strong>${recipe.name}</strong>
    <small>
        ${recipe.emoji}
        ${recipe.time} min ·
        ${recipe.portions} pers.
    </small>
</div>
`;

}


function moveMeal(sourceKey, targetKey) {
  if (!sourceKey || !targetKey || sourceKey === targetKey || !state.meals[sourceKey]) return;
  const sourceRecipe = state.meals[sourceKey];
  const targetRecipe = state.meals[targetKey];
  state.meals[targetKey] = sourceRecipe;
  if (targetRecipe) state.meals[sourceKey] = targetRecipe;
  else delete state.meals[sourceKey];
  save();
  renderWeek();
  showToast(targetRecipe ? "Les deux repas ont été intervertis" : "Repas déplacé");
}

function clearDragStyles() {
  $$(".meal-slot.drag-over").forEach(el => el.classList.remove("drag-over"));
  $$(".meal-card.dragging").forEach(el => el.classList.remove("dragging"));
  document.body.classList.remove("touch-dragging");
  $(".touch-drag-ghost")?.remove();
}

function renderRecipes(filter = "all", query = "") {
  const recipes = state.recipes.filter(r =>
    r.name.toLowerCase().includes(query.toLowerCase()) &&
    (filter === "all" || (filter === "veggie" && r.veggie) || (filter === "quick" && r.time <= 30))
  );
  $("#recipeGrid").innerHTML = recipes.length ? recipes.map(r => `
    <article class="recipe-card">
      <div class="recipe-visual ${r.color === "sage" ? "" : r.color}">${r.emoji}</div>
      <div class="recipe-content">
        <h3>${r.name}</h3>
        <p class="recipe-meta">◷ ${r.time} min &nbsp;·&nbsp; ♙ ${r.portions} personnes</p>
        <div class="tags">${r.tags.map(t => `<span class="tag">${t}</span>`).join("")}</div>
        <div class="recipe-actions"><button data-plan-recipe="${r.id}">Planifier</button><button data-delete-recipe="${r.id}">Supprimer</button></div>
      </div>
    </article>`).join("") : `<div class="empty-state">Aucune recette ne correspond à votre recherche.</div>`;
}

function renderShopping() {
  const groups = [...new Set(state.shopping.map(i => i.group))];
  $("#shoppingList").innerHTML = groups.map(group => `
    <section class="shopping-group"><h3>${group}</h3>
      ${state.shopping.filter(i => i.group === group).map(i => `
        <label class="shopping-item ${i.checked ? "checked" : ""}">
          <input type="checkbox" data-check-item="${i.id}" ${i.checked ? "checked" : ""}>
          <span>${i.name}</span><small>${i.qty}</small>
        </label>`).join("")}
    </section>`).join("");
  const checked = state.shopping.filter(i => i.checked).length;
  const total = state.shopping.length;
  $("#progressText").textContent = `${checked} sur ${total} articles`;
  $("#progressBar").style.width = total ? `${checked / total * 100}%` : "0";
  $("#remainingCount").textContent = total - checked;
  $("#shoppingBadge").textContent = total - checked;
}

function renderFridge() {
  $("#fridgeGrid").innerHTML = state.fridge.map(f => `
    <article class="fridge-card"><span class="food-icon">${f.emoji}</span><h3>${f.name}</h3><p>${f.qty}</p>
      <span class="expiry ${f.soon ? "soon" : ""}">${f.soon ? "À utiliser · " : "Encore "}${f.expiry}</span>
    </article>`).join("");
}

function openModal(type, payload = {}) {
  const modal = $("#modal");
  const title = $("#modalTitle");
  const eyebrow = $("#modalEyebrow");
  const fields = $("#modalFields");
  const form = $("#modalForm");
  const cancelButton = $(".modal-actions .secondary-button", form);
  const submitButton = $("#modalSubmit");
  form.dataset.type = type;
  form.dataset.payload = JSON.stringify(payload);
  cancelButton.textContent = "Annuler";
  submitButton.hidden = false;
  submitButton.textContent = "Enregistrer";
  if (type === "recipe") {
    eyebrow.textContent = "NOUVELLE RECETTE"; title.textContent = "Ajouter une recette";
    fields.innerHTML = `<div class="field"><label>Nom de la recette</label><input name="name" required placeholder="Ex. Gratin de courgettes"></div>
      <div class="field-row"><div class="field"><label>Temps (minutes)</label><input name="time" type="number" min="5" value="30" required></div>
      <div class="field"><label>Portions</label><input name="portions" type="number" min="1" value="4" required></div></div>
      <div class="field"><label>Type</label><select name="veggie"><option value="false">Tous les plats</option><option value="true">Végétarien</option></select></div>`;
  } else if (type === "meal") {
    eyebrow.textContent = "PLANIFIER UN REPAS"; title.textContent = "Choisir une recette";
    fields.innerHTML = `<div class="field"><label>Recette</label><select name="recipe">${state.recipes.map(r => `<option value="${r.id}" ${r.id === payload.recipeId ? "selected" : ""}>${r.name} · ${r.time} min</option>`).join("")}</select></div>`;
  } else if (type === "shopping") {
    eyebrow.textContent = "LISTE DE COURSES"; title.textContent = "Ajouter un article";
    fields.innerHTML = `<div class="field"><label>Article</label><input name="name" required placeholder="Ex. Pain complet"></div>
      <div class="field-row"><div class="field"><label>Quantité</label><input name="qty" value="1"></div>
      <div class="field"><label>Rayon</label><select name="group"><option>Fruits & légumes</option><option>Épicerie</option><option>Crèmerie</option><option>Boucherie</option><option>Poissonnerie</option></select></div></div>`;
  } else if (type === "fridge") {
    eyebrow.textContent = "MON FRIGO"; title.textContent = "Ajouter un aliment";
    fields.innerHTML = `<div class="field"><label>Aliment</label><input name="name" required placeholder="Ex. Champignons"></div>
      <div class="field-row"><div class="field"><label>Quantité</label><input name="qty" value="1"></div>
      <div class="field"><label>À consommer dans</label><input name="expiry" value="7 jours"></div></div>`;
  } else if (type === "recipe-details") {
    const recipe = state.recipes.find(r => r.id === payload.recipeId);
    if (!recipe) return;
    eyebrow.textContent = "FICHE RECETTE";
    title.textContent = `${recipe.emoji} ${recipe.name}`;
    cancelButton.textContent = "Fermer";
    submitButton.hidden = true;
    fields.innerHTML = `
      <div class="recipe-detail-meta">
        <span>◷ ${recipe.time} min</span>
        <span>♙ ${recipe.portions} personnes</span>
        ${recipe.veggie ? "<span>☘ Végétarien</span>" : ""}
      </div>
      <div class="tags recipe-detail-tags">${recipe.tags.map(t => `<span class="tag">${t}</span>`).join("")}</div>
      <section class="recipe-detail-section">
        <h3>Ingrédients</h3>
        ${recipe.ingredients?.length
          ? `<ul>${recipe.ingredients.map(item => `<li>${item}</li>`).join("")}</ul>`
          : `<p>Les ingrédients détaillés pourront être ajoutés lors de la modification de cette recette.</p>`}
      </section>
      <section class="recipe-detail-section">
        <h3>Préparation</h3>
        ${recipe.steps?.length
          ? `<ol>${recipe.steps.map(step => `<li>${step}</li>`).join("")}</ol>`
          : `<p>La préparation détaillée n’a pas encore été renseignée.</p>`}
      </section>`;
  }
  modal.showModal();
}

$("#modalForm").addEventListener("submit", e => {
  if (e.submitter?.value === "cancel") return;
  e.preventDefault();
  const form = e.currentTarget, data = Object.fromEntries(new FormData(form));
  const type = form.dataset.type, payload = JSON.parse(form.dataset.payload || "{}");
  if (type === "recipe") {
    const id = Date.now();
    state.recipes.push({ id, name: data.name, time: +data.time, portions: +data.portions, veggie: data.veggie === "true", emoji: data.veggie === "true" ? "🥗" : "🍲", color: data.veggie === "true" ? "sage" : "orange", tags: [data.veggie === "true" ? "Végétarien" : "Maison", +data.time <= 30 ? "Express" : "À partager"].filter(Boolean) });
    renderRecipes(); showToast("Recette ajoutée à votre carnet");
  } else if (type === "meal") {
    state.meals[payload.key] = +data.recipe; renderWeek(); showToast("Repas ajouté à la semaine");
  } else if (type === "shopping") {
    state.shopping.push({ id: Date.now(), group: data.group, name: data.name, qty: data.qty, checked: false }); renderShopping(); showToast("Article ajouté à la liste");
  } else {
    state.fridge.push({ id: Date.now(), name: data.name, qty: data.qty, expiry: data.expiry, soon: false, emoji: "🥬" }); renderFridge(); showToast("Aliment rangé dans le frigo");
  }
  save(); $("#modal").close();
});

document.addEventListener("click", e => {
  const nav = e.target.closest("[data-view], [data-view-link]");
  if (nav) navigate(nav.dataset.view || nav.dataset.viewLink);
  const addMeal = e.target.closest("[data-add-meal]");
  if (addMeal) openModal("meal", { key: addMeal.dataset.addMeal });
  const removeMeal = e.target.closest("[data-remove-meal]");
  if (removeMeal) { delete state.meals[removeMeal.dataset.removeMeal]; save(); renderWeek(); showToast("Repas retiré"); }
  const planRecipe = e.target.closest("[data-plan-recipe]");
  if (planRecipe) {
    const free = [...Array(7).keys()].flatMap(d => ["lunch","dinner"].map(s => `${d}-${s}`)).find(k => !state.meals[k]);
    if (free) { state.meals[free] = +planRecipe.dataset.planRecipe; save(); renderWeek(); navigate("planning"); showToast("Recette ajoutée au prochain créneau libre"); }
    else showToast("Votre semaine est déjà complète !");
  }
  const delRecipe = e.target.closest("[data-delete-recipe]");
  if (delRecipe && confirm("Supprimer cette recette du carnet ?")) {
    const id = +delRecipe.dataset.deleteRecipe;
    state.recipes = state.recipes.filter(r => r.id !== id);
    Object.keys(state.meals).forEach(k => { if (state.meals[k] === id) delete state.meals[k]; });
    save(); renderRecipes(); renderWeek(); showToast("Recette supprimée");
  }
  const openRecipe = e.target.closest("[data-open-recipe]");
  if (openRecipe && !openRecipe.classList.contains("dragging")) {
    openModal("recipe-details", { recipeId: +openRecipe.dataset.openRecipe });
  }
});

document.addEventListener("change", e => {
  if (e.target.matches("[data-check-item]")) {
    const item = state.shopping.find(i => i.id === +e.target.dataset.checkItem);
    item.checked = e.target.checked; save(); renderShopping();
  }
});

let draggedMealKey = null;

document.addEventListener("dragstart", e => {
  const card = e.target.closest("[data-drag-meal]");
  if (!card) return;
  draggedMealKey = card.dataset.dragMeal;
  card.classList.add("dragging");
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/plain", draggedMealKey);
});

document.addEventListener("dragover", e => {
  const slot = e.target.closest("[data-drop-meal]");
  if (!slot || slot.dataset.dropMeal === draggedMealKey) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
  $$(".meal-slot.drag-over").forEach(el => {
    if (el !== slot) el.classList.remove("drag-over");
  });
  slot.classList.add("drag-over");
});

document.addEventListener("dragleave", e => {
  const slot = e.target.closest("[data-drop-meal]");
  if (slot && !slot.contains(e.relatedTarget)) slot.classList.remove("drag-over");
});

document.addEventListener("drop", e => {
  const slot = e.target.closest("[data-drop-meal]");
  if (!slot) return;
  e.preventDefault();
  const sourceKey = e.dataTransfer.getData("text/plain") || draggedMealKey;
  const targetKey = slot.dataset.dropMeal;
  clearDragStyles();
  draggedMealKey = null;
  moveMeal(sourceKey, targetKey);
});

document.addEventListener("dragend", () => {
  draggedMealKey = null;
  clearDragStyles();
});

// Glisser-déposer tactile pour téléphone et tablette.
let touchDrag = null;
document.addEventListener("pointerdown", e => {
  if (e.pointerType === "mouse") return;
  const card = e.target.closest("[data-drag-meal]");
  if (!card) return;
  touchDrag = {
    pointerId: e.pointerId,
    sourceKey: card.dataset.dragMeal,
    card,
    startX: e.clientX,
    startY: e.clientY,
    ghost: null
  };
  card.setPointerCapture(e.pointerId);
});

document.addEventListener("pointermove", e => {
  if (!touchDrag || e.pointerId !== touchDrag.pointerId) return;
  if (!touchDrag.ghost) {
    const distance = Math.hypot(e.clientX - touchDrag.startX, e.clientY - touchDrag.startY);
    if (distance < 9) return;
    const rect = touchDrag.card.getBoundingClientRect();
    const ghost = touchDrag.card.cloneNode(true);
    ghost.classList.add("touch-drag-ghost");
    ghost.removeAttribute("draggable");
    Object.assign(ghost.style, { width: `${rect.width}px`, left: `${rect.left}px`, top: `${rect.top}px` });
    document.body.appendChild(ghost);
    touchDrag.ghost = ghost;
    touchDrag.card.classList.add("dragging");
    document.body.classList.add("touch-dragging");
  }
  touchDrag.ghost.style.left = `${e.clientX - touchDrag.ghost.offsetWidth / 2}px`;
  touchDrag.ghost.style.top = `${e.clientY - touchDrag.ghost.offsetHeight / 2}px`;
  touchDrag.ghost.style.display = "none";
  const slot = document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-drop-meal]");
  touchDrag.ghost.style.display = "";
  $$(".meal-slot.drag-over").forEach(el => el.classList.toggle("drag-over", el === slot && el.dataset.dropMeal !== touchDrag.sourceKey));
  e.preventDefault();
});

document.addEventListener("pointerup", e => {
  if (!touchDrag || e.pointerId !== touchDrag.pointerId) return;
  if (!touchDrag.ghost) {
    touchDrag = null;
    return;
  }
  touchDrag.ghost.style.display = "none";
  const slot = document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-drop-meal]");
  const sourceKey = touchDrag.sourceKey;
  touchDrag = null;
  clearDragStyles();
  if (slot) moveMeal(sourceKey, slot.dataset.dropMeal);
});

document.addEventListener("pointercancel", () => {
  touchDrag = null;
  clearDragStyles();
});

$("#openRecipeModal").addEventListener("click", () => openModal("recipe"));
$("#addShopping").addEventListener("click", () => openModal("shopping"));
$("#addFridge").addEventListener("click", () => openModal("fridge"));
$("#uncheckAll").addEventListener("click", () => { state.shopping.forEach(i => i.checked = false); save(); renderShopping(); });
$("#clearWeek").addEventListener("click", () => { state.meals = {}; save(); renderWeek(); showToast("La semaine est prête à être recomposée"); });
$("#autoPlan").addEventListener("click", () => {
  const keys = [...Array(7).keys()].flatMap(d => ["lunch","dinner"].map(s => `${d}-${s}`));
  let added = 0;
  keys.filter(k => !state.meals[k]).slice(0, 5).forEach((k, i) => { state.meals[k] = state.recipes[i % state.recipes.length].id; added++; });
  save(); renderWeek(); showToast(`${added} repas ajoutés à votre semaine`);
});

let activeFilter = "all";
$$(".filter-chip").forEach(btn => btn.addEventListener("click", () => {
  $$(".filter-chip").forEach(b => b.classList.remove("active")); btn.classList.add("active");
  activeFilter = btn.dataset.filter; renderRecipes(activeFilter, $("#recipeSearch").value);
}));
$("#recipeSearch").addEventListener("input", e => renderRecipes(activeFilter, e.target.value));

$("#todayWeek").addEventListener("click", () => {
  currentDate = new Date();
  renderWeek();
  showToast("Retour à la semaine actuelle");
});
$("#prevWeek").addEventListener("click", () => {
  currentDate.setDate(currentDate.getDate() - 7);
  renderWeek();
});
$("#nextWeek").addEventListener("click", () => {
  currentDate.setDate(currentDate.getDate() + 7);
  renderWeek();
});

renderWeek();
renderRecipes();
renderShopping();
renderFridge();
