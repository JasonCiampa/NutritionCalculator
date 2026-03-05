let expandedEntries = new Set();

function currentDate() {
    let d = new Date();
    const month = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    document.getElementById('current_date').innerHTML = (String(month[d.getMonth()]) + ' ' + String(d.getDate()) + ',' + ' ' + String(d.getFullYear()));
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
                    document.getElementById('total_calories').innerHTML = Math.round(totalCals.result.content * 100) / 100;
                }
                totalCarbs.onsuccess = function () {
                    document.getElementById('total_carbs').innerHTML = Math.round(totalCarbs.result.content * 100) / 100;
                }
                totalProtein.onsuccess = function () {
                    document.getElementById('total_protein').innerHTML = Math.round(totalProtein.result.content * 100) / 100;
                }
                totalFat.onsuccess = function () {
                    document.getElementById('total_fat').innerHTML = Math.round(totalFat.result.content * 100) / 100;
                }
                eatenToday.onsuccess = function () {
                    const container = document.getElementById('eaten_today');
                    container.innerHTML = "";

                    for (let i = 0; i < eatenToday.result.content.length; i++) {
                        const entry = eatenToday.result.content[i];

                        const box = document.createElement("div");
                        box.className = expandedEntries.has(i) ? "entry-box expanded" : "entry-box";

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
                        calsLine.textContent = "Calories: " + entry.cals;
                        details.appendChild(calsLine);

                        const carbsLine = document.createElement("p");
                        carbsLine.className = "entry-detail-carbs";
                        carbsLine.textContent = "Carbs: " + entry.carbs + "g";
                        details.appendChild(carbsLine);

                        const proteinLine = document.createElement("p");
                        proteinLine.className = "entry-detail-protein";
                        proteinLine.textContent = "Protein: " + entry.protein + "g";
                        details.appendChild(proteinLine);

                        const fatLine = document.createElement("p");
                        fatLine.className = "entry-detail-fat";
                        fatLine.textContent = "Fat: " + entry.fat + "g";
                        details.appendChild(fatLine);

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

window.addEventListener("load", function() {
    currentDate();
    setNutritionToday();
    loadFoodsAndMeals();

    const searchInput = document.getElementById('food_meal_search');
    if (searchInput) {
        searchInput.addEventListener("input", filterFoodsAndMeals);
    }
});
