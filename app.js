

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
  deleteRecipeFromDB,
  getPlanning,
  savePlanning,
  getPlanningNotes,
  savePlanningNote,
  deletePlanningNote,
  getRecipeIngredientsForRecipes,

  // 🏪 Stock — Supabase
  getProducts,
  addProduct,
  addStockItem,
  getStockItems,
  updateStockItem,
  deleteStockItem

} from "./js/storage.js";

import { importRecipe } from "./js/import.js";

import { createRecipe } from "./js/recipe.js";




const defaultState = {
  weekStart: "wednesday",

  weatherLocation: {
    city: "Tourcoing",
    latitude: 50.7214,
    longitude: 3.1614
  },

  recipes: [],
  meals: {},
  shopping: [],
  fridge: [],
  pantry: [],
  freezer: []
};

let state;
let planningNotes = [];

try { state = JSON.parse(localStorage.getItem("mijote-state")) || structuredClone(defaultState); }
catch { state = structuredClone(defaultState); }

// Compatibilité avec les anciens états sauvegardés
state.fridge ??= [];
state.pantry ??= [];
state.freezer ??= [];
state.shopping ??= [];
state.recipes ??= [];
state.meals ??= {};

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

function getCurrentWeekStart() {
  const days = getWeekDays();
  const date = days[0].date;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  const weekStart = `${year}-${month}-${day}`;

  console.log("📅 DEBUG semaine");
  console.log("➡️ currentDate :", currentDate);
  console.log("➡️ jours :", days.map(d => d.date.toLocaleDateString("fr-FR")));
  console.log("➡️ weekStart :", weekStart);

  return weekStart;
}


async function save() {

  // Sauvegarde locale de sécurité
  const stateToSave = {
    ...state,
    fridge: undefined,
    pantry: undefined,
    freezer: undefined
  };

  localStorage.setItem(
    "mijote-state",
    JSON.stringify(stateToSave)
  );

  // Sauvegarde du planning dans Supabase
  try {

    const weekStart = getCurrentWeekStart();

    await savePlanning(
      state.meals,
      weekStart
    );

    console.log(
      "☁️ Planning sauvegardé pour la semaine :",
      weekStart
    );

  } catch (error) {

    console.error(
      "❌ Impossible de sauvegarder le planning dans Supabase :",
      error
    );
  }
}

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

const importTextMode = $("#importTextMode");
const importLinkMode = $("#importLinkMode");

const importTextSection = $("#importTextSection");
const importLinkSection = $("#importLinkSection");

const importRecipeUrl = $("#importRecipeUrl");


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
const removeRecipePhoto = $("#removeRecipePhoto");

photoDropzone.addEventListener("click", () => {
  recipePhotoInput.click();
});

recipePhotoInput.addEventListener("change", () => {

  const file = recipePhotoInput.files[0];

  previewRecipePhoto(file);

});

importTextMode.addEventListener("click", () => {

  importTextMode.classList.add("active");
  importLinkMode.classList.remove("active");

  importTextSection.classList.remove("hidden");
  importLinkSection.classList.add("hidden");

  requestAnimationFrame(() => {
    importRecipeText.focus();
  });
});


importLinkMode.addEventListener("click", () => {

  importLinkMode.classList.add("active");
  importTextMode.classList.remove("active");

  importLinkSection.classList.remove("hidden");
  importTextSection.classList.add("hidden");

  requestAnimationFrame(() => {
    importRecipeUrl.focus();
  });
});

openImportModal.addEventListener("click", () => {

  console.log("📥 clic Import");

  // Réinitialise les champs
  importRecipeText.value = "";
  importRecipeUrl.value = "";

  // Revient toujours sur le mode Lien
  importLinkMode.classList.add("active");
  importTextMode.classList.remove("active");

  importLinkSection.classList.remove("hidden");
  importTextSection.classList.add("hidden");

  // Ouvre la fenêtre
  importModal.classList.remove("hidden");

  requestAnimationFrame(() => {
    importRecipeUrl.focus();
  });

  console.log(importModal);
});

closeImportModal.addEventListener("click", () => {

  importModal.classList.add("hidden");

});

cancelImport.addEventListener("click", () => {

  importModal.classList.add("hidden");

});

function parseIngredientText(value) {
  if (!value) {
    return {
      quantity: null,
      unit: null,
      ingredient: "",
      category: null
    };
  }

  const text = String(value).trim();

  // Déjà structuré : on ne modifie rien
  if (
    typeof value === "object" &&
    value !== null &&
    "ingredient" in value
  ) {
    return {
      quantity: value.quantity ?? null,
      unit: value.unit ?? null,
      ingredient: value.ingredient ?? "",
      category: value.category ?? null
    };
  }

  // --------------------------------------------------
  // Quantité
  // --------------------------------------------------

  const quantityMatch = text.match(
    /^(\d+(?:[.,]\d+)?)\s*(.*)$/i
  );

  let quantity = null;
  let remainder = text;

  if (quantityMatch) {
    quantity = Number(
      quantityMatch[1].replace(",", ".")
    );

    remainder = quantityMatch[2].trim();
  }

  // --------------------------------------------------
  // Unités reconnues
  // --------------------------------------------------

  const units = [
    "c. à soupe",
    "c à soupe",
    "cuillère à soupe",
    "cuillères à soupe",
    "c. à café",
    "c à café",
    "cuillère à café",
    "cuillères à café",
    "kg",
    "g",
    "mg",
    "l",
    "cl",
    "ml",
    "pièces",
    "pièce",
    "tranches",
    "tranche",
    "gousses",
    "gousse",
    "bottes",
    "botte",
    "sachets",
    "sachet",
    "pots",
    "pot",
    "boîtes",
    "boîte"
  ];

  let unit = null;
  let ingredient = remainder;

  for (const candidate of units) {

    const regex = new RegExp(
      `^${candidate.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b\\s*(.*)$`,
      "i"
    );

    const match = remainder.match(regex);

    if (match) {
      unit = candidate;
      ingredient = match[1].trim();
      break;
    }
  }

  // --------------------------------------------------
  // Nettoyage
  // --------------------------------------------------

  ingredient = ingredient
    .replace(/^de\s+/i, "")
    .replace(/^du\s+/i, "")
    .replace(/^des\s+/i, "")
    .trim();

  // "pièces" -> "pièce"
  if (unit === "pièces") unit = "pièce";
  if (unit === "tranches") unit = "tranche";
  if (unit === "gousses") unit = "gousse";
  if (unit === "bottes") unit = "botte";
  if (unit === "sachets") unit = "sachet";
  if (unit === "pots") unit = "pot";
  if (unit === "boîtes") unit = "boîte";

  // --------------------------------------------------
  // Si quantité sans unité explicite :
  // on considère qu'il s'agit d'une pièce
  // --------------------------------------------------

  if (quantity !== null && !unit) {
    unit = "pièce";
  }

  // --------------------------------------------------
  // Détermination prudente du rayon
  // --------------------------------------------------

  const lower = ingredient.toLowerCase();

  let category = null;

  if (
    /boeuf|bœuf|veau|porc|jambon|lardon|saucisse|viande|steak/.test(lower)
  ) {
    category = "Viandes";
  } else if (
    /poulet|dinde|canard|volaille/.test(lower)
  ) {
    category = "Viandes";
  } else if (
    /cabillaud|saumon|thon|crevette|crevettes|poisson|moule|moules/.test(lower)
  ) {
    category = "Poissons";
  } else if (
    /feta|mozzarella|parmesan|comté|reblochon|camembert|chèvre|chevre|fromage/.test(lower)
  ) {
    category = "Fromages";
  } else if (
    /crème|creme|lait|beurre|yaourt|yaourt|mascarpone|œuf|oeuf/.test(lower)
  ) {
    category = "Produits frais";
  } else if (
    /tomate|tomates|courgette|courgettes|carotte|carottes|oignon|oignons|ail|poivron|poireau|brocoli|champignon|champignons|salade|épinard|epinard|concombre|avocat/.test(lower)
  ) {
    category = "Fruits & légumes";
  } else if (
    /baguette|pain|bagel|brioche|pâte brisée|pate brisee|pâte feuilletée|pate feuilletee/.test(lower)
  ) {
    category = "Boulangerie";
  } else if (
    /huile|vinaigre|farine|sucre|sel|poivre|riz|pâtes|pates|coulis|épices|epices|moutarde|bouillon/.test(lower)
  ) {
    category = "Épicerie";
  }

  return {
    quantity,
    unit,
    ingredient,
    category
  };
}


function parseImportedIngredients(ingredients) {
  return (ingredients ?? [])
    .map(parseIngredientText)
    .filter(item => item.ingredient);
}

function extractIngredientsFromTextImport(text) {
  const lines = String(text)
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  const startIndex = lines.findIndex(line =>
    /^ingrédients?\s*:?\s*$/i.test(line)
  );

  if (startIndex === -1) {
    return [];
  }

  const endIndex = lines.findIndex((line, index) =>
    index > startIndex &&
    /^(préparation|preparation|instructions?|étapes?|etapes?)\s*:?\s*$/i.test(line)
  );

  const ingredientLines = lines.slice(
    startIndex + 1,
    endIndex === -1 ? lines.length : endIndex
  );

  return parseImportedIngredients(ingredientLines);
}


startImport.addEventListener("click", async () => {

  // ==================================================
  // MODE TEXTE
  // ==================================================

  if (!importTextSection.classList.contains("hidden")) {

    const rawImportText = importRecipeText.value;

    const recipe = importRecipe(rawImportText);

    if (!recipe) {
      return;
    }

    recipe.ingredients = extractIngredientsFromTextImport(
      rawImportText
    );


    // Ferme la fenêtre d'import
    importModal.classList.add("hidden");

    // Prépare le formulaire en mode AJOUT
    delete recipeForm.dataset.recipeId;

    $("#recipeModalTitle").textContent =
      "Ajouter la recette";

    $("#recipeModalSubtitle").textContent =
      recipe.name;

    $("#saveRecipe").textContent =
      "Ajouter";

    // Charge les données importées
    loadRecipe(recipe);

    // Ouvre le formulaire
    recipeModal.classList.remove("hidden");

    return;
  }


  // ==================================================
  // MODE LIEN
  // ==================================================

  const url =
    importRecipeUrl.value.trim();

  if (!url) {

    alert(
      "Veuillez saisir le lien d'une recette."
    );

    importRecipeUrl.focus();

    return;
  }


  // Vérification simple de l'URL
  try {

    new URL(url);

  } catch {

    alert(
      "Le lien saisi n'est pas valide."
    );

    importRecipeUrl.focus();

    return;
  }


  // --------------------------------------------------
  // Désactive temporairement le bouton
  // --------------------------------------------------

  startImport.disabled = true;
  startImport.textContent =
    "Import en cours…";


  try {

    console.log(
      "🌐 Import depuis le lien :",
      url
    );


    const response =
      await fetch(
        `https://mijote-api.onrender.com/api/import-url?url=${encodeURIComponent(url)}`
      );



    const data =
      await response.json();


    // ------------------------------------------------
    // Erreur renvoyée par le serveur
    // ------------------------------------------------

    if (!response.ok) {

      throw new Error(
        data.error ||
        "Impossible d'importer cette recette."
      );
    }


    console.log(
      "✅ Recette récupérée depuis le lien :",
      data
    );


    // ------------------------------------------------
    // Transformation en recette Mijoté
    // ------------------------------------------------

    const recipe =
      createRecipe({

        name:
          data.name || "",

        photo:
          data.image || "",

        prepTime:
          Number(
            data.prepTime || 0
          ),

        cookTime:
          Number(
            data.cookTime || 0
          ),

        restTime: 0,

        portions:
          Number(
            data.portions || 0
          ),

        ingredients:
          parseImportedIngredients(
            Array.isArray(data.ingredients)
              ? data.ingredients
              : []
          ),

        steps:
          Array.isArray(
            data.steps
          )
            ? data.steps
            : [],

        categories:
          data.category
            ? [data.category]
            : [],

        notes:
          data.notes || "",

        equipment: [],

        occasion: [],

        source:
          data.source || {
            type: "url",
            value: url
          }
      });


    // ------------------------------------------------
    // Ferme la fenêtre d'import
    // ------------------------------------------------

    importModal.classList.add("hidden");


    // ------------------------------------------------
    // Prépare le formulaire en mode AJOUT
    // ------------------------------------------------

    delete recipeForm.dataset.recipeId;

    $("#recipeModalTitle").textContent =
      "Ajouter la recette";

    $("#recipeModalSubtitle").textContent =
      recipe.name;

    $("#saveRecipe").textContent =
      "Ajouter";


    // ------------------------------------------------
    // Charge la recette importée
    // ------------------------------------------------

    loadRecipe(recipe);


    // ------------------------------------------------
    // Ouvre le formulaire
    // ------------------------------------------------

    recipeModal.classList.remove("hidden");


  } catch (error) {

    console.error(
      "❌ Erreur import lien :",
      error
    );

    alert(
      `Impossible d'importer la recette.\n\n${error.message}`
    );


  } finally {

    startImport.disabled = false;

    startImport.textContent =
      "Importer";
  }
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
  $("#recipeVeggie").checked = recipe.veggie ?? false;

  renderCategoryChips(
    $("#recipeCategories"),
    recipe.categories ?? []
  );

  // ==========================================
  // Chargement de la référence
  // ==========================================

  $("#recipeSource").value =
    typeof recipe.source === "string"
      ? recipe.source
      : (recipe.source?.value ?? "");


  // ==========================================
  // Chargement des notes
  // ==========================================

  $("#recipeNotes").value = recipe.notes ?? "";


  // ==========================================
  // Chargement du matériel
  // ==========================================

  equipmentList.innerHTML = "";

  (recipe.equipment ?? []).forEach(item => {
    addEquipmentLine(item);
  });



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
    removeRecipePhoto.hidden = false;
  } else {
    recipePhotoPreview.src = "";
    recipePhotoPreview.hidden = true;
    photoPlaceholder.hidden = false;
    removeRecipePhoto.hidden = true;
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
      removeRecipePhoto.hidden = false;

    };

    img.src = event.target.result;
  };

  reader.readAsDataURL(file);
}

removeRecipePhoto.addEventListener("click", (event) => {
  event.stopPropagation();

  currentRecipePhoto = "";

  recipePhotoPreview.src = "";
  recipePhotoPreview.hidden = true;

  photoPlaceholder.hidden = false;

  removeRecipePhoto.hidden = true;

  recipePhotoInput.value = "";
});


recipeForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = $("#recipeName").value.trim();

  if (!name) {
    alert("Le nom de la recette est obligatoire.");
    $("#recipeName").focus();
    return;
  }

  const emoji =
    $("#recipeEmoji").value.trim() || "👨‍🍳";

  const prepTime =
    Number($("#recipePrepTime").value);

  const cookTime =
    Number($("#recipeCookTime").value);

  const restTime =
    Number($("#recipeRestTime").value);

  const portions =
    Number($("#recipePortions").value);

  const veggie =
    $("#recipeVeggie").checked;

  if (
    prepTime < 0 ||
    cookTime < 0 ||
    restTime < 0
  ) {
    alert("Les temps ne peuvent pas être négatifs.");
    return;
  }


  if (portions < 1) {
    alert("Le nombre de portions doit être supérieur à 0.");
    $("#recipePortions").focus();
    return;
  }


  // ==========================================
  // Ingrédients
  // ==========================================

  const ingredients = [...$$(".ingredient-row")]
    .map(row => ({
      quantity: row.querySelector(".ingredient-quantity")?.value
        ? Number(row.querySelector(".ingredient-quantity").value)
        : null,

      unit:
        row.querySelector(".ingredient-unit")?.value || null,

      ingredient:
        row.querySelector(".ingredient-name")?.value.trim() || "",

      category:
        row.querySelector(".ingredient-category")?.value || null
    }))
    .filter(item => item.ingredient !== "");


  // ==========================================
  // Étapes
  // ==========================================

  const steps =
    [...$$(".step-input")]
      .map(input => input.value.trim())
      .filter(value => value !== "");


  // ==========================================
  // Catégories
  // ==========================================

  const categories = [
    ...$$('#recipeCategories .chip[aria-pressed="true"]')
  ].map(
    chip => chip.dataset.categoryId
  );


  // ==========================================
  // Matériel
  // ==========================================

  const equipment =
    [...$$(".equipment-row input")]
      .map(input => input.value.trim())
      .filter(value => value !== "");


  // ==========================================
  // Notes
  // ==========================================

  const notes =
    $("#recipeNotes").value.trim();


  // ==========================================
  // Référence / Source
  // ==========================================

  const source =
    $("#recipeSource").value.trim();


  // ==========================================
  // ID recette
  // ==========================================

  const recipeId =
    recipeForm.dataset.recipeId;


  // ==========================================
  // Création de la recette
  // ==========================================

  const recipe = createRecipe({

    id:
      recipeId || undefined,

    name,

    emoji,

    prepTime,

    cookTime,

    restTime,

    portions,

    veggie,

    categories,

    ingredients,

    steps,

    photo:
      currentRecipePhoto,

    equipment,

    notes,

    source
  });


  // ==========================================
  // Mise à jour
  // ==========================================

  if (recipeId) {

    const index =
      state.recipes.findIndex(
        r => r.id == recipeId
      );

    if (index !== -1) {

      state.recipes[index] =
        recipe;

      await saveRecipeToDB(
        recipe
      );

      save();

      // Actualise immédiatement
      // "Mes recettes"
      renderRecipes(
        activeFilter,
        $("#recipeSearch").value
      );
    }

  } else {

    await addRecipe(
      recipe
    );
  }


  // ==========================================
  // Réinitialisation du formulaire
  // ==========================================

  $("#recipeName").value = "";

  $("#recipeEmoji").value = "";

  $("#recipePrepTime").value = 20;

  $("#recipeCookTime").value = 30;

  $("#recipeRestTime").value = 0;

  $("#recipePortions").value = 4;

  $("#recipeVeggie").checked = false;

  $("#recipeNotes").value = "";

  $("#recipeSource").value = "";

  equipmentList.innerHTML = "";


  // Ferme la fenêtre
  recipeModal.classList.add(
    "hidden"
  );
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
  $("#recipeVeggie").checked = false;


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

function addIngredientLine(value = {}) {
  const row = document.createElement("div");
  row.className = "ingredient-row";

  const quantity =
    typeof value === "object" && value !== null
      ? value.quantity ?? ""
      : "";

  const unit =
    typeof value === "object" && value !== null
      ? value.unit ?? ""
      : "";

  const ingredient =
    typeof value === "object" && value !== null
      ? value.ingredient ?? ""
      : typeof value === "string"
        ? value
        : "";

  const category =
    typeof value === "object" && value !== null
      ? value.category ?? ""
      : "";

  row.innerHTML = `
        <input
            type="number"
            class="ingredient-quantity"
            placeholder="Qté"
            min="0"
            step="0.01"
            value="${quantity}"
        >
  
        <select class="ingredient-unit">
            <option value="">Unité</option>
            <option value="g">g</option>
            <option value="kg">kg</option>
            <option value="ml">ml</option>
            <option value="cl">cl</option>
            <option value="l">l</option>
            <option value="pièce">pièce</option>
            <option value="tranche">tranche</option>
            <option value="gousse">gousse</option>
            <option value="botte">botte</option>
            <option value="c. à café">c. à café</option>
            <option value="c. à soupe">c. à soupe</option>
            <option value="pincée">pincée</option>
            <option value="à volonté">à volonté</option>
        </select>
  
        <input
            type="text"
            class="ingredient-name"
            placeholder="Ex. farine"
            value="${String(ingredient).replace(/"/g, "&quot;")}"
        >
  
        <select class="ingredient-category">
            <option value="">Rayon</option>
            <option value="Fruits & légumes">🥕 Fruits & légumes</option>
            <option value="Viandes">🥩 Viandes</option>
            <option value="Poissons">🐟 Poissons</option>
            <option value="Fromages">🧀 Fromages</option>
            <option value="Produits frais">🥛 Produits frais</option>
            <option value="Épicerie">🥫 Épicerie</option>
            <option value="Boulangerie">🍞 Boulangerie</option>
            <option value="Surgelés">🧊 Surgelés</option>
            <option value="Boissons">🥤 Boissons</option>
            <option value="Condiments">🧂 Condiments</option>
            <option value="Autres">📦 Autres</option>
        </select>
  
        <button
            type="button"
            class="icon-button remove-ingredient"
            aria-label="Supprimer l'ingrédient"
        >
            🗑
        </button>
    `;

  row.querySelector(".ingredient-unit").value = unit;
  row.querySelector(".ingredient-category").value = category;

  row.querySelector(".remove-ingredient").addEventListener(
    "click",
    () => row.remove()
  );

  ingredientsList.appendChild(row);
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

function addEquipmentLine(value = "") {

  const row = document.createElement("div");

  row.className = "equipment-row";

  row.innerHTML = `
    <input
      type="text"
      value="${value.replace(/"/g, "&quot;")}"
      placeholder="Ex. Four, Air Fryer, Monsieur Cuisine..."
    >
  
    <button
      type="button"
      class="button secondary-button"
      aria-label="Supprimer ce matériel">
      🗑
    </button>
  `;


  const input =
    row.querySelector("input");

  const deleteButton =
    row.querySelector("button");


  deleteButton.addEventListener(
    "click",
    () => {
      row.remove();
    }
  );


  equipmentList.appendChild(row);
}

$("#addEquipment").addEventListener(
  "click",
  () => {
    addEquipmentLine();
  }
);



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
  console.log(
    "📅 getWeekDays() :",
    days.map(d => d.date.toLocaleDateString("fr-FR"))
  );

  return days;
  return days;
}

async function getWeatherForWeek(days) {
  try {
    const location = state.weatherLocation;

    if (!location?.latitude || !location?.longitude) {
      console.warn("⚠️ Localisation météo non configurée");
      return days.map(() => null);
    }

    const startDate = days[0].date.toISOString().split("T")[0];
    const endDate = days[days.length - 1].date.toISOString().split("T")[0];

    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${location.latitude}` +
      `&longitude=${location.longitude}` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,wind_speed_10m_max` +
      `&temperature_unit=celsius` +
      `&wind_speed_unit=kmh` +
      `&timezone=Europe%2FParis` +
      `&start_date=${startDate}` +
      `&end_date=${endDate}`;




    console.log("🌤️ URL météo :", url);


    const response = await fetch(url);

    console.log("🌤️ Réponse météo :", response.status, response.ok);

    if (!response.ok) {
      throw new Error(`Erreur météo : ${response.status}`);
    }

    const data = await response.json();

    return days.map(day => {
      const date = day.date.toISOString().split("T")[0];
      const index = data.daily.time.indexOf(date);

      if (index === -1) {
        return null;
      }

      return {
        date,
        weatherCode: data.daily.weather_code[index],
        max: Math.round(data.daily.temperature_2m_max[index]),
        min: Math.round(data.daily.temperature_2m_min[index]),
        wind: Math.round(data.daily.wind_speed_10m_max[index])
      };
    });

  } catch (error) {
    console.error("❌ Impossible de récupérer la météo :", error);
    return days.map(() => null);
  }
}

async function testWeather() {
  const days = getWeekDays();
  const weather = await getWeatherForWeek(days);

  console.log("🌤️ MÉTÉO DE LA SEMAINE :", weather);
}
window.testWeather = testWeather;


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

async function loadPlanningFromSupabase() {

  const weekStart = getCurrentWeekStart();

  console.log(
    "📅 Chargement du planning pour :",
    weekStart
  );

  try {

    const planning = await getPlanning(
      weekStart
    );

    if (planning) {

      state.meals = planning.meals || {};

      console.log(
        "☁️ Planning chargé depuis Supabase :",
        state.meals
      );

    } else {

      // Aucune semaine enregistrée
      state.meals = {};

      console.log(
        "📅 Aucun planning enregistré pour cette semaine"
      );
    }

    // On garde également une copie locale
    localStorage.setItem(
      "mijote-state",
      JSON.stringify(state)
    );

  } catch (error) {

    console.error(
      "❌ Impossible de charger le planning Supabase :",
      error
    );

    // En cas de problème réseau,
    // on conserve le planning local existant.
  }
}

function getWeatherIcon(code) {
  if (code === 0) return "☀️";
  if (code === 1) return "🌤️";
  if (code === 2) return "⛅";
  if (code === 3) return "☁️";

  if (code >= 45 && code <= 48) return "🌫️";

  if (code >= 51 && code <= 57) return "🌦️";

  if (code >= 61 && code <= 67) return "🌧️";

  if (code >= 71 && code <= 77) return "🌨️";

  if (code >= 80 && code <= 82) return "🌦️";

  if (code >= 85 && code <= 86) return "🌨️";

  if (code >= 95) return "⛈️";

  return "🌤️";
}

async function renderWeather(days) {
  const weatherStrip = $("#weatherStrip");

  if (!weatherStrip) return;

  const city = state.weatherLocation?.city || "Tourcoing";

  const startDate = days[0].date;
  const endDate = days[days.length - 1].date;

  const dateOptions = {
    weekday: "long",
    day: "numeric",
    month: "long"
  };

  const startLabel = startDate.toLocaleDateString("fr-FR", dateOptions);
  const endLabel = endDate.toLocaleDateString("fr-FR", dateOptions);

  // Affichage du titre et des cartes météo
  weatherStrip.innerHTML = `
    <div class="weather-heading">
      <h3>🌤️ Météo à ${city}</h3>
      <p>Prévisions du ${startLabel} au ${endLabel}</p>
    </div>
  
    <div class="weather-cards"></div>
  `;

  // Récupération des données météo
  const weather = await getWeatherForWeek(days);

  // Création des 7 cartes
  weatherStrip.querySelector(".weather-cards").innerHTML =
    days.map((day, index) => {
      const data = weather[index];

      if (!data) {
        return `}
          <div class="weather-card">
            <div class="weather-day">
              <strong>${day.name.toUpperCase()}</strong>
            </div>
      
            <div class="weather-icon">❔</div>
      
            <div class="weather-temperatures">
              Météo indisponible
            </div>
          </div>
        `;
      }

      return `
        <div class="weather-card">
          <div class="weather-day">
            <strong>${day.name.toUpperCase()}</strong>
          </div>
    
          <div class="weather-icon">
            ${getWeatherIcon(data.weatherCode)}
          </div>
    
          <div class="weather-temperatures">
            <span>${data.min}°</span>
            <strong>${data.max}°</strong>
          </div>
    
          <div class="weather-wind">
            💨 ${data.wind} km/h
          </div>
        </div>
      `;
    }).join("");
}

function getPlanningNotesForDate(date) {
  const dateKey =
    `${date.getFullYear()}-` +
    `${String(date.getMonth() + 1).padStart(2, "0")}-` +
    `${String(date.getDate()).padStart(2, "0")}`;

  return planningNotes.filter(note => {

    // Note ponctuelle
    if (!note.recurring) {
      return note.date === dateKey;
    }

    const originalDate = new Date(`${note.date}T12:00:00`);

    // Tous les ans
    if (note.recurrence_type === "yearly") {
      const yearsDiff =
        date.getFullYear() - originalDate.getFullYear();

      return (
        yearsDiff >= 0 &&
        yearsDiff % (note.recurrence_interval || 1) === 0 &&
        date.getMonth() === originalDate.getMonth() &&
        date.getDate() === originalDate.getDate()
      );
    }

    // Toutes les semaines
    if (note.recurrence_type === "weekly") {
      const diffMs = date - originalDate;
      const diffDays = Math.floor(diffMs / 86400000);

      return (
        diffDays >= 0 &&
        diffDays % (7 * (note.recurrence_interval || 1)) === 0
      );
    }

    // Tous les mois à la même date
    if (note.recurrence_type === "monthly_day") {
      const monthsDiff =
        (date.getFullYear() - originalDate.getFullYear()) * 12 +
        (date.getMonth() - originalDate.getMonth());

      return (
        monthsDiff >= 0 &&
        monthsDiff % (note.recurrence_interval || 1) === 0 &&
        date.getDate() === originalDate.getDate()
      );
    }

    // Un jour précis du mois
    if (note.recurrence_type === "monthly_weekday") {
      const monthsDiff =
        (date.getFullYear() - originalDate.getFullYear()) * 12 +
        (date.getMonth() - originalDate.getMonth());

      if (
        monthsDiff < 0 ||
        monthsDiff % (note.recurrence_interval || 1) !== 0
      ) {
        return false;
      }

      // Même jour de la semaine
      if (date.getDay() !== note.recurrence_day) {
        return false;
      }

      // Numéro de semaine dans le mois
      const weekNumber = Math.ceil(date.getDate() / 7);

      return weekNumber === note.recurrence_week;
    }

    return false;
  });
}

function renderPlanningNote(dayInfo) {

  const dateKey =
    `${dayInfo.date.getFullYear()}-` +
    `${String(dayInfo.date.getMonth() + 1).padStart(2, "0")}-` +
    `${String(dayInfo.date.getDate()).padStart(2, "0")}`;

  const notes = getPlanningNotesForDate(dayInfo.date);

  // Aucune note
  if (notes.length === 0) {
    return `
      <button
        class="planning-note-add"
        data-add-note="${dateKey}"
        title="Ajouter une note"
        aria-label="Ajouter une note"
      >
        📝
      </button>
    `;
  }

  // Une ou plusieurs notes
  return `
  <div class="planning-notes">
  
    ${notes.map(note => `
      <div class="planning-note" data-note-id="${note.id}">
  
        <span class="planning-note-text">
          ${note.note}
        </span>
  
        <button
          class="planning-note-delete"
          data-delete-note="${note.id}"
          aria-label="Supprimer la note"
        >
          ×
        </button>
  
      </div>
    `).join("")}
  
    <button
      class="planning-note-add"
      data-add-note="${dateKey}"
      title="Ajouter une note"
      aria-label="Ajouter une note"
    >
      📝
    </button>
  
  </div>
`;
}

function renderWeek() {
  updateWeekTitle();
  updateTodayDate();

  const days = getWeekDays();

  renderWeather(days);

  const today = new Date();

  $("#weekGrid").innerHTML = days.map((dayInfo, day) => `
    <article class="day-column ${dayInfo.date.toDateString() === today.toDateString() ? "today" : ""}">
      <header class="day-header">
        <strong>${dayInfo.name}</strong>
        <span>${dayInfo.day}</span>
      </header>
  
      ${["lunch", "dinner"].map(slot => renderSlot(day, slot)).join("")}
  
      ${renderPlanningNote(dayInfo)}
  
    </article>
  `).join("");

  $("#plannedCount").textContent = Object.keys(state.meals).length;

  updateWeekSummary();
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
    `DU ${firstDay.getDate()} AU ${lastDay.getDate()} ${months[lastDay.getMonth()]} `;
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
    `${days[today.getDay()]} ${today.getDate()} ${months[today.getMonth()]} `;

  const firstDay = new Date(currentDate);
  const diff = (firstDay.getDay() - 3 + 7) % 7;
  firstDay.setDate(firstDay.getDate() - diff);

  const todayIndex = Math.floor(
    (today - firstDay) / (1000 * 60 * 60 * 24)
  );

  if (todayIndex < 0 || todayIndex > 6) {
    $("#todayCard").style.display = "none";
    return;
  }

  $("#todayCard").style.display = "";

  const lunchKey = `${todayIndex}-lunch`;
  const dinnerKey = `${todayIndex}-dinner`;

  const lunchMeal = state.meals[lunchKey];
  const dinnerMeal = state.meals[dinnerKey];

  const getTodayMeal = (meal) => {
    if (!meal) return null;

    // Ancien format : l'ID de la recette est stocké directement
    if (typeof meal !== "object") {
      return state.recipes.find(
        r => String(r.id) === String(meal)
      ) || null;
    }

    // Nouveau format : une ou plusieurs recettes
    if (meal.type === "recipe") {
      const recipeIds = Array.isArray(meal.recipeIds)
        ? meal.recipeIds
        : meal.recipeId
          ? [meal.recipeId]
          : [];

      return state.recipes.find(
        r => String(r.id) === String(recipeIds[0])
      ) || null;
    }

    // Repas libre ou occasion
    return meal;
  };

  const lunchRecipe = getTodayMeal(lunchMeal);
  const dinnerRecipe = getTodayMeal(dinnerMeal);

  console.log("🍽️ LUNCH DU JOUR :", lunchMeal);
  console.log("🌙 DINNER DU JOUR :", dinnerMeal);

  $("#todayMeals").innerHTML = `
  <div class="today-meal" >
    <h3>🌞 Déjeuner</h3>
      ${lunchRecipe
      ? `
      <div class="meal-card ${getMealColorClass(lunchRecipe)}">
          ${lunchRecipe.photo
        ? `<img src="${lunchRecipe.photo}" class="today-meal-photo" alt="">`
        : ""
      }

          <div class="today-meal-info">
              <strong>${lunchRecipe.name}</strong>

              ${lunchRecipe.type === "free"
        ? `<small>🥫 Repas libre</small>`
        : lunchRecipe.type === "occasion"
          ? `<small>🏠 Occasion</small>`
          : `<small>${lunchRecipe.emoji || "👨‍🍳"} ${getTotalTime(lunchRecipe)} min · ${lunchRecipe.portions} pers.</small>`
      }
          </div>
      </div>
  `
      : "<p>Aucun repas prévu</p>"
    }
    </div>

  <div class="today-meal">
    <h3>🌙 Dîner</h3>
    ${dinnerRecipe
      ? `
      <div class="meal-card ${getMealColorClass(dinnerRecipe)}">
          ${dinnerRecipe.photo
        ? `<img src="${dinnerRecipe.photo}" class="today-meal-photo" alt="">`
        : ""
      }

          <div class="today-meal-info">
              <strong>${dinnerRecipe.name}</strong>

              ${dinnerRecipe.type === "free"
        ? `<small>🥫 Repas libre</small>`
        : dinnerRecipe.type === "occasion"
          ? `<small>🏠 Occasion</small>`
          : `<small>${dinnerRecipe.emoji || "👨‍🍳"} ${getTotalTime(dinnerRecipe)} min · ${dinnerRecipe.portions} pers.</small>`
      }
          </div>
      </div>
  `
      : "<p>Aucun repas prévu</p>"
    }
  </div>
`;
}

function renderSlot(day, slot) {
  const key = `${day}-${slot}`;

  const planned = state.meals[key];

  return `
    <div class="meal-slot ${slot}" data-drop-meal="${key}">
      <div class="slot-label">
        ${slotNames[slot]}
        <span>${slot === "lunch" ? "☀" : "☾"}</span>
      </div>
  
      ${planned
      ? `
          <button
            class="remove-meal"
            data-remove-meal="${key}"
            aria-label="Retirer"
          >×</button>
  
          ${renderMealCard(planned, key)}
        `
      : `
          <button
            class="add-meal"
            data-add-meal="${key}"
            aria-label="Ajouter un repas"
          >＋</button>
        `
    }
    </div>
  `;
}

function renderMealCard(planned, key) {

  // Ancien format : ID directement stocké dans state.meals
  if (typeof planned !== "object") {
    const recipe = state.recipes.find(
      r => String(r.id) === String(planned)
    );

    if (!recipe) {
      return `<p>Repas introuvable</p>`;
    }

    return `
      <div
        class="meal-card ${recipe.veggie
        ? "sage"
        : getTotalTime(recipe) <= 30
          ? "orange"
          : ""
      }"
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

  // 🍲 RECETTE : 1 ou 2 recettes
  if (planned.type === "recipe") {

    // Compatibilité avec l'ancien format
    const recipeIds = planned.recipeIds
      ? planned.recipeIds
      : [planned.recipeId];

    const recipes = recipeIds
      .map(id =>
        state.recipes.find(
          r => String(r.id) === String(id)
        )
      )
      .filter(Boolean);

    if (!recipes.length) {
      return `<p>Recette introuvable</p>`;
    }

    return `
    <div
      class="meal-card ${recipes[0].veggie
        ? "sage"
        : getTotalTime(recipes[0]) <= 30
          ? "orange"
          : ""
      }"
      draggable="true"
      data-drag-meal="${key}"
    >

      ${recipes.map(recipe => `
        <div
          class="planned-recipe"
          data-open-recipe="${recipe.id}"
        >
          <strong>${recipe.name}</strong>
          <small>
            ${recipe.emoji || "🍽️"}
            ${getTotalTime(recipe)} min ·
            ${recipe.portions} pers.
          </small>
        </div>
      `).join("")}

      ${recipes.length < 2 ? `
        <button
  type="button"
  class="add-second-recipe"
  data-add-second-recipe="${key}"
  aria-label="Ajouter une deuxième recette"
  title="Ajouter une deuxième recette"
>
  ＋
</button>
      ` : ""}
    </div>
  `;
  }


  // 🥫 REPAS LIBRE
  if (planned.type === "free") {

    return `
      <div
        class="meal-card free"
        draggable="true"
        data-drag-meal="${key}"
      >
        <strong>${planned.name}</strong>
        <small>🥫 Repas libre</small>
      </div>
    `;
  }

  // 🏠 OCCASION
  if (planned.type === "occasion") {

    return `
      <div
        class="meal-card occasion"
        draggable="true"
        data-drag-meal="${key}"
      >
        <strong>${planned.name}</strong>
        <small>🏠 Occasion</small>
      </div>
    `;
  }

  return "";
}

function getMealColorClass(meal) {

  if (!meal) return "";

  // Repas libre
  if (meal.type === "free") {
    return "free";
  }

  // Occasion
  if (meal.type === "occasion") {
    return "occasion";
  }

  // Recette
  return meal.color || "";
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
    (
      filter === "all" ||
      (filter === "veggie" && r.veggie) ||
      (filter === "quick" && getTotalTime(r) <= 30)
    )
  );

  recipes.sort((a, b) => {
    if (a.favorite === b.favorite) return 0;
    return a.favorite ? -1 : 1;
  });

  $("#recipeGrid").innerHTML = recipes.length
    ? recipes.map(r => `
  <article class="recipe-card">
    
                <!-- ⭐ Favori: en dehors de la photo-->
                <div class="recipe-badges">
    
    <span
        class="recipe-category-badge"
        title="${r.categories?.[0] ? getCategoryLabel(r.categories[0]) : ""}">
        ${r.categories?.[0] ? getCategoryIcon(r.categories[0]) : ""}
    </span>
    
    <button
        class="favorite-button ${r.favorite ? "favorite" : ""}"
data-favorite="${r.id}"
title = "${r.favorite ? "Retirer des favoris" : "Ajouter aux favoris"}" >
  ${r.favorite ? "★" : "☆"}
    </button>
    
</div>
    
                <!-- 📷 Zone visuelle-->
  <div class="recipe-visual ${r.color === "sage" ? "" : r.color}" >
    
    ${r.photo
        ? `<img src="${r.photo}" alt="${r.name}">`
        : `<div class="recipe-placeholder">
                                ${r.emoji}
                               </div>`
      }
  
                </div>
  
                <!-- 📝 Contenu de la recette-->
  <div class="recipe-content">
  
    <h3>${r.name}</h3>
  
    <p class="recipe-meta">
      ◷ ${getTotalTime(r)} min
      &nbsp;·&nbsp;
      ♙ ${r.portions} personnes
    </p>
  
    <div class="tags">
      ${(r.tags ?? [])
        .map(t => `<span class="tag">${t}</span>`)
        .join("")}
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
  
            </article>
  `).join("")
    : `<div class="empty-state" >
  Aucune recette ne correspond à votre recherche.
          </div> `;
}

// ======================================================
// GÉNÉRER LA LISTE DE COURSES DEPUIS LE PLANNING
// ======================================================
function normalizeShoppingIngredient(value) {

  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}


function normalizeShoppingUnit(value) {

  if (!value) {
    return "";
  }

  const unit = String(value)
    .trim()
    .toLowerCase();

  const aliases = {
    "pieces": "pièce",
    "piece": "pièce",
    "tranches": "tranche",
    "gousses": "gousse",
    "bottes": "botte",
    "brins": "brin",
    "boules": "boule",
    "sachets": "sachet",
    "pots": "pot",
    "boites": "boîte"
  };

  return aliases[unit] || unit;
}


function shoppingItemKey(item) {

  return [
    item.group || "Autres",
    normalizeShoppingIngredient(item.name),
    normalizeShoppingUnit(item.unit)
  ].join("|");
}

async function generateShoppingFromPlanning() {

  console.log("🛒 Génération de la liste de courses...");

  // --------------------------------------------------
  // 1. Récupérer toutes les recettes du planning
  // --------------------------------------------------

  const recipeIds = [];

  Object.values(state.meals).forEach(meal => {

    if (!meal || meal.type !== "recipe") {
      return;
    }

    const ids = Array.isArray(meal.recipeIds)
      ? meal.recipeIds
      : meal.recipeId
        ? [meal.recipeId]
        : [];

    ids.forEach(id => {
      if (id != null) {
        recipeIds.push(String(id));
      }
    });
  });

  const uniqueRecipeIds = [
    ...new Set(recipeIds)
  ];

  console.log(
    "🍽️ Recettes du planning :",
    uniqueRecipeIds
  );

  if (uniqueRecipeIds.length === 0) {
    showToast(
      "Aucune recette dans le planning"
    );
    return;
  }

  // --------------------------------------------------
  // 2. Charger les ingrédients structurés
  // --------------------------------------------------

  const ingredients =
    await getRecipeIngredientsForRecipes(
      uniqueRecipeIds
    );

  console.log("🛒 IDS RECETTES :", uniqueRecipeIds);
  console.log("🥕 INGREDIENTS SUPABASE :", ingredients);

  console.log(
    "🥕 Ingrédients récupérés :",
    ingredients
  );

  // --------------------------------------------------
  // 3. Regroupement
  // --------------------------------------------------

  const grouped = new Map();

  ingredients.forEach(item => {

    const ingredient =
      String(item.ingredient || "")
        .trim();

    if (!ingredient) {
      return;
    }

    // On ignore nos anciennes lignes
    // explicitement exclues.
    const normalizedText =
      ingredient.toLowerCase();

    if (
      normalizedText.startsWith("blank ") ||
      normalizedText.startsWith("pour la sauce") ||
      normalizedText.startsWith("selon votre goût") ||
      normalizedText.startsWith("selon vos goûts")
    ) {
      return;
    }

    const category =
      item.category || "Autres";

    const unit =
      item.unit
        ? item.unit.trim()
        : null;

    const key =
      [
        category,
        normalizeShoppingIngredient(
          ingredient
        ),
        normalizeShoppingUnit(unit)
      ].join("|");

    if (!grouped.has(key)) {

      grouped.set(key, {
        id: `planning-${Date.now()}-${grouped.size}`,
        group: category,
        name: ingredient,
        qty: item.quantity ?? null,
        unit,
        checked: false,
        source: "planning"
      });

      return;
    }

    const existing =
      grouped.get(key);

    // Addition seulement si les deux
    // quantités sont numériques.
    if (
      typeof existing.qty === "number" &&
      typeof item.quantity === "number"
    ) {
      existing.qty += item.quantity;
    }

  });

  // --------------------------------------------------
  // 4. Préserver l'état "coché" d'une génération précédente
  // --------------------------------------------------

  const previousGenerated =
    new Map(
      state.shopping
        .filter(
          item =>
            item.source === "planning"
        )
        .map(item => [
          shoppingItemKey(item),
          item.checked
        ])
    );

  grouped.forEach(item => {

    const key =
      shoppingItemKey(item);

    if (previousGenerated.has(key)) {
      item.checked =
        previousGenerated.get(key);
    }
  });

  // --------------------------------------------------
  // 5. Conserver les éventuels articles ajoutés
  //    manuellement
  // --------------------------------------------------

  const manualItems =
    state.shopping.filter(
      item => item.source !== "planning"
    );

  state.shopping = [
    ...manualItems,
    ...[...grouped.values()]
  ];

  save();
  renderShopping();

  showToast(
    `🛒 ${grouped.size} articles générés`
  );
}

// ======================================================
// BOUTON : GÉNÉRER LES COURSES DEPUIS LE PLANNING
// ======================================================

const generateShoppingButton =
  $("#generateShoppingFromWeek");

if (generateShoppingButton) {

  generateShoppingButton.addEventListener(
    "click",
    async () => {

      try {

        await generateShoppingFromPlanning();

        navigate("shopping");

      } catch (error) {

        console.error(
          "❌ Erreur génération courses :",
          error
        );

        showToast(
          "Impossible de générer les courses"
        );
      }

    }
  );

}


function formatShoppingQuantity(item) {

  if (item.qty === null || item.qty === undefined) {
    return "quantité non précisée";
  }

  const quantity =
    Number.isInteger(Number(item.qty))
      ? Number(item.qty).toString()
      : Number(item.qty).toLocaleString("fr-FR", {
        maximumFractionDigits: 2
      });

  if (!item.unit) {
    return quantity;
  }

  let unit = item.unit;

  if (unit === "pièce" && Number(item.qty) > 1) {
    unit = "pièces";
  }

  if (unit === "boule" && Number(item.qty) > 1) {
    unit = "boules";
  }

  if (unit === "botte" && Number(item.qty) > 1) {
    unit = "bottes";
  }

  if (unit === "tranche" && Number(item.qty) > 1) {
    unit = "tranches";
  }

  if (unit === "gousse" && Number(item.qty) > 1) {
    unit = "gousses";
  }

  return `${quantity} ${unit}`;
}


function renderShopping() {

  const groups = [
    ...new Set(
      state.shopping.map(item =>
        item.group || "Autres"
      )
    )
  ];

  $("#shoppingList").innerHTML = groups
    .map(group => {

      const items = state.shopping.filter(
        item => (item.group || "Autres") === group
      );

      return `
        <section class="shopping-group">
    
          <h3>${group}</h3>
    
          ${items.map(item => `
            <label
              class="shopping-item ${item.checked ? "checked" : ""}"
            >
    
              <input
                type="checkbox"
                data-check-item="${item.id}"
                ${item.checked ? "checked" : ""}
              >
    
              <span>${item.name}</span>
    
              <small>
                ${formatShoppingQuantity(item)}
              </small>
    
            </label>
          `).join("")}
    
        </section>
      `;

    })
    .join("");


  const checked =
    state.shopping.filter(
      item => item.checked
    ).length;

  const total =
    state.shopping.length;

  $("#progressText").textContent =
    `${checked} sur ${total} articles`;

  $("#progressBar").style.width =
    total
      ? `${checked / total * 100}%`
      : "0";

  $("#remainingCount").textContent =
    total - checked;

  $("#shoppingBadge").textContent =
    total - checked;
}

async function loadStockFromSupabase() {
  console.log("📦 Chargement du stock depuis Supabase...");

  const stockItems = await getStockItems();

  // On vide les trois zones en mémoire
  state.fridge = [];
  state.pantry = [];
  state.freezer = [];

  // Transformation Supabase → format utilisé par l'interface
  stockItems.forEach(item => {
    const product = item.product;

    const stockItem = {
      id: item.id,
      product_id: item.product_id,
      name: product?.name || "Produit",
      qty: item.quantity ?? "",
      unit: item.unit ?? product?.default_unit ?? "",
      expiry: item.expiration_date || "",
      brand: item.brand || null,
      location: item.location
    };

    if (item.location === "fridge") {
      state.fridge.push(stockItem);
    } else if (item.location === "pantry") {
      state.pantry.push(stockItem);
    } else if (item.location === "freezer") {
      state.freezer.push(stockItem);
    }
  });

  console.log("🥶 Frigo :", state.fridge);
  console.log("🥫 Placard :", state.pantry);
  console.log("❄️ Congélateur :", state.freezer);
}

function formatDate(date) {
  if (!date) return "";

  const d = new Date(date + "T00:00:00");

  if (isNaN(d)) return "";

  return d.toLocaleDateString("fr-FR");
}


// ==================================================
// STOCK — AFFICHAGE
// ==================================================

function renderFridge() {
  const container = $("#stockFridge");
  if (!container) return;

  const items = state.fridge || [];

  const count = $("#stockCountFridge");
  if (count) {
    count.textContent = items.length;
  }

  container.innerHTML = `
    <div class="stock-header">
      <span>Qté</span>
      <span>Unité</span>
      <span>Produit</span>
      <span>Date</span>
    </div>
  
    ${items.length
      ? items.map(item => `
            <article
              class="stock-item"
              data-location="fridge"
              data-id="${item.id}"
            >
              <span class="stock-qty">
                ${item.qty || ""}
              </span>
    
              <span class="stock-unit">
                ${item.unit || ""}
              </span>
    
              <span class="stock-name">
                ${item.name || ""}
              </span>
    
              <span class="stock-expiry">
  ${item.expiry ? formatDate(item.expiry) : ""}
</span>
    
<label class="stock-select" title="Sélectionner pour supprimer">
  <input
    type="checkbox"
    class="stock-checkbox"
    data-stock-id="${item.id}"
    ${selectedStockIds.has(String(item.id)) ? "checked" : ""}
  >
</label>
            </article>
          `).join("")
      : `
            <p class="stock-empty">
              Aucun produit dans le frigo.
            </p>
          `
    }
  
    <button
      class="stock-add-button"
      data-location="fridge"
    >
      + Ajouter un produit
    </button>
  `;
}


function renderPantry() {
  const container = $("#stockCupboard");
  if (!container) return;

  const items = state.pantry || [];

  const count = $("#stockCountCupboard");
  if (count) {
    count.textContent = items.length;
  }

  container.innerHTML = `
    <div class="stock-header">
      <span>Qté</span>
      <span>Unité</span>
      <span>Produit</span>
      <span>Date</span>
    </div>
  
    ${items.length
      ? items.map(item => `
            <article
              class="stock-item"
              data-location="pantry"
              data-id="${item.id}"
            >
              <span class="stock-qty">
                ${item.qty || ""}
              </span>
    
              <span class="stock-unit">
                ${item.unit || ""}
              </span>
    
              <span class="stock-name">
                ${item.name || ""}
              </span>
    
              <span class="stock-expiry">
  ${item.expiry ? formatDate(item.expiry) : ""}
</span>
    
<label class="stock-select" title="Sélectionner pour supprimer">
  <input
    type="checkbox"
    class="stock-checkbox"
    data-stock-id="${item.id}"
    ${selectedStockIds.has(String(item.id)) ? "checked" : ""}
  >
</label>
            </article>
          `).join("")
      : `
            <p class="stock-empty">
              Aucun produit dans le placard.
            </p>
          `
    }
  
    <button
      class="stock-add-button"
      data-location="pantry"
    >
      + Ajouter un produit
    </button>
  `;
}


function renderFreezer() {
  const container = $("#stockFreezer");
  if (!container) return;

  const items = state.freezer || [];

  const count = $("#stockCountFreezer");
  if (count) {
    count.textContent = items.length;
  }

  container.innerHTML = `
    <div class="stock-header">
      <span>Qté</span>
      <span>Unité</span>
      <span>Produit</span>
      <span>Date</span>
    </div>
  
    ${items.length
      ? items.map(item => `
            <article
              class="stock-item"
              data-location="freezer"
              data-id="${item.id}"
            >
              <span class="stock-qty">
                ${item.qty || ""}
              </span>
    
              <span class="stock-unit">
                ${item.unit || ""}
              </span>
    
              <span class="stock-name">
                ${item.name || ""}
              </span>
    
              <span class="stock-expiry">
  ${item.expiry ? formatDate(item.expiry) : ""}
</span>
    
<label class="stock-select" title="Sélectionner pour supprimer">
  <input
    type="checkbox"
    class="stock-checkbox"
    data-stock-id="${item.id}"
    ${selectedStockIds.has(String(item.id)) ? "checked" : ""}
  >
</label>
            </article>
          `).join("")
      : `
            <p class="stock-empty">
              Aucun produit dans le congélateur.
            </p>
          `
    }
  
    <button
      class="stock-add-button"
      data-location="freezer"
    >
      + Ajouter un produit
    </button>
  `;
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
}

function openModal(type, payload = {}) {

  const modal = $("#modal");
  const title = $("#modalTitle");
  const eyebrow = $("#modalEyebrow");
  const fields = $("#modalFields");
  const form = $("#modalForm");
  const cancelButton = $(".modal-actions .secondary-button", form);
  const submitButton = $("#modalSubmit");

  submitButton.type = "submit";
  submitButton.dataset.editRecipeFromDetail = "";
  cancelButton.type = "button";
  form.dataset.type = type;
  form.dataset.payload = JSON.stringify(payload);
  cancelButton.textContent = "Annuler";
  submitButton.hidden = false;
  submitButton.textContent = "Enregistrer";

  // 🗑️ Bouton supprimer pour un produit existant
  const oldDeleteButton = form.querySelector("#modalDeleteStock");
  if (oldDeleteButton) oldDeleteButton.remove();

  if (
    payload.edit &&
    ["fridge", "pantry", "freezer"].includes(type)
  ) {
    const deleteButton = document.createElement("button");

    deleteButton.type = "button";
    deleteButton.id = "modalDeleteStock";
    deleteButton.className = "secondary-button";
    deleteButton.textContent = "🗑️ Supprimer";

    submitButton.parentElement.prepend(deleteButton);
  }

  // TODO FEAT-005
  // Ancien système de création de recette.
  // À supprimer lorsque recipeForm sera entièrement migré.
  if (type === "recipe") {
    eyebrow.textContent = "NOUVELLE RECETTE"; title.textContent = "Ajouter une recette";
    fields.innerHTML = `
  <div class="field" >
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
    const isAddingSecondRecipe = payload.addSecondRecipe === true;

    eyebrow.textContent = isAddingSecondRecipe
      ? "AJOUTER UNE RECETTE"
      : "AJOUTER AU MENU";

    title.textContent = isAddingSecondRecipe
      ? "Quelle recette souhaitez-vous ajouter ?"
      : "Que souhaitez-vous prévoir ?";

    fields.innerHTML = `
  <div class="field" >
            <label>Type</label>
            <select name="mealType" id="mealType" required>
                <option value="recipe">🍲 Une recette</option>
                <option value="free">🥫 Un repas libre</option>
                <option value="occasion">🏠 Une occasion</option>
            </select>
        </div>
      
        <div id="mealRecipeField" class="field">
            <label>Recette</label>
            <div class="recipe-search">
      
    <div id="selectedRecipes" class="selected-recipes"></div>
      
    <input
        type="text"
        id="mealRecipeSearch"
        placeholder="🔎 Rechercher une recette..."
        autocomplete="off"
    >
      
    <div id="mealRecipeResults" class="recipe-search-results">
        ${state.recipes.map(r => `
            <button
                type="button"
                class="recipe-search-item"
                data-recipe-id="${r.id}"
            >
                ${r.name}
                <span>· ${getTotalTime(r)} min</span>
            </button>
        `).join("")}
    </div>
      
    <input type="hidden" name="recipe" id="selectedRecipeId">
      
</div>
        </div>
      
        <div id="mealTextField" class="field hidden">
            <label id="mealTextLabel">Nom</label>
            <input
                type="text"
                name="mealName"
                placeholder="Ex. Cassoulet"
            >
        </div>
      
        <div id="mealPhotoField" class="field hidden">
            <label>Photo <span class="optional">(facultative)</span></label>
            <input
                type="file"
                name="mealPhoto"
                accept="image/*"
            >
        </div>
`;

    const mealType = fields.querySelector("#mealType");
    const mealRecipeField = fields.querySelector("#mealRecipeField");
    const mealTextField = fields.querySelector("#mealTextField");
    const mealPhotoField = fields.querySelector("#mealPhotoField");
    const mealTextLabel = fields.querySelector("#mealTextLabel");
    const mealName = fields.querySelector('[name="mealName"]');

    // 🔎 Recherche de recette

    const mealRecipeSearch = fields.querySelector("#mealRecipeSearch");
    const mealRecipeResults = fields.querySelector("#mealRecipeResults");
    const selectedRecipeId = fields.querySelector("#selectedRecipeId");


    // 🍽️ Gestion de 1 ou 2 recettes

    let selectedRecipeIds = [];


    const selectedRecipes = fields.querySelector("#selectedRecipes");

    function renderSelectedRecipes() {

      selectedRecipes.innerHTML = selectedRecipeIds.map(id => {

        const recipe = state.recipes.find(
          r => String(r.id) === String(id)
        );

        if (!recipe) return "";

        return `
      <div class="selected-recipe">
        <span>
          ${recipe.emoji || "🍽️"} ${recipe.name}
        </span>
          
        <button
          type="button"
          class="remove-selected-recipe"
          data-remove-recipe="${recipe.id}"
        >
          ×
        </button>
      </div>
    `;
      }).join("");

      selectedRecipeId.value = selectedRecipeIds[0] || "";

      const maxReached = selectedRecipeIds.length >= 2;

      mealRecipeSearch.disabled = maxReached;

      if (maxReached) {
        mealRecipeSearch.placeholder = "2 recettes sélectionnées";
        mealRecipeResults.classList.add("hidden");
      } else {
        mealRecipeSearch.placeholder = "🔎 Rechercher une recette...";
      }
    }

    function filterRecipes() {

      const search = mealRecipeSearch.value.trim().toLowerCase();

      mealRecipeResults.querySelectorAll(".recipe-search-item").forEach(item => {

        const id = item.dataset.recipeId;
        const recipeName = item.textContent.toLowerCase();

        const alreadySelected = selectedRecipeIds.some(
          selectedId => String(selectedId) === String(id)
        );

        const matchesSearch =
          search === "" || recipeName.includes(search);

        item.classList.toggle(
          "hidden",
          alreadySelected || !matchesSearch
        );
      });
    }

    mealRecipeSearch.addEventListener("input", filterRecipes);

    mealRecipeSearch.addEventListener("focus", () => {

      if (selectedRecipeIds.length < 2) {
        mealRecipeResults.classList.remove("hidden");
        filterRecipes();
      }

    });

    mealRecipeResults.addEventListener("click", e => {

      const item = e.target.closest(".recipe-search-item");

      if (!item) return;

      const recipeId = item.dataset.recipeId;

      if (selectedRecipeIds.length >= 2) return;

      if (selectedRecipeIds.includes(recipeId)) return;

      selectedRecipeIds.push(recipeId);

      mealRecipeSearch.value = "";

      renderSelectedRecipes();
      filterRecipes();

    });

    selectedRecipes.addEventListener("click", e => {

      const button = e.target.closest("[data-remove-recipe]");

      if (!button) return;

      const recipeId = button.dataset.removeRecipe;

      selectedRecipeIds = selectedRecipeIds.filter(
        id => String(id) !== String(recipeId)
      );

      renderSelectedRecipes();
      filterRecipes();

    });

    if (isAddingSecondRecipe) {
      mealType.value = "recipe";
      mealType.dispatchEvent(new Event("change"));
    }

    mealType.addEventListener("change", () => {
      const isRecipe = mealType.value === "recipe";

      mealRecipeField.classList.toggle("hidden", !isRecipe);
      mealTextField.classList.toggle("hidden", isRecipe);
      mealPhotoField.classList.toggle("hidden", isRecipe);

      if (mealType.value === "free") {
        mealTextLabel.textContent = "Nom du repas";
        mealName.placeholder = "Ex. Cassoulet";
      }

      if (mealType.value === "occasion") {
        mealTextLabel.textContent = "Nom de l'occasion";
        mealName.placeholder = "Ex. Repas chez les frangins";
      }
    });
    requestAnimationFrame(() => {
      if (mealType.value === "recipe") {
        mealRecipeSearch.focus();
      }
    });
  }
  else if (type === "plan") {

    eyebrow.textContent = "PLANIFIER UNE RECETTE";
    title.textContent = "Choisir un créneau";

    fields.innerHTML = `
  <div class="field" >
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

        // Ne proposer que les créneaux libres
        if (plannedId) return "";

        return `
      <option value="${key}">
        ${dayInfo.name} ${slot === "lunch" ? "midi" : "soir"} 🟢 Libre
      </option>
    `;
      }).filter(Boolean)
    ).join("")}
    
    </select>
  </div>
`;
  }

  else if (type === "complete-week") {

    eyebrow.textContent = "PLANNING INTELLIGENT";
    title.textContent = "Compléter ma semaine";

    fields.innerHTML = `
  <div class="field" >
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

  } else if (type === "planning-note") {

    const date = payload.date || "";

    eyebrow.textContent = "NOTE DU JOUR";
    title.textContent = "Ajouter une note";

    fields.innerHTML = `
    <div class="field">
      <label>Note</label>
      <input
        name="note"
        required
        placeholder="Ex. Anniversaire Juline"
      >
    </div>
    
    <div class="field">
      <label>Date</label>
      <input
        name="date"
        type="date"
        value="${date}"
        required
      >
    </div>
    
    <div class="field">
      <label>
        <input
          type="checkbox"
          name="recurring"
          id="planningNoteRecurring"
        >
        Récurrente
      </label>
    </div>
    
    <div id="recurrenceOptions" hidden>
    
      <div class="field">
        <label>Répéter</label>
    
        <select name="recurrence_type" id="recurrenceType">
          <option value="yearly">Tous les ans</option>
          <option value="weekly">Toutes les semaines</option>
          <option value="monthly_day">Tous les mois à la même date</option>
          <option value="monthly_weekday">Un jour précis du mois</option>
        </select>
      </div>
    
      <div class="field" id="recurrenceIntervalField">
        <label>Intervalle</label>
        <input
          name="recurrence_interval"
          type="number"
          min="1"
          value="1"
        >
      </div>
    
      <div class="field" id="recurrenceWeekField" hidden>
        <label>Numéro dans le mois</label>
    
        <select name="recurrence_week">
          <option value="1">1er</option>
          <option value="2">2ème</option>
          <option value="3">3ème</option>
          <option value="4">4ème</option>
          <option value="5">5ème</option>
        </select>
      </div>
    
    </div>
  `;

    const recurringCheckbox = fields.querySelector(
      "#planningNoteRecurring"
    );

    const recurrenceOptions = fields.querySelector(
      "#recurrenceOptions"
    );

    const recurrenceType = fields.querySelector(
      "#recurrenceType"
    );

    const recurrenceWeekField = fields.querySelector(
      "#recurrenceWeekField"
    );

    recurringCheckbox.addEventListener("change", () => {
      recurrenceOptions.hidden = !recurringCheckbox.checked;
    });

    recurrenceType.addEventListener("change", () => {
      recurrenceWeekField.hidden =
        recurrenceType.value !== "monthly_weekday";
    });

  } else if (type === "shopping") {
    eyebrow.textContent = "LISTE DE COURSES"; title.textContent = "Ajouter un article";
    fields.innerHTML = `<div class="field" ><label>Article</label><input name="name" required placeholder="Ex. Pain complet"></div>
      <div class="field-row"><div class="field"><label>Quantité</label><input name="qty" value="1"></div>
      <div class="field"><label>Rayon</label><select name="group"><option>Fruits & légumes</option><option>Épicerie</option><option>Crèmerie</option><option>Boucherie</option><option>Poissonnerie</option></select></div></div>`;

  } else if (type === "stock") {

    eyebrow.textContent = "MON STOCK";
    title.textContent = "Ajouter un produit";

    fields.innerHTML = `
    <div class="field">
      <label>Produit</label>
      <input
        name="name"
        required
        placeholder="Ex. Champignons"
      >
    </div>
    
    <div class="field-row">
    
      <div class="field">
        <label>Quantité</label>
        <input
          name="qty"
          value="1"
        >
      </div>
    
      <div class="field">
        <label>Ranger dans</label>
        <select name="location" required>
          <option value="fridge">🧊 Frigo</option>
          <option value="pantry">🥫 Placard</option>
          <option value="freezer">❄️ Congélateur</option>
        </select>
      </div>
    
    </div>
    
    <div class="field">
      <label>Date de péremption / DLC</label>
      <input
        name="expiry"
        type="date"
      >
    </div>
  `;

  } else if (type === "fridge") {
    eyebrow.textContent = "MON FRIGO";
    title.textContent = "Ajouter un aliment";

    fields.innerHTML = `
    <div class="field">
      <label>Aliment</label>
      <input
        name="name"
        required
        placeholder="Ex. Champignons"
      >
    </div>
    
    <div class="field-row">
      <div class="field">
        <label>Quantité</label>
        <input
          name="qty"
          type="number"
          min="0"
          step="any"
          placeholder="Ex. 6"
        >
      </div>
    
      <div class="field">
        <label>Unité</label>
        <input
          name="unit"
          placeholder="Ex. pièces, g, kg, L..."
        >
      </div>
    </div>
    
    <div class="field">
      <label>Date de péremption / DLC</label>
      <input
        name="expiry"
        type="date"
      >
    </div>
  `;

  } else if (type === "pantry") {
    eyebrow.textContent = "MON PLACARD";
    title.textContent = "Ajouter un produit";

    fields.innerHTML = `
    <div class="field">
      <label>Produit</label>
      <input
        name="name"
        required
        placeholder="Ex. Pâtes"
      >
    </div>
    
    <div class="field-row">
      <div class="field">
        <label>Quantité</label>
        <input
          name="qty"
          type="number"
          min="0"
          step="any"
          placeholder="Ex. 2"
        >
      </div>
    
      <div class="field">
        <label>Unité</label>
        <input
          name="unit"
          placeholder="Ex. paquets, g, kg, L..."
        >
      </div>
    </div>
    
    <div class="field">
      <label>Date de péremption / DLC</label>
      <input
        name="expiry"
        type="date"
      >
    </div>
  `;

  } else if (type === "freezer") {
    eyebrow.textContent = "MON CONGÉLATEUR";
    title.textContent = "Ajouter un produit";

    fields.innerHTML = `
    <div class="field">
      <label>Produit</label>
      <input
        name="name"
        required
        placeholder="Ex. Blancs de poulet"
      >
    </div>
    
    <div class="field-row">
      <div class="field">
        <label>Quantité</label>
        <input
          name="qty"
          type="number"
          min="0"
          step="any"
          placeholder="Ex. 4"
        >
      </div>
    
      <div class="field">
        <label>Unité</label>
        <input
          name="unit"
          placeholder="Ex. pièces, g, kg..."
        >
      </div>
    </div>
    
    <div class="field">
      <label>Date de péremption / DLC</label>
      <input
        name="expiry"
        type="date"
      >
    </div>
  `;


  } else if (type === "recipe-details") {
    const recipe = state.recipes.find(r => r.id == payload.recipeId);

    console.log("🔎 RECETTE FICHE :", {
      name: recipe?.name,
      ingredients: recipe?.ingredients,
      steps: recipe?.steps
    });

    if (!recipe) return;

    eyebrow.textContent = "FICHE RECETTE";
    title.textContent = `${recipe.emoji} ${recipe.name} `;

    cancelButton.textContent = "Fermer";

    submitButton.hidden = false;
    submitButton.textContent = "✏️ Modifier";
    submitButton.type = "button";
    submitButton.dataset.editRecipeFromDetail = recipe.id;

    fields.innerHTML = `
  <div class="recipe-detail-meta" >
        <span>◷ ${getTotalTime(recipe)} min</span>
        <span>♙ ${recipe.portions} personnes</span>
        ${recipe.veggie ? "<span>☘ Végétarien</span>" : ""}
      </div>
    
      <div class="tags recipe-detail-tags">
        ${(recipe.tags || [])
        .map(t => `<span class="tag">${t}</span>`)
        .join("")}
      </div>
    
      <section class="recipe-detail-section">
        <h3>Ingrédients</h3>
        ${recipe.ingredients?.length
        ? `<ul>${recipe.ingredients.map(item => `
    <li>
      ${item.quantity ?? ""} ${item.unit ?? ""} ${item.ingredient ?? ""}
    </li>
  `).join("")}</ul>`
        : `<p>Les ingrédients détaillés pourront être ajoutés lors de la modification de cette recette.</p>`
      }
      </section>
    
      <section class="recipe-detail-section">
        <h3>Préparation</h3>
        ${recipe.steps?.length
        ? `<ol>${recipe.steps.map(step => `<li>${step}</li>`).join("")}</ol>`
        : `<p>La préparation détaillée n’a pas encore été renseignée.</p>`
      }
      </section>
  
  
`;
  }
  // ✏️ Mode modification d'un produit du stock
  if (
    payload.edit &&
    payload.product &&
    ["fridge", "pantry", "freezer"].includes(type)
  ) {
    const product = payload.product;

    const nameInput = fields.querySelector('[name="name"]');
    const qtyInput = fields.querySelector('[name="qty"]');
    const unitInput = fields.querySelector('[name="unit"]');
    const expiryInput = fields.querySelector('[name="expiry"]');

    if (nameInput) {
      nameInput.value = product.name ?? "";
    }

    if (qtyInput) {
      qtyInput.value = product.qty ?? "";
    }

    if (unitInput) {
      unitInput.value = product.unit ?? "";
    }

    if (expiryInput) {
      expiryInput.value = product.expiry ?? "";
    }

    title.textContent = "Modifier le produit";
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

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;

    reader.readAsDataURL(file);
  });
}

function updateWeekSummary() {
  let plannedMeals = 0;
  let occasions = 0;
  let vegetarians = 0;
  let totalMinutes = 0;

  Object.values(state.meals).forEach(meal => {
    if (!meal) return;

    // ==================================================
    // ANCIEN FORMAT : l'ID de la recette est stocké
    // directement
    // ==================================================
    if (typeof meal !== "object") {
      const recipe = state.recipes.find(
        r => String(r.id) === String(meal)
      );

      if (recipe) {
        plannedMeals++;

        if (recipe.vegetarian) {
          vegetarians++;
        }

        totalMinutes += getTotalTime(recipe) || 0;
      }

      return;
    }

    // ==================================================
    // REPAS LIBRE
    // ==================================================
    if (meal.type === "free") {
      plannedMeals++;
      return;
    }

    // ==================================================
    // OCCASION
    // ==================================================
    if (meal.type === "occasion") {
      occasions++;
      return;
    }

    // ==================================================
    // RECETTE — NOUVEAU FORMAT : recipeIds[]
    // ==================================================
    if (meal.type === "recipe") {

      const recipeIds = Array.isArray(meal.recipeIds)
        ? meal.recipeIds
        : meal.recipeId
          ? [meal.recipeId]
          : [];

      if (recipeIds.length === 0) return;

      // Le créneau constitue 1 repas planifié
      plannedMeals++;

      recipeIds.forEach(recipeId => {

        const recipe = state.recipes.find(
          r => String(r.id) === String(recipeId)
        );

        if (!recipe) return;

        if (recipe.vegetarian) {
          vegetarians++;
        }

        totalMinutes += getTotalTime(recipe) || 0;
      });

      return;
    }
  });

  // ==================================================
  // TEMPS TOTAL DE CUISINE
  // ==================================================

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  let cookingText = "";

  if (totalMinutes > 0) {
    if (hours > 0 && minutes > 0) {
      cookingText =
        `environ ${hours} h ${minutes.toString().padStart(2, "0")}`;
    } else if (hours > 0) {
      cookingText = `environ ${hours} h`;
    } else {
      cookingText = `environ ${minutes} min`;
    }
  }

  // ==================================================
  // TEXTE DU BANDEAU
  // ==================================================

  const parts = [
    `${plannedMeals} repas planifié${plannedMeals > 1 ? "s" : ""}`
  ];

  if (occasions > 0) {
    parts.push(
      `${occasions} occasion${occasions > 1 ? "s" : ""}`
    );
  }

  if (vegetarians > 0) {
    parts.push(
      `${vegetarians} végétarien${vegetarians > 1 ? "s" : ""}`
    );
  }

  if (cookingText) {
    parts.push(`${cookingText} de cuisine`);
  }

  const summary = document.querySelector("#weekSummaryText");

  if (summary) {
    summary.textContent = parts.join(" · ");
  }
}



$("#modalForm").addEventListener("submit", async e => {
  if (e.submitter?.value === "cancel") return;
  e.preventDefault();
  const form = e.currentTarget, data = Object.fromEntries(new FormData(form));
  const type = form.dataset.type, payload = JSON.parse(form.dataset.payload || "{}");

  const stockLocation =
    type === "stock"
      ? data.location
      : type;


  if (type === "meal") {

    const mealType = data.mealType;

    if (mealType === "recipe") {

      // 🍽️ Ajout d'une deuxième recette
      if (payload.addSecondRecipe) {

        const existingMeal = state.meals[payload.key];

        if (
          existingMeal &&
          existingMeal.type === "recipe"
        ) {

          const existingIds = existingMeal.recipeIds
            ? [...existingMeal.recipeIds]
            : [existingMeal.recipeId];

          if (existingIds.length < 2) {
            existingIds.push(data.recipe);
          }

          existingMeal.recipeIds = existingIds;
          delete existingMeal.recipeId;
        }

        showToast("Deuxième recette ajoutée à la semaine");

      } else {

        // 🍲 Première recette
        state.meals[payload.key] = {
          type: "recipe",
          recipeIds: [data.recipe]
        };

        showToast("Recette ajoutée à la semaine");
      }

    } else {
      const photoFile = data.mealPhoto;

      state.meals[payload.key] = {
        type: mealType,
        name: data.mealName.trim(),
        photo: photoFile instanceof File && photoFile.size > 0
          ? await fileToDataUrl(photoFile)
          : ""
      };

      showToast(
        mealType === "occasion"
          ? "Occasion ajoutée à la semaine"
          : "Repas ajouté à la semaine"
      );
    }

    renderWeek();

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

    showToast(`✅ ${payload.recipe.name} planifiée • ${slotLabel[data.slot]} `);

  } else if (type === "planning-note") {

    const noteDate = data.date;

    const note = await savePlanningNote({
      note: data.note.trim(),
      date: noteDate,
      recurring: data.recurring === "on",
      recurrence_type:
        data.recurring === "on"
          ? data.recurrence_type
          : null,
      recurrence_interval:
        data.recurring === "on"
          ? Number(data.recurrence_interval || 1)
          : 1,
      recurrence_day:
        data.recurring === "on"
          ? (
            data.recurrence_type === "monthly_day"
              ? new Date(`${noteDate}T12:00:00`).getDate()
              : new Date(`${noteDate}T12:00:00`).getDay()
          )
          : null,
      recurrence_week:
        data.recurring === "on" &&
          data.recurrence_type === "monthly_weekday"
          ? Number(data.recurrence_week)
          : null
    });

    planningNotes.push(note);

    renderWeek();

    showToast("📝 Note ajoutée");

  } else if (type === "shopping") {
    state.shopping.push({ id: Date.now(), group: data.group, name: data.name, qty: data.qty, checked: false }); renderShopping(); showToast("Article ajouté à la liste");
  } else {

    // ==================================================
    // STOCK — MODIFICATION / AJOUT
    // ==================================================

    // ✏️ Modification d'un produit existant
    if (payload.edit && payload.product) {

      try {

        await updateStockItem(payload.product.id, {
          product_id: payload.product.product_id,
          brand: payload.product.brand ?? null,
          location: stockLocation,
          quantity: data.qty,
          unit: payload.product.unit ?? null,
          expiration_date: data.expiry || null,
        });

        // Recharge le stock depuis Supabase
        await loadStockFromSupabase();

        if (type === "fridge") {
          renderFridge();
        } else if (type === "pantry") {
          renderPantry();
        } else if (type === "freezer") {
          renderFreezer();
        }

        showToast(
          type === "fridge"
            ? "Aliment modifié"
            : "Produit modifié"
        );

      } catch (error) {

        console.error(
          "❌ Erreur modification stock :",
          error
        );

        showToast("Impossible de modifier le produit");
        return;
      }

    } else {

      // ➕ Ajout d'un nouveau produit
      try {

        // 1️⃣ Cherche si le produit existe déjà dans Supabase
        const products = await getProducts();

        let product = products.find(
          p =>
            String(p.name).trim().toLowerCase() ===
            String(data.name).trim().toLowerCase()
        );

        // 2️⃣ S'il n'existe pas, on le crée
        if (!product) {

          product = await addProduct({
            name: data.name,
            default_unit: null,
            always_have: false
          });

        }

        console.log("📦 Produit utilisé :", product);

        // 3️⃣ Crée la ligne de stock
        await addStockItem({

          product_id: product.id,

          location: stockLocation,

          quantity: data.qty,

          unit: data.unit || null,

          expiration_date: data.expiry || null,

          brand: null
        });

        // 4️⃣ Recharge le stock depuis Supabase
        await loadStockFromSupabase();

        // 5️⃣ Réaffiche les trois zones
        renderFridge();
        renderPantry();
        renderFreezer();

        showToast(
          stockLocation === "fridge"
            ? "Aliment rangé dans le frigo"
            : stockLocation === "pantry"
              ? "Produit rangé dans le placard"
              : "Produit rangé dans le congélateur"
        );

      } catch (error) {

        console.error(
          "❌ Erreur ajout stock :",
          error
        );

        showToast("Impossible d'ajouter le produit");
        return;
      }
    }
  }

  await save();
  $("#modal").close();
});

async function geocodeWeatherCity(city) {
  const url =
    `https://geocoding-api.open-meteo.com/v1/search` +
    `?name=${encodeURIComponent(city)}` +
    `&count=5` +
    `&language=fr` +
    `&format=json`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Erreur géocodage : ${response.status}`);
  }

  const data = await response.json();

  if (!data.results?.length) {
    throw new Error(`Ville introuvable : ${city}`);
  }

  const result =
    data.results.find(r => r.country_code === "FR") ||
    data.results[0];

  return {
    city: result.name,
    latitude: result.latitude,
    longitude: result.longitude,
    country: result.country,
    countryCode: result.country_code
  };
}

// ==================================================
// STOCK — NAVIGATION ENTRE LES ZONES
// ==================================================

document.addEventListener("click", (e) => {
  const button = e.target.closest("[data-stock-nav]");
  if (!button) return;

  const targetId = button.dataset.stockNav;
  const target = document.getElementById(targetId);

  if (!target) return;

  target.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
});

// ==================================================
// STOCK — SÉLECTION POUR SUPPRESSION
// ==================================================

const selectedStockIds = new Set();


document.addEventListener("click", async (e) => {

  // ==================================================
  // STOCK — CASES À COCHER
  // ==================================================

  const checkbox = e.target.closest(".stock-checkbox");

  if (checkbox) {

    const productId = String(checkbox.dataset.stockId);

    if (checkbox.checked) {
      selectedStockIds.add(productId);
    } else {
      selectedStockIds.delete(productId);
    }

    updateStockSelectionUI();

    return;
  }

  // Ouvrir les réglages
  const openSettings = e.target.closest("#openSettingsButton");

  if (openSettings) {
    const settingsModal = document.querySelector("#settingsModal");
    const weatherCity = document.querySelector("#weatherCity");

    if (settingsModal && weatherCity) {
      weatherCity.value = state.weatherLocation?.city || "Tourcoing";
      settingsModal.showModal();
    }

    return;
  }

  // Fermer les réglages
  const closeSettings = e.target.closest("#closeSettingsButton");
  const cancelSettings = e.target.closest("#cancelSettingsButton");

  if (closeSettings || cancelSettings) {
    const settingsModal = document.querySelector("#settingsModal");

    if (settingsModal?.open) {
      settingsModal.close();
    }

    return;
  }

  // Enregistrer les réglages
  const settingsForm = e.target.closest("#settingsForm");

  if (settingsForm) {
    const weatherCity = document.querySelector("#weatherCity");
    const city = weatherCity?.value.trim();

    if (!city) {
      showToast("Veuillez saisir une ville");
      return;
    }

    try {
      const location = await geocodeWeatherCity(city);

      state.weatherLocation = location;

      save();

      const settingsModal = document.querySelector("#settingsModal");

      if (settingsModal?.open) {
        settingsModal.close();
      }

      showToast(`Météo configurée pour ${location.city}`);

    } catch (error) {
      console.error("❌ Erreur recherche ville :", error);
      showToast("Ville introuvable");
      return;
    }

    return;
  }

  // ➕ Ajouter un produit au stock
  const stockAddButton = e.target.closest(".stock-add-button");

  if (stockAddButton) {

    const location = stockAddButton.dataset.location;

    console.log("➕ Ajout d'un produit au stock :", location);

    openModal(location);

    return;
  }

  // ✏️ Modifier un produit du stock
  const stockItem = e.target.closest(".stock-item");

  if (stockItem) {

    const location = stockItem.dataset.location;
    const id = stockItem.dataset.id;

    let product;

    if (location === "fridge") {
      product = state.fridge.find(
        item => String(item.id) === String(id)
      );
    } else if (location === "pantry") {
      product = state.pantry.find(
        item => String(item.id) === String(id)
      );
    } else if (location === "freezer") {
      product = state.freezer.find(
        item => String(item.id) === String(id)
      );
    }

    if (!product) {
      console.error("❌ Produit stock introuvable :", {
        location,
        id
      });
      return;
    }

    console.log("✏️ Modification du stock :", product);

    openModal(location, {
      edit: true,
      product
    });

    return;
  }

  const addNote = e.target.closest("[data-add-note]");

  if (addNote) {

    const date = addNote.dataset.addNote;

    openModal("planning-note", {
      date: date
    });

    return;
  }

  const deleteNote = e.target.closest("[data-delete-note]");

  if (deleteNote) {
    const noteId = deleteNote.dataset.deleteNote;

    if (!confirm("Supprimer cette note ?")) {
      return;
    }

    try {
      await deletePlanningNote(noteId);

      // Supprime immédiatement la note affichée à l'écran
      const noteElement = deleteNote.closest(".planning-note");

      if (noteElement) {
        noteElement.remove();
      }

      showToast("Note supprimée");

    } catch (error) {
      console.error("❌ Erreur suppression note :", error);
      showToast("Impossible de supprimer la note");
    }

    return;
  }

  // 🗑️ Supprimer un produit du stock
  const deleteStockButton = e.target.closest("#modalDeleteStock");

  if (deleteStockButton) {

    const form = $("#modalForm");
    const type = form.dataset.type;
    const payload = JSON.parse(form.dataset.payload || "{}");

    if (!payload.product) {
      console.error("❌ Produit à supprimer introuvable");
      return;
    }

    const productId = String(payload.product.id);

    if (!confirm(`Supprimer « ${payload.product.name} » ?`)) {
      return;
    }

    try {

      // 🗑️ Suppression dans Supabase
      await deleteStockItem(productId);

      console.log("✅ Produit supprimé de Supabase :", productId);

      // Fermer immédiatement la modale
      const modal = $("#modal");

      if (modal?.open) {
        modal.close();
      }

      // 🔄 Recharger le stock depuis Supabase
      await loadStockFromSupabase();

      // 🔄 Réafficher le stock
      if (type === "fridge") {
        renderFridge();
      } else if (type === "pantry") {
        renderPantry();
      } else if (type === "freezer") {
        renderFreezer();
      }

      showToast("🗑️ Produit supprimé");

    } catch (error) {

      console.error(
        "❌ Erreur suppression produit :",
        error
      );

      showToast("Impossible de supprimer le produit");
    }

    return;
  }

  // ==================================================
  // STOCK — SUPPRESSION MULTIPLE
  // ==================================================

  const deleteSelectedButton =
    e.target.closest(".stock-delete-selected");

  if (deleteSelectedButton) {

    const location = deleteSelectedButton.dataset.location;

    const idsToDelete = (state[location] || [])
      .map(item => String(item.id))
      .filter(id => selectedStockIds.has(id));

    if (!idsToDelete.length) {
      return;
    }

    const count = idsToDelete.length;

    const confirmed = confirm(
      `Supprimer ${count} produit${count > 1 ? "s" : ""} sélectionné${count > 1 ? "s" : ""} ?`
    );

    if (!confirmed) {
      return;
    }

    try {

      // 🗑️ Suppression dans Supabase
      await Promise.all(
        idsToDelete.map(id => deleteStockItem(id))
      );

      console.log(
        "✅ Produits supprimés :",
        idsToDelete
      );

      // Retirer de la sélection
      idsToDelete.forEach(id => {
        selectedStockIds.delete(id);
      });

      // 🔄 Recharger le stock
      await loadStockFromSupabase();

      // 🔄 Réafficher les trois zones
      renderFridge();
      renderPantry();
      renderFreezer();

      updateStockSelectionUI();

      showToast(
        `🗑️ ${count} produit${count > 1 ? "s" : ""} supprimé${count > 1 ? "s" : ""}`
      );

    } catch (error) {

      console.error(
        "❌ Erreur suppression multiple :",
        error
      );

      showToast(
        "Impossible de supprimer les produits sélectionnés"
      );
    }

    return;
  }




  const nav = e.target.closest("[data-view], [data-view-link]");
  // Ouvrir la fiche recette depuis le planning
  const openRecipe = e.target.closest("[data-open-recipe]");

  if (openRecipe) {
    const recipeId = openRecipe.dataset.openRecipe;

    openModal("recipe-details", {
      recipeId: recipeId
    });

    return;
  }
  if (nav) {

    const targetView =
      nav.dataset.view ||
      nav.dataset.viewLink;

    if (targetView === "shopping") {

      try {
        await generateShoppingFromPlanning();
      } catch (error) {

        console.error(
          "❌ Erreur génération courses :",
          error
        );

        showToast(
          "Impossible de générer les courses"
        );

        return;
      }
    }

    navigate(targetView);
  }

  const addMeal = e.target.closest("[data-add-meal]");

  const addSecondRecipe = e.target.closest("[data-add-second-recipe]");

  if (addSecondRecipe) {

    const key = addSecondRecipe.dataset.addSecondRecipe;

    openModal("meal", {
      key: key,
      addSecondRecipe: true
    });

    return;
  }

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

      await saveRecipeToDB(recipe);

      showToast(
        recipe.favorite
          ? `⭐ "${recipe.name}" ajouté aux favoris`
          : `☆ "${recipe.name}" retiré des favoris`
      );

      renderRecipes();
    }

    return;
  }

  const editRecipeFromDetail = e.target.closest("[data-edit-recipe-from-detail]");

  if (editRecipeFromDetail) {
    const id = editRecipeFromDetail.dataset.editRecipeFromDetail;

    const recipe = state.recipes.find(
      r => String(r.id) === String(id)
    );

    if (!recipe) {
      showToast("Recette introuvable");
      return;
    }

    // Ferme la fiche recette
    const detailModal = $("#modal");

    if (detailModal.open) {
      detailModal.close();
    }

    // Même comportement que "Modifier" dans Mes recettes
    $("#recipeModalTitle").textContent = "Modifier la recette";
    $("#recipeModalSubtitle").textContent = recipe.name;
    $("#saveRecipe").textContent = "Mettre à jour";

    loadRecipe(recipe);

    // Très important : on conserve l'ID
    recipeForm.dataset.recipeId = recipe.id;

    // Ouvre le formulaire complet
    recipeModal.classList.remove("hidden");

    console.log("✏️ Modification de la recette :", recipe.name);

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

  if (!e.target.matches("[data-check-item]")) {
    return;
  }

  const item = state.shopping.find(
    i => String(i.id) === String(e.target.dataset.checkItem)
  );

  if (!item) {
    console.warn(
      "⚠️ Article introuvable :",
      e.target.dataset.checkItem
    );
    return;
  }

  item.checked = e.target.checked;

  save();
  renderShopping();
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

document.addEventListener("click", (e) => {
  const cancelButton = e.target.closest(
    "#modalForm .modal-actions .secondary-button"
  );

  if (!cancelButton) return;

  // Ne pas intercepter le bouton Supprimer
  if (cancelButton.id === "modalDeleteStock") return;

  const modal = $("#modal");

  if (modal?.open) {
    modal.close();
  }
});


//$("#openRecipeModal").addEventListener("click", () => openModal("recipe"));
$("#addShopping").addEventListener("click", () => openModal("shopping"));
$("#addStock")?.addEventListener(
  "click",
  () => openModal("stock")
);
$("#addFridge")?.addEventListener("click", () => openModal("fridge"));
$("#addPantry")?.addEventListener("click", () => openModal("pantry"));
$("#addFreezer")?.addEventListener("click", () => openModal("freezer"));

$("#uncheckAll").addEventListener("click", async () => {

  state.shopping.forEach(item => {
    item.checked = false;
  });

  await save();
  renderShopping();

  showToast("🛒 Toutes les courses sont décochées");
});

$("#checkAll").addEventListener("click", async () => {

  state.shopping.forEach(item => {
    item.checked = true;
  });

  await save();
  renderShopping();

  showToast("✅ Toutes les courses sont cochées");
});


$("#clearWeek").addEventListener("click", () => { state.meals = {}; save(); renderWeek(); showToast("La semaine est prête à être recomposée"); });
$("#printWeek").addEventListener("click", () => { window.print(); });



// ==================================================
// STOCK — AFFICHAGE DU BOUTON DE SUPPRESSION
// ==================================================

function updateStockSelectionUI() {

  const count = selectedStockIds.size;

  document.querySelectorAll(".stock-delete-selected").forEach(button => {

    const location = button.dataset.location;

    const locationIds = (state[location] || [])
      .map(item => String(item.id))
      .filter(id => selectedStockIds.has(id));

    const selectedCount = locationIds.length;

    button.hidden = selectedCount === 0;

    button.textContent =
      `🗑️ Supprimer la sélection (${selectedCount})`;
  });
}

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

$("#todayWeek").addEventListener("click", async () => {

  currentDate = new Date();

  await loadPlanningFromSupabase();

  renderWeek();

  showToast("Retour à la semaine actuelle");
});


$("#prevWeek").addEventListener("click", async () => {

  currentDate.setDate(
    currentDate.getDate() - 7
  );

  await loadPlanningFromSupabase();

  renderWeek();
});


$("#nextWeek").addEventListener("click", async () => {

  currentDate.setDate(
    currentDate.getDate() + 7
  );

  await loadPlanningFromSupabase();

  renderWeek();
});

async function initializeRecipes() {

  return await getAllRecipes();

}

async function initializeApp() {

  await openDatabase();

  // 🏪 Chargement du stock depuis Supabase
  await loadStockFromSupabase();

  state.recipes = (await initializeRecipes())
    .map(createRecipe);

  await loadPlanningFromSupabase();

  // 📝 Chargement des notes du planning
  planningNotes = await getPlanningNotes();

  renderWeek();
  renderRecipes();
  renderShopping();

  renderFridge();
  renderPantry();
  renderFreezer();
}

initializeApp();
