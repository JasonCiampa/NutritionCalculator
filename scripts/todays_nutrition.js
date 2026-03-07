let expandedEntries = new Set();
var cachedEatenToday = [];

function currentDate() {
    let d = new Date();
    const month = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    document.getElementById('current_date').innerHTML = (String(month[d.getMonth()]) + ' ' + String(d.getDate()) + ',' + ' ' + String(d.getFullYear()));
}

function renderRegimenDisplay() {
    var container = document.getElementById('regimen_display');
    if (!container) return;
    container.innerHTML = '';

    var request = openDatabase();
    request.onsuccess = function () {
        var db = request.result;
        var tx = db.transaction("regimens", "readonly");
        var store = tx.objectStore("regimens");
        var getAll = store.getAll();

        getAll.onsuccess = function () {
            var regimens = getAll.result || [];
            var activeRegimen = localStorage.getItem('activeRegimen') || '';

            if (regimens.length === 0 && !activeRegimen) return;

            var selectorDiv = document.createElement('div');
            selectorDiv.id = 'regimen_selector';

            var label = document.createElement('span');
            label.textContent = 'Regimen: ';
            label.style.fontWeight = 'bold';
            selectorDiv.appendChild(label);

            var select = document.createElement('select');
            select.id = 'regimen_select';

            var noneOpt = document.createElement('option');
            noneOpt.value = '';
            noneOpt.textContent = 'None';
            select.appendChild(noneOpt);

            for (var i = 0; i < regimens.length; i++) {
                var opt = document.createElement('option');
                opt.value = regimens[i].name;
                opt.textContent = regimens[i].name;
                if (regimens[i].name === activeRegimen) opt.selected = true;
                select.appendChild(opt);
            }

            select.addEventListener('change', function () {
                localStorage.setItem('activeRegimen', select.value);
                updateMacroGoalDisplay();
                renderMicroTotals();
            });

            selectorDiv.appendChild(select);

            if (activeRegimen) {
                var deactivateBtn = document.createElement('button');
                deactivateBtn.id = 'deactivate_regimen_btn';
                deactivateBtn.textContent = 'Deactivate';
                deactivateBtn.addEventListener('click', function () {
                    localStorage.setItem('activeRegimen', '');
                    select.value = '';
                    updateMacroGoalDisplay();
                    renderMicroTotals();
                });
                selectorDiv.appendChild(deactivateBtn);
            }

            container.appendChild(selectorDiv);
        };
    };
}

function getActiveRegimenData(callback) {
    var activeRegimen = localStorage.getItem('activeRegimen') || '';
    if (!activeRegimen) { callback(null); return; }

    var request = openDatabase();
    request.onsuccess = function () {
        var db = request.result;
        var tx = db.transaction("regimens", "readonly");
        var store = tx.objectStore("regimens");
        var req = store.get(activeRegimen);
        req.onsuccess = function () {
            callback(req.result || null);
        };
    };
}

function updateMacroGoalDisplay() {
    getActiveRegimenData(function (regimen) {
        var calsEl = document.getElementById('total_calories');
        var carbsEl = document.getElementById('total_carbs');
        var proteinEl = document.getElementById('total_protein');
        var fatEl = document.getElementById('total_fat');

        var calsH2 = document.getElementById('cals');
        var carbsH2 = document.getElementById('carbs');
        var proteinH2 = document.getElementById('protein');
        var fatH2 = document.getElementById('fat');

        var currentCals = parseFloat(calsEl.textContent) || 0;
        var currentCarbs = parseFloat(carbsEl.textContent) || 0;
        var currentProtein = parseFloat(proteinEl.textContent) || 0;
        var currentFat = parseFloat(fatEl.textContent) || 0;

        if (regimen) {
            calsH2.innerHTML = 'Calories: <span id="total_calories">' + formatNumber(currentCals) + '</span> / ' + formatNumber(regimen.maxCalories);
            carbsH2.innerHTML = 'Carbs: <span id="total_carbs">' + formatNumber(currentCarbs) + '</span>g / ' + formatNumber(regimen.maxCarbs) + 'g';
            proteinH2.innerHTML = 'Protein: <span id="total_protein">' + formatNumber(currentProtein) + '</span>g / ' + formatNumber(regimen.maxProtein) + 'g';
            fatH2.innerHTML = 'Fat: <span id="total_fat">' + formatNumber(currentFat) + '</span>g / ' + formatNumber(regimen.maxFat) + 'g';

            if (currentCals > regimen.maxCalories) calsH2.classList.add('over-limit');
            else calsH2.classList.remove('over-limit');
            if (currentCarbs > regimen.maxCarbs) carbsH2.classList.add('over-limit');
            else carbsH2.classList.remove('over-limit');
            if (currentProtein > regimen.maxProtein) proteinH2.classList.add('over-limit');
            else proteinH2.classList.remove('over-limit');
            if (currentFat > regimen.maxFat) fatH2.classList.add('over-limit');
            else fatH2.classList.remove('over-limit');
        } else {
            calsH2.innerHTML = 'Calories: <span id="total_calories">' + formatNumber(currentCals) + '</span>';
            carbsH2.innerHTML = 'Carbs: <span id="total_carbs">' + formatNumber(currentCarbs) + '</span>g';
            proteinH2.innerHTML = 'Protein: <span id="total_protein">' + formatNumber(currentProtein) + '</span>g';
            fatH2.innerHTML = 'Fat: <span id="total_fat">' + formatNumber(currentFat) + '</span>g';
            calsH2.classList.remove('over-limit');
            carbsH2.classList.remove('over-limit');
            proteinH2.classList.remove('over-limit');
            fatH2.classList.remove('over-limit');
        }
    });
}

function renderMicroTotals() {
    var section = document.getElementById('micro_totals_section');
    if (!section) return;
    var enabledMicros = getEnabledMicronutrients();
    if (enabledMicros.length === 0) {
        section.style.display = 'none';
        return;
    }
    section.style.display = 'block';
    section.innerHTML = '';

    var toggleBtn = document.createElement('button');
    toggleBtn.id = 'micro_totals_toggle';
    toggleBtn.textContent = 'Micronutrient Totals';
    var content = document.createElement('div');
    content.id = 'micro_totals_content';

    toggleBtn.addEventListener('click', function () {
        content.classList.toggle('expanded');
    });

    section.appendChild(toggleBtn);

    var entries = cachedEatenToday || [];

    getActiveRegimenData(function (regimen) {
        for (var i = 0; i < enabledMicros.length; i++) {
            var mk = enabledMicros[i];
            var def = getMicroDef(mk);
            if (!def) continue;

            var total = 0;
            var hasMissing = false;
            for (var j = 0; j < entries.length; j++) {
                if (entries[j][mk] != null) {
                    total += parseFloat(entries[j][mk]);
                } else {
                    hasMissing = true;
                }
            }
            total = Math.round(total * 100) / 100;

            var row = document.createElement('div');
            row.className = 'micro-total-row';

            var labelSpan = document.createElement('span');
            labelSpan.className = 'micro-total-label';
            labelSpan.textContent = def.label;
            row.appendChild(labelSpan);

            var rightDiv = document.createElement('div');
            rightDiv.className = 'micro-total-right';

            var valueSpan = document.createElement('span');
            valueSpan.className = 'micro-total-value';
            var maxKey = 'max' + mk.charAt(0).toUpperCase() + mk.slice(1);
            if (regimen && regimen[maxKey] != null) {
                valueSpan.textContent = formatNumber(total) + def.unit + ' / ' + formatNumber(regimen[maxKey]) + def.unit;
                if (total > regimen[maxKey]) valueSpan.style.color = '#e74c3c';
            } else {
                valueSpan.textContent = formatNumber(total) + def.unit;
            }
            rightDiv.appendChild(valueSpan);

            if (hasMissing && entries.length > 0) {
                var warnIcon = document.createElement('span');
                warnIcon.className = 'micro-warning-icon';
                warnIcon.setAttribute('tabindex', '0');
                warnIcon.innerHTML = '&#9888;';
                var tooltip = document.createElement('span');
                tooltip.className = 'micro-warning-tooltip';
                tooltip.textContent = "Some foods eaten today don't have information for " + def.label + ", so this total may be inaccurate.";
                warnIcon.appendChild(tooltip);
                rightDiv.appendChild(warnIcon);
            }

            row.appendChild(rightDiv);
            content.appendChild(row);
        }

        section.appendChild(content);
    });
}

function uniformizeEntryBoxes() {
    const boxes = document.querySelectorAll('.entry-box');
    if (boxes.length === 0) return;

    boxes.forEach(box => {
        box.style.width = '';
        box.style.minHeight = '';
    });

    let maxWidth = 0;
    let maxCollapsedHeight = 0;

    boxes.forEach(box => {
        maxWidth = Math.max(maxWidth, box.offsetWidth);
        if (!box.classList.contains('expanded')) {
            maxCollapsedHeight = Math.max(maxCollapsedHeight, box.offsetHeight);
        }
    });

    boxes.forEach(box => {
        box.style.width = maxWidth + 'px';
        if (!box.classList.contains('expanded')) {
            box.style.minHeight = maxCollapsedHeight + 'px';
        }
    });
}

function setNutritionToday() {
    const request = openDatabase();
    request.onsuccess = function () {
        console.log("Database opened successfully");
        const db = request.result;

        const nutritionTransaction = db.transaction("nutrition", "readwrite");
        const nutritionStore = nutritionTransaction.objectStore("nutrition");

        if (!localStorage.getItem('nutritionDataFormat_v2')) {
            nutritionStore.put({ name: "eatenToday", content: [] });
            nutritionStore.put({ name: "totalCals", content: 0 });
            nutritionStore.put({ name: "totalCarbs", content: 0 });
            nutritionStore.put({ name: "totalProtein", content: 0 });
            nutritionStore.put({ name: "totalFat", content: 0 });
            nutritionStore.put({ name: "currentDate", content: "" });
            localStorage.setItem('nutritionDataFormat_v2', 'structured');
            document.getElementById('total_calories').innerHTML = 0;
            document.getElementById('total_carbs').innerHTML = 0;
            document.getElementById('total_protein').innerHTML = 0;
            document.getElementById('total_fat').innerHTML = 0;
            document.getElementById('eaten_today').innerHTML = '';
            nutritionTransaction.oncomplete = function () {
                setNutritionToday();
            };
            return;
        }

        const currentDateReq = nutritionStore.get("currentDate");

        currentDateReq.onsuccess = function () {
            if ((currentDateReq.result != undefined) && (currentDateReq.result.content === document.getElementById('current_date').innerHTML)) {
                const totalCals = nutritionStore.get("totalCals");
                const totalCarbs = nutritionStore.get("totalCarbs");
                const totalProtein = nutritionStore.get("totalProtein");
                const totalFat = nutritionStore.get("totalFat");
                const eatenToday = nutritionStore.get("eatenToday");

                totalCals.onsuccess = function () {
                    document.getElementById('total_calories').innerHTML = formatNumber(totalCals.result.content);
                }
                totalCarbs.onsuccess = function () {
                    document.getElementById('total_carbs').innerHTML = formatNumber(totalCarbs.result.content);
                }
                totalProtein.onsuccess = function () {
                    document.getElementById('total_protein').innerHTML = formatNumber(totalProtein.result.content);
                }
                totalFat.onsuccess = function () {
                    document.getElementById('total_fat').innerHTML = formatNumber(totalFat.result.content);
                }
                eatenToday.onsuccess = function () {
                    cachedEatenToday = eatenToday.result.content || [];
                    const container = document.getElementById('eaten_today');
                    container.innerHTML = "";
                    var enabledMicros = getEnabledMicronutrients();

                    for (let i = 0; i < eatenToday.result.content.length; i++) {
                        const entry = eatenToday.result.content[i];

                        const box = document.createElement("div");
                        box.className = expandedEntries.has(i) ? "entry-box expanded" : "entry-box";

                        var warningIcon = buildMicroWarningIcon(entry, enabledMicros);
                        if (warningIcon) box.appendChild(warningIcon);

                        const title = document.createElement("span");
                        title.className = "entry-title";
                        title.textContent = entry.name + " (" + entry.servings + "x)";
                        box.appendChild(title);

                        const details = document.createElement("div");
                        details.className = "entry-details";

                        const servingLine = document.createElement("p");
                        servingLine.className = "entry-detail-serving";
                        if (entry.type === "food") {
                            servingLine.textContent = "Serving: " + entry.servingSize + " " + entry.measurementUnit;
                        } else {
                            servingLine.textContent = "Ingredients: " + entry.ingredients.join(", ");
                        }
                        details.appendChild(servingLine);

                        const calsLine = document.createElement("p");
                        calsLine.className = "entry-detail-cals";
                        calsLine.textContent = "Calories: " + formatNumber(entry.cals);
                        details.appendChild(calsLine);

                        const carbsLine = document.createElement("p");
                        carbsLine.className = "entry-detail-carbs";
                        carbsLine.textContent = "Carbs: " + formatNumber(entry.carbs) + "g";
                        details.appendChild(carbsLine);

                        const proteinLine = document.createElement("p");
                        proteinLine.className = "entry-detail-protein";
                        proteinLine.textContent = "Protein: " + formatNumber(entry.protein) + "g";
                        details.appendChild(proteinLine);

                        const fatLine = document.createElement("p");
                        fatLine.className = "entry-detail-fat";
                        fatLine.textContent = "Fat: " + formatNumber(entry.fat) + "g";
                        details.appendChild(fatLine);

                        if (enabledMicros.length > 0) {
                            var hasMicroData = false;
                            for (var mi = 0; mi < enabledMicros.length; mi++) {
                                if (entry[enabledMicros[mi]] != null) { hasMicroData = true; break; }
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
                                    if (entry[mk] != null) {
                                        var def = getMicroDef(mk);
                                        if (def) {
                                            var microLine = document.createElement("p");
                                            microLine.className = "entry-detail-micro";
                                            microLine.textContent = def.label + ": " + formatNumber(entry[mk]) + def.unit;
                                            microContent.appendChild(microLine);
                                        }
                                    }
                                }
                                microContainer.appendChild(microToggle);
                                microContainer.appendChild(microContent);
                                details.appendChild(microContainer);
                            }
                        }

                        const removeBtn = document.createElement("button");
                        removeBtn.className = "entry-remove-btn";
                        removeBtn.textContent = "Remove";
                        removeBtn.addEventListener("click", function (e) {
                            e.stopPropagation();
                            expandedEntries.delete(i);
                            const adjusted = new Set();
                            expandedEntries.forEach(function (idx) {
                                adjusted.add(idx > i ? idx - 1 : idx);
                            });
                            expandedEntries = adjusted;
                            document.getElementById("remove_nutrition_name").value = entry.name;
                            document.getElementById("remove_nutrition_index").value = i;
                            processForm(removeNutritionForm);
                        });
                        details.appendChild(removeBtn);

                        box.appendChild(details);

                        box.addEventListener("click", function () {
                            box.classList.toggle("expanded");
                            if (box.classList.contains("expanded")) {
                                expandedEntries.add(i);
                            } else {
                                expandedEntries.delete(i);
                            }
                            uniformizeEntryBoxes();
                        });

                        container.appendChild(box);
                    }

                    uniformizeEntryBoxes();
                    updateMacroGoalDisplay();
                    renderMicroTotals();
                }
            }
            else {
                document.getElementById('total_calories').innerHTML = 0;
                document.getElementById('total_carbs').innerHTML = 0;
                document.getElementById('total_protein').innerHTML = 0;
                document.getElementById('total_fat').innerHTML = 0;
                document.getElementById('eaten_today').innerHTML = '';
                const eatenToday = nutritionStore.get("eatenToday");
                eatenToday.onsuccess = function () {
                    nutritionStore.put({ name: "eatenToday", content: [] });
                }
            }
        }
    };
}

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

function loadFoodsAndMeals() {
    const request = openDatabase();

    request.onsuccess = function () {
        console.log("Database opened successfully");
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

                button.onclick = () => {
                    document.getElementById("log_nutrition_name").value = food.name;
                    displayForm(logNutritionForm);
                };

                wrapper.appendChild(button);
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

                button.onclick = () => {
                    document.getElementById("log_nutrition_name").value = meal.name;
                    displayForm(logNutritionForm);
                };

                wrapper.appendChild(button);
                mealButtons.appendChild(wrapper);
            }

            mealTransaction.oncomplete = function () {
                db.close();
            };

            mealList.appendChild(mealButtons);
        };
    };
}

function resetNutrition() {
    const request = openDatabase();
    request.onsuccess = function () {
        const db = request.result;
        const nutritionTransaction = db.transaction("nutrition", "readwrite");
        const nutritionStore = nutritionTransaction.objectStore("nutrition");

        nutritionStore.put({ name: "eatenToday", content: [] });
        nutritionStore.put({ name: "totalCals", content: 0 });
        nutritionStore.put({ name: "totalCarbs", content: 0 });
        nutritionStore.put({ name: "totalProtein", content: 0 });
        nutritionStore.put({ name: "totalFat", content: 0 });

        nutritionTransaction.oncomplete = function () {
            db.close();
            expandedEntries.clear();
            setNutritionToday();
        };
    };
}

window.addEventListener("load", function() {
    currentDate();
    renderRegimenDisplay();
    setNutritionToday();
    loadFoodsAndMeals();

    const searchInput = document.getElementById('food_meal_search');
    if (searchInput) {
        searchInput.addEventListener("input", filterFoodsAndMeals);
    }

    var resetBtn = document.getElementById('reset_nutrition_btn');
    if (resetBtn) {
        resetBtn.addEventListener("click", function () {
            var container = document.getElementById('reset_nutrition_container');
            var existing = container.querySelector('.delete-confirm-panel');
            if (existing) {
                existing.remove();
                return;
            }

            var panel = document.createElement("div");
            panel.className = "delete-confirm-panel";

            var msg = document.createElement("h4");
            msg.textContent = "Are you sure you want to reset today's nutrition?";
            panel.appendChild(msg);

            var btnRow = document.createElement("div");
            btnRow.className = "delete-confirm-buttons";

            var confirmBtn = document.createElement("button");
            confirmBtn.className = "delete-confirm-yes";
            confirmBtn.textContent = "Reset";
            confirmBtn.addEventListener("click", function () {
                panel.remove();
                resetNutrition();
            });

            var cancelBtn = document.createElement("button");
            cancelBtn.className = "delete-confirm-cancel";
            cancelBtn.textContent = "Cancel";
            cancelBtn.addEventListener("click", function () {
                panel.remove();
            });

            btnRow.appendChild(confirmBtn);
            btnRow.appendChild(cancelBtn);
            panel.appendChild(btnRow);
            container.appendChild(panel);
        });
    }
});
