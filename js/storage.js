console.log("📦 storage.js chargé");

const DB_NAME = "mijote-db";
const DB_VERSION = 1;
const STORE_RECIPES = "recipes";

let db = null;

async function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => reject(request.error);
        request.onupgradeneeded = (event) => {
            db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_RECIPES)) {
                db.createObjectStore(STORE_RECIPES, {
                    keyPath: "id"
                });
            }
        };

        request.onsuccess = () => {
            db = request.result;
            console.log("✅ IndexedDB ouverte");
            resolve(db);
        };
    });
}

async function saveRecipeToDB(recipe) {

    console.log("💾 saveRecipeToDB appelée", recipe.name);

    const transaction = db.transaction(STORE_RECIPES, "readwrite");
    const store = transaction.objectStore(STORE_RECIPES);

    const request = store.put(recipe);

    request.onsuccess = () => {
        console.log("✅ Enregistrement OK");
    };

    request.onerror = () => {
        console.error("❌ Erreur IndexedDB :", request.error);
    };
}

async function deleteRecipeFromDB(id) {
    const transaction = db.transaction(STORE_RECIPES, "readwrite");
    const store = transaction.objectStore(STORE_RECIPES);

    return new Promise((resolve, reject) => {
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}


async function getAllRecipes() {

    const transaction = db.transaction(STORE_RECIPES, "readonly");
    const store = transaction.objectStore(STORE_RECIPES);

    return new Promise((resolve, reject) => {

        const request = store.getAll();

        request.onsuccess = () => {
            console.log("📖", request.result.length, "recette(s) chargée(s)");
            resolve(request.result);
        };

        request.onerror = () => reject(request.error);

    });

}





export {
    openDatabase,
    saveRecipeToDB,
    getAllRecipes,
    deleteRecipeFromDB
};
