console.log("☁️ storage.js Supabase chargé");

// ======================================================
// CONFIGURATION SUPABASE
// ======================================================

const SUPABASE_URL = "https://tcgitffsqqngjandpvlk.supabase.co";

// ⚠️ REMPLACE uniquement cette valeur par ta Publishable key
const SUPABASE_KEY = "sb_publishable_KRkKQu-Vcv5sx2XVqvoMxA_ly6m-6Kp";

const RECIPES_ENDPOINT = `${SUPABASE_URL}/rest/v1/recipes`;


// ======================================================
// HEADERS SUPABASE
// ======================================================

function getHeaders(extra = {}) {
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        ...extra
    };
}


// ======================================================
// CONVERSION Mijoté → Supabase
// ======================================================

function recipeToSupabase(recipe) {

    return {
        id: recipe.id,
        name: recipe.name ?? "",
        photo: recipe.photo ?? "",
        category: recipe.category ?? "Plat",
        tags: recipe.tags ?? [],

        emoji: recipe.emoji ?? "🍽️",
        color: recipe.color ?? "orange",

        prep_time: recipe.prepTime ?? 0,
        cook_time: recipe.cookTime ?? 0,
        rest_time: recipe.restTime ?? 0,

        portions: recipe.portions ?? 4,

        veggie: recipe.veggie ?? false,
        vegan: recipe.vegan ?? false,
        gluten_free: recipe.glutenFree ?? false,
        lactose_free: recipe.lactoseFree ?? false,

        favorite: recipe.favorite ?? false,
        archived: recipe.archived ?? false,

        difficulty: recipe.difficulty ?? 1,
        price: recipe.price ?? 1,

        equipment: recipe.equipment ?? [],
        occasion: recipe.occasion ?? [],

        ingredients: recipe.ingredients ?? [],
        steps: recipe.steps ?? [],
        notes: recipe.notes ?? "",

        last_cooked: recipe.lastCooked ?? null,
        cook_count: recipe.cookCount ?? 0,
        rating: recipe.rating ?? 0,

        source: recipe.source ?? {
            type: "",
            value: ""
        }
    };
}


// ======================================================
// CONVERSION Supabase → Mijoté
// ======================================================

function supabaseToRecipe(row) {

    return {
        id: row.id,
        name: row.name ?? "",

        photo: row.photo ?? "",

        category: row.category ?? "Plat",
        tags: row.tags ?? [],

        emoji: row.emoji ?? "🍽️",
        color: row.color ?? "orange",

        prepTime: row.prep_time ?? 0,
        cookTime: row.cook_time ?? 0,
        restTime: row.rest_time ?? 0,

        portions: row.portions ?? 4,

        veggie: row.veggie ?? false,
        vegan: row.vegan ?? false,
        glutenFree: row.gluten_free ?? false,
        lactoseFree: row.lactose_free ?? false,

        favorite: row.favorite ?? false,
        archived: row.archived ?? false,

        difficulty: row.difficulty ?? 1,
        price: row.price ?? 1,

        equipment: row.equipment ?? [],
        occasion: row.occasion ?? [],

        ingredients: row.ingredients ?? [],
        steps: row.steps ?? [],
        notes: row.notes ?? "",

        lastCooked: row.last_cooked ?? null,
        cookCount: row.cook_count ?? 0,
        rating: row.rating ?? 0,

        source: row.source ?? {
            type: "",
            value: ""
        }
    };
}


// ======================================================
// TEST DE CONNEXION
// ======================================================

async function openDatabase() {

    console.log("☁️ Connexion à Supabase...");

    if (
        !SUPABASE_URL ||
        SUPABASE_URL.includes("...") ||
        !SUPABASE_KEY ||
        SUPABASE_KEY.includes("COLLE_TA")
    ) {
        throw new Error(
            "Configuration Supabase incomplète dans js/storage.js"
        );
    }

    const response = await fetch(
        `${RECIPES_ENDPOINT}?select=id&limit=1`,
        {
            method: "GET",
            headers: getHeaders()
        }
    );

    if (!response.ok) {

        const errorText = await response.text();

        console.error(
            "❌ Erreur connexion Supabase :",
            errorText
        );

        throw new Error(
            `Supabase inaccessible (${response.status})`
        );
    }

    console.log("✅ Supabase connecté");

    return true;
}


// ======================================================
// SAUVEGARDER / MODIFIER UNE RECETTE
// ======================================================

async function saveRecipeToDB(recipe) {

    console.log(
        "☁️ Sauvegarde Supabase :",
        recipe.name
    );

    const response = await fetch(
        RECIPES_ENDPOINT,
        {
            method: "POST",

            headers: getHeaders({
                "Prefer":
                    "resolution=merge-duplicates,return=minimal"
            }),

            body: JSON.stringify(
                recipeToSupabase(recipe)
            )
        }
    );

    if (!response.ok) {

        const errorText = await response.text();

        console.error(
            "❌ Erreur sauvegarde Supabase :",
            errorText
        );

        throw new Error(
            `Impossible de sauvegarder la recette (${response.status})`
        );
    }

    console.log(
        "✅ Recette sauvegardée dans Supabase :",
        recipe.name
    );
}


// ======================================================
// RÉCUPÉRER TOUTES LES RECETTES
// ======================================================

async function getAllRecipes() {

    console.log(
        "📖 Chargement des recettes depuis Supabase..."
    );

    const response = await fetch(
        `${RECIPES_ENDPOINT}?select=*&order=created_at.asc`,
        {
            method: "GET",
            headers: getHeaders()
        }
    );

    if (!response.ok) {

        const errorText = await response.text();

        console.error(
            "❌ Erreur lecture Supabase :",
            errorText
        );

        throw new Error(
            `Impossible de charger les recettes (${response.status})`
        );
    }

    const rows = await response.json();

    const recipes = rows.map(
        supabaseToRecipe
    );

    console.log(
        "☁️",
        recipes.length,
        "recette(s) chargée(s) depuis Supabase"
    );

    return recipes;
}


// ======================================================
// SUPPRIMER UNE RECETTE
// ======================================================

async function deleteRecipeFromDB(id) {

    console.log(
        "🗑️ Suppression Supabase :",
        id
    );

    const response = await fetch(
        `${RECIPES_ENDPOINT}?id=eq.${encodeURIComponent(id)}`,
        {
            method: "DELETE",

            headers: getHeaders({
                "Prefer": "return=minimal"
            })
        }
    );

    if (!response.ok) {

        const errorText = await response.text();

        console.error(
            "❌ Erreur suppression Supabase :",
            errorText
        );

        throw new Error(
            `Impossible de supprimer la recette (${response.status})`
        );
    }

    console.log(
        "✅ Recette supprimée de Supabase"
    );
}


// ======================================================
// EXPORTS
// ======================================================

export {
    openDatabase,
    saveRecipeToDB,
    getAllRecipes,
    deleteRecipeFromDB
};