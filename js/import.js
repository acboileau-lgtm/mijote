console.log("📥 import.js chargé");

import { createRecipe } from "./recipe.js";
import { saveRecipeToDB } from "./storage.js";
import { addRecipe } from "../app.js";

function parseDuration(text) {

    const value = text.toLowerCase().trim();

    // Exemple : 1 h 30 ou 1h30
    const hoursMinutes = value.match(/(\d+)\s*h(?:eure?s?)?\s*(\d+)?/i);

    if (hoursMinutes) {
        const hours = Number(hoursMinutes[1]);
        const minutes = hoursMinutes[2]
            ? Number(hoursMinutes[2])
            : 0;

        return hours * 60 + minutes;
    }

    // Exemple : 75 min / 75 minutes
    const minutes = value.match(/(\d+)\s*(?:min|minutes?)/i);

    if (minutes) {
        return Number(minutes[1]);
    }

    return 0;
}

function parsePortions(text) {

    // 4 personnes / 4 pers. / 4 portions
    let match = text.match(
        /(\d+)\s*(?:personnes?|pers\.?|portions?)/i
    );

    if (match) {
        return Number(match[1]);
    }

    // pour 4 / pour 4 personnes
    match = text.match(
        /pour\s+(\d+)(?:\s*(?:personnes?|pers\.?|portions?))?/i
    );

    if (match) {
        return Number(match[1]);
    }

    return 0;
}



export function importRecipe(text) {

    text = text.trim();

    const lines = text
        .split("\n")
        .map(line => line.trim())
        .filter(line => line !== "");

    if (lines.length === 0) {
        alert("Aucune recette à importer.");
        return;
    }

    const recipe = {
        name: lines[0],
        prepTime: 0,
        cookTime: 0,
        restTime: 0,
        portions: 0,
        ingredients: [],
        steps: []
    };

    let mode = "ingredients";

    for (let i = 1; i < lines.length; i++) {

        const line = lines[i];
        const lowerLine = line.toLowerCase();

        if (
            lowerLine.includes("personne") ||
            lowerLine.includes("pers") ||
            lowerLine.includes("portion")
        ) {
            const portions = parsePortions(line);

            if (portions > 0) {
                recipe.portions = portions;
                continue;
            }
        }

        if (lowerLine.startsWith("préparation :")) {

            recipe.prepTime = parseDuration(line);
            mode = "steps";

            continue;
        }
        if (lowerLine.startsWith("cuisson :")) {

            recipe.cookTime = parseDuration(line);

            continue;
        }
        if (
            lowerLine.startsWith("repos :") ||
            lowerLine.startsWith("temps de repos :") ||
            lowerLine.startsWith("levée :") ||
            lowerLine.startsWith("temps de levée :")
        ) {

            recipe.restTime = parseDuration(line);

            continue;
        }

        if (
            lowerLine === "préparation" ||
            lowerLine === "etapes" ||
            lowerLine === "étapes" ||
            lowerLine === "instructions"
        ) {
            mode = "steps";
            continue;
        }

        if (mode === "ingredients") {
            recipe.ingredients.push(line);
        } else {
            recipe.steps.push(line);
        }
    }


    console.log("🧪 RECETTE IMPORTÉE :", {
    name: recipe.name,
    portions: recipe.portions,
    prepTime: recipe.prepTime,
    cookTime: recipe.cookTime,
    restTime: recipe.restTime,
    ingredients: recipe.ingredients,
    steps: recipe.steps
});
    

    return createRecipe({
        name: recipe.name,
        prepTime: recipe.prepTime,
        cookTime: recipe.cookTime,
        restTime: recipe.restTime,
        portions: recipe.portions,
        ingredients: recipe.ingredients,
        steps: recipe.steps
    });

}