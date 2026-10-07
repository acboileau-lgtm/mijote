import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({});

const recipeSchema = {
  type: "object",
  properties: {
    name: {
      type: "string",
      description: "Nom de la recette"
    },
    portions: {
      type: "integer",
      description: "Nombre de portions. 0 si non indiqué."
    },
    prepTime: {
      type: "integer",
      description: "Temps de préparation en minutes. 0 si non indiqué."
    },
    cookTime: {
      type: "integer",
      description: "Temps de cuisson en minutes. 0 si non indiqué."
    },
    ingredients: {
      type: "array",
      items: {
        type: "object",
        properties: {
          quantity: {
            type: "string",
            description: "Quantité avec unité. Vide si aucune quantité n'est indiquée."
          },
          name: {
            type: "string",
            description: "Nom de l'ingrédient."
          }
        },
        required: ["quantity", "name"]
      }
    },
    steps: {
      type: "array",
      items: {
        type: "string"
      }
    },
    notes: {
      type: "string",
      description: "Conseils ou astuces réellement présents dans la vidéo."
    }
  },
  required: [
    "name",
    "portions",
    "prepTime",
    "cookTime",
    "ingredients",
    "steps",
    "notes"
  ]
};

const prompt = `
Tu es l'assistant d'import de recettes de l'application Mijoté.

Analyse attentivement TOUTE la vidéo :
- ce qui est dit oralement ;
- ce qui est écrit ou affiché à l'écran ;
- les ingrédients et quantités visibles ;
- les actions réalisées ;
- les durées de cuisson indiquées.

OBJECTIF :
Créer une recette exploitable directement par Mijoté.

RÈGLES IMPORTANTES :
1. N'invente aucune quantité.
2. Si une quantité est visible ou prononcée dans la vidéo, récupère-la précisément.
3. Si aucune quantité n'est disponible, laisse quantity vide.
4. Ne confonds pas le titre marketing avec les ingrédients réellement utilisés.
5. Déduis les temps uniquement lorsqu'ils sont explicitement indiqués.
6. Conserve toutes les étapes importantes dans leur ordre.
7. Si le nombre de portions n'est pas indiqué, mets 0.
8. Les ingrédients sans quantité doivent avoir quantity = "".
9. Sépare toujours la quantité et le nom de l'ingrédient.
10. Les temps doivent être exprimés en minutes.
11. Dans notes, indique uniquement les conseils ou astuces réellement présents dans la vidéo.
`;

const interaction = await ai.interactions.create({
  model: "gemini-3.5-flash-lite",
  input: [
    {
      type: "text",
      text: prompt
    },
    {
      type: "video",
      uri: "https://www.youtube.com/shorts/LCDNmfuHG8Y"
    }
  ],
  response_format: {
    type: "text",
    mime_type: "application/json",
    schema: recipeSchema
  }
});

console.log(interaction.output_text);