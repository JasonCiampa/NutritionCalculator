let viewedItems = new Map();
let cachedFoods = [];
let editingItem = null;

function filterFoodsAndMeals() {
    const searchInput = document.getElementById('food_meal_search');
    if (!searchInput) return;
    const term = searchInput.value.toLowerCase();

    const foodWrappers = document.querySelectorAll('#foodButtons .food-button-wrapper');
    foodWrappers.forEach(wrapper => {
        const name = wrapper.querySelector('button').textContent.toLowerCase();
        wrapper.style.display = name.includes(term) ? '' : 'none';
    });

    const mealWrappers = document.querySelectorAll('#mealButtons .meal-button-wrapper');
    mealWrappers.forEach(wrapper => {
        const btn = wrapper.querySelector('button');
        const name = btn.textContent.toLowerCase();
        const ingredients = (btn.dataset.ingredients || '').toLowerCase();
        const matches = name.includes(term) || ingredients.includes(term);
        wrapper.style.display = matches ? '' : 'none';
    });
}

function filterIngredientDropdown(input) {
    const dropdown = input.parentElement.querySelector('.ingredient-dropdown');
    if (!dropdown) return;
    const term = input.value.toLowerCase();

    const items = dropdown.querySelectorAll('.ingredient-dropdown-item');
    items.forEach(item => {
        item.style.display = item.textContent.toLowerCase().includes(term) ? '' : 'none';
    });

    dropdown.style.display = term ? 'block' : 'block';
}

function populateIngredientDropdown(dropdown, input) {
    dropdown.innerHTML = '';
    for (let i = 0; i < cachedFoods.length; i++) {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "ingredient-dropdown-item";
        item.textContent = cachedFoods[i].name;
        item.addEventListener("click", function (e) {
            e.preventDefault();
            input.value = cachedFoods[i].name;
            dropdown.style.display = 'none';
        });
        dropdown.appendChild(item);
    }
}

function populateAllIngredientDropdowns() {
    const inputs = document.querySelectorAll('.meal_ingredients');
    inputs.forEach(input => {
        const dropdown = input.parentElement.querySelector('.ingredient-dropdown');
        if (dropdown) {
            populateIngredientDropdown(dropdown, input);
        }
    });
}

function loadCachedFoods(callback) {
    const request = openDatabase();
    request.onsuccess = function () {
        const db = request.result;
        const foodTransaction = db.transaction("foods", "readonly");
        const foodStore = foodTransaction.objectStore("foods");
        const foodStoreList = foodStore.getAll();

        foodStoreList.onsuccess = function () {
            cachedFoods = foodStoreList.result;
            foodTransaction.oncomplete = function () {
                db.close();
            };
            if (callback) callback();
        };
    };
}

function showAddFoodChoice() {
    const choice = document.getElementById('add_food_choice');
    displayForm(choice);
}

function renderMicroFieldsInForm() {
    var container = document.getElementById('micro_fields_content');
    var section = document.getElementById('micro_fields_section');
    if (!container || !section) return;
    container.innerHTML = '';
    var enabled = getEnabledMicronutrients();
    if (enabled.length === 0) {
        section.style.display = 'none';
        return;
    }
    section.style.display = 'block';
    for (var i = 0; i < enabled.length; i++) {
        var def = getMicroDef(enabled[i]);
        if (!def) continue;
        var p = document.createElement('p');
        p.textContent = def.label + ' (' + def.unit + '): ';
        var input = document.createElement('input');
        input.type = 'number';
        input.id = 'food_' + def.key;
        input.step = 'any';
        input.min = '0';
        input.autocomplete = 'off';
        p.appendChild(input);
        container.appendChild(p);
    }
}

function toggleMicroFields() {
    var content = document.getElementById('micro_fields_content');
    if (content) content.classList.toggle('expanded');
}

function editFood(data) {
    displayForm(addFoodForm);
    editingItem = { type: 'food', originalName: data.name };
    document.getElementById('food_name').value = data.name;
    document.getElementById('food_measurement_unit').value = data.measurement_unit;
    document.getElementById('food_serving_size').value = data.serving_size;
    document.getElementById('food_calories').value = data.cals;
    document.getElementById('food_carbs').value = data.carbs;
    document.getElementById('food_protein').value = data.protein;
    document.getElementById('food_fat').value = data.fat;
    renderMicroFieldsInForm();
    var enabled = getEnabledMicronutrients();
    for (var i = 0; i < enabled.length; i++) {
        var el = document.getElementById('food_' + enabled[i]);
        if (el && data[enabled[i]] != null) el.value = data[enabled[i]];
    }
}

function editMeal(data) {
    displayForm(addMealForm);
    editingItem = { type: 'meal', originalName: data.name };
    document.getElementById('meal_name').value = data.name;

    const ingredientsDiv = document.getElementById('ingredients');
    const existingRows = ingredientsDiv.getElementsByClassName('ingredient_and_serving');
    while (existingRows.length > 1) {
        ingredientsDiv.removeChild(existingRows[existingRows.length - 1]);
    }

    existingRows[0].querySelector('.meal_ingredients').value = data.ingredient_list[0];
    existingRows[0].querySelector('.meal_serving_sizes').value = data.serving_list[0];

    for (let i = 1; i < data.ingredient_list.length; i++) {
        addIngredient();
        const allRows = ingredientsDiv.getElementsByClassName('ingredient_and_serving');
        const newRow = allRows[allRows.length - 1];
        newRow.querySelector('.meal_ingredients').value = data.ingredient_list[i];
        newRow.querySelector('.meal_serving_sizes').value = data.serving_list[i];
    }

    populateAllIngredientDropdowns();
}

function renderNutritionViewer() {
    const container = document.getElementById('nutrition_viewer_entries');
    container.innerHTML = '';

    viewedItems.forEach(function (data, key) {
        const box = document.createElement("div");
        box.className = "entry-box expanded";
        box.dataset.itemName = data.name;
        box.dataset.itemType = data.type;

        const title = document.createElement("span");
        title.className = "entry-title";
        title.textContent = data.name;
        box.appendChild(title);

        const details = document.createElement("div");
        details.className = "entry-details";

        const servingLine = document.createElement("p");
        servingLine.className = "entry-detail-serving";
        if (data.type === "food") {
            servingLine.textContent = "Serving: " + data.serving_size + " " + data.measurement_unit;
        } else {
            let ingredientStrings = [];
            for (let i = 0; i < data.ingredient_list.length; i++) {
                ingredientStrings.push(data.serving_list[i] + "x " + data.ingredient_list[i]);
            }
            servingLine.textContent = "Ingredients: " + ingredientStrings.join(", ");
        }
        details.appendChild(servingLine);

        const calsLine = document.createElement("p");
        calsLine.className = "entry-detail-cals";
        calsLine.textContent = "Calories: " + formatNumber(data.cals);
        details.appendChild(calsLine);

        const carbsLine = document.createElement("p");
        carbsLine.className = "entry-detail-carbs";
        carbsLine.textContent = "Carbs: " + formatNumber(data.carbs) + "g";
        details.appendChild(carbsLine);

        const proteinLine = document.createElement("p");
        proteinLine.className = "entry-detail-protein";
        proteinLine.textContent = "Protein: " + formatNumber(data.protein) + "g";
        details.appendChild(proteinLine);

        const fatLine = document.createElement("p");
        fatLine.className = "entry-detail-fat";
        fatLine.textContent = "Fat: " + formatNumber(data.fat) + "g";
        details.appendChild(fatLine);

        var enabledMicros = getEnabledMicronutrients();
        if (enabledMicros.length > 0) {
            var hasMicroData = false;
            for (var mi = 0; mi < enabledMicros.length; mi++) {
                if (data[enabledMicros[mi]] != null) { hasMicroData = true; break; }
            }
            if (hasMicroData) {
                var microContainer = document.createElement("div");
                microContainer.className = "entry-micro-container";
                var microToggle = document.createElement("button");
                microToggle.className = "entry-micro-toggle-btn";
                microToggle.textContent = "Micronutrients";
                var microContent = document.createElement("div");
                microContent.className = "entry-micro-content";
                microToggle.addEventListener("click", function (e) {
                    e.stopPropagation();
                    microContent.classList.toggle("expanded");
                });
                for (var mi = 0; mi < enabledMicros.length; mi++) {
                    var mk = enabledMicros[mi];
                    if (data[mk] != null) {
                        var def = getMicroDef(mk);
                        if (def) {
                            var microLine = document.createElement("p");
                            microLine.className = "entry-detail-micro";
                            microLine.textContent = def.label + ": " + formatNumber(data[mk]) + def.unit;
                            microContent.appendChild(microLine);
                        }
                    }
                }
                microContainer.appendChild(microToggle);
                microContainer.appendChild(microContent);
                details.appendChild(microContainer);
            }
        }

        var warningIcon = buildMicroWarningIcon(data, enabledMicros);
        if (warningIcon) box.appendChild(warningIcon);

        const actionRow = document.createElement("div");
        actionRow.className = "entry-action-buttons";

        const editBtn = document.createElement("button");
        editBtn.className = "entry-edit-btn";
        editBtn.textContent = "Edit";
        editBtn.addEventListener("click", function (e) {
            e.stopPropagation();
            if (data.type === "food") {
                editFood(data);
            } else {
                editMeal(data);
            }
        });
        actionRow.appendChild(editBtn);

        const deleteBtn = document.createElement("button");
        deleteBtn.className = "entry-delete-btn";
        deleteBtn.textContent = "Delete";
        deleteBtn.addEventListener("click", function (e) {
            e.stopPropagation();
            const existing = box.querySelector('.delete-confirm-panel');
            if (existing) {
                existing.remove();
                return;
            }
            const panel = document.createElement("div");
            panel.className = "delete-confirm-panel";

            const msg = document.createElement("h4");
            msg.textContent = "Are you sure you want to delete this?";
            panel.appendChild(msg);

            const btnRow = document.createElement("div");
            btnRow.className = "delete-confirm-buttons";

            const confirmBtn = document.createElement("button");
            confirmBtn.className = "delete-confirm-yes";
            confirmBtn.textContent = "Delete";
            confirmBtn.addEventListener("click", function (ev) {
                ev.stopPropagation();
                deleteItemFromDatabase(data.name, data.type);
            });

            const cancelBtn = document.createElement("button");
            cancelBtn.className = "delete-confirm-cancel";
            cancelBtn.textContent = "Cancel";
            cancelBtn.addEventListener("click", function (ev) {
                ev.stopPropagation();
                panel.remove();
            });

            btnRow.appendChild(confirmBtn);
            btnRow.appendChild(cancelBtn);
            panel.appendChild(btnRow);
            box.appendChild(panel);
        });
        actionRow.appendChild(deleteBtn);

        details.appendChild(actionRow);

        box.appendChild(details);

        box.addEventListener("click", function (e) {
            if (e.target.closest('.entry-delete-btn') || e.target.closest('.delete-confirm-panel') || e.target.closest('.entry-edit-btn')) return;
            viewedItems.delete(key);
            renderNutritionViewer();
        });

        container.appendChild(box);
    });
}

function toggleViewItem(itemData) {
    const key = itemData.type + ":" + itemData.name;
    if (viewedItems.has(key)) {
        viewedItems.delete(key);
    } else {
        viewedItems.set(key, itemData);
    }
    renderNutritionViewer();
}

function deleteItemFromDatabase(name, type) {
    markDataModified();
    const request = openDatabase();
    request.onsuccess = function () {
        const db = request.result;

        if (type === "food") {
            const foodTransaction = db.transaction("foods", "readwrite");
            const foodStore = foodTransaction.objectStore("foods");
            foodStore.delete(name);

            foodTransaction.oncomplete = function () {
                const mealTransaction = db.transaction(["meals", "foods"], "readwrite");
                const mealStore = mealTransaction.objectStore("meals");
                const foodStoreForLookup = mealTransaction.objectStore("foods");
                const allMeals = mealStore.getAll();

                allMeals.onsuccess = function () {
                    let mealsToProcess = [];
                    let deletedMealNames = [];

                    for (let m = 0; m < allMeals.result.length; m++) {
                        const meal = allMeals.result[m];
                        const idx = meal.ingredient_list.indexOf(name);
                        if (idx === -1) continue;

                        const newIngredients = [];
                        const newServings = [];
                        for (let i = 0; i < meal.ingredient_list.length; i++) {
                            if (meal.ingredient_list[i] !== name) {
                                newIngredients.push(meal.ingredient_list[i]);
                                newServings.push(meal.serving_list[i]);
                            }
                        }

                        if (newIngredients.length === 0) {
                            mealStore.delete(meal.name);
                            deletedMealNames.push(meal.name);
                            viewedItems.delete("meal:" + meal.name);
                        } else {
                            mealsToProcess.push({
                                name: meal.name,
                                ingredients: newIngredients,
                                servings: newServings
                            });
                        }
                    }

                    for (let p = 0; p < mealsToProcess.length; p++) {
                        const mp = mealsToProcess[p];
                        let newCals = 0, newCarbs = 0, newProtein = 0, newFat = 0;
                        let newMicros = {};
                        let microMissingCount = {};
                        let ingredientsDone = 0;

                        for (let i = 0; i < mp.ingredients.length; i++) {
                            const foodReq = foodStoreForLookup.get(mp.ingredients[i]);
                            foodReq.onsuccess = function () {
                                if (foodReq.result) {
                                    newCals += parseFloat(foodReq.result.cals) * parseFloat(mp.servings[i]);
                                    newCarbs += parseFloat(foodReq.result.carbs) * parseFloat(mp.servings[i]);
                                    newProtein += parseFloat(foodReq.result.protein) * parseFloat(mp.servings[i]);
                                    newFat += parseFloat(foodReq.result.fat) * parseFloat(mp.servings[i]);
                                    if (typeof MICRONUTRIENT_DEFINITIONS !== 'undefined') {
                                        for (var m = 0; m < MICRONUTRIENT_DEFINITIONS.length; m++) {
                                            var mk = MICRONUTRIENT_DEFINITIONS[m].key;
                                            if (foodReq.result[mk] != null) {
                                                newMicros[mk] = (newMicros[mk] || 0) + parseFloat(foodReq.result[mk]) * parseFloat(mp.servings[i]);
                                            } else {
                                                microMissingCount[mk] = (microMissingCount[mk] || 0) + 1;
                                            }
                                        }
                                    }
                                }
                                ingredientsDone++;
                                if (ingredientsDone === mp.ingredients.length) {
                                    var missingMicros = [];
                                    if (typeof MICRONUTRIENT_DEFINITIONS !== 'undefined') {
                                        for (var m = 0; m < MICRONUTRIENT_DEFINITIONS.length; m++) {
                                            var mk = MICRONUTRIENT_DEFINITIONS[m].key;
                                            if (microMissingCount[mk] > 0) {
                                                missingMicros.push(mk);
                                            }
                                        }
                                    }
                                    var mealRecord = {
                                        name: mp.name,
                                        ingredient_list: mp.ingredients,
                                        serving_list: mp.servings,
                                        cals: Math.round(newCals * 100) / 100,
                                        carbs: Math.round(newCarbs * 100) / 100,
                                        protein: Math.round(newProtein * 100) / 100,
                                        fat: Math.round(newFat * 100) / 100,
                                        _missingMicros: missingMicros
                                    };
                                    for (var mk in newMicros) {
                                        if (newMicros.hasOwnProperty(mk)) {
                                            mealRecord[mk] = Math.round(newMicros[mk] * 100) / 100;
                                        }
                                    }
                                    mealStore.put(mealRecord);

                                    if (viewedItems.has("meal:" + mp.name)) {
                                        var viewRecord = JSON.parse(JSON.stringify(mealRecord));
                                        viewRecord.type = "meal";
                                        viewedItems.set("meal:" + mp.name, viewRecord);
                                    }
                                }
                            };
                        }
                    }

                    mealTransaction.oncomplete = function () {
                        let namesToRemove = [name].concat(deletedMealNames);
                        removeFromTodaysNutrition(namesToRemove, db);
                    };
                };
            };
        } else {
            const mealTransaction = db.transaction("meals", "readwrite");
            const mealStore = mealTransaction.objectStore("meals");
            mealStore.delete(name);

            mealTransaction.oncomplete = function () {
                removeFromTodaysNutrition([name], db);
            };
        }
    };
}

function removeFromTodaysNutrition(namesToRemove, db) {
    const nutritionTransaction = db.transaction("nutrition", "readwrite");
    const nutritionStore = nutritionTransaction.objectStore("nutrition");

    const eatenTodayReq = nutritionStore.get("eatenToday");
    const totalCalsReq = nutritionStore.get("totalCals");
    const totalCarbsReq = nutritionStore.get("totalCarbs");
    const totalProteinReq = nutritionStore.get("totalProtein");
    const totalFatReq = nutritionStore.get("totalFat");

    let allLoaded = 0;
    let eatenData, calsData, carbsData, proteinData, fatData;

    function onLoaded() {
        allLoaded++;
        if (allLoaded < 5) return;

        if (!eatenData || !eatenData.content) {
            finishCleanup();
            return;
        }

        let calsToRemove = 0, carbsToRemove = 0, proteinToRemove = 0, fatToRemove = 0;
        const filtered = [];

        for (let i = 0; i < eatenData.content.length; i++) {
            const entry = eatenData.content[i];
            if (namesToRemove.indexOf(entry.name) !== -1) {
                calsToRemove += entry.cals;
                carbsToRemove += entry.carbs;
                proteinToRemove += entry.protein;
                fatToRemove += entry.fat;
            } else {
                filtered.push(entry);
            }
        }

        nutritionStore.put({ name: "eatenToday", content: filtered });

        const currentCals = calsData ? calsData.content : 0;
        const currentCarbs = carbsData ? carbsData.content : 0;
        const currentProtein = proteinData ? proteinData.content : 0;
        const currentFat = fatData ? fatData.content : 0;

        nutritionStore.put({ name: "totalCals", content: Math.round((currentCals - calsToRemove) * 100) / 100 });
        nutritionStore.put({ name: "totalCarbs", content: Math.round((currentCarbs - carbsToRemove) * 100) / 100 });
        nutritionStore.put({ name: "totalProtein", content: Math.round((currentProtein - proteinToRemove) * 100) / 100 });
        nutritionStore.put({ name: "totalFat", content: Math.round((currentFat - fatToRemove) * 100) / 100 });

        finishCleanup();
    }

    eatenTodayReq.onsuccess = function () { eatenData = eatenTodayReq.result; onLoaded(); };
    totalCalsReq.onsuccess = function () { calsData = totalCalsReq.result; onLoaded(); };
    totalCarbsReq.onsuccess = function () { carbsData = totalCarbsReq.result; onLoaded(); };
    totalProteinReq.onsuccess = function () { proteinData = totalProteinReq.result; onLoaded(); };
    totalFatReq.onsuccess = function () { fatData = totalFatReq.result; onLoaded(); };

    function finishCleanup() {
        nutritionTransaction.oncomplete = function () {
            db.close();
            for (let i = 0; i < namesToRemove.length; i++) {
                viewedItems.delete("food:" + namesToRemove[i]);
                viewedItems.delete("meal:" + namesToRemove[i]);
            }
            renderNutritionViewer();
            loadCachedFoods(function () {
                setNutritionLists();
            });
        };
    }
}

function renameFoodInMeals(oldName, newName, db, onComplete) {
    var mealTransaction = db.transaction("meals", "readwrite");
    var mealStore = mealTransaction.objectStore("meals");
    var allMeals = mealStore.getAll();

    allMeals.onsuccess = function () {
        for (var m = 0; m < allMeals.result.length; m++) {
            var meal = allMeals.result[m];
            var idx = meal.ingredient_list.indexOf(oldName);
            if (idx === -1) continue;

            while (idx !== -1) {
                meal.ingredient_list[idx] = newName;
                idx = meal.ingredient_list.indexOf(oldName);
            }
            mealStore.put(meal);

            if (typeof viewedItems !== 'undefined' && viewedItems.has("meal:" + meal.name)) {
                var viewed = viewedItems.get("meal:" + meal.name);
                viewed.ingredient_list = meal.ingredient_list;
                viewedItems.set("meal:" + meal.name, viewed);
            }
        }
    };

    mealTransaction.oncomplete = function () {
        if (onComplete) onComplete();
    };
}

function renameFoodInTodaysNutrition(oldName, newName, db, onComplete) {
    var nutritionTransaction = db.transaction("nutrition", "readwrite");
    var nutritionStore = nutritionTransaction.objectStore("nutrition");
    var eatenTodayReq = nutritionStore.get("eatenToday");

    eatenTodayReq.onsuccess = function () {
        if (!eatenTodayReq.result || !eatenTodayReq.result.content) return;
        var entries = eatenTodayReq.result.content;
        var changed = false;
        for (var i = 0; i < entries.length; i++) {
            if (entries[i].name === oldName) {
                entries[i].name = newName;
                changed = true;
            }
        }
        if (changed) {
            nutritionStore.put({ name: "eatenToday", content: entries });
        }
    };

    nutritionTransaction.oncomplete = function () {
        if (onComplete) onComplete();
    };
}

function renameMealInTodaysNutrition(oldName, newName, db, onComplete) {
    var nutritionTransaction = db.transaction("nutrition", "readwrite");
    var nutritionStore = nutritionTransaction.objectStore("nutrition");
    var eatenTodayReq = nutritionStore.get("eatenToday");

    eatenTodayReq.onsuccess = function () {
        if (!eatenTodayReq.result || !eatenTodayReq.result.content) return;
        var entries = eatenTodayReq.result.content;
        var changed = false;
        for (var i = 0; i < entries.length; i++) {
            if (entries[i].name === oldName && entries[i].type === "meal") {
                entries[i].name = newName;
                changed = true;
            }
        }
        if (changed) {
            nutritionStore.put({ name: "eatenToday", content: entries });
        }
    };

    nutritionTransaction.oncomplete = function () {
        if (onComplete) onComplete();
    };
}

function cascadeFoodEditToMeals(foodName, db, onComplete) {
    const mealTransaction = db.transaction(["meals", "foods"], "readwrite");
    const mealStore = mealTransaction.objectStore("meals");
    const foodStoreForLookup = mealTransaction.objectStore("foods");
    const allMeals = mealStore.getAll();

    let affectedMealNames = [];

    allMeals.onsuccess = function () {
        let mealsToRecalc = [];
        for (let m = 0; m < allMeals.result.length; m++) {
            const meal = allMeals.result[m];
            if (meal.ingredient_list.indexOf(foodName) !== -1) {
                mealsToRecalc.push(meal);
                affectedMealNames.push(meal.name);
            }
        }

        for (let p = 0; p < mealsToRecalc.length; p++) {
            const meal = mealsToRecalc[p];
            let newCals = 0, newCarbs = 0, newProtein = 0, newFat = 0;
            let newMicros = {};
            let microMissingCount = {};
            let ingredientsDone = 0;

            for (let i = 0; i < meal.ingredient_list.length; i++) {
                const foodReq = foodStoreForLookup.get(meal.ingredient_list[i]);
                foodReq.onsuccess = function () {
                    if (foodReq.result) {
                        newCals += parseFloat(foodReq.result.cals) * parseFloat(meal.serving_list[i]);
                        newCarbs += parseFloat(foodReq.result.carbs) * parseFloat(meal.serving_list[i]);
                        newProtein += parseFloat(foodReq.result.protein) * parseFloat(meal.serving_list[i]);
                        newFat += parseFloat(foodReq.result.fat) * parseFloat(meal.serving_list[i]);
                        if (typeof MICRONUTRIENT_DEFINITIONS !== 'undefined') {
                            for (var m = 0; m < MICRONUTRIENT_DEFINITIONS.length; m++) {
                                var mk = MICRONUTRIENT_DEFINITIONS[m].key;
                                if (foodReq.result[mk] != null) {
                                    newMicros[mk] = (newMicros[mk] || 0) + parseFloat(foodReq.result[mk]) * parseFloat(meal.serving_list[i]);
                                } else {
                                    microMissingCount[mk] = (microMissingCount[mk] || 0) + 1;
                                }
                            }
                        }
                    }
                    ingredientsDone++;
                    if (ingredientsDone === meal.ingredient_list.length) {
                        var missingMicros = [];
                        if (typeof MICRONUTRIENT_DEFINITIONS !== 'undefined') {
                            for (var m = 0; m < MICRONUTRIENT_DEFINITIONS.length; m++) {
                                var mk = MICRONUTRIENT_DEFINITIONS[m].key;
                                if (microMissingCount[mk] > 0) {
                                    missingMicros.push(mk);
                                }
                            }
                        }
                        var mealRecord = {
                            name: meal.name,
                            ingredient_list: meal.ingredient_list,
                            serving_list: meal.serving_list,
                            cals: Math.round(newCals * 100) / 100,
                            carbs: Math.round(newCarbs * 100) / 100,
                            protein: Math.round(newProtein * 100) / 100,
                            fat: Math.round(newFat * 100) / 100,
                            _missingMicros: missingMicros
                        };
                        for (var mk in newMicros) {
                            if (newMicros.hasOwnProperty(mk)) {
                                mealRecord[mk] = Math.round(newMicros[mk] * 100) / 100;
                            }
                        }
                        mealStore.put(mealRecord);
                        if (viewedItems.has("meal:" + meal.name)) {
                            var viewRecord = JSON.parse(JSON.stringify(mealRecord));
                            viewRecord.type = "meal";
                            viewedItems.set("meal:" + meal.name, viewRecord);
                        }
                    }
                };
            }
        }
    };

    mealTransaction.oncomplete = function () {
        onComplete(affectedMealNames);
    };
}

function updateTodaysNutritionAfterEdit(affectedNames, db, onComplete) {
    const nutritionTransaction = db.transaction(["nutrition", "foods", "meals"], "readwrite");
    const nutritionStore = nutritionTransaction.objectStore("nutrition");
    const foodStore = nutritionTransaction.objectStore("foods");
    const mealStore = nutritionTransaction.objectStore("meals");

    const eatenTodayReq = nutritionStore.get("eatenToday");

    eatenTodayReq.onsuccess = function () {
        if (!eatenTodayReq.result || !eatenTodayReq.result.content || eatenTodayReq.result.content.length === 0) {
            return;
        }

        const entries = eatenTodayReq.result.content;
        let pendingLookups = 0;
        let lookupsCompleted = 0;

        for (let i = 0; i < entries.length; i++) {
            if (affectedNames.indexOf(entries[i].name) !== -1) {
                pendingLookups++;
            }
        }

        if (pendingLookups === 0) return;

        function checkAllDone() {
            lookupsCompleted++;
            if (lookupsCompleted === pendingLookups) {
                let totalCals = 0, totalCarbs = 0, totalProtein = 0, totalFat = 0;
                for (let i = 0; i < entries.length; i++) {
                    totalCals += entries[i].cals;
                    totalCarbs += entries[i].carbs;
                    totalProtein += entries[i].protein;
                    totalFat += entries[i].fat;
                }

                nutritionStore.put({ name: "eatenToday", content: entries });
                nutritionStore.put({ name: "totalCals", content: Math.round(totalCals * 100) / 100 });
                nutritionStore.put({ name: "totalCarbs", content: Math.round(totalCarbs * 100) / 100 });
                nutritionStore.put({ name: "totalProtein", content: Math.round(totalProtein * 100) / 100 });
                nutritionStore.put({ name: "totalFat", content: Math.round(totalFat * 100) / 100 });
            }
        }

        for (let i = 0; i < entries.length; i++) {
            if (affectedNames.indexOf(entries[i].name) === -1) continue;

            const entryIndex = i;
            const entry = entries[i];

            if (entry.type === "food") {
                const foodReq = foodStore.get(entry.name);
                foodReq.onsuccess = function () {
                    if (foodReq.result) {
                        entries[entryIndex].cals = Math.round(parseFloat(foodReq.result.cals) * entry.servings * 100) / 100;
                        entries[entryIndex].carbs = Math.round(parseFloat(foodReq.result.carbs) * entry.servings * 100) / 100;
                        entries[entryIndex].protein = Math.round(parseFloat(foodReq.result.protein) * entry.servings * 100) / 100;
                        entries[entryIndex].fat = Math.round(parseFloat(foodReq.result.fat) * entry.servings * 100) / 100;
                        entries[entryIndex].servingSize = foodReq.result.serving_size;
                        entries[entryIndex].measurementUnit = foodReq.result.measurement_unit;
                        if (typeof MICRONUTRIENT_DEFINITIONS !== 'undefined') {
                            for (var m = 0; m < MICRONUTRIENT_DEFINITIONS.length; m++) {
                                var mk = MICRONUTRIENT_DEFINITIONS[m].key;
                                entries[entryIndex][mk] = foodReq.result[mk] != null
                                    ? Math.round(parseFloat(foodReq.result[mk]) * entry.servings * 100) / 100
                                    : undefined;
                            }
                        }
                    }
                    checkAllDone();
                };
            } else {
                const mealReq = mealStore.get(entry.name);
                mealReq.onsuccess = function () {
                    if (mealReq.result) {
                        entries[entryIndex].cals = Math.round(parseFloat(mealReq.result.cals) * entry.servings * 100) / 100;
                        entries[entryIndex].carbs = Math.round(parseFloat(mealReq.result.carbs) * entry.servings * 100) / 100;
                        entries[entryIndex].protein = Math.round(parseFloat(mealReq.result.protein) * entry.servings * 100) / 100;
                        entries[entryIndex].fat = Math.round(parseFloat(mealReq.result.fat) * entry.servings * 100) / 100;
                        let ingredientStrings = [];
                        for (let j = 0; j < mealReq.result.ingredient_list.length; j++) {
                            ingredientStrings.push(mealReq.result.serving_list[j] + "x " + mealReq.result.ingredient_list[j]);
                        }
                        entries[entryIndex].ingredients = ingredientStrings;
                        entries[entryIndex].ingredient_list = mealReq.result.ingredient_list;
                        entries[entryIndex]._missingMicros = mealReq.result._missingMicros || [];
                        if (typeof MICRONUTRIENT_DEFINITIONS !== 'undefined') {
                            for (var m = 0; m < MICRONUTRIENT_DEFINITIONS.length; m++) {
                                var mk = MICRONUTRIENT_DEFINITIONS[m].key;
                                entries[entryIndex][mk] = mealReq.result[mk] != null
                                    ? Math.round(parseFloat(mealReq.result[mk]) * entry.servings * 100) / 100
                                    : undefined;
                            }
                        }
                    }
                    checkAllDone();
                };
            }
        }
    };

    nutritionTransaction.oncomplete = function () {
        db.close();
        if (onComplete) onComplete();
    };
}

function setNutritionLists() {
    const request = openDatabase();
    request.onsuccess = function () {
        const db = request.result;

        const foodTransaction = db.transaction("foods", "readwrite");
        const mealTransaction = db.transaction("meals", "readwrite");
        const foodStore = foodTransaction.objectStore("foods");
        const mealStore = mealTransaction.objectStore("meals");

        const foodStoreList = foodStore.getAll();
        const mealStoreList = mealStore.getAll();

        foodStoreList.onsuccess = function () {
            const foodList = document.getElementById('food_list');
            foodList.innerHTML = "";
            foodList.appendChild(document.createElement("h3")).innerHTML = "Foods";

            const foodButtons = document.createElement("ul");
            foodButtons.id = "foodButtons";

            for (let i = 0; i < foodStoreList.result.length; i++) {
                const food = foodStoreList.result[i];

                const wrapper = document.createElement("div");
                wrapper.className = "food-button-wrapper";

                const button = document.createElement("button");
                button.innerHTML = food.name;

                var foodData = {
                    name: food.name,
                    type: "food",
                    serving_size: food.serving_size,
                    measurement_unit: food.measurement_unit,
                    cals: food.cals,
                    carbs: food.carbs,
                    protein: food.protein,
                    fat: food.fat
                };
                if (typeof MICRONUTRIENT_DEFINITIONS !== 'undefined') {
                    for (var mi = 0; mi < MICRONUTRIENT_DEFINITIONS.length; mi++) {
                        var mk = MICRONUTRIENT_DEFINITIONS[mi].key;
                        if (food[mk] != null) foodData[mk] = food[mk];
                    }
                }

                button.onclick = (function(fd) { return function() { toggleViewItem(fd); }; })(foodData);

                wrapper.appendChild(button);

                var enabledMicros = getEnabledMicronutrients();
                var wIcon = buildMicroWarningIcon(food, enabledMicros);
                if (wIcon) {
                    wrapper.style.position = 'relative';
                    wrapper.appendChild(wIcon);
                }

                foodButtons.appendChild(wrapper);
            }

            foodTransaction.oncomplete = function () {
                db.close();
            };

            foodList.appendChild(foodButtons);
        };

        mealStoreList.onsuccess = function () {
            const mealList = document.getElementById('meal_list');
            mealList.innerHTML = "";
            mealList.appendChild(document.createElement("h3")).innerHTML = "Meals";

            const mealButtons = document.createElement("ul");
            mealButtons.id = "mealButtons";

            for (let i = 0; i < mealStoreList.result.length; i++) {
                const meal = mealStoreList.result[i];

                const wrapper = document.createElement("div");
                wrapper.className = "meal-button-wrapper";

                const button = document.createElement("button");
                button.innerHTML = meal.name;
                button.dataset.ingredients = meal.ingredient_list.join(",");

                var mealData = {
                    name: meal.name,
                    type: "meal",
                    ingredient_list: meal.ingredient_list,
                    serving_list: meal.serving_list,
                    cals: meal.cals,
                    carbs: meal.carbs,
                    protein: meal.protein,
                    fat: meal.fat,
                    _missingMicros: meal._missingMicros || []
                };
                if (typeof MICRONUTRIENT_DEFINITIONS !== 'undefined') {
                    for (var mi = 0; mi < MICRONUTRIENT_DEFINITIONS.length; mi++) {
                        var mk = MICRONUTRIENT_DEFINITIONS[mi].key;
                        if (meal[mk] != null) mealData[mk] = meal[mk];
                    }
                }

                button.onclick = (function(md) { return function() { toggleViewItem(md); }; })(mealData);

                wrapper.appendChild(button);

                var enabledMicros = getEnabledMicronutrients();
                var wIcon = buildMicroWarningIcon(meal, enabledMicros);
                if (wIcon) {
                    wrapper.style.position = 'relative';
                    wrapper.appendChild(wIcon);
                }

                mealButtons.appendChild(wrapper);
            }

            mealTransaction.oncomplete = function () {
                db.close();
            };

            mealList.appendChild(mealButtons);
        };
    };
}

window.addEventListener("load", function () {
    viewedItems.clear();

    loadCachedFoods(function () {
        setNutritionLists();
        populateAllIngredientDropdowns();
    });

    const searchInput = document.getElementById('food_meal_search');
    if (searchInput) {
        searchInput.addEventListener("input", filterFoodsAndMeals);
    }

    document.getElementById('manual_add_btn').addEventListener("click", function () {
        document.getElementById('add_food_choice').style.display = 'none';
        renderMicroFieldsInForm();
        displayForm(addFoodForm);
    });

    document.getElementById('auto_add_btn').addEventListener("click", function () {
        document.getElementById('add_food_choice').style.display = 'none';
        var autoForm = document.getElementById('auto_add_food_form');
        displayForm(autoForm);
    });

    document.getElementById('add_food_choice_quit').addEventListener("click", function () {
        document.getElementById('add_food_choice').style.display = 'none';
        openedFile = '';
    });

    document.getElementById('scan_label_btn').addEventListener("click", function () {
        document.getElementById('add_food_choice').style.display = 'none';
        var scanForm = document.getElementById('scan_label_form');
        displayForm(scanForm);
    });

    if (typeof initAutoAdd === "function") {
        initAutoAdd();
    }
});
