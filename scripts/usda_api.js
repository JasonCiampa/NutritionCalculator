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

var USDA_NUTRIENT_MAP = {
    "Energy": { key: "calories", matchUnit: "kcal" },
    "Protein": { key: "protein" },
    "Total lipid (fat)": { key: "fat" },
    "Carbohydrate, by difference": { key: "carbs" },
    "Fatty acids, total saturated": { key: "saturatedFat" },
    "Fatty acids, total trans": { key: "transFat" },
    "Cholesterol": { key: "cholesterol" },
    "Sodium, Na": { key: "sodium" },
    "Fiber, total dietary": { key: "fiber" },
    "Total Sugars": { key: "sugars" },
    "Sugars, total including NLEA": { key: "sugars" },
    "Sugars, added": { key: "addedSugars" },
    "Vitamin D (D2 + D3)": { key: "vitaminD" },
    "Vitamin D (D2 + D3), International Units": { key: null },
    "Calcium, Ca": { key: "calcium" },
    "Iron, Fe": { key: "iron" },
    "Potassium, K": { key: "potassium" },
    "Vitamin A, RAE": { key: "vitaminA" },
    "Vitamin A, IU": { key: null },
    "Vitamin C, total ascorbic acid": { key: "vitaminC" },
    "Vitamin E (alpha-tocopherol)": { key: "vitaminE" },
    "Vitamin K (phylloquinone)": { key: "vitaminK" },
    "Thiamin": { key: "thiamin" },
    "Riboflavin": { key: "riboflavin" },
    "Niacin": { key: "niacin" },
    "Vitamin B-6": { key: "vitaminB6" },
    "Folate, total": { key: "folate" },
    "Folate, DFE": { key: "folate" },
    "Vitamin B-12": { key: "vitaminB12" },
    "Phosphorus, P": { key: "phosphorus" },
    "Magnesium, Mg": { key: "magnesium" },
    "Zinc, Zn": { key: "zinc" }
};

function extractNutrients(foodData) {
    var nutrients = { calories: 0, protein: 0, fat: 0, carbs: 0 };
    var list = foodData.foodNutrients || [];

    for (var i = 0; i < list.length; i++) {
        var fn = list[i];
        var name = (fn.nutrient && fn.nutrient.name) || fn.nutrientName || fn.name || "";
        var unit = ((fn.nutrient && fn.nutrient.unitName) || fn.unitName || "").toLowerCase();
        var amount = fn.amount != null ? fn.amount : (fn.value || 0);

        var mapping = USDA_NUTRIENT_MAP[name];
        if (mapping && mapping.key) {
            if (mapping.matchUnit && unit !== mapping.matchUnit) continue;
            if (nutrients[mapping.key] === undefined || nutrients[mapping.key] === 0) {
                nutrients[mapping.key] = amount;
            }
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

function extractPortionsFromSearchResult(food) {
    var portions = [];

    if (food.servingSize) {
        var servingDesc = "";
        if (food.householdServingFullText) {
            servingDesc = food.householdServingFullText +
                " (" + food.servingSize + (food.servingSizeUnit || "g") + ")";
        } else {
            servingDesc = food.servingSize + (food.servingSizeUnit || "g");
        }
        portions.push({
            description: servingDesc,
            gramWeight: food.servingSize,
            amount: 1
        });
    }

    if (food.foodMeasures) {
        for (var i = 0; i < food.foodMeasures.length; i++) {
            var m = food.foodMeasures[i];
            if (!m.gramWeight) continue;
            var desc = "";
            if (m.disseminationText) {
                desc = m.disseminationText;
            } else {
                desc = (m.value || 1) + " " + (m.modifier || m.measureUnitName || "");
            }
            if (m.gramWeight) {
                desc += " (" + m.gramWeight + "g)";
            }
            desc = desc.trim();
            if (!desc) continue;

            var isDuplicate = portions.some(function (p) {
                return p.gramWeight === m.gramWeight && p.description === desc;
            });
            if (!isDuplicate) {
                portions.push({
                    description: desc,
                    gramWeight: m.gramWeight,
                    amount: m.value || 1
                });
            }
        }
    }

    var has100g = portions.some(function (p) { return p.gramWeight === 100; });
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
    var scaled = {};
    for (var key in nutrientsPer100g) {
        if (nutrientsPer100g.hasOwnProperty(key)) {
            scaled[key] = nutrientsPer100g[key] * factor;
        }
    }
    return scaled;
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
