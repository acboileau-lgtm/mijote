console.log("📥 import.js chargé");

import { createRecipe } from "./recipe.js";
import { saveRecipeToDB } from "./storage.js";
import { addRecipe } from "../app.js";


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
        ingredients: [],
        steps: []
    };

    let mode = "ingredients";

    for (let i = 1; i < lines.length; i++) {

        const line = lines[i];

        if (
            line.toLowerCase().startsWith("préparation") ||
            line.toLowerCase().startsWith("etapes") ||
            line.toLowerCase().startsWith("étapes") ||
            line.toLowerCase().startsWith("instructions")
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

    return createRecipe({
    name: recipe.name,
    ingredients: recipe.ingredients,
    steps: recipe.steps
});

}