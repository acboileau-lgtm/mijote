console.log("📥 import.js chargé");

import { createRecipe } from "./recipe.js";
import { getCategoryById } from "../data/categories.js";


function parseDuration(text) {

    const value = text.toLowerCase().trim();

    // 1 h 30 / 1h30 / 1 heure 30
    const hoursMinutes = value.match(
        /(\d+)\s*h(?:eure?s?)?\s*(\d+)?/
    );

    if (hoursMinutes) {
        const hours = Number(hoursMinutes[1]);
        const minutes = hoursMinutes[2]
            ? Number(hoursMinutes[2])
            : 0;

        return hours * 60 + minutes;
    }

    // 90 min / 90 minutes
    const minutes = value.match(
        /(\d+)\s*(?:min|minutes?)/i
    );

    if (minutes) {
        return Number(minutes[1]);
    }

    return 0;
}


// --------------------------------------------------
// Import d'une recette depuis un texte
// --------------------------------------------------

export function importRecipe(text) {

    text = text.trim();

    const lines = text
        .split("\n")
        .map(line => line.trim())
        .filter(line => line !== "");

    if (lines.length === 0) {
        alert("Aucune recette à importer.");
        return null;
    }


    // --------------------------------------------------
    // Catégorie éventuelle trouvée au début du texte
    // --------------------------------------------------

    const knownCategories = [
        "plat",
        "entrée",
        "entree",
        "dessert",
        "boisson",
        "sauce",
        "accompagnement",
        "apéritif",
        "aperitif"
    ];

    let category = "Plat";
    let categories = [];
    let emoji = "🍽️";
    let startIndex = 0;
    

    const firstLine = lines[0].toLowerCase();

    if (knownCategories.includes(firstLine)) {
        category = lines[0];
        categories = [firstLine];

        const categoryData = getCategoryById(firstLine);

        if (categoryData?.icon) {
            emoji = categoryData.icon;
        }

        startIndex = 1;
    }


    // --------------------------------------------------
    // Recherche du vrai nom de la recette
    // --------------------------------------------------

    const ignoredTitleLines = [
        "ingrédients",
        "ingredients",
        "préparation",
        "preparation",
        "instructions",
        "étapes",
        "etapes"
    ];

    let name = "";

    for (let i = startIndex; i < lines.length; i++) {

        const candidate = lines[i].trim();
        const lower = candidate.toLowerCase();

        if (!ignoredTitleLines.includes(lower)) {
            name = candidate;
            startIndex = i + 1;
            break;
        }
    }

    if (!name) {
        alert("Impossible de trouver le nom de la recette.");
        return null;
    }


    // --------------------------------------------------
    // Création de la recette
    // --------------------------------------------------

    const recipe = createRecipe({

        name,
        category,
        emoji,

        prepTime: 0,
        cookTime: 0,
        restTime: 0,

        portions: 0,

        ingredients: [],
        steps: [],

        photo: "",

        categories,

        equipment: [],

        occasion: []
    });


    // --------------------------------------------------
    // Détection des sections
    // --------------------------------------------------

    let mode = "search";


    for (let i = startIndex; i < lines.length; i++) {

        const line = lines[i];
        const lowerLine = line.toLowerCase();


        // ----------------------------------------------
        // Bruit provenant des sites web
        // ----------------------------------------------

        if (
            lowerLine.includes("en lire moins") ||
            lowerLine.includes("en lire plus")
        ) {
            continue;
        }


        if (
            lowerLine.includes("buon appetito") ||
            lowerLine.includes("bon appétit")
        ) {
            continue;
        }


        // ----------------------------------------------
        // Début des ingrédients
        // ----------------------------------------------

        if (
            lowerLine === "ingrédients" ||
            lowerLine === "ingredients"
        ) {
            mode = "ingredients";
            continue;
        }


        // ----------------------------------------------
        // Début de la préparation
        // ----------------------------------------------

        if (
            lowerLine === "préparation" ||
            lowerLine === "preparation" ||
            lowerLine === "étapes" ||
            lowerLine === "etapes" ||
            lowerLine === "instructions"
        ) {
            mode = "steps";
            continue;
        }


        // ----------------------------------------------
        // Informations générales
        // ----------------------------------------------

        let foundGeneralInformation = false;


        // Portions

        const portionsMatch = line.match(
            /(\d+)\s*(?:personnes?|pers\.?|portions?)/i
        );

        if (portionsMatch) {
            recipe.portions = Number(portionsMatch[1]);
            foundGeneralInformation = true;
        }


        // Préparation

        if (/préparation/i.test(line)) {
            recipe.prepTime = parseDuration(line);
            foundGeneralInformation = true;
        }


        // Cuisson

        if (/cuisson/i.test(line)) {
            recipe.cookTime = parseDuration(line);
            foundGeneralInformation = true;
        }

        // Repos

        const restMatch = line.match(
            /(?:repos|temps de repos|levée|temps de levée)\s*(?:[:\-])?\s*(\d+)\s*(?:min|minutes?|h|heures?)/i
        );

        if (restMatch) {

            const restValue = Number(restMatch[1]);

            if (/h|heure/i.test(restMatch[0])) {
                recipe.restTime = restValue * 60;
            } else {
                recipe.restTime = restValue;
            }

            foundGeneralInformation = true;
        }


        if (foundGeneralInformation) {
            continue;
        }


        // ----------------------------------------------
        // Ingrédients
        // ----------------------------------------------

        if (mode === "ingredients") {

            let ingredient = line
                .replace(/^[-•●▪◦]\s*/, "")
                .trim();


            if (!ingredient) {
                continue;
            }


            // Ignore les lignes parasites

            const lowerIngredient = ingredient.toLowerCase();

            if (
                lowerIngredient === "ingrédients" ||
                lowerIngredient === "ingredients" ||
                lowerIngredient.includes("en lire moins") ||
                lowerIngredient.includes("en lire plus") ||
                lowerIngredient.includes("buon appetito") ||
                lowerIngredient.includes("bon appétit")
            ) {
                continue;
            }


            recipe.ingredients.push(ingredient);

            continue;
        }


        // ----------------------------------------------
        // Préparation
        // ----------------------------------------------

        if (mode === "steps") {

            const step = line.trim();

            if (!step) {
                continue;
            }


            // Ignore les lignes parasites

            const lowerStep = step.toLowerCase();

            if (
                lowerStep.includes("en lire moins") ||
                lowerStep.includes("en lire plus") ||
                lowerStep.includes("buon appetito") ||
                lowerStep.includes("bon appétit")
            ) {
                continue;
            }


            recipe.steps.push(step);
        }
    }


    // --------------------------------------------------
    // Contrôle console
    // --------------------------------------------------

    console.log("🧪 RECETTE IMPORTÉE :", {
        name: recipe.name,
        category: recipe.category,
        portions: recipe.portions,
        prepTime: recipe.prepTime,
        cookTime: recipe.cookTime,
        restTime: recipe.restTime,
        ingredients: recipe.ingredients,
        steps: recipe.steps
    });


    // --------------------------------------------------
    // Retour de la recette
    // --------------------------------------------------

    return recipe;
}