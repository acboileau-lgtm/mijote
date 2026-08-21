console.log("☁️ storage.js Supabase chargé");

// ======================================================
// CONFIGURATION SUPABASE
// ======================================================

const SUPABASE_URL = "https://tcgitffsqqngjandpvlk.supabase.co";

// ⚠️ REMPLACE uniquement cette valeur par ta Publishable key
const SUPABASE_KEY = "sb_publishable_KRkKQu-Vcv5sx2XVqvoMxA_ly6m-6Kp";

const RECIPES_ENDPOINT = `${SUPABASE_URL}/rest/v1/recipes`;
const PLANNING_ENDPOINT = `${SUPABASE_URL}/rest/v1/planning`;
const PLANNING_NOTES_ENDPOINT = `${SUPABASE_URL}/rest/v1/planning_notes`;
const RECIPE_INGREDIENTS_ENDPOINT =
    `${SUPABASE_URL}/rest/v1/recipe_ingredients`;
const PRODUCTS_ENDPOINT =
    `${SUPABASE_URL}/rest/v1/products`;

const STOCK_ITEMS_ENDPOINT =
    `${SUPABASE_URL}/rest/v1/stock_items`;



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
        categories: recipe.categories ?? [],
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
        categories: row.categories ?? [],
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
    await saveRecipeIngredients(
        recipe.id,
        recipe.ingredients ?? []
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

    const recipes = await Promise.all(
        rows.map(async row => {

            const recipe = supabaseToRecipe(row);

            const ingredients =
                await getRecipeIngredients(recipe.id);

            recipe.ingredients = ingredients.map(item => ({
                quantity: item.quantity,
                unit: item.unit,
                ingredient: item.ingredient,
                category: item.category
            }));

            return recipe;
        })
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
// INGRÉDIENTS STRUCTURÉS
// ======================================================

async function getRecipeIngredients(recipeId) {

    const response = await fetch(
        `${RECIPE_INGREDIENTS_ENDPOINT}?recipe_id=eq.${encodeURIComponent(recipeId)}&select=*&order=position.asc`,
        {
            method: "GET",
            headers: getHeaders()
        }
    );

    if (!response.ok) {
        const errorText = await response.text();

        console.error(
            "❌ Erreur lecture ingrédients Supabase :",
            errorText
        );

        throw new Error(
            `Impossible de charger les ingrédients (${response.status})`
        );
    }

    return await response.json();
}


async function saveRecipeIngredients(recipeId, ingredients) {

    // Supprime les anciennes lignes
    const deleteResponse = await fetch(
        `${RECIPE_INGREDIENTS_ENDPOINT}?recipe_id=eq.${encodeURIComponent(recipeId)}`,
        {
            method: "DELETE",
            headers: getHeaders({
                "Prefer": "return=minimal"
            })
        }
    );

    if (!deleteResponse.ok) {
        const errorText = await deleteResponse.text();

        console.error(
            "❌ Erreur suppression anciens ingrédients :",
            errorText
        );

        throw new Error(
            `Impossible de remplacer les ingrédients (${deleteResponse.status})`
        );
    }

    if (!ingredients?.length) {
        return;
    }

    const rows = ingredients.map((ingredient, index) => ({
        recipe_id: recipeId,
        position: index,
        quantity: ingredient.quantity ?? null,
        unit: ingredient.unit ?? null,
        ingredient: ingredient.ingredient ?? "",
        category: ingredient.category ?? null
    }));

    const response = await fetch(
        RECIPE_INGREDIENTS_ENDPOINT,
        {
            method: "POST",
            headers: getHeaders({
                "Prefer": "return=minimal"
            }),
            body: JSON.stringify(rows)
        }
    );

    if (!response.ok) {
        const errorText = await response.text();

        console.error(
            "❌ Erreur sauvegarde ingrédients Supabase :",
            errorText
        );

        throw new Error(
            `Impossible de sauvegarder les ingrédients (${response.status})`
        );
    }

    console.log(
        "✅ Ingrédients structurés sauvegardés :",
        ingredients.length
    );
}


async function deleteRecipeIngredients(recipeId) {

    const response = await fetch(
        `${RECIPE_INGREDIENTS_ENDPOINT}?recipe_id=eq.${encodeURIComponent(recipeId)}`,
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
            "❌ Erreur suppression ingrédients Supabase :",
            errorText
        );

        throw new Error(
            `Impossible de supprimer les ingrédients (${response.status})`
        );
    }
}

// ======================================================
// INGRÉDIENTS STRUCTURÉS POUR LA LISTE DE COURSES
// ======================================================


async function getRecipeIngredientsForRecipes(recipeIds) {

    if (!recipeIds?.length) {
        return [];
    }

    const uniqueIds = [
        ...new Set(
            recipeIds.map(id => String(id))
        )
    ];

    const results = await Promise.all(
        uniqueIds.map(async recipeId => {

            const response = await fetch(
                `${RECIPE_INGREDIENTS_ENDPOINT}?recipe_id=eq.${encodeURIComponent(recipeId)}&select=recipe_id,position,quantity,unit,ingredient,category&order=position.asc`,
                {
                    method: "GET",
                    headers: getHeaders()
                }
            );

            if (!response.ok) {
                const errorText = await response.text();

                console.error(
                    "❌ Erreur lecture ingrédients recette :",
                    recipeId,
                    errorText
                );

                throw new Error(
                    `Impossible de charger les ingrédients de la recette ${recipeId}`
                );
            }

            return await response.json();
        })
    );

    return results.flat();
}

// ======================================================
// PLANNING
// ======================================================

async function getPlanning(weekStart) {

    console.log(
        "📅 Chargement du planning depuis Supabase..."
    );

    const response = await fetch(
        `${PLANNING_ENDPOINT}?week_start=eq.${encodeURIComponent(weekStart)}&select=*`,
        {
            method: "GET",
            headers: getHeaders()
        }
    );

    if (!response.ok) {

        const errorText = await response.text();

        console.error(
            "❌ Erreur lecture planning Supabase :",
            errorText
        );

        throw new Error(
            `Impossible de charger le planning (${response.status})`
        );
    }

    const rows = await response.json();

    if (rows.length === 0) {
        console.log("📅 Aucun planning trouvé");
        return null;
    }

    console.log(
        "✅ Planning chargé depuis Supabase"
    );

    return rows[0];
}


async function savePlanning(meals, weekStart) {

    console.log(
        "☁️ Sauvegarde planning Supabase..."
    );

    try {

        // Cherche si cette semaine existe déjà
        const existingResponse = await fetch(
            `${PLANNING_ENDPOINT}?week_start=eq.${encodeURIComponent(weekStart)}&select=id`,
            {
                method: "GET",
                headers: getHeaders()
            }
        );

        if (!existingResponse.ok) {
            throw new Error(
                `Recherche planning impossible (${existingResponse.status})`
            );
        }

        const existingRows = await existingResponse.json();

        // ==========================================
        // LA SEMAINE EXISTE → UPDATE
        // ==========================================

        if (existingRows.length > 0) {

            const id = existingRows[0].id;

            const response = await fetch(
                `${PLANNING_ENDPOINT}?id=eq.${id}`,
                {
                    method: "PATCH",

                    headers: getHeaders({
                        "Prefer": "return=minimal"
                    }),

                    body: JSON.stringify({
                        meals: meals,
                        week_start: weekStart
                    })
                }
            );

            if (!response.ok) {
                const errorText = await response.text();

                console.error(
                    "❌ Erreur mise à jour planning :",
                    errorText
                );

                throw new Error(
                    `Impossible de mettre à jour le planning (${response.status})`
                );
            }

            console.log(
                "✅ Planning existant mis à jour :",
                weekStart
            );

            return;
        }

        // ==========================================
        // LA SEMAINE N'EXISTE PAS → INSERT
        // ==========================================

        const response = await fetch(
            PLANNING_ENDPOINT,
            {
                method: "POST",

                headers: getHeaders({
                    "Prefer": "return=minimal"
                }),

                body: JSON.stringify({
                    meals: meals,
                    week_start: weekStart
                })
            }
        );

        if (!response.ok) {
            const errorText = await response.text();

            console.error(
                "❌ Erreur création planning :",
                errorText
            );

            throw new Error(
                `Impossible de créer le planning (${response.status})`
            );
        }

        console.log(
            "✅ Nouveau planning créé :",
            weekStart
        );

    } catch (error) {

        console.error(
            "❌ Erreur sauvegarde planning :",
            error
        );

        throw error;
    }
}

// ======================================================
// PLANNING NOTES
// ======================================================

async function getPlanningNotes() {

    console.log("📝 Chargement des notes depuis Supabase...");

    const response = await fetch(
        `${PLANNING_NOTES_ENDPOINT}?select=*&order=date.asc`,
        {
            method: "GET",
            headers: getHeaders()
        }
    );

    if (!response.ok) {
        const errorText = await response.text();

        console.error(
            "❌ Erreur lecture notes Supabase :",
            errorText
        );

        throw new Error(
            `Impossible de charger les notes (${response.status})`
        );
    }

    const rows = await response.json();

    console.log(
        "✅ Notes chargées depuis Supabase :",
        rows.length
    );

    return rows;
}


async function savePlanningNote(note) {

    console.log("☁️ Sauvegarde note Supabase :", note);

    const response = await fetch(
        PLANNING_NOTES_ENDPOINT,
        {
            method: "POST",

            headers: getHeaders({
                "Prefer": "return=representation"
            }),

            body: JSON.stringify({
                note: note.note,
                date: note.date,
                recurring: note.recurring || false,
                recurrence_type: note.recurrence_type || null,
                recurrence_interval: note.recurrence_interval || 1,
                recurrence_day: note.recurrence_day ?? null,
                recurrence_week: note.recurrence_week ?? null
            })
        }
    );

    if (!response.ok) {

        const errorText = await response.text();

        console.error(
            "❌ Erreur création note :",
            errorText
        );

        throw new Error(
            `Impossible de créer la note (${response.status})`
        );
    }

    const rows = await response.json();

    console.log("✅ Note créée :", rows[0]);

    return rows[0];
}


async function deletePlanningNote(id) {

    console.log("🗑️ Suppression note :", id);

    const response = await fetch(
        `${PLANNING_NOTES_ENDPOINT}?id=eq.${encodeURIComponent(id)}`,
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
            "❌ Erreur suppression note :",
            errorText
        );

        throw new Error(
            `Impossible de supprimer la note (${response.status})`
        );
    }

    console.log("✅ Note supprimée :", id);
}

// ======================================================
// STOCK — PRODUITS
// ======================================================

async function getProducts() {
    console.log("📦 Chargement des produits depuis Supabase...");

    const response = await fetch(
        `${PRODUCTS_ENDPOINT}?select=*&order=name.asc`,
        {
            method: "GET",
            headers: getHeaders()
        }
    );

    if (!response.ok) {
        const errorText = await response.text();

        console.error(
            "❌ Erreur lecture produits :",
            errorText
        );

        throw new Error(
            `Impossible de charger les produits (${response.status})`
        );
    }

    const products = await response.json();

    console.log(
        `✅ ${products.length} produit(s) chargé(s)`
    );

    return products;
}

async function addProduct(product) {
    console.log("📦 Ajout du produit :", product);

    const response = await fetch(PRODUCTS_ENDPOINT, {
        method: "POST",
        headers: {
            ...getHeaders(),
            "Prefer": "return=representation"
        },
        body: JSON.stringify({
            name: product.name,
            default_unit: product.default_unit ?? null,
            always_have: product.always_have ?? false
        })
    });

    if (!response.ok) {
        const errorText = await response.text();

        console.error(
            "❌ Erreur ajout produit :",
            errorText
        );

        throw new Error(
            `Impossible d'ajouter le produit (${response.status})`
        );
    }

    const result = await response.json();

    console.log("✅ Produit ajouté :", result[0]);

    return result[0];
}

async function addStockItem(stockItem) {
    console.log("📦 Ajout du stock :", stockItem);

    const response = await fetch(STOCK_ITEMS_ENDPOINT, {
        method: "POST",
        headers: {
            ...getHeaders(),
            "Prefer": "return=representation"
        },
        body: JSON.stringify({
            product_id: stockItem.product_id,
            brand: stockItem.brand ?? null,
            location: stockItem.location,
            quantity: stockItem.quantity ?? null,
            unit: stockItem.unit ?? null,
            expiration_date: stockItem.expiration_date ?? null
        })
    });

    if (!response.ok) {
        const errorText = await response.text();

        console.error(
            "❌ Erreur ajout stock :",
            errorText
        );

        throw new Error(
            `Impossible d'ajouter le stock (${response.status})`
        );
    }

    const result = await response.json();

    console.log("✅ Stock ajouté :", result[0]);

    return result[0];
}

async function getStockItems() {
    console.log("📦 Chargement du stock depuis Supabase...");

    const response = await fetch(
        `${STOCK_ITEMS_ENDPOINT}?select=*,product:products(name,default_unit,always_have)&order=expiration_date.asc.nullslast`,
        {
            method: "GET",
            headers: getHeaders()
        }
    );

    if (!response.ok) {
        const errorText = await response.text();

        console.error(
            "❌ Erreur lecture stock :",
            errorText
        );

        throw new Error(
            `Impossible de charger le stock (${response.status})`
        );
    }

    const stockItems = await response.json();

    console.log(
        `✅ ${stockItems.length} élément(s) de stock chargé(s)`
    );

    return stockItems;
}

async function updateStockItem(id, stockItem) {
    console.log("✏️ Modification du stock :", id, stockItem);

    const response = await fetch(
        `${STOCK_ITEMS_ENDPOINT}?id=eq.${id}`,
        {
            method: "PATCH",
            headers: {
                ...getHeaders(),
                "Prefer": "return=representation"
            },
            body: JSON.stringify({
                product_id: stockItem.product_id,
                brand: stockItem.brand ?? null,
                location: stockItem.location,
                quantity: stockItem.quantity ?? null,
                unit: stockItem.unit ?? null,
                expiration_date: stockItem.expiration_date ?? null
            })
        }
    );

    if (!response.ok) {
        const errorText = await response.text();

        console.error(
            "❌ Erreur modification stock :",
            errorText
        );

        throw new Error(
            `Impossible de modifier le stock (${response.status})`
        );
    }

    const result = await response.json();

    console.log("✅ Stock modifié :", result[0]);

    return result[0];
}

async function deleteStockItem(id) {
    console.log("🗑️ Suppression du stock :", id);

    const response = await fetch(
        `${STOCK_ITEMS_ENDPOINT}?id=eq.${id}`,
        {
            method: "DELETE",
            headers: {
                ...getHeaders(),
                "Prefer": "return=representation"
            }
        }
    );

    if (!response.ok) {
        const errorText = await response.text();

        console.error(
            "❌ Erreur suppression stock :",
            errorText
        );

        throw new Error(
            `Impossible de supprimer le stock (${response.status})`
        );
    }

    const result = await response.json();

    console.log("✅ Stock supprimé :", result[0]);

    return result[0];
}

// ======================================================
// EXPORTS
// ======================================================

export {
    openDatabase,
    saveRecipeToDB,
    getAllRecipes,
    deleteRecipeFromDB,
    getPlanning,
    savePlanning,
    getPlanningNotes,
    savePlanningNote,
    deletePlanningNote,
    getRecipeIngredients,
    saveRecipeIngredients,
    deleteRecipeIngredients,
    getRecipeIngredientsForRecipes,
    getProducts,
    addProduct,
    addStockItem,
    getStockItems,
    updateStockItem,
    deleteStockItem,
};