

import {
    getAllCategories,
    getCategoryById,
    getCategoryLabel,
    getCategoryIcon
} from "./data/categories.js";

import {
    openDatabase,
    saveRecipeToDB,
    getAllRecipes,
    deleteRecipeFromDB
} from "./js/storage.js";

import { importRecipe } from "./js/import.js";

import { createRecipe } from "./js/recipe.js";




const defaultState = {
    weekStart: "wednesday",

    recipes: [],

    meals: {},

    shopping: [],

    fridge: []
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

const recipeModal = $("#recipeModal");
const openRecipeModal = $("#openRecipeModal");
const closeRecipeModal = $("#closeRecipeModal");
const cancelRecipe = $("#cancelRecipe");
const recipeSearch = $("#recipeSearch");

const ingredientsList = $("#ingredientsList");
const addIngredient = $("#addIngredient");

const stepsList = $("#stepsList");
const addStep = $("#addStep");

const recipeForm = $("#recipeForm");

const importModal = $("#importModal");
const openImportModal = $("#openImportModal");
console.log(openImportModal);
const closeImportModal = $("#closeImportModal");
const startImport = $("#startImport");
const cancelImport = $("#cancelImport");
const importRecipeText = $("#importRecipeText");




let currentRecipePhoto = "";

// Mise à jour automatique du temps total
["recipePrepTime", "recipeCookTime", "recipeRestTime"].forEach(id => {
    const input = $("#" + id);

    if (input) {
        input.addEventListener("input", updateTotalTime);
    }
});

const CATEGORIES = [
  "Apéritif",
  "Entrée",
  "Plat",
  "Accompagnement",
  "Dessert",
  "Petit-déjeuner",
  "Boisson",
  "Sauce"
];

const EQUIPMENT = [
  "Four",
  "Air Fryer",
  "Monsieur Cuisine",
  "Barbecue",
  "Plancha",
  "Cocotte",
  "Cookeo",
  "Micro-ondes",
  "Sans cuisson"
];

const OCCASIONS = [
  "Quotidien",
  "Invités",
  "Barbecue",
  "Noël",
  "Nouvel An",
  "Camping",
  "Brunch",
  "Pique-nique",
  "Vacances"
];

  const photoDropzone = $(".photo-dropzone");
  const recipePhotoInput = $("#recipePhotoInput");

  photoDropzone.addEventListener("click", () => {
    recipePhotoInput.click();
});

recipePhotoInput.addEventListener("change", () => {

    const file = recipePhotoInput.files[0];

    previewRecipePhoto(file);

});

openImportModal.addEventListener("click", () => {
    console.log("📥 clic Import");
    importRecipeText.value = "";

    importModal.classList.remove("hidden");
    requestAnimationFrame(() => {
    importRecipeText.focus();
});
    console.log(importModal);

});

closeImportModal.addEventListener("click", () => {

    importModal.classList.add("hidden");

});

cancelImport.addEventListener("click", () => {

    importModal.classList.add("hidden");

});

startImport.addEventListener("click", async () => {

    const recipe = importRecipe(importRecipeText.value);

    await addRecipe(recipe);

    importModal.classList.add("hidden");

});




function getTotalTime(recipe) {
    return (recipe.prepTime || 0)
         + (recipe.cookTime || 0)
         + (recipe.restTime || 0);
}

function loadRecipe(recipe) {

    $("#recipeName").value = recipe.name;
    $("#recipeEmoji").value = recipe.emoji;

    $("#recipePrepTime").value = recipe.prepTime;
    $("#recipeCookTime").value = recipe.cookTime;
    $("#recipeRestTime").value = recipe.restTime;

    $("#recipePortions").value = recipe.portions;

    renderCategoryChips(
        $("#recipeCategories"),
        recipe.categories ?? []
    );

    // Chargement des ingrédients
    ingredientsList.innerHTML = "";

    (recipe.ingredients ?? []).forEach(ingredient => {
        addIngredientLine(ingredient);
    });

    // Chargement des étapes
    stepsList.innerHTML = "";

    (recipe.steps ?? []).forEach(step => {
        addStepLine(step);
    });

    // Chargement de la photo
    currentRecipePhoto = recipe.photo ?? "";

    if (currentRecipePhoto) {
        recipePhotoPreview.src = currentRecipePhoto;
        recipePhotoPreview.hidden = false;
        photoPlaceholder.hidden = true;
    } else {
        recipePhotoPreview.src = "";
        recipePhotoPreview.hidden = true;
        photoPlaceholder.hidden = false;
    }

    updateTotalTime();
}

function updateTotalTime() {

    const prep = Number($("#recipePrepTime").value) || 0;
    const cook = Number($("#recipeCookTime").value) || 0;
    const rest = Number($("#recipeRestTime").value) || 0;

    const total = prep + cook + rest;

    $("#recipeTotalTime").innerHTML =
        `Temps total : <strong>${total} min</strong>`;                    
}

function previewRecipePhoto(file) {
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (event) => {

        const img = new Image();

        img.onload = () => {

          const MAX_WIDTH = 800;

          let width = img.width;
          let height = img.height;

          if (width > MAX_WIDTH) {
              height = Math.round(height * MAX_WIDTH / width);
              width = MAX_WIDTH;
          }

          

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          // Création de la photo optimisée
          currentRecipePhoto = canvas.toDataURL("image/jpeg", 0.8);

          // Aperçu
          recipePhotoPreview.src = currentRecipePhoto;
          recipePhotoPreview.hidden = false;
          photoPlaceholder.hidden = true;

          
      };

        img.src = event.target.result;
    };

    reader.readAsDataURL(file);
}

recipeForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = $("#recipeName").value.trim();
  if (!name) {
    alert("Le nom de la recette est obligatoire.");
    $("#recipeName").focus();
    return;
  }

  const emoji = $("#recipeEmoji").value.trim() || "👨‍🍳";
  const prepTime = Number($("#recipePrepTime").value);
  const cookTime = Number($("#recipeCookTime").value);
  const restTime = Number($("#recipeRestTime").value);
  const portions = Number($("#recipePortions").value);

  if (prepTime < 0 || cookTime < 0 || restTime < 0) {
    alert("Les temps ne peuvent pas être négatifs.");
    return;
}

  if (portions < 1) {
    alert("Le nombre de portions doit être supérieur à 0.");
    $("#recipePortions").focus();
    return;
  }

  
  const ingredients = [...$$(".ingredient-input")]
    .map(input => input.value.trim())
    .filter(value => value !== "");

  const steps = [...$$(".step-input")]
    .map(input => input.value.trim())
    .filter(value => value !== "");

  const recipeId = recipeForm.dataset.recipeId;
 
  const categories = [
    ...$$('#recipeCategories .chip[aria-pressed="true"]')
  ].map(chip => chip.dataset.categoryId);
  

  const recipe = createRecipe({
    
    id: recipeId || undefined,

    name,
    emoji,

    prepTime,
    cookTime,
    restTime,

    portions,

    categories,

    ingredients,
    steps,

    photo: currentRecipePhoto

});


  if (recipeId) {

    const index = state.recipes.findIndex(r => r.id == recipeId);

    if (index !== -1) {
        state.recipes[index] = recipe;

        // Sauvegarde de la recette modifiée dans IndexedDB
        await saveRecipeToDB(recipe);

        // Sauvegarde également l'état local
        save();
    }

} else {

    await addRecipe(recipe);

}

 

  $("#recipeName").value = "";
  $("#recipeEmoji").value = "";
  $("#recipePrepTime").value = 20;
  $("#recipeCookTime").value = 30;
  $("#recipeRestTime").value = 0;
  $("#recipePortions").value = 4;

  recipeModal.classList.add("hidden");
});

openRecipeModal.addEventListener("click", () => {

  // Remise à zéro du formulaire
  delete recipeForm.dataset.recipeId;
  $("#recipeModalTitle").textContent = "Nouvelle recette";
  $("#recipeModalSubtitle").textContent = "";
  $("#saveRecipe").textContent = "Enregistrer";
  $("#recipeName").value = "";
  $("#recipeEmoji").value = "";
  $("#recipePrepTime").value = 20;
  $("#recipeCookTime").value = 30;
  $("#recipeRestTime").value = 0;
  $("#recipePortions").value = 4;

  
// Affiche les catégories

renderCategoryChips($("#recipeCategories"));

  // On vide les listes
  ingredientsList.innerHTML = "";
  stepsList.innerHTML = "";

  currentRecipePhoto = "";

  recipePhotoInput.value = "";
  recipePhotoPreview.src = "";
  recipePhotoPreview.hidden = true;
  photoPlaceholder.hidden = false;

  // Une ligne par défaut
  addIngredientLine();
  addStepLine();

  recipeModal.classList.remove("hidden");
});

closeRecipeModal.addEventListener("click", () => {
  recipeModal.classList.add("hidden");
});

cancelRecipe.addEventListener("click", () => {
  recipeModal.classList.add("hidden");
});

recipeSearch.addEventListener("input", () => {
  
});

export async function addRecipe(recipe) {

    state.recipes.push(recipe);
console.log("🔎 APRÈS AJOUT :", {
    name: recipe.name,
    ingredients: recipe.ingredients,
    steps: recipe.steps
});
    await saveRecipeToDB(recipe);

    save();

    renderRecipes();

}

function addIngredientLine(value = "") {

  const row = document.createElement("div");
  row.className = "ingredient-row";

  row.innerHTML = `
        <input
            type="text"
            class="ingredient-input"
            placeholder="Ex : 500 g de farine"
            value="${value}"
        >

        <button
            type="button"
            class="icon-button remove-ingredient">
            🗑
        </button>
    `;

  const removeButton = $(".remove-ingredient", row);

  removeButton.addEventListener("click", () => {
    row.remove();
  });

  ingredientsList.appendChild(row);

  const input = $(".ingredient-input", row);
  input.addEventListener("paste", handleIngredientPaste);
  input.focus();

}

function addStepLine(value = "") {

  const row = document.createElement("div");
  row.className = "step-row";

  row.innerHTML = `
        <textarea
            class="step-input"
            placeholder="Décrivez cette étape..."
            rows="2">${value}</textarea>

        <button
            type="button"
            class="icon-button remove-step">
            🗑
        </button>
    `;

  const removeButton = $(".remove-step", row);

  removeButton.addEventListener("click", () => {
    row.remove();
  });

  stepsList.appendChild(row);

  const textarea = $(".step-input", row);
  textarea.addEventListener("paste", handleStepPaste);
  textarea.focus();
}

function handleIngredientPaste(event) {

  event.preventDefault();

  const text = event.clipboardData.getData("text");
  const currentRow = event.target.closest(".ingredient-row");
  const lines = text
    .split("\n")
    .map(line => line.trim())
    .filter(line => line !== "");

  lines.forEach(line => addIngredientLine(line));
  currentRow.remove();
}
addIngredient.addEventListener("click", () => {
  addIngredientLine();

});

addStep.addEventListener("click", () => {
  addStepLine();


});

function handleStepPaste(event) {

  event.preventDefault();

  const text = event.clipboardData.getData("text");

  const currentRow = event.target.closest(".step-row");

  const lines = text
    .split("\n")
    .map(line => line.trim())
    .filter(line => line !== "");

  lines.forEach(line => addStepLine(line));

  currentRow.remove();
}



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
    <article class="day-column ${dayInfo.date.toDateString() === today.toDateString()
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
      ${lunchRecipe
      ? `
            <div class="meal-card ${lunchRecipe.color}">
              <strong>${lunchRecipe.name}</strong>
              <small>${lunchRecipe.emoji} ${getTotalTime(lunchRecipe)} min · ${lunchRecipe.portions} pers.</small>
            </div>
          `
      : "<p>Aucun repas prévu</p>"
    }
    </div>

    <div class="today-meal">
      <h3>🌙 Dîner</h3>
      ${dinnerRecipe
      ? `
            <div class="meal-card ${dinnerRecipe.color}">
              <strong>${dinnerRecipe.name}</strong>
              <small>${dinnerRecipe.emoji} ${getTotalTime(dinnerRecipe)} min · ${dinnerRecipe.portions} pers.</small>
            </div>
          `
      : "<p>Aucun repas prévu</p>"
    }
    </div>
  `;
}

function renderSlot(day, slot) {
  const key = `${day}-${slot}`;
  
  const recipe = state.recipes.find(
    r => String(r.id) === String(state.meals[key])
  );
  return `<div class="meal-slot ${slot}" data-drop-meal="${key}">
  <div class="slot-label">
    ${slotNames[slot]}
    <span>${slot === "lunch" ? "☀" : "☾"}</span>
  </div>

  ${recipe
      ? `
        <button
          class="remove-meal"
          data-remove-meal="${key}"
          aria-label="Retirer"
        >×</button>

       ${renderMealCard(recipe, key)}
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

function renderMealCard(recipe, key) {
  if (!recipe) {
    return `<p>Aucun repas prévu</p>`;
  }
  return `
  <div
    class="meal-card ${recipe.color == "sage" ? "" : recipe.color}"
    draggable="true"
    data-drag-meal="${key}"
    data-open-recipe="${recipe.id}"
  >
    <strong>${recipe.name}</strong>
    <small>
        ${recipe.emoji}
        ${getTotalTime(recipe)} min ·
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
console.log("🔎 CATEGORIES :", state.recipes.map(r => ({
    id: r.id,
    name: r.name,
    categories: r.categories
})));
  const recipes = state.recipes.filter(r =>

    r.name.toLowerCase().includes(query.toLowerCase()) &&
    (filter === "all" || (filter === "veggie" && r.veggie) || (filter === "quick" && getTotalTime(r) <= 30))
  );
  recipes.sort((a, b) => {
    if (a.favorite === b.favorite) return 0;
    return a.favorite ? -1 : 1;
  });

  $("#recipeGrid").innerHTML = recipes.length ? recipes.map(r => `
    <article class="recipe-card">

    <div class="recipe-visual ${r.color === "sage" ? "" : r.color}">

        <button
            class="favorite-button ${r.favorite ? "favorite" : ""}"
            data-favorite="${r.id}"
            title="${r.favorite ? "Retirer des favoris" : "Ajouter aux favoris"}">
            ${r.favorite ? "★" : "☆"}
        </button>

        ${r.emoji}

    </div>
      <div class="recipe-content">
        <h3>${r.name}</h3>
        <p class="recipe-meta">◷ ${getTotalTime(r)} min &nbsp;·&nbsp; ♙ ${r.portions} personnes</p>
        <div class="tags">
          ${(r.tags ?? []).map(t => `<span class="tag">${t}</span>`).join("")}
        </div>
        <div class="recipe-actions">

          <button data-plan-recipe="${r.id}">
              Planifier
          </button>

          <button data-edit-recipe="${r.id}">
              Modifier
          </button>

          <button data-delete-recipe="${r.id}">
              Supprimer
          </button>

        </div>
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

function renderCategoryChips(container, selectedCategories = []) {

    container.innerHTML = getAllCategories()
        .map(category => `
            <button
                type="button"
                class="chip"
                aria-pressed="${selectedCategories.includes(category.id)}"
                data-category-id="${category.id}">
                ${category.icon} ${category.label}
            </button>
        `)
        .join("");

    container
    .querySelectorAll(".chip")
    .forEach(chip => {

        chip.addEventListener("click", () => {

            const isSelected =
                chip.getAttribute("aria-pressed") === "true";

            chip.setAttribute(
                "aria-pressed",
                String(!isSelected)
            );

        });

    });

    // Les événements viendront ici
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
  // TODO FEAT-005
  // Ancien système de création de recette.
  // À supprimer lorsque recipeForm sera entièrement migré.
  if (type === "recipe") {
    eyebrow.textContent = "NOUVELLE RECETTE"; title.textContent = "Ajouter une recette";
    fields.innerHTML = `
  <div class="field">
    <label>Nom de la recette</label>
    <input name="name" required placeholder="Ex. Gratin de courgettes">
  </div>

  <div class="field-row">
    <div class="field">
      <label>Temps (minutes)</label>
      <input name="time" type="number" min="5" value="30" required>
    </div>

    <div class="field">
      <label>Portions</label>
      <input name="portions" type="number" min="1" value="4" required>
    </div>
  </div>

  <div class="field">
    <label>Type</label>
    <select name="veggie">
      <option value="false">Tous les plats</option>
      <option value="true">Végétarien</option>
    </select>
  </div>

  <div class="field">
    <label>Catégories</label>
    <div id="recipeCategories"></div>
  </div>
`;
renderCategoryChips($("#recipeCategories"));

  } else if (type === "meal") {
    eyebrow.textContent = "PLANIFIER UN REPAS"; title.textContent = "Choisir une recette";
    fields.innerHTML = `<div class="field"><label>Recette</label><select name="recipe">${state.recipes.map(r => `<option value="${r.id}" ${r.id === payload.recipeId ? "selected" : ""}>${r.name} · ${getTotalTime(r)} min</option>`).join("")}</select></div>`;
  }
  else if (type === "plan") {

    eyebrow.textContent = "PLANIFIER UNE RECETTE";
    title.textContent = "Choisir un créneau";

    fields.innerHTML = `
        <div class="field">
            <label>Recette</label>
            <p><strong>${payload.recipe.name}</strong></p>
        </div>

        <div class="field">
            <label>Créneau</label>

            <select name="slot" required>
                <option value="">Choisir...</option>

                ${getWeekDays().flatMap((dayInfo, day) =>
                  ["lunch", "dinner"].map(slot => {

                    const key = `${day}-${slot}`;
                    const plannedId = state.meals[key];

                    const plannedRecipe = state.recipes.find(r => r.id == plannedId);

                    const label =
                      `${dayInfo.name} ${slot === "lunch" ? "midi" : "soir"}` +
                      (plannedRecipe
                        ? ` 🔄 ${plannedRecipe.name}`
                        : " 🟢 Libre");

                    return `<option value="${key}">${label}</option>`;
                  })
                ).join("")
                  }

            </select>
        </div>
    `;
  }

  else if (type === "complete-week") {

    eyebrow.textContent = "PLANNING INTELLIGENT";
    title.textContent = "Compléter ma semaine";

    fields.innerHTML = `
    <div class="field">
      <label>
        <input type="checkbox" name="noDuplicates" checked>
        Éviter les doublons
      </label>
    </div>

    <div class="field">
      <label>
        <input type="checkbox" name="quickDinner" checked>
        Favoriser les repas rapides le soir
      </label>
    </div>

    <div class="field">
      <label>
        <input type="checkbox" name="veggie" checked>
        Prévoir au moins 2 repas végétariens
      </label>
    </div>

    <div class="field">
      <label>
        <input type="checkbox" name="favorites">
        Utiliser les recettes favorites
      </label>
    </div>

    <div class="field">
      <label>
        <input type="checkbox" name="fridge">
        Prioriser les aliments du frigo
      </label>
    </div>
  `;
  }
  else if (type === "shopping") {
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

    console.log("🔎 RECETTE FICHE :", {
    name: recipe?.name,
    ingredients: recipe?.ingredients,
    steps: recipe?.steps
});

    if (!recipe) return;
    eyebrow.textContent = "FICHE RECETTE";
    title.textContent = `${recipe.emoji} ${recipe.name}`;
    cancelButton.textContent = "Fermer";
    submitButton.hidden = true;
    fields.innerHTML = `
      <div class="recipe-detail-meta">
        <span>◷ ${getTotalTime(recipe)} min</span>
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
  const slotSelect = fields.querySelector('select[name="slot"]');

  if (slotSelect) {
    const firstFree = [...slotSelect.options]
      .find(o => o.value && !state.meals[o.value]);

    if (firstFree) {
      slotSelect.value = firstFree.value;
    }
  }

  modal.showModal();
}

$("#modalForm").addEventListener("submit", e => {
  if (e.submitter?.value === "cancel") return;
  e.preventDefault();
  const form = e.currentTarget, data = Object.fromEntries(new FormData(form));
  const type = form.dataset.type, payload = JSON.parse(form.dataset.payload || "{}");
  // TODO FEAT-005
  // Ancien système de création de recette.
  // À supprimer lorsque recipeForm sera entièrement migré.
  if (type === "recipe") {
    const id = Date.now();
    
    state.recipes.push({
      // Identification
      id,
      name: data.name,
      photo: "",

      // Classement
      category: "Plat",
      tags: [
        data.veggie === "true" ? "Végétarien" : "Maison",
        +data.time <= 30 ? "Express" : "À partager"
      ].filter(Boolean),

      // Apparence
      emoji: data.veggie === "true" ? "🥗" : "🍝",
      color: data.veggie === "true" ? "sage" : "orange",

      // Temps
      prepTime: +data.time,
      cookTime: 0,
      restTime: 0,

      // Portions
      portions: +data.portions,

      // Régimes
      veggie: data.veggie === "true",
      vegan: false,
      glutenFree: false,
      lactoseFree: false,

      // Préférences
      favorite: false,
      archived: false,

      // Difficulté / coût
      difficulty: 1,
      price: 1,

      // Organisation
      equipment: [],
      occasion: [],

      // Contenu
      ingredients: [],
      steps: [],
      notes: "",

      // Statistiques
      lastCooked: null,
      cookCount: 0,
      rating: 0
    });

    renderRecipes(); showToast("Recette ajoutée à votre carnet");
  } else if (type === "meal") {
    state.meals[payload.key] = data.recipe;
    renderWeek();
    showToast("Repas ajouté à la semaine");
    
  } else if (type === "complete-week") {

    completeWeek({
      noDuplicates: data.noDuplicates === "on",
      quickDinner: data.quickDinner === "on",
      veggie: data.veggie === "on",
      favorites: data.favorites === "on",
      fridge: data.fridge === "on"
    });

  } else if (type === "plan") {



    state.meals[data.slot] = payload.recipe.id;


    renderWeek();
    const slotLabel = {
      "0-lunch": "Mercredi midi",
      "0-dinner": "Mercredi soir",
      "1-lunch": "Jeudi midi",
      "1-dinner": "Jeudi soir",
      "2-lunch": "Vendredi midi",
      "2-dinner": "Vendredi soir",
      "3-lunch": "Samedi midi",
      "3-dinner": "Samedi soir",
      "4-lunch": "Dimanche midi",
      "4-dinner": "Dimanche soir",
      "5-lunch": "Lundi midi",
      "5-dinner": "Lundi soir",
      "6-lunch": "Mardi midi",
      "6-dinner": "Mardi soir"
    };

    showToast(`✅ ${payload.recipe.name} planifiée • ${slotLabel[data.slot]}`);
  }
  else if (type === "shopping") {
    state.shopping.push({ id: Date.now(), group: data.group, name: data.name, qty: data.qty, checked: false }); renderShopping(); showToast("Article ajouté à la liste");
  } else {
    state.fridge.push({ id: Date.now(), name: data.name, qty: data.qty, expiry: data.expiry, soon: false, emoji: "🥬" }); renderFridge(); showToast("Aliment rangé dans le frigo");
  }
  
  save(); $("#modal").close();
});

document.addEventListener("click", async (e) => {
  const nav = e.target.closest("[data-view], [data-view-link]");
  if (nav) navigate(nav.dataset.view || nav.dataset.viewLink);
  const addMeal = e.target.closest("[data-add-meal]");
  if (addMeal) openModal("meal", { key: addMeal.dataset.addMeal });
  const removeMeal = e.target.closest("[data-remove-meal]");
  if (removeMeal) { delete state.meals[removeMeal.dataset.removeMeal]; save(); renderWeek(); showToast("Repas retiré"); }
  const planRecipe = e.target.closest("[data-plan-recipe]");
  if (planRecipe) {

    const recipeId = planRecipe.dataset.planRecipe;

    const recipe = state.recipes.find(r => r.id == recipeId);

    openModal("plan", { recipe });

  }
  const editRecipe = e.target.closest("[data-edit-recipe]");

  if (editRecipe) {
    const id = editRecipe.dataset.editRecipe;
    const recipe = state.recipes.find(r => r.id == id);

    $("#recipeModalTitle").textContent = "Modifier la recette";
    $("#recipeModalSubtitle").textContent = recipe.name;
    $("#saveRecipe").textContent = "Mettre à jour";
    loadRecipe(recipe);
    recipeForm.dataset.recipeId = recipe.id;
    recipeModal.classList.remove("hidden");
  }

  const favoriteRecipe = e.target.closest("[data-favorite]");

  if (favoriteRecipe) {

    const id = favoriteRecipe.dataset.favorite;

    const recipe = state.recipes.find(r => r.id == id);

    if (recipe) {
      recipe.favorite = !recipe.favorite;
      showToast(
        recipe.favorite
          ? `⭐ "${recipe.name}" ajouté aux favoris`
          : `☆ "${recipe.name}" retiré des favoris`
      );

      save();
      renderRecipes();
    }

    return;
  }

  const delRecipe = e.target.closest("[data-delete-recipe]");

  if (delRecipe && confirm("Supprimer cette recette du carnet ?")) {

    const id = delRecipe.dataset.deleteRecipe;

    await deleteRecipeFromDB(id);

    state.recipes = state.recipes.filter(r => r.id != id);

    Object.keys(state.meals).forEach(key => {
      if (state.meals[key] == id) {
        delete state.meals[key];
      }
    });

    save();
    renderRecipes();
    renderWeek();
    showToast("Recette supprimée");
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

//$("#openRecipeModal").addEventListener("click", () => openModal("recipe"));
$("#addShopping").addEventListener("click", () => openModal("shopping"));
$("#addFridge").addEventListener("click", () => openModal("fridge"));
$("#uncheckAll").addEventListener("click", () => { state.shopping.forEach(i => i.checked = false); save(); renderShopping(); });
$("#clearWeek").addEventListener("click", () => { state.meals = {}; save(); renderWeek(); showToast("La semaine est prête à être recomposée"); });

function completeWeek(options) {
  let candidates = [...state.recipes];
  let missingVeggie = 0;
  if (options.veggie) {

    const veggieCount = Object.values(state.meals)
      .map(id => state.recipes.find(r => r.id === id))
      .filter(r => r?.veggie).length;

    

    missingVeggie = Math.max(0, 2 - veggieCount);


  }

  if (options.noDuplicates) {
    const used = Object.values(state.meals);
    candidates = candidates.filter(r => !used.includes(r.id));
  }

  if (candidates.length === 0) {
    showToast("Aucune recette disponible avec ces critères");
    return;
  }

  const keys = [...Array(7).keys()]
    .flatMap(d => ["lunch", "dinner"].map(s => `${d}-${s}`));

  let added = 0;

  keys
    .filter(k => !state.meals[k])
    .slice(0, 5)
    .forEach((k, i) => {

      let list = candidates;

      if (options.quickDinner && k.endsWith("dinner")) {

        const quick = candidates.filter(r => r.prepTime <= 30);

        if (quick.length) {
          list = quick;
        }

      }

      let recipe;

      if (missingVeggie > 0) {

        recipe = list.find(r => r.veggie);

        if (recipe) {
          missingVeggie--;
        }

      } else {

        recipe = list[0];

      }

      if (!recipe) return;

      state.meals[k] = recipe.id;

      // On retire la recette des listes
      candidates = candidates.filter(r => r.id !== recipe.id);
      list = list.filter(r => r.id !== recipe.id);

      added++;

    });

  save();
  renderWeek();

  showToast(`${added} repas ajoutés à votre semaine`);
}

$("#autoPlan").addEventListener("click", () => {
  openModal("complete-week");
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

async function initializeRecipes() {

    return await getAllRecipes();

}

async function initializeApp() {

    await openDatabase();

    state.recipes = (await initializeRecipes())
    .map(createRecipe);
   
    renderWeek();
    renderRecipes();
    renderShopping();
    renderFridge();

}

initializeApp();






