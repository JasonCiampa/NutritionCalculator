let selectedBrandOwner = "";
let selectedBrandApiNames = [];
let selectedFoodFdcId = null;
let brandSearchDebounceTimer = null;
let foodSearchDebounceTimer = null;

function initAutoAddTabs() {
    const tabs = document.querySelectorAll(".auto-tab");
    tabs.forEach(function (tab) {
        tab.addEventListener("click", function () {
            tabs.forEach(function (t) { t.classList.remove("active"); });
            tab.classList.add("active");

            document.querySelectorAll(".auto-tab-content").forEach(function (c) {
                c.classList.remove("active");
            });
            const target = document.getElementById("auto_tab_" + tab.dataset.tab);
            if (target) target.classList.add("active");

            resetAutoAddState();
        });
    });
}

function resetAutoAddState() {
    selectedBrandOwner = "";
    selectedBrandApiNames = [];
    selectedFoodFdcId = null;

    var brandInput = document.getElementById("brand_owner_search");
    if (brandInput) brandInput.value = "";
    var brandDropdown = document.getElementById("brand_owner_dropdown");
    if (brandDropdown) brandDropdown.innerHTML = "";

    var brandedField = document.getElementById("branded_food_field");
    if (brandedField) brandedField.style.display = "none";
    var brandedInput = document.getElementById("branded_food_search");
    if (brandedInput) brandedInput.value = "";
    var brandedDropdown = document.getElementById("branded_food_dropdown");
    if (brandedDropdown) brandedDropdown.innerHTML = "";

    var restInput = document.getElementById("restaurant_food_search");
    if (restInput) restInput.value = "";
    var restDropdown = document.getElementById("restaurant_food_dropdown");
    if (restDropdown) restDropdown.innerHTML = "";

    var genInput = document.getElementById("general_food_search");
    if (genInput) genInput.value = "";
    var genDropdown = document.getElementById("general_food_dropdown");
    if (genDropdown) genDropdown.innerHTML = "";

    hidePortionPicker();
    hideAutoAddLoading();
}

function closeAutoAddForm() {
    resetAutoAddState();
    var form = document.getElementById("auto_add_food_form");
    if (form) {
        form.style.display = "none";
        if (typeof openedFile !== "undefined") openedFile = "";
    }
}

// --- Brand Owner Typeahead (Branded Foods tab) ---

function initBrandOwnerSearch() {
    var input = document.getElementById("brand_owner_search");
    if (!input) return;

    input.addEventListener("input", function () {
        var term = input.value.toLowerCase().trim();
        var dropdown = document.getElementById("brand_owner_dropdown");
        dropdown.innerHTML = "";

        if (term.length < 1) return;

        var brands = typeof BRAND_OWNERS !== "undefined" ? BRAND_OWNERS : [];
        var matches = [];
        for (var i = 0; i < brands.length; i++) {
            if (brands[i].toLowerCase().includes(term)) {
                matches.push(brands[i]);
                if (matches.length >= 100) break;
            }
        }

        if (matches.length === 0 && term.length >= 2) {
            searchBrandsFromAPI(term, dropdown);
            return;
        }

        renderDropdownItems(dropdown, matches, function (brand) {
            input.value = brand;
            dropdown.innerHTML = "";
            selectBrandOwner(brand);
        });
    });
}

function searchBrandsFromAPI(term, dropdown) {
    if (!ensureApiKey()) return;

    searchFoods(term, ["Branded"], null, 50)
        .then(function (result) {
            var brandSet = {};
            if (result.foods) {
                for (var i = 0; i < result.foods.length; i++) {
                    var bo = result.foods[i].brandOwner;
                    if (bo) {
                        var displayName = getDisplayBrandName(bo);
                        if (displayName.toLowerCase().includes(term.toLowerCase()) ||
                            bo.toLowerCase().includes(term.toLowerCase())) {
                            brandSet[displayName] = true;
                        }
                    }
                }
            }
            var brands = Object.keys(brandSet).sort();
            renderDropdownItems(dropdown, brands, function (brand) {
                document.getElementById("brand_owner_search").value = brand;
                dropdown.innerHTML = "";
                selectBrandOwner(brand);
            });
        })
        .catch(function (err) {
            console.error("Brand search error:", err);
        });
}

function getDisplayBrandName(apiBrandName) {
    if (typeof BRAND_CONSOLIDATION === "undefined") return apiBrandName;
    var upper = apiBrandName.toUpperCase();
    var keys = Object.keys(BRAND_CONSOLIDATION);
    for (var i = 0; i < keys.length; i++) {
        var variants = BRAND_CONSOLIDATION[keys[i]];
        for (var j = 0; j < variants.length; j++) {
            if (variants[j].toUpperCase() === upper) {
                return keys[i];
            }
        }
    }
    return apiBrandName;
}

function selectBrandOwner(brand) {
    selectedBrandOwner = brand;
    selectedBrandApiNames = getApiBrandNames(brand);
    var field = document.getElementById("branded_food_field");
    if (field) field.style.display = "block";
    var input = document.getElementById("branded_food_search");
    if (input) {
        input.value = "";
        input.focus();
    }
    var dropdown = document.getElementById("branded_food_dropdown");
    if (dropdown) dropdown.innerHTML = "";
}

function getApiBrandNames(displayName) {
    if (typeof BRAND_CONSOLIDATION !== "undefined" && BRAND_CONSOLIDATION[displayName]) {
        return BRAND_CONSOLIDATION[displayName];
    }
    return [displayName];
}

// --- Branded Food Search (API-powered) ---

function initBrandedFoodSearch() {
    var input = document.getElementById("branded_food_search");
    if (!input) return;

    input.addEventListener("input", function () {
        clearTimeout(foodSearchDebounceTimer);
        var term = input.value.trim();
        var dropdown = document.getElementById("branded_food_dropdown");

        if (term.length < 2) {
            dropdown.innerHTML = "";
            return;
        }

        foodSearchDebounceTimer = setTimeout(function () {
            if (!ensureApiKey()) return;
            if (!selectedBrandOwner) return;

            showAutoAddLoading();
            searchFoods(selectedBrandOwner + " " + term, ["Branded"], null, 200)
                .then(function (result) {
                    hideAutoAddLoading();
                    dropdown.innerHTML = "";
                    if (!result.foods || result.foods.length === 0) {
                        var noResult = document.createElement("div");
                        noResult.className = "auto-dropdown-item no-results";
                        noResult.textContent = "No foods found for this brand.";
                        dropdown.appendChild(noResult);
                        return;
                    }
                    renderBrandedResults(result.foods, dropdown, input);
                })
                .catch(function (err) {
                    hideAutoAddLoading();
                    console.error("Food search error:", err);
                });
        }, 300);
    });
}

function getBrandCore(brandName) {
    return brandName.toUpperCase()
        .replace(/'S$/g, "")
        .replace(/\s+(COMPANY|CO\.?|INC\.?|FOODS?|CORPORATION|BRANDS?|GROUP|SALES|LLC|LTD).*$/g, "")
        .trim();
}

function renderBrandedResults(foods, dropdown, input) {
    dropdown.innerHTML = "";
    var names = [];
    var idMap = {};
    var brandCore = getBrandCore(selectedBrandOwner);
    var brandUpper = selectedBrandOwner.toUpperCase();

    for (var i = 0; i < foods.length; i++) {
        var foodBrand = (foods[i].brandOwner || "").toUpperCase();
        var foodBrandName = (foods[i].brandName || "").toUpperCase();
        var foodDesc = (foods[i].description || "").toUpperCase();
        var belongsToSelected = false;

        for (var j = 0; j < selectedBrandApiNames.length; j++) {
            if (foodBrand === selectedBrandApiNames[j].toUpperCase()) {
                belongsToSelected = true;
                break;
            }
        }

        if (!belongsToSelected && brandCore.length >= 3) {
            var foodBrandCore = getBrandCore(foodBrand);
            if (foodBrandCore.indexOf(brandCore) !== -1 || brandCore.indexOf(foodBrandCore) !== -1) {
                belongsToSelected = true;
            }
        }

        if (!belongsToSelected && brandCore.length >= 3) {
            if (foodBrandName.indexOf(brandCore) !== -1) {
                belongsToSelected = true;
            }
        }

        if (!belongsToSelected && brandCore.length >= 3) {
            if (foodDesc.indexOf(brandUpper) !== -1 || foodDesc.indexOf(brandCore) !== -1) {
                belongsToSelected = true;
            }
        }

        if (!belongsToSelected) continue;

        var desc = foods[i].description;
        if (!idMap[desc]) {
            names.push(desc);
            idMap[desc] = foods[i].fdcId;
        }
    }

    if (names.length === 0) {
        var noResult = document.createElement("div");
        noResult.className = "auto-dropdown-item no-results";
        noResult.textContent = "No foods found for this brand.";
        dropdown.appendChild(noResult);
        return;
    }

    renderDropdownItems(dropdown, names, function (name) {
        input.value = name;
        dropdown.innerHTML = "";
        onFoodSelected(idMap[name], name);
    });
}

// --- Restaurant / Fast Food Typeahead ---

function initRestaurantFoodSearch() {
    var input = document.getElementById("restaurant_food_search");
    if (!input) return;

    input.addEventListener("input", function () {
        var term = input.value.toLowerCase().trim();
        var dropdown = document.getElementById("restaurant_food_dropdown");
        dropdown.innerHTML = "";

        if (term.length < 1) return;

        var foods = typeof RESTAURANT_FOODS !== "undefined" ? RESTAURANT_FOODS : [];
        var matches = [];
        for (var i = 0; i < foods.length; i++) {
            if (foods[i].name.toLowerCase().includes(term)) {
                matches.push(foods[i]);
                if (matches.length >= 100) break;
            }
        }

        var names = [];
        var idMap = {};
        for (var i = 0; i < matches.length; i++) {
            names.push(matches[i].name);
            idMap[matches[i].name] = matches[i].fdcId;
        }

        if (names.length === 0 && term.length >= 2) {
            searchRestaurantFoodsFromAPI(term, dropdown);
            return;
        }

        renderDropdownItems(dropdown, names, function (name) {
            input.value = name;
            dropdown.innerHTML = "";
            onFoodSelected(idMap[name], name);
        });
    });
}

function searchRestaurantFoodsFromAPI(term, dropdown) {
    if (!ensureApiKey()) return;

    clearTimeout(foodSearchDebounceTimer);
    foodSearchDebounceTimer = setTimeout(function () {
        showAutoAddLoading();
        searchFoods(term, ["SR Legacy"], null, 50)
            .then(function (result) {
                hideAutoAddLoading();
                dropdown.innerHTML = "";
                if (!result.foods || result.foods.length === 0) {
                    var noResult = document.createElement("div");
                    noResult.className = "auto-dropdown-item no-results";
                    noResult.textContent = "No foods found.";
                    dropdown.appendChild(noResult);
                    return;
                }

                var names = [];
                var idMap = {};
                for (var i = 0; i < result.foods.length; i++) {
                    var desc = result.foods[i].description;
                    if (!idMap[desc]) {
                        names.push(desc);
                        idMap[desc] = result.foods[i].fdcId;
                    }
                }

                renderDropdownItems(dropdown, names, function (name) {
                    document.getElementById("restaurant_food_search").value = name;
                    dropdown.innerHTML = "";
                    onFoodSelected(idMap[name], name);
                });
            })
            .catch(function (err) {
                hideAutoAddLoading();
                console.error("Restaurant food search error:", err);
            });
    }, 300);
}

// --- General Foods Typeahead ---

function initGeneralFoodSearch() {
    var input = document.getElementById("general_food_search");
    if (!input) return;

    input.addEventListener("input", function () {
        var term = input.value.toLowerCase().trim();
        var dropdown = document.getElementById("general_food_dropdown");
        dropdown.innerHTML = "";

        if (term.length < 1) return;

        var foods = typeof GENERAL_FOODS !== "undefined" ? GENERAL_FOODS : [];

        if (foods.length === 0) {
            if (term.length >= 2) {
                searchGeneralFoodsFromAPI(term, dropdown);
            }
            return;
        }

        var matches = [];
        for (var i = 0; i < foods.length; i++) {
            if (foods[i].name.toLowerCase().includes(term)) {
                matches.push(foods[i]);
                if (matches.length >= 100) break;
            }
        }

        var names = [];
        var idMap = {};
        for (var i = 0; i < matches.length; i++) {
            names.push(matches[i].name);
            idMap[matches[i].name] = matches[i].fdcId;
        }

        if (names.length === 0 && term.length >= 2) {
            searchGeneralFoodsFromAPI(term, dropdown);
            return;
        }

        renderDropdownItems(dropdown, names, function (name) {
            input.value = name;
            dropdown.innerHTML = "";
            onFoodSelected(idMap[name], name);
        });
    });
}

function searchGeneralFoodsFromAPI(term, dropdown) {
    if (!ensureApiKey()) return;

    clearTimeout(foodSearchDebounceTimer);
    foodSearchDebounceTimer = setTimeout(function () {
        showAutoAddLoading();
        searchFoods(term, ["Foundation", "SR Legacy", "Survey (FNDDS)"], null, 50)
            .then(function (result) {
                hideAutoAddLoading();
                dropdown.innerHTML = "";
                if (!result.foods || result.foods.length === 0) {
                    var noResult = document.createElement("div");
                    noResult.className = "auto-dropdown-item no-results";
                    noResult.textContent = "No foods found.";
                    dropdown.appendChild(noResult);
                    return;
                }

                var names = [];
                var idMap = {};
                for (var i = 0; i < result.foods.length; i++) {
                    var desc = result.foods[i].description;
                    if (!idMap[desc]) {
                        names.push(desc);
                        idMap[desc] = result.foods[i].fdcId;
                    }
                }

                renderDropdownItems(dropdown, names, function (name) {
                    document.getElementById("general_food_search").value = name;
                    dropdown.innerHTML = "";
                    onFoodSelected(idMap[name], name);
                });
            })
            .catch(function (err) {
                hideAutoAddLoading();
                console.error("General food search error:", err);
            });
    }, 300);
}

// --- Food Selection -> Fetch Details -> Portion Picker -> Auto-fill ---

function onFoodSelected(fdcId, foodName) {
    if (!fdcId) return;
    if (!ensureApiKey()) return;

    selectedFoodFdcId = fdcId;
    showAutoAddLoading();

    getFoodDetails(fdcId)
        .then(function (foodData) {
            hideAutoAddLoading();

            var portions = extractPortions(foodData);
            var nutrientsPer100g = extractNutrients(foodData);

            if (portions.length > 1) {
                showPortionPicker(portions, function (selectedPortion) {
                    var scaled = scaleNutrients(nutrientsPer100g, selectedPortion.gramWeight);
                    autoFillFoodForm(foodName, scaled, selectedPortion);
                });
            } else if (portions.length === 1) {
                var scaled = scaleNutrients(nutrientsPer100g, portions[0].gramWeight);
                autoFillFoodForm(foodName, scaled, portions[0]);
            } else {
                autoFillFoodForm(foodName, nutrientsPer100g, null);
            }
        })
        .catch(function (err) {
            hideAutoAddLoading();
            console.error("Food detail fetch error:", err);
            showAutoAddError("Failed to fetch food details. " + err.message);
        });
}

function showPortionPicker(portions, onSelect) {
    var container = document.getElementById("auto_add_portion_picker");
    var optionsDiv = document.getElementById("portion_options");
    container.style.display = "block";
    optionsDiv.innerHTML = "";

    for (var i = 0; i < portions.length; i++) {
        (function (portion, index) {
            var btn = document.createElement("button");
            btn.type = "button";
            btn.className = "portion-option-btn";
            btn.textContent = portion.description || ("Portion " + (index + 1));
            btn.addEventListener("click", function () {
                container.style.display = "none";
                onSelect(portion);
            });
            optionsDiv.appendChild(btn);
        })(portions[i], i);
    }
}

function hidePortionPicker() {
    var container = document.getElementById("auto_add_portion_picker");
    if (container) container.style.display = "none";
    var options = document.getElementById("portion_options");
    if (options) options.innerHTML = "";
}

function autoFillFoodForm(foodName, nutrients, portion) {
    closeAutoAddForm();

    if (typeof displayForm === "function" && typeof addFoodForm !== "undefined") {
        displayForm(addFoodForm);
    }

    document.getElementById("food_name").value = foodName;
    document.getElementById("food_calories").value = Math.round(nutrients.calories * 100) / 100;
    document.getElementById("food_protein").value = Math.round(nutrients.protein * 100) / 100;
    document.getElementById("food_fat").value = Math.round(nutrients.fat * 100) / 100;
    document.getElementById("food_carbs").value = Math.round(nutrients.carbs * 100) / 100;

    if (portion) {
        var parsed = parsePortionString(portion.description);
        document.getElementById("food_serving_size").value = parsed.servingSize;
        document.getElementById("food_measurement_unit").value = parsed.unit;
    } else {
        document.getElementById("food_serving_size").value = "1";
        document.getElementById("food_measurement_unit").value = "serving";
    }
}

// --- UI Helpers ---

function renderDropdownItems(dropdown, items, onSelect) {
    dropdown.innerHTML = "";
    for (var i = 0; i < items.length; i++) {
        (function (item) {
            var btn = document.createElement("button");
            btn.type = "button";
            btn.className = "auto-dropdown-item";
            btn.textContent = item;
            btn.addEventListener("click", function (e) {
                e.preventDefault();
                onSelect(item);
            });
            dropdown.appendChild(btn);
        })(items[i]);
    }
}

function showAutoAddLoading() {
    var el = document.getElementById("auto_add_loading");
    if (el) el.style.display = "block";
}

function hideAutoAddLoading() {
    var el = document.getElementById("auto_add_loading");
    if (el) el.style.display = "none";
}

function showAutoAddError(msg) {
    var form = document.getElementById("auto_add_food_form");
    if (!form) return;
    var errorSpan = form.querySelector(".error");
    if (errorSpan) errorSpan.textContent = msg;
}

// --- Data Refresh Notifications ---

function checkDataRefreshSchedule() {
    var now = new Date();
    var currentMonth = now.getMonth();
    var currentYear = now.getFullYear();

    var lastBrandRefresh = localStorage.getItem("lastBrandRefresh");
    if (lastBrandRefresh) {
        var brandDate = new Date(lastBrandRefresh);
        var monthsSince = (currentYear - brandDate.getFullYear()) * 12 + (currentMonth - brandDate.getMonth());
        if (monthsSince >= 1) {
            console.log("[Auto-Add] Brand owner data may be stale. Consider re-running: node tools/extract_brands.js <path-to-csv>");
        }
    } else {
        localStorage.setItem("lastBrandRefresh", now.toISOString());
    }

    var lastGeneralRefresh = localStorage.getItem("lastGeneralRefresh");
    var needsGeneralRefresh = false;
    if (lastGeneralRefresh) {
        var genDate = new Date(lastGeneralRefresh);
        var refreshMonths = [4, 10]; // May (4) and November (10)
        for (var i = 0; i < refreshMonths.length; i++) {
            var refreshDate = new Date(currentYear, refreshMonths[i], 1);
            if (now >= refreshDate && genDate < refreshDate) {
                needsGeneralRefresh = true;
                break;
            }
        }
        if (!needsGeneralRefresh) {
            var prevYear = new Date(currentYear - 1, 10, 1);
            if (genDate < prevYear && now >= prevYear) {
                needsGeneralRefresh = true;
            }
        }
    } else {
        localStorage.setItem("lastGeneralRefresh", now.toISOString());
    }

    if (needsGeneralRefresh) {
        console.log("[Auto-Add] General/Foundation/Survey food data may be stale (updates May 1 & Nov 1). Consider re-running: node tools/extract_foods.js <api-key>");
    }
}

// --- Initialize on page load ---

function initAutoAdd() {
    initAutoAddTabs();
    initBrandOwnerSearch();
    initBrandedFoodSearch();
    initRestaurantFoodSearch();
    initGeneralFoodSearch();
    checkDataRefreshSchedule();
}
