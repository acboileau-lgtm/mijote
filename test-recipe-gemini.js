import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({});

const recipeText = `
Penne au poulet et au pesto

Pour 4 personnes.

Ingrédients :
- 400 g de penne
- 400 g de blancs de poulet
- 150 g de pesto vert
- 20 cl de crème liquide
- 1 gousse d'ail
- 2 cuillères à soupe d'huile d'olive
- 50 g de parmesan râpé
- Sel
- Poivre

Préparation :
Faire cuire les penne dans une grande casserole d'eau salée selon les indications du paquet.
Couper les blancs de poulet en morceaux.
Faire chauffer l'huile d'olive dans une poêle et faire revenir l'ail haché.
Ajouter le poulet et le faire dorer pendant environ 6 à 8 minutes.
Ajouter le pesto et la crème, mélanger et laisser mijoter 2 minutes.
Égoutter les penne et les ajouter dans la poêle.
Mélanger puis servir avec le parmesan râpé.
`;

const schema = {
  type: "object",
  properties: {
    name: {
      type: "string",
      description: "Nom de la recette"
    },
    portions: {
      type: "integer",
      description: "Nombre de portions"
    },
    prepTime: {
      type: "integer",
      description: "Temps de préparation en minutes"
    },
    cookTime: {
      type: "integer",
      description: "Temps de cuisson en minutes"
    },
    ingredients: {
      type: "array",
      items: {
        type: "object",
        properties: {
          quantity: {
            type: "string",
            description: "Quantité et unité"
          },
          name: {
            type: "string",
            description: "Nom de l'ingrédient"
          }
        },
        required: ["quantity", "name"]
      }
    },
    steps: {
      type: "array",
      items: {
        type: "string"
      },
      description: "Étapes de préparation dans l'ordre"
    },
    notes: {
      type: "string",
      description: "Conseils ou remarques utiles"
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

const response = await ai.models.generateContent({
  model: "gemini-3.5-flash-lite",
  contents: `
Tu es l'assistant d'import de recettes de l'application Mijoté.

À partir du texte de recette ci-dessous, extrais uniquement les informations présentes.
Ne crée pas d'ingrédients ou d'informations qui ne sont pas dans le texte.

Retourne les données conformément au schéma demandé.

Texte de la recette :
${recipeText}
`,
  config: {
    responseMimeType: "application/json",
    responseSchema: schema
  }
});

console.log(response.text);
