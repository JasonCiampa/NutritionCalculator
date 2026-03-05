/**
 * Extracts unique brand owner names from the USDA Branded Foods CSV.
 * 
 * Usage:
 *   1. Download the branded foods CSV from https://fdc.nal.usda.gov/download-datasets
 *      (look for "Branded Foods" CSV download, ~427MB zipped)
 *   2. Unzip and locate "branded_food.csv" inside the extracted folder
 *   3. Run: node tools/extract_brands.js path/to/branded_food.csv
 * 
 * Output: data/brand_owners.js
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");

const csvPath = process.argv[2];
if (!csvPath) {
    console.error("Usage: node tools/extract_brands.js <path-to-branded_food.csv>");
    console.error("\nDownload the CSV from: https://fdc.nal.usda.gov/download-datasets");
    process.exit(1);
}

const outputPath = path.join(__dirname, "..", "data", "brand_owners.js");
const brandSet = new Set();
let lineCount = 0;
let brandColIndex = -1;

const rl = readline.createInterface({
    input: fs.createReadStream(csvPath, { encoding: "utf-8" }),
    crlfDelay: Infinity
});

function parseCSVLine(line) {
    const fields = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (inQuotes) {
            if (ch === '"' && i + 1 < line.length && line[i + 1] === '"') {
                current += '"';
                i++;
            } else if (ch === '"') {
                inQuotes = false;
            } else {
                current += ch;
            }
        } else {
            if (ch === '"') {
                inQuotes = true;
            } else if (ch === ',') {
                fields.push(current);
                current = "";
            } else {
                current += ch;
            }
        }
    }
    fields.push(current);
    return fields;
}

rl.on("line", (line) => {
    lineCount++;

    if (lineCount === 1) {
        const headers = parseCSVLine(line);
        brandColIndex = headers.findIndex(h =>
            h.toLowerCase().replace(/["\s]/g, "") === "brand_owner"
        );
        if (brandColIndex === -1) {
            console.error("Could not find 'brand_owner' column in CSV headers.");
            console.error("Found headers:", headers.join(", "));
            process.exit(1);
        }
        console.log(`Found brand_owner at column index ${brandColIndex}`);
        return;
    }

    const fields = parseCSVLine(line);
    if (fields.length > brandColIndex) {
        const brand = fields[brandColIndex].replace(/^"|"$/g, "").trim();
        if (brand) brandSet.add(brand);
    }

    if (lineCount % 50000 === 0) {
        console.log(`Processed ${lineCount} lines, ${brandSet.size} unique brands so far...`);
    }
});

rl.on("close", () => {
    const sorted = Array.from(brandSet).sort((a, b) =>
        a.toLowerCase().localeCompare(b.toLowerCase())
    );

    const jsContent = "const BRAND_OWNERS = " + JSON.stringify(sorted, null, 0) + ";\n";

    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, jsContent, "utf-8");

    console.log(`\nDone! Extracted ${sorted.length} unique brand owners from ${lineCount - 1} food entries.`);
    console.log(`Output written to: ${outputPath}`);
});
