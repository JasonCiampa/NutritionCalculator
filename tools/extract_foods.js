/**
 * Extracts restaurant/fast food names and general food names from the USDA API.
 * 
 * Usage:
 *   node tools/extract_foods.js <your-api-key>
 * 
 * Output:
 *   data/restaurant_foods.js  - SR Legacy "Restaurant Foods" and "Fast Foods" categories
 *   data/general_foods.js     - Foundation + SR Legacy (non-restaurant) + Survey (FNDDS) foods
 * 
 * This script makes ~100 API calls total, well within the 1,000/hour rate limit.
 */

const fs = require("fs");
const path = require("path");
const https = require("https");

const API_KEY = process.argv[2];
if (!API_KEY) {
    console.error("Usage: node tools/extract_foods.js <your-usda-api-key>");
    console.error("\nGet a free key at: https://fdc.nal.usda.gov/api-key-signup");
    process.exit(1);
}

const BASE_URL = "https://api.nal.usda.gov/fdc/v1";
const RESTAURANT_CATEGORIES = ["Restaurant Foods", "Fast Foods"];

function apiRequest(endpoint, body) {
    return new Promise((resolve, reject) => {
        const url = new URL(`${BASE_URL}${endpoint}?api_key=${API_KEY}`);
        const postData = JSON.stringify(body);

        const options = {
            hostname: url.hostname,
            path: url.pathname + url.search,
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(postData)
            }
        };

        const req = https.request(options, (res) => {
            let data = "";
            res.on("data", (chunk) => { data += chunk; });
            res.on("end", () => {
                if (res.statusCode !== 200) {
                    reject(new Error(`API returned ${res.statusCode}: ${data.substring(0, 200)}`));
                    return;
                }
                try { resolve(JSON.parse(data)); }
                catch (e) { reject(new Error("Failed to parse API response")); }
            });
        });

        req.on("error", reject);
        req.write(postData);
        req.end();
    });
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchAllFoods(dataTypes, label) {
    const allFoods = [];
    let pageNumber = 1;
    let hasMore = true;

    while (hasMore) {
        console.log(`  Fetching ${label} page ${pageNumber}...`);

        const results = await apiRequest("/v1/foods/list", {
            dataType: dataTypes,
            pageSize: 200,
            pageNumber: pageNumber,
            sortBy: "lowercaseDescription.keyword",
            sortOrder: "asc"
        });

        if (results.length === 0) {
            hasMore = false;
        } else {
            for (let i = 0; i < results.length; i++) {
                allFoods.push(results[i]);
            }
            pageNumber++;
            if (results.length < 200) hasMore = false;
        }

        await delay(200);
    }

    return allFoods;
}

async function fetchFoodDetails(fdcId) {
    return new Promise((resolve, reject) => {
        const url = new URL(`${BASE_URL}/v1/food/${fdcId}?format=full&api_key=${API_KEY}`);

        const req = https.get(url, (res) => {
            let data = "";
            res.on("data", (chunk) => { data += chunk; });
            res.on("end", () => {
                if (res.statusCode !== 200) {
                    reject(new Error(`API returned ${res.statusCode}`));
                    return;
                }
                try { resolve(JSON.parse(data)); }
                catch (e) { reject(e); }
            });
        });
        req.on("error", reject);
    });
}

async function categorizeSRLegacy(foods) {
    const restaurant = [];
    const general = [];

    const sampleSize = Math.min(5, foods.length);
    const sampleDetails = [];

    for (let i = 0; i < sampleSize; i++) {
        try {
            const detail = await fetchFoodDetails(foods[i].fdcId);
            sampleDetails.push(detail);
            await delay(200);
        } catch (e) {
            console.log(`  Warning: Could not fetch details for ${foods[i].fdcId}`);
        }
    }

    const hasFoodCategory = sampleDetails.some(d => d.foodCategory && d.foodCategory.description);

    if (!hasFoodCategory) {
        console.log("  SR Legacy foods don't have category info in detail endpoint.");
        console.log("  Falling back to description-based categorization...");

        for (let i = 0; i < foods.length; i++) {
            const desc = (foods[i].description || "").toUpperCase();
            const isRestaurant =
                desc.startsWith("MCDONALD") ||
                desc.startsWith("BURGER KING") ||
                desc.startsWith("WENDY") ||
                desc.startsWith("SUBWAY") ||
                desc.startsWith("TACO BELL") ||
                desc.startsWith("PIZZA HUT") ||
                desc.startsWith("KFC") ||
                desc.startsWith("KENTUCKY FRIED") ||
                desc.startsWith("DOMINO") ||
                desc.startsWith("CHICK-FIL-A") ||
                desc.startsWith("POPEYE") ||
                desc.startsWith("ARBY") ||
                desc.startsWith("JACK IN THE BOX") ||
                desc.startsWith("DENNY") ||
                desc.startsWith("LONG JOHN SILVER") ||
                desc.startsWith("PAPA JOHN") ||
                desc.startsWith("LITTLE CAESARS") ||
                desc.startsWith("SONIC") ||
                desc.startsWith("CARL'S JR") ||
                desc.startsWith("HARDEE") ||
                desc.startsWith("DAIRY QUEEN") ||
                desc.startsWith("PANERA") ||
                desc.startsWith("CHIPOTLE") ||
                desc.startsWith("FIVE GUYS") ||
                desc.startsWith("WHATABURGER") ||
                desc.startsWith("STARBUCKS") ||
                desc.startsWith("DUNKIN") ||
                desc.startsWith("PANDA EXPRESS") ||
                desc.includes(", RESTAURANT") ||
                desc.includes("FAST FOOD");

            if (isRestaurant) {
                restaurant.push({ name: foods[i].description, fdcId: foods[i].fdcId });
            } else {
                general.push({ name: foods[i].description, fdcId: foods[i].fdcId });
            }
        }

        return { restaurant, general };
    }

    console.log("  Fetching full details for category-based classification...");
    console.log(`  This will take a while (${foods.length} foods)...`);

    const batchSize = 20;
    for (let batch = 0; batch < foods.length; batch += batchSize) {
        const end = Math.min(batch + batchSize, foods.length);
        const promises = [];

        for (let i = batch; i < end; i++) {
            promises.push(
                fetchFoodDetails(foods[i].fdcId)
                    .then(detail => {
                        const cat = detail.foodCategory ? detail.foodCategory.description : "";
                        if (RESTAURANT_CATEGORIES.includes(cat)) {
                            restaurant.push({ name: foods[i].description, fdcId: foods[i].fdcId });
                        } else {
                            general.push({ name: foods[i].description, fdcId: foods[i].fdcId });
                        }
                    })
                    .catch(() => {
                        general.push({ name: foods[i].description, fdcId: foods[i].fdcId });
                    })
            );
        }

        await Promise.all(promises);
        if (batch % 100 === 0 && batch > 0) {
            console.log(`  Categorized ${batch}/${foods.length} SR Legacy foods...`);
        }
        await delay(500);
    }

    return { restaurant, general };
}

async function main() {
    console.log("=== USDA Food Data Extraction ===\n");

    console.log("1/3: Fetching SR Legacy foods...");
    const srLegacyFoods = await fetchAllFoods(["SR Legacy"], "SR Legacy");
    console.log(`  Found ${srLegacyFoods.length} SR Legacy foods.\n`);

    console.log("  Categorizing SR Legacy foods (restaurant vs general)...");
    const { restaurant: restaurantFoods, general: srGeneralFoods } = await categorizeSRLegacy(srLegacyFoods);
    console.log(`  Restaurant/Fast Food: ${restaurantFoods.length}`);
    console.log(`  General: ${srGeneralFoods.length}\n`);

    console.log("2/3: Fetching Foundation foods...");
    const foundationFoods = await fetchAllFoods(["Foundation"], "Foundation");
    console.log(`  Found ${foundationFoods.length} Foundation foods.\n`);

    console.log("3/3: Fetching Survey (FNDDS) foods...");
    const surveyFoods = await fetchAllFoods(["Survey (FNDDS)"], "Survey (FNDDS)");
    console.log(`  Found ${surveyFoods.length} Survey foods.\n`);

    const generalFoods = [];

    for (let i = 0; i < srGeneralFoods.length; i++) {
        generalFoods.push(srGeneralFoods[i]);
    }
    for (let i = 0; i < foundationFoods.length; i++) {
        generalFoods.push({ name: foundationFoods[i].description, fdcId: foundationFoods[i].fdcId });
    }
    for (let i = 0; i < surveyFoods.length; i++) {
        generalFoods.push({ name: surveyFoods[i].description, fdcId: surveyFoods[i].fdcId });
    }

    generalFoods.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
    restaurantFoods.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

    const seen = new Set();
    const dedupedGeneral = [];
    for (let i = 0; i < generalFoods.length; i++) {
        const key = generalFoods[i].name.toLowerCase();
        if (!seen.has(key)) {
            seen.add(key);
            dedupedGeneral.push(generalFoods[i]);
        }
    }

    const seenR = new Set();
    const dedupedRestaurant = [];
    for (let i = 0; i < restaurantFoods.length; i++) {
        const key = restaurantFoods[i].name.toLowerCase();
        if (!seenR.has(key)) {
            seenR.add(key);
            dedupedRestaurant.push(restaurantFoods[i]);
        }
    }

    const dataDir = path.join(__dirname, "..", "data");
    fs.mkdirSync(dataDir, { recursive: true });

    const restaurantJS = "const RESTAURANT_FOODS = " + JSON.stringify(dedupedRestaurant) + ";\n";
    fs.writeFileSync(path.join(dataDir, "restaurant_foods.js"), restaurantJS, "utf-8");
    console.log(`Wrote ${dedupedRestaurant.length} restaurant/fast food entries to data/restaurant_foods.js`);

    const generalJS = "const GENERAL_FOODS = " + JSON.stringify(dedupedGeneral) + ";\n";
    fs.writeFileSync(path.join(dataDir, "general_foods.js"), generalJS, "utf-8");
    console.log(`Wrote ${dedupedGeneral.length} general food entries to data/general_foods.js`);

    const now = new Date().toISOString();
    const metaJS = `const FOOD_DATA_META = ${JSON.stringify({
        restaurantExtracted: now,
        generalExtracted: now,
        srLegacyCount: srLegacyFoods.length,
        foundationCount: foundationFoods.length,
        surveyCount: surveyFoods.length
    }, null, 2)};\n`;
    fs.writeFileSync(path.join(dataDir, "extraction_meta.json"), metaJS, "utf-8");

    console.log("\n=== Extraction complete! ===");
}

main().catch((err) => {
    console.error("Fatal error:", err.message);
    process.exit(1);
});
