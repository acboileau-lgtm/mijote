function createRecipe(data = {}) {
  return {
    // Identification
    id: data.id ?? crypto.randomUUID(),
    name: data.name ?? "",

    // Photo
    photo: data.photo ?? "",

    // Classement
    category: data.category ?? "Plat",
    categories: data.categories ?? [],
    tags: data.tags ?? [],

    // Apparence
    emoji: data.emoji ?? "🍽️",
    color: data.color ?? "orange",

    // Temps
    prepTime: data.prepTime ?? data.time ?? 0,
    cookTime: data.cookTime ?? 0,
    restTime: data.restTime ?? 0,

    // Portions
    portions: data.portions ?? 4,

    // Régimes
    veggie: data.veggie ?? false,
    vegan: data.vegan ?? false,
    glutenFree: data.glutenFree ?? false,
    lactoseFree: data.lactoseFree ?? false,

    // Préférences
    favorite: data.favorite ?? false,
    archived: data.archived ?? false,

    // Informations
    difficulty: data.difficulty ?? 1,
    price: data.price ?? 1,

    // Organisation
    equipment: data.equipment ?? [],
    occasion: data.occasion ?? [],

    // Contenu
    ingredients: data.ingredients ?? [],
    steps: data.steps ?? [],
    notes: data.notes ?? "",

    // Historique
    lastCooked: data.lastCooked ?? null,
    cookCount: data.cookCount ?? 0,
    rating: data.rating ?? 0,

    // Source
    source: data.source ?? {
      type: "",
      value: ""
    }
  };
}

export {
    createRecipe
};