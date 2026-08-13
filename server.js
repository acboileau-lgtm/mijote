import express from "express";
import fetch from "node-fetch";
import * as cheerio from "cheerio";

const app = express();

const PORT = process.env.PORT || 3000;


// ======================================================
// CORS
// ======================================================

app.use((req, res, next) => {

    const allowedOrigins = [
        "http://127.0.0.1:5500",
        "http://localhost:5500"
    ];

    const origin = req.headers.origin;

    if (allowedOrigins.includes(origin)) {
        res.header(
            "Access-Control-Allow-Origin",
            origin
        );
    }

    res.header(
        "Access-Control-Allow-Methods",
        "GET,OPTIONS"
    );

    res.header(
        "Access-Control-Allow-Headers",
        "Content-Type"
    );

    if (req.method === "OPTIONS") {
        return res.sendStatus(204);
    }

    next();
});


// ======================================================
// Recherche récursive d'un objet Recipe
// ======================================================

function findRecipeSchema(data) {

    if (!data) {
        return null;
    }

    if (Array.isArray(data)) {

        for (const item of data) {

            const result =
                findRecipeSchema(item);

            if (result) {
                return result;
            }
        }

        return null;
    }

    if (typeof data !== "object") {
        return null;
    }

    const type =
        data["@type"];

    if (
        type === "Recipe" ||
        (
            Array.isArray(type) &&
            type.includes("Recipe")
        )
    ) {
        return data;
    }

    if (Array.isArray(data["@graph"])) {

        for (const item of data["@graph"]) {

            const result =
                findRecipeSchema(item);

            if (result) {
                return result;
            }
        }
    }

    return null;
}


// ======================================================
// Extrait la chaîne contenue dans self.__next_f.push
// ======================================================

function extractNextPayload(text) {

    const prefix =
        "self.__next_f.push([1,";

    const start =
        text.indexOf(prefix);

    if (start === -1) {
        return null;
    }

    const payloadStart =
        start + prefix.length;

    let inString = false;
    let escaped = false;

    for (
        let i = payloadStart;
        i < text.length;
        i++
    ) {

        const char = text[i];

        if (!inString) {

            if (char === '"') {
                inString = true;
            }

            continue;
        }

        if (escaped) {

            escaped = false;
            continue;
        }

        if (char === "\\") {

            escaped = true;
            continue;
        }

        if (char === '"') {

            const rawString =
                text.slice(
                    payloadStart,
                    i + 1
                );

            try {

                return JSON.parse(
                    rawString
                );

            } catch {

                return null;
            }
        }
    }

    return null;
}


// ======================================================
// Trouve l'objet Recipe dans le texte décodé
// ======================================================

function extractRecipeObject(text) {

    if (!text) {
        return null;
    }

    const marker =
        '"@type":"Recipe"';

    const markerIndex =
        text.indexOf(marker);

    if (markerIndex === -1) {
        return null;
    }

    let start =
        text.lastIndexOf(
            '{"@context":"https://schema.org"',
            markerIndex
        );

    if (start === -1) {

        start =
            text.lastIndexOf(
                '{"@type":"Recipe"',
                markerIndex
            );
    }

    if (start === -1) {
        return null;
    }

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (
        let i = start;
        i < text.length;
        i++
    ) {

        const char = text[i];

        if (inString) {

            if (escaped) {

                escaped = false;
                continue;
            }

            if (char === "\\") {

                escaped = true;
                continue;
            }

            if (char === '"') {

                inString = false;
            }

            continue;
        }

        if (char === '"') {

            inString = true;
            continue;
        }

        if (char === "{") {

            depth++;
            continue;
        }

        if (char === "}") {

            depth--;

            if (depth === 0) {

                const jsonText =
                    text.slice(
                        start,
                        i + 1
                    );

                try {

                    return JSON.parse(
                        jsonText
                    );

                } catch (error) {

                    console.log(
                        "⚠️ JSON Recipe invalide :",
                        error.message
                    );

                    return null;
                }
            }
        }
    }

    return null;
}


// ======================================================
// Extraction Recipe depuis un script Next.js
// ======================================================

function extractRecipeFromNextScript(text) {

    const decoded =
        extractNextPayload(text);

    if (!decoded) {
        return null;
    }

    const recipeIndex =
        decoded.indexOf(
            '"@type":"Recipe"'
        );

    if (recipeIndex === -1) {
        return null;
    }

    console.log(
        "🔎 Bloc Recipe détecté dans Next.js"
    );

    return extractRecipeObject(
        decoded
    );
}


// ======================================================
// Conversion ISO 8601 -> minutes
// ======================================================

function parseIsoDuration(value) {

    if (
        !value ||
        typeof value !== "string"
    ) {
        return 0;
    }

    const match =
        value.match(
            /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?$/i
        );

    if (!match) {
        return 0;
    }

    const days =
        Number(match[1] || 0);

    const hours =
        Number(match[2] || 0);

    const minutes =
        Number(match[3] || 0);

    return (
        days * 24 * 60 +
        hours * 60 +
        minutes
    );
}


// ======================================================
// Temps de préparation affiché sur la page
// ======================================================

function extractPrepTimeFromPage($) {

    const text =
        $("body")
            .text()
            .replace(/\s+/g, " ")
            .trim();

    const match =
        text.match(
            /(\d+)\s*min\s+Préparation/i
        );

    if (match) {
        return Number(match[1]);
    }

    return 0;
}


// ======================================================
// Photo
// ======================================================

function normalizeImage(image) {

    if (!image) {
        return "";
    }

    if (typeof image === "string") {
        return image;
    }

    if (Array.isArray(image)) {
        return normalizeImage(image[0]);
    }

    if (typeof image === "object") {

        return (
            image.url ||
            image.contentUrl ||
            ""
        );
    }

    return "";
}


// ======================================================
// Portions
// ======================================================

function normalizeYield(value) {

    if (!value) {
        return 0;
    }

    const text =
        Array.isArray(value)
            ? value.join(" ")
            : String(value);

    const match =
        text.match(
            /(\d+)\s*(?:personnes?|pers\.?|portions?)/i
        );

    if (match) {
        return Number(match[1]);
    }

    const number =
        text.match(/\d+/);

    return number
        ? Number(number[0])
        : 0;
}


// ======================================================
// Ingrédients
// ======================================================

function normalizeIngredients(value) {

    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .map(item =>
            String(item).trim()
        )
        .filter(Boolean);
}


// ======================================================
// Instructions
// ======================================================
function extractRecipeTips(value) {

    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .filter(item =>
            item &&
            item["@type"] === "HowToTip"
        )
        .map(item =>
            String(item.text || "").trim()
        )
        .filter(Boolean);
}

function normalizeInstructions(value) {

    if (!value) {
        return [];
    }

    if (typeof value === "string") {

        return value
            .split(/\n+/)
            .map(step => step.trim())
            .filter(Boolean);
    }

    if (!Array.isArray(value)) {
        return [];
    }

    const result = [];

    for (const item of value) {

        if (!item) {
            continue;
        }

        if (
            item &&
            item["@type"] === "HowToTip"
        ) {
            continue;
        }

        if (typeof item === "string") {

            const text =
                item.trim();

            if (text) {
                result.push(text);
            }

            continue;
        }

        if (item.text) {

            result.push(
                String(item.text).trim()
            );

            continue;
        }

        if (
            Array.isArray(
                item.itemListElement
            )
        ) {

            result.push(
                ...normalizeInstructions(
                    item.itemListElement
                )
            );
        }
    }

    return result;
}

function cleanSuggestedIngredients(
    ingredients,
    tips,
    steps
) {

    if (!Array.isArray(ingredients)) {
        return [];
    }

    if (!Array.isArray(tips) || tips.length === 0) {
        return ingredients;
    }

    const suggestionText =
        normalizeCategoryText(
            tips.join(" ")
        );

    const stepsText =
        normalizeCategoryText(
            steps.join(" ")
        );


    // Mots indiquant des alternatives de viande/volaille
    const alternativeTerms = [
        "poulet",
        "dinde",
        "canard",
        "oie",
        "merguez",
        "porc",
        "boeuf",
        "bœuf",
        "veau",
        "agneau",
        "lapin",
        "saumon",
        "thon",
        "cabillaud",
        "truite"
    ];


    const suggestionTerms =
        alternativeTerms.filter(
            term =>
                suggestionText.includes(term)
        );


    return ingredients.filter(
        ingredient => {

            const ingredientText =
                normalizeCategoryText(
                    ingredient
                );


            for (
                const term of suggestionTerms
            ) {

                const inIngredient =
                    ingredientText.includes(term);

                const inSteps =
                    stepsText.includes(term);

                // Présent dans la suggestion
                // mais pas dans la vraie préparation :
                // probablement un ingrédient suggéré.
                if (
                    inIngredient &&
                    !inSteps
                ) {
                    return false;
                }
            }

            return true;
        }
    );
}




// ======================================================
// Catégorie fournie par le site
// ======================================================

function normalizeCategory(value) {

    if (!value) {
        return "";
    }

    if (Array.isArray(value)) {

        return value.length
            ? String(value[0]).trim()
            : "";
    }

    return String(value).trim();
}


// ======================================================
// Détection automatique de la catégorie
// ======================================================

function normalizeCategoryText(text) {

    return String(text || "")
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .toLowerCase()
        // On supprime les expressions de mesure
        // pour éviter "à soupe" => catégorie Soupe
        .replace(
            /\b(?:c|cs|cuillere|cuilleres|cuillere a|cuilleres a)\s*\.?\s*a?\s*(?:soupe|cafe)\b/gi,
            " "
        )
        .replace(
            /\ba\s+soupe\b/gi,
            " "
        );
}


function detectCategory(
    name,
    ingredients,
    steps
) {

    // On privilégie d'abord le nom de la recette
    // car il est généralement le meilleur indicateur.
    const nameText =
        normalizeCategoryText(name);


    // --------------------------------------------------
    // Dessert
    // --------------------------------------------------

    if (
        /dessert|gateau|tarte|flan|panna cotta|mousse|creme|cookie|biscuit|glace|brownie|fondant/
            .test(nameText)
    ) {
        return "dessert";
    }


    // --------------------------------------------------
    // Pizza / Pinsa
    // --------------------------------------------------

    if (
        /pizza|pinsa/
            .test(nameText)
    ) {
        return "pizza";
    }


    // --------------------------------------------------
    // Pâtes
    // --------------------------------------------------

    if (
        /pates|spaghetti|tagliatelle|penne|macaroni|linguine|fusilli|orecchiette|tortiglioni/
            .test(nameText)
    ) {
        return "pasta";
    }


    // --------------------------------------------------
    // Riz
    // --------------------------------------------------

    if (
        /\briz\b|risotto/
            .test(nameText)
    ) {
        return "rice";
    }


    // --------------------------------------------------
    // Volaille
    // --------------------------------------------------

    if (
        /poulet|dinde|canard|oie|poularde|chapon|volaille|escalope de poulet|filet de poulet/
            .test(nameText)
    ) {
        return "poultry";
    }


    // --------------------------------------------------
    // Poisson
    // --------------------------------------------------

    if (
        /saumon|thon|cabillaud|colin|dorade|truite|bar|poisson|crevette|crevettes/
            .test(nameText)
    ) {
        return "fish";
    }


    // --------------------------------------------------
    // Viande
    // --------------------------------------------------

    if (
        /boeuf|bœuf|veau|porc|agneau|jambon|bacon|lardons|guanciale|bresaola|viande|merguez/
            .test(nameText)
    ) {
        return "meat";
    }


    // --------------------------------------------------
    // Si le nom ne suffit pas,
    // on analyse ingrédients + étapes
    // --------------------------------------------------

    const fullText =
        normalizeCategoryText([
            name,
            ...(ingredients || []),
            ...(steps || [])
        ].join(" "));


    if (
        /poulet|dinde|canard|oie|poularde|chapon|volaille/
            .test(fullText)
    ) {
        return "poultry";
    }


    if (
        /saumon|thon|cabillaud|colin|dorade|truite|bar|poisson|crevette|crevettes/
            .test(fullText)
    ) {
        return "fish";
    }


    if (
        /pizza|pinsa/
            .test(fullText)
    ) {
        return "pizza";
    }


    if (
        /pates|spaghetti|tagliatelle|penne|macaroni|linguine|fusilli|orecchiette/
            .test(fullText)
    ) {
        return "pasta";
    }


    if (
        /\briz\b|risotto/
            .test(fullText)
    ) {
        return "rice";
    }


    if (
        /soupe|veloute|potage|bouillon/
            .test(fullText)
    ) {
        return "soup";
    }


    if (
        /\bsalade\b|vinaigrette|saladier/
            .test(fullText)
    ) {
        return "salad";
    }


    if (
        /dessert|gateau|tarte|flan|panna cotta|mousse|cookie|glace/
            .test(fullText)
    ) {
        return "dessert";
    }


    return "meat";
}


// ======================================================
// API IMPORT URL
// ======================================================

app.get(
    "/api/import-url",
    async (req, res) => {

        try {

            const url =
                req.query.url;

            if (!url) {

                return res
                    .status(400)
                    .json({
                        error:
                            "URL manquante"
                    });
            }


            let parsedUrl;

            try {

                parsedUrl =
                    new URL(url);

            } catch {

                return res
                    .status(400)
                    .json({
                        error:
                            "URL invalide"
                    });
            }


            // ------------------------------------------
            // Récupération de la page
            // ------------------------------------------

            console.log(
                "🌐 Récupération :",
                parsedUrl.href
            );

            const response =
                await fetch(
                    parsedUrl.href,
                    {
                        headers: {

                            "User-Agent":
                                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36",

                            "Accept-Language":
                                "fr-FR,fr;q=0.9,en;q=0.8"
                        }
                    }
                );


            if (!response.ok) {

                return res
                    .status(response.status)
                    .json({
                        error:
                            `Erreur HTTP ${response.status}`
                    });
            }


            const html =
                await response.text();

            console.log(
                "✅ Page récupérée :",
                html.length,
                "caractères"
            );


            const $ =
                cheerio.load(html);


            let recipeSchema =
                null;


            // ==========================================
            // 1. JSON-LD classique
            // ==========================================

            $(
                'script[type="application/ld+json"]'
            ).each(
                (index, element) => {

                    if (recipeSchema) {
                        return;
                    }

                    const content =
                        $(element).html();

                    if (!content) {
                        return;
                    }

                    try {

                        const json =
                            JSON.parse(
                                content
                            );

                        const recipe =
                            findRecipeSchema(
                                json
                            );

                        if (recipe) {

                            console.log(
                                "✅ Recipe trouvé dans JSON-LD"
                            );

                            recipeSchema =
                                recipe;
                        }

                    } catch {
                        // JSON-LD invalide : on continue
                    }
                }
            );


            // ==========================================
            // 2. Recherche Next.js
            // ==========================================

            if (!recipeSchema) {

                $("script").each(
                    (index, element) => {

                        if (recipeSchema) {
                            return;
                        }

                        const content =
                            $(element).html();

                        if (!content) {
                            return;
                        }

                        if (
                            !content.includes(
                                "self.__next_f.push"
                            )
                        ) {
                            return;
                        }

                        if (
                            !content.includes(
                                "Recipe"
                            )
                        ) {
                            return;
                        }

                        const recipe =
                            extractRecipeFromNextScript(
                                content
                            );

                        if (recipe) {

                            console.log(
                                "✅ Recipe trouvé dans Next.js"
                            );

                            recipeSchema =
                                recipe;
                        }
                    }
                );
            }


            // ==========================================
            // Aucune recette trouvée
            // ==========================================

            if (!recipeSchema) {

                console.log(
                    "❌ Aucun schema Recipe trouvé"
                );

                return res
                    .status(404)
                    .json({
                        error:
                            "Aucune recette structurée trouvée sur cette page."
                    });
            }


            // ==========================================
            // Extraction des données
            // ==========================================

            const prepTimeFromSchema =
                parseIsoDuration(
                    recipeSchema.prepTime
                );

            const cookTimeFromSchema =
                parseIsoDuration(
                    recipeSchema.cookTime
                );

            const totalTime =
                parseIsoDuration(
                    recipeSchema.totalTime
                );

            const prepTime =
                prepTimeFromSchema ||
                extractPrepTimeFromPage($);

            let cookTime =
                cookTimeFromSchema;

            if (
                cookTime === 0 &&
                totalTime > prepTime
            ) {

                cookTime =
                    totalTime - prepTime;
            }


            const tips =
                extractRecipeTips(
                    recipeSchema.recipeInstructions
                );


            const steps =
                normalizeInstructions(
                    recipeSchema.recipeInstructions
                );


            const rawIngredients =
                normalizeIngredients(
                    recipeSchema.recipeIngredient
                );


            const ingredients =
                cleanSuggestedIngredients(
                    rawIngredients,
                    tips,
                    steps
                );


            const notes =
                tips.length
                    ? tips
                        .map(
                            tip => `Suggestion : ${tip}`
                        )
                        .join("\n\n")
                    : "";


            // ==========================================
            // Catégorie
            // ==========================================

            const detectedCategory =
                detectCategory(
                    recipeSchema.name,
                    ingredients,
                    steps
                );


            const category =
                normalizeCategory(
                    recipeSchema.recipeCategory
                ) ||
                detectedCategory;


            // ==========================================
            // Portions
            // ==========================================

            const detectedPortions =
                normalizeYield(
                    recipeSchema.recipeYield
                ) || 4;


            // ==========================================
            // Objet final
            // ==========================================

            const recipe = {

                name:
                    recipeSchema.name ||
                    "",

                image:
                    normalizeImage(
                        recipeSchema.image
                    ),

                prepTime,

                cookTime,

                totalTime,

                portions:
                    detectedPortions,

                ingredients,

                steps,

                category,

                notes,

                source: {

                    type: "url",

                    value:
                        parsedUrl.href
                }
            };


            // ==========================================
            // Debug
            // ==========================================

            console.log(
                "✅ RECETTE EXTRAITE :",
                {
                    name:
                        recipe.name,

                    image:
                        recipe.image
                            ? "✅"
                            : "❌",

                    prepTime:
                        recipe.prepTime,

                    cookTime:
                        recipe.cookTime,

                    totalTime:
                        recipe.totalTime,

                    portions:
                        recipe.portions,

                    ingredients:
                        recipe.ingredients.length,

                    steps:
                        recipe.steps.length,

                    category:
                        recipe.category
                }
            );


            return res.json(
                recipe
            );


        } catch (error) {

            console.error(
                "❌ Erreur serveur :",
                error
            );

            return res
                .status(500)
                .json({
                    error:
                        "Impossible d'importer cette recette.",

                    details:
                        error.message
                });
        }
    }
);


// ======================================================
// Démarrage du serveur
// ======================================================

app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            `🚀 Serveur Mijoté démarré sur le port ${PORT}`
        );
    }
);