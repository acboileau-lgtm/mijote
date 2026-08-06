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

    const transaction = db.transaction(STORE_RECIPES, "readwrite");

    const store = transaction.objectStore(STORE_RECIPES);

    return new Promise((resolve, reject) => {

        const request = store.put(recipe);

        request.onsuccess = () => resolve();

        request.onerror = () => reject(request.error);

    });

}

export {
    openDatabase,
    saveRecipeToDB
};
