/**
 * Catalogue des catégories de recettes.
 * Les identifiants (id) sont utilisés dans les recettes.
 */
export const RECIPE_CATEGORIES = [
    { id: "meat", label: "Viande", icon: "🥩" },
    { id: "fish", label: "Poisson", icon: "🐟" },
    { id: "pasta", label: "Pâtes", icon: "🍝" },
    { id: "rice", label: "Riz", icon: "🍚" },
    { id: "pizza", label: "Pizza", icon: "🍕" },
    { id: "soup", label: "Soupe", icon: "🥣" },
    { id: "salad", label: "Salade", icon: "🥗" },
    { id: "dessert", label: "Dessert", icon: "🍰" },
    { id: "breakfast", label: "Petit-déjeuner", icon: "🥐" },
    { id: "world", label: "Cuisine du monde", icon: "🌍" },
    { id: "drink", label: "Boisson", icon: "🍹" }
];

export function getAllCategories() {
    return RECIPE_CATEGORIES;
}

export function getCategoryById(id) {
    return RECIPE_CATEGORIES.find(category => category.id === id);
}

export function getCategoryLabel(id) {
    return getCategoryById(id)?.label ?? "";
}

export function getCategoryIcon(id) {
    return getCategoryById(id)?.icon ?? "";
}