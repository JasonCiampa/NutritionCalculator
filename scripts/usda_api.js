const USDA_API_BASE = "https://api.nal.usda.gov/fdc/v1";
const USDA_API_KEY_DEFAULT = "UA4u0dscGgox96go9cxIjYOhOkh2KMSmTFoxhPGC"; // Paste your USDA API key here to auto-load it on all devices
let USDA_API_KEY = "";

function getApiKey() {
    if (USDA_API_KEY) return USDA_API_KEY;
    const stored = localStorage.getItem("usda_api_key");
    if (stored) {
        USDA_API_KEY = stored;
        return stored;
    }
    if (USDA_API_KEY_DEFAULT) {
        setApiKey(USDA_API_KEY_DEFAULT);
        return USDA_API_KEY_DEFAULT;
    }
    return null;
}

function setApiKey(key) {
    USDA_API_KEY = key.trim();
    localStorage.setItem("usda_api_key", USDA_API_KEY);
}

function promptForApiKey() {
    const key = prompt(
        "To use Auto-Add, you need a free USDA FoodData Central API key.\n\n" +
        "1. Visit: https://fdc.nal.usda.gov/api-key-signup\n" +
        "2. Sign up and copy your API key\n" +
        "3. Paste it below:\n"
    );
    if (key && key.trim()) {
        setApiKey(key);
        return true;
    }
    return false;
}

function ensureApiKey() {
    if (getApiKey()) return true;
    return promptForApiKey();
}

async function usdaFetch(endpoint, options) {
    const key = getApiKey();
    if (!key) throw new Error("No API key configured");

    const url = endpoint.includes("?")
        ? `${USDA_API_BASE}${endpoint}&api_key=${key}`
        : `${USDA_API_BASE}${endpoint}?api_key=${key}`;

    const response = await fetch(url, options);

    if (response.status === 429) {
        throw new Error("API rate limit exceeded. Please wait a few minutes and try again.");
    }
    if (!response.ok) {
        throw new Error(`USDA API error: ${response.status} ${response.statusText}`);
    }
    return response.json();
}

async function searchFoods(query, dataTypes, brandOwner, pageSize, pageNumber) {
    const body = { query: query };
    if (dataTypes) body.dataType = dataTypes;
    if (brandOwner) body.brandOwner = brandOwner;
    body.pageSize = pageSize || 50;
    if (pageNumber) body.pageNumber = pageNumber;

    return usdaFetch("/foods/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });
}

async function getFoodDetails(fdcId) {
    return usdaFetch(`/food/${fdcId}?format=full`);
}

async function listFoods(dataTypes, pageSize, pageNumber) {
    const body = {};
    if (dataTypes) body.dataType = dataTypes;
    body.pageSize = pageSize || 200;
    if (pageNumber) body.pageNumber = pageNumber;
    body.sortBy = "lowercaseDescription.keyword";
    body.sortOrder = "asc";

    return usdaFetch("/foods/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });
}

function extractNutrients(foodData) {
    const nutrients = { calories: 0, protein: 0, fat: 0, carbs: 0 };
    const list = foodData.foodNutrients || [];

    for (let i = 0; i < list.length; i++) {
        const fn = list[i];
        const name = (fn.nutrient && fn.nutrient.name) || fn.name || "";
        const unit = (fn.nutrient && fn.nutrient.unitName) || fn.unitName || "";
        const amount = fn.amount || 0;

        if (name === "Energy" && unit === "kcal") {
            nutrients.calories = amount;
        } else if (name === "Protein") {
            nutrients.protein = amount;
        } else if (name === "Total lipid (fat)") {
            nutrients.fat = amount;
        } else if (name === "Carbohydrate, by difference") {
            nutrients.carbs = amount;
        }
    }

    return nutrients;
}

function extractPortions(foodData) {
    const portions = [];

    if (foodData.servingSize) {
        let servingDesc = "";
        if (foodData.householdServingFullText) {
            servingDesc = foodData.householdServingFullText +
                " (" + foodData.servingSize + (foodData.servingSizeUnit || "g") + ")";
        } else {
            servingDesc = foodData.servingSize + (foodData.servingSizeUnit || "g");
        }
        portions.push({
            description: servingDesc,
            gramWeight: foodData.servingSize,
            amount: 1
        });
    }

    if (foodData.foodPortions && foodData.foodPortions.length > 0) {
        for (let i = 0; i < foodData.foodPortions.length; i++) {
            const p = foodData.foodPortions[i];
            let desc = p.portionDescription || p.modifier || "";
            if (p.amount && desc) {
                desc = p.amount + " " + desc;
            }
            if (p.gramWeight) {
                desc += " (" + p.gramWeight + "g)";
            }
            const trimmed = desc.trim();
            if (!trimmed) continue;
            const isDuplicate = portions.some(function (existing) {
                return existing.gramWeight === p.gramWeight && existing.description === trimmed;
            });
            if (!isDuplicate) {
                portions.push({
                    description: trimmed,
                    gramWeight: p.gramWeight || 0,
                    amount: p.amount || 1
                });
            }
        }
    }

    const has100g = portions.some(function (p) { return p.gramWeight === 100; });
    if (!has100g) {
        portions.push({
            description: "100g",
            gramWeight: 100,
            amount: 100
        });
    }

    return portions;
}

function scaleNutrients(nutrientsPer100g, gramWeight) {
    if (!gramWeight || gramWeight <= 0) return nutrientsPer100g;
    var factor = gramWeight / 100;
    return {
        calories: nutrientsPer100g.calories * factor,
        protein: nutrientsPer100g.protein * factor,
        fat: nutrientsPer100g.fat * factor,
        carbs: nutrientsPer100g.carbs * factor
    };
}

function parsePortionString(portionStr) {
    let servingSize = "";
    let unit = "";
    let i = 0;

    while (i < portionStr.length && (portionStr[i] >= '0' && portionStr[i] <= '9' || portionStr[i] === '.')) {
        servingSize += portionStr[i];
        i++;
    }

    unit = portionStr.substring(i).trim();

    if (!servingSize) servingSize = "1";
    if (!unit) unit = "serving";

    return { servingSize: servingSize, unit: unit };
}
