// DATABASE INITIALIZATION AND STANDARD SET-UP PROCEDURE //
function openDatabase() {
/** 
     
* This function initializes the database on the user's browser 
     
* The "request" value that is returned can be used in a "request.onsuccess"
* statement, and inside those statements are the code to manipulate the database
    
*/
    const indexedDB =
    window.indexedDB ||
    window.mozIndexedDB ||
    window.webkitIndexedDB ||
    window.msIndexedDB ||
    window.shimIndexedDB;
  
    if (!indexedDB) {
        console.log("IndexedDB could not be found in this browser.");
        return
    }

    const request = indexedDB.open("FoodMealDatabase", 1);

    request.onerror = function (event) {
        console.error("An error occurred with IndexedDB");
        console.error(event);
    };

    request.onupgradeneeded = function () {
        const db = request.result;

        const foodStore = db.createObjectStore("foods", { keyPath: "name" });
        const mealStore = db.createObjectStore("meals", { keyPath: "name" });
        const nutritionStore = db.createObjectStore("nutrition", { keyPath: "name" });
    };

    return request;
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////

// FOOD CLASS
class Food {
    constructor(name, measurement_unit, serving_size, cals, carbs, protein, fat) {
        this.name = name;
        this.measurement_unit = measurement_unit;
        this.serving_size = serving_size;
        this.cals = cals;
        this.carbs = carbs;
        this.protein = protein;
        this.fat = fat;
    }
}

// MEAL CLASS
class Meal {
    constructor(name, ingredient_list, serving_list, cals, carbs, protein, fat) {
        this.name = name;
        this.ingredient_list = ingredient_list;
        this.serving_list = serving_list;
        this.cals = cals;
        this.carbs = carbs;
        this.protein = protein;
        this.fat = fat;
    }
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////

// VARIABLE INITIALIZATION (FORMS, LISTS, BUTTONS)
let openedFile = '';    /** Initialized as empty, will later be set to whichever form is currently open */

const addFoodForm = document.getElementById('add_food_form');   
const addFoodButton = document.getElementById('add_food');  

const addMealForm = document.getElementById('add_meal_form');
const addMealButton = document.getElementById('add_meal');

const modifyForm = document.getElementById('modify_form');
const modifyButton = document.getElementById('modify');

const autoAddFoodForm = document.getElementById('auto_add_food_form');
const autoAddFoodDiv = autoAddFoodForm;

const logNutritionForm = document.getElementById('log_nutrition_form');
const logNutritionButton = document.getElementById('log_nutrition');

const removeNutritionForm = document.getElementById('remove_nutrition_name');
const removeNutritionButton = document.getElementById('remove_nutrition');

/////////////////////////////////////////////////////////////////////////////////////////////////////////

function displayForm(form) {
/**
 
* This function displays the form that corresponds to the button pressed by the user.
* It ensures only one form is open at a time by using the "openedFile" variable initialized above.

*/
    if (openedFile === '') {
        openedFile = form;
    }

    else if (openedFile !== form) {
        let values = form.getElementsByTagName("input");
        for (let i = 0; i < values.length; i++) {
            values[i].value = values[i].defaultValue || '';
        }
        closeForm(openedFile);
        openedFile = form;
    }

    form.style.display = "flex";
    form.scrollIntoView({ behavior: "smooth", block: "center" });
}

function closeForm(form) {
/**

* This function closes whichever form was open.
* Can be activated by the user when they click the "Quit" button.

*/
    form.style.display = "none";
    error = document.getElementsByClassName('error');
    for (i = 0; i < error.length; i++) {
        error[i].innerHTML = '';
    }
    if (form.id === 'auto_add_food_form' && typeof resetAutoAddState === 'function') {
        resetAutoAddState();
    }
    if (typeof editingItem !== 'undefined' && editingItem) {
        editingItem = null;
        const foodNameInput = document.getElementById('food_name');
        if (foodNameInput) foodNameInput.readOnly = false;
        const mealNameInput = document.getElementById('meal_name');
        if (mealNameInput) mealNameInput.readOnly = false;
    }
    if (form.id === 'add_meal_form') {
        const ingredientsDiv = document.getElementById('ingredients');
        if (ingredientsDiv) {
            const rows = ingredientsDiv.getElementsByClassName('ingredient_and_serving');
            while (rows.length > 1) {
                ingredientsDiv.removeChild(rows[rows.length - 1]);
            }
            if (rows.length > 0) {
                const firstIngInput = rows[0].querySelector('.meal_ingredients');
                const firstServInput = rows[0].querySelector('.meal_serving_sizes');
                if (firstIngInput) firstIngInput.value = '';
                if (firstServInput) firstServInput.value = '1';
            }
        }
    }
}

function missingInformation() {
/**

* Sets the value of the error pop-up message in a form to indicate information is missing.

*/
    error = document.getElementsByClassName('error');
    for (i = 0; i < error.length; i++) {
        error[i].innerHTML = "You must appropriately fill out every field before submitting.";
    }
}

function addIngredient() {
    let div = document.createElement("div");
    div.className = "ingredient_and_serving";

    let p_ingredient = document.createElement("div");
    p_ingredient.className = "ingredient_field";
    let ingredient_text = document.createTextNode("Ingredient: ");
    let ingredient_input = document.createElement("input");
    ingredient_input.type = "text";
    ingredient_input.className = "meal_ingredients";
    ingredient_input.autocomplete = "off";
    ingredient_input.setAttribute("oninput", "filterIngredientDropdown(this)");

    let dropdown = document.createElement("div");
    dropdown.className = "ingredient-dropdown";

    p_ingredient.appendChild(ingredient_text);
    p_ingredient.appendChild(ingredient_input);
    p_ingredient.appendChild(dropdown);

    if (typeof populateIngredientDropdown === 'function') {
        populateIngredientDropdown(dropdown, ingredient_input);
    }

    let p_servings = document.createElement("p");
    let servings_text = document.createTextNode("Servings: ");
    let servings_input = document.createElement("input");
    servings_input.type = "number";
    servings_input.className = "meal_serving_sizes";
    servings_input.min = "0.01";
    servings_input.step = "any";
    servings_input.value = "1";
    servings_input.autocomplete = "off";
    p_servings.appendChild(servings_text);
    p_servings.appendChild(servings_input);

    let ingredientsList = document.getElementById("ingredients");

    div.appendChild(p_ingredient);
    div.appendChild(p_servings);
    ingredientsList.appendChild(div);
}

function removeIngredient() {
/**

* Removes an ingredient and serving input box for the addMeal form.
* Will activate whenever the user clicks the "Remove Ingredient" button on the form.

*/
    let div = document.getElementById('ingredients');
    let ingredients_list = document.getElementsByClassName('ingredient_and_serving');
    div.removeChild(ingredients_list[(ingredients_list.length - 1)]);
}

function processForm(form) {
/**

* This function holds a majority of the code responsible for the nutrition calculator's functionality.
* When a user clicks the "Submit" button on a form, the form is sent through as a parameter to this function.

* The function will determine which form was sent through, and once it is determined, the appropriate
  procedures are performed to carry out the purpose of the form.

*/
    /**
    
    * In the addFoodForm case, all data is organized into their corresponding variables.

    * If any of these variables are empty (missing information), the user is prompted with the
      "missing information" error. 

    * Once all variables are properly set, they are made into a Food object.

    * Then the database is opened, the food is stored properly inside, and the page is reloaded to update the food list.

    */ 
    if(form === addFoodForm) {
        let name = document.getElementById("food_name").value;
        let measurement_unit = document.getElementById("food_measurement_unit").value;
        let serving_size = document.getElementById("food_serving_size").value;
        let calories = document.getElementById("food_calories").value;
        let carbs = document.getElementById("food_carbs").value;
        let protein = document.getElementById("food_protein").value;
        let fat = document.getElementById("food_fat").value;

        let foodAttributes = [name, measurement_unit, serving_size, calories, carbs, protein, fat];

        for (let i = 0; i < foodAttributes.length; i++){
            if(foodAttributes[i] === '') {
                missingInformation();
                return;
            }
        }

        let food = new Food(name, measurement_unit, serving_size, calories, carbs, protein, fat);
        let isEditing = (typeof editingItem !== 'undefined' && editingItem && editingItem.type === 'food');

        const request = openDatabase();
        request.onsuccess = function () {
            const db = request.result;

            if (isEditing) {
                var oldName = editingItem.originalName;
                var nameChanged = (food.name !== oldName);

                function commitFoodEdit() {
                    var foodTransaction = db.transaction("foods", "readwrite");
                    var foodStore = foodTransaction.objectStore("foods");
                    if (nameChanged) {
                        foodStore.delete(oldName);
                    }
                    foodStore.put({ name: food.name, measurement_unit: food.measurement_unit, serving_size: food.serving_size, cals: food.cals, carbs: food.carbs, protein: food.protein, fat: food.fat });

                    foodTransaction.oncomplete = function () {
                        if (typeof viewedItems !== 'undefined') {
                            if (nameChanged && viewedItems.has("food:" + oldName)) {
                                viewedItems.delete("food:" + oldName);
                            }
                            viewedItems.set("food:" + food.name, {
                                name: food.name, type: "food",
                                serving_size: food.serving_size, measurement_unit: food.measurement_unit,
                                cals: food.cals, carbs: food.carbs, protein: food.protein, fat: food.fat
                            });
                        }

                        if (nameChanged) {
                            renameFoodInMeals(oldName, food.name, db, function () {
                                renameFoodInTodaysNutrition(oldName, food.name, db, function () {
                                    cascadeFoodEditToMeals(food.name, db, function (affectedMealNames) {
                                        var allAffected = [food.name].concat(affectedMealNames);
                                        updateTodaysNutritionAfterEdit(allAffected, db, function () {
                                            renderNutritionViewer();
                                            loadCachedFoods(function () {
                                                setNutritionLists();
                                                populateAllIngredientDropdowns();
                                            });
                                        });
                                    });
                                });
                            });
                        } else {
                            cascadeFoodEditToMeals(food.name, db, function (affectedMealNames) {
                                var allAffected = [food.name].concat(affectedMealNames);
                                updateTodaysNutritionAfterEdit(allAffected, db, function () {
                                    renderNutritionViewer();
                                    loadCachedFoods(function () {
                                        setNutritionLists();
                                        populateAllIngredientDropdowns();
                                    });
                                });
                            });
                        }
                    };
                }

                if (nameChanged) {
                    var checkTransaction = db.transaction(["foods", "meals"], "readonly");
                    var cFoodStore = checkTransaction.objectStore("foods");
                    var cMealStore = checkTransaction.objectStore("meals");
                    var foodCheck = cFoodStore.get(food.name);
                    var mealCheck = cMealStore.get(food.name);
                    var nameExists = false;
                    foodCheck.onsuccess = function () { if (foodCheck.result) nameExists = true; };
                    mealCheck.onsuccess = function () { if (mealCheck.result) nameExists = true; };
                    checkTransaction.oncomplete = function () {
                        if (nameExists) {
                            var error = document.getElementsByClassName('error');
                            for (var i = 0; i < error.length; i++) {
                                error[i].innerHTML = "A food or meal with this name already exists.";
                            }
                            db.close();
                            return;
                        }
                        commitFoodEdit();
                    };
                } else {
                    commitFoodEdit();
                }

                document.getElementById("food_name").value = '';
                document.getElementById("food_measurement_unit").value = '';
                document.getElementById("food_serving_size").value = '';
                document.getElementById("food_calories").value = '';
                document.getElementById("food_carbs").value = '';
                document.getElementById("food_protein").value = '';
                document.getElementById("food_fat").value = '';
                closeForm(form);
            } else {
                const checkTransaction = db.transaction(["foods", "meals"], "readonly");
                const cFoodStore = checkTransaction.objectStore("foods");
                const cMealStore = checkTransaction.objectStore("meals");
                const foodCheck = cFoodStore.get(name);
                const mealCheck = cMealStore.get(name);

                let nameExists = false;
                foodCheck.onsuccess = function () { if (foodCheck.result) nameExists = true; };
                mealCheck.onsuccess = function () { if (mealCheck.result) nameExists = true; };

                checkTransaction.oncomplete = function () {
                    if (nameExists) {
                        let error = document.getElementsByClassName('error');
                        for (let i = 0; i < error.length; i++) {
                            error[i].innerHTML = "A food or meal with this name already exists.";
                        }
                        db.close();
                        return;
                    }

                    const saveTransaction = db.transaction("foods", "readwrite");
                    const saveFoodStore = saveTransaction.objectStore("foods");
                    saveFoodStore.put({ name: food.name, measurement_unit: food.measurement_unit, serving_size: food.serving_size, cals: food.cals, carbs: food.carbs, protein: food.protein, fat: food.fat });

                    saveTransaction.oncomplete = function () {
                        db.close();
                    };

                    document.getElementById("food_name").value = '';
                    document.getElementById("food_measurement_unit").value = '';
                    document.getElementById("food_serving_size").value = '';
                    document.getElementById("food_calories").value = '';
                    document.getElementById("food_carbs").value = '';
                    document.getElementById("food_protein").value = '';
                    document.getElementById("food_fat").value = '';
                    closeForm(form);
                    if (typeof loadCachedFoods === 'function') {
                        loadCachedFoods(function () {
                            setNutritionLists();
                            populateAllIngredientDropdowns();
                        });
                    } else {
                        setNutritionLists();
                    }
                };
            }
        };
    }

    /**
    * In the addMealForm case, the name is stored in a variable and then two parallel lists are built.
      for the ingredients and their corresponding number of servings.
    
    * All data is then checked for missing information. If any values are empty, the "missing information" error arises.
      Otherwise, the database is opened and variables for calories and micronutrients are initialized.
      
    * All of the current information is created into a Meal object and is updated in a for loop. This loop gets the nutrition of
      each food in the ingredient_list, and increments a total count for cals, carbs, protein, and fat.

    * The Meal object is stored in the database and repeatedly updated during the loop. Once the loop finishes,
      the page is reloaded to update the meal list.

     */
    else if (form === addMealForm) {
        let name = document.getElementById("meal_name").value;

        let temp_ingredient_list = document.getElementsByClassName('meal_ingredients');
        let temp_serving_list = document.getElementsByClassName('meal_serving_sizes');
        let ingredient_list = [];
        let serving_list = [];

        if (name === '') {
            missingInformation();
            return;
        }

        let isEditing = (typeof editingItem !== 'undefined' && editingItem && editingItem.type === 'meal');

        const request = openDatabase();
        request.onsuccess = function () {
            const db = request.result;

            function doMealProcessing() {
                const foodTransaction = db.transaction("foods", "readonly");
                const foodStore = foodTransaction.objectStore("foods");
                const foodList = foodStore.getAll();

                foodList.onsuccess = function () {
                    for (let i = 0; i < temp_ingredient_list.length; i++) {
                        let servingVal = parseFloat(temp_serving_list[i].value);
                        if (isNaN(servingVal) || servingVal < 1) {
                            servingVal = 1;
                            temp_serving_list[i].value = '1';
                        }

                        if ((temp_ingredient_list[i].value !== '') && (temp_serving_list[i].value !== '')){
                            let ingredientExists = false;
                            let matchedName = '';
                            for (let f = 0; f < foodList.result.length; f++) {
                                if (foodList.result[f].name.toLowerCase() === temp_ingredient_list[i].value.toLowerCase()) {
                                    matchedName = foodList.result[f].name;
                                    ingredient_list.push(matchedName);
                                    serving_list.push(String(servingVal));
                                    ingredientExists = true;
                                    break;
                                }
                            }

                            if (ingredientExists === false) {
                                let notRegistered = temp_ingredient_list[i].value;
                                error = document.getElementsByClassName('error');
                                for (i = 0; i < error.length; i++) {
                                    error[i].innerHTML = `${notRegistered} is not registered, and therefore cannot be included in this meal.`;
                                }
                                return
                            }
                        }
                        else {
                            missingInformation();
                            return
                        }
                    }

                    let mergedIngredients = [];
                    let mergedServings = [];
                    for (let i = 0; i < ingredient_list.length; i++) {
                        let dupeIndex = mergedIngredients.indexOf(ingredient_list[i]);
                        if (dupeIndex !== -1) {
                            mergedServings[dupeIndex] = String(parseFloat(mergedServings[dupeIndex]) + parseFloat(serving_list[i]));
                        } else {
                            mergedIngredients.push(ingredient_list[i]);
                            mergedServings.push(serving_list[i]);
                        }
                    }
                    ingredient_list = mergedIngredients;
                    serving_list = mergedServings;

                    let ingredientsDone = 0;
                    let totalCals = 0, totalCarbs = 0, totalProtein = 0, totalFat = 0;

                    for (let i = 0; i < ingredient_list.length; i++) {
                        const food = foodStore.get(ingredient_list[i]);
                        food.onsuccess = function () {
                            totalCals += parseFloat(food.result.cals) * parseFloat(serving_list[i]);
                            totalCarbs += parseFloat(food.result.carbs) * parseFloat(serving_list[i]);
                            totalProtein += parseFloat(food.result.protein) * parseFloat(serving_list[i]);
                            totalFat += parseFloat(food.result.fat) * parseFloat(serving_list[i]);

                            ingredientsDone++;
                            if (ingredientsDone === ingredient_list.length) {
                                var mealOldName = isEditing ? editingItem.originalName : null;
                                var mealNameChanged = isEditing && (name !== mealOldName);

                                const mealTransaction = db.transaction("meals", "readwrite");
                                const mealStore = mealTransaction.objectStore("meals");

                                if (mealNameChanged) {
                                    mealStore.delete(mealOldName);
                                }
                                mealStore.put({
                                    name: name,
                                    ingredient_list: ingredient_list,
                                    serving_list: serving_list,
                                    cals: Math.round(totalCals * 100) / 100,
                                    carbs: Math.round(totalCarbs * 100) / 100,
                                    protein: Math.round(totalProtein * 100) / 100,
                                    fat: Math.round(totalFat * 100) / 100
                                });

                                mealTransaction.oncomplete = function () {
                                    if (isEditing) {
                                        if (typeof viewedItems !== 'undefined') {
                                            if (mealNameChanged && viewedItems.has("meal:" + mealOldName)) {
                                                viewedItems.delete("meal:" + mealOldName);
                                            }
                                            viewedItems.set("meal:" + name, {
                                                name: name, type: "meal",
                                                ingredient_list: ingredient_list,
                                                serving_list: serving_list,
                                                cals: Math.round(totalCals * 100) / 100,
                                                carbs: Math.round(totalCarbs * 100) / 100,
                                                protein: Math.round(totalProtein * 100) / 100,
                                                fat: Math.round(totalFat * 100) / 100
                                            });
                                        }

                                        if (mealNameChanged) {
                                            renameMealInTodaysNutrition(mealOldName, name, db, function () {
                                                updateTodaysNutritionAfterEdit([name], db, function () {
                                                    renderNutritionViewer();
                                                    loadCachedFoods(function () {
                                                        setNutritionLists();
                                                        populateAllIngredientDropdowns();
                                                    });
                                                });
                                            });
                                        } else {
                                            updateTodaysNutritionAfterEdit([name], db, function () {
                                                renderNutritionViewer();
                                                loadCachedFoods(function () {
                                                    setNutritionLists();
                                                    populateAllIngredientDropdowns();
                                                });
                                            });
                                        }
                                    } else {
                                        db.close();
                                        if (typeof loadCachedFoods === 'function') {
                                            loadCachedFoods(function () {
                                                setNutritionLists();
                                                populateAllIngredientDropdowns();
                                            });
                                        } else {
                                            setNutritionLists();
                                        }
                                    }
                                };
                            }
                        };
                    }

                    document.getElementById("meal_name").value = '';
                    for (let j = 0; j < temp_ingredient_list.length; j++) {
                        temp_ingredient_list[j].value = '';
                        temp_serving_list[j].value = '1';
                    }
                    closeForm(form);
                };
            }

            var mealNeedsNameCheck = !isEditing || (isEditing && name !== editingItem.originalName);

            if (mealNeedsNameCheck) {
                const checkTransaction = db.transaction(["foods", "meals"], "readonly");
                const cFoodStore = checkTransaction.objectStore("foods");
                const cMealStore = checkTransaction.objectStore("meals");
                const foodCheck = cFoodStore.get(name);
                const mealCheck = cMealStore.get(name);

                let nameExists = false;
                foodCheck.onsuccess = function () { if (foodCheck.result) nameExists = true; };
                mealCheck.onsuccess = function () { if (mealCheck.result) nameExists = true; };

                checkTransaction.oncomplete = function () {
                    if (nameExists) {
                        let error = document.getElementsByClassName('error');
                        for (let i = 0; i < error.length; i++) {
                            error[i].innerHTML = "A food or meal with this name already exists.";
                        }
                        db.close();
                        return;
                    }
                    doMealProcessing();
                };
            } else {
                doMealProcessing();
            }
        };
    }

    /**
      
    * In the logNutritionForm case, the name and number of servings are intialized and checked
     to see if they contain data. If they don't, the user is prompted with the "missing information" error.

    * If the data is accounted for, the database is opened and the program begins to search
      for a food that matches the name the user inputted in the food store.

    * If it cannot locate one, it will then search for a meal that matches the name in the meal store.

    * If no match is found for the name in either of the stores, the user is prompted with a
      "food/meal not in registry" error.

    */

    else if (form === logNutritionForm) {
        let name = document.getElementById("log_nutrition_name").value;
        let numServings = parseFloat(document.getElementById("log_nutrition_servings").value);
        if (isNaN(numServings) || numServings < 1) {
            numServings = 1;
        }
        
        const request = openDatabase();
        request.onsuccess = function () {
            console.log("Database opened successfully");
            const db = request.result;

            const foodTransaction = db.transaction("foods", "readwrite");
            const foodStore = foodTransaction.objectStore("foods");
            const foodStoreList = foodStore.getAll();

            foodStoreList.onsuccess = function () {
                let foodFound = false;
                for (let i = 0; i < foodStoreList.result.length; i++) {
                    if (name === foodStoreList.result[i].name) {
                        foodFound = true;
                        break
                    }
                }

                if (foodFound === true) {
                /**
                    * If a food is found:
      
                    * The program sets the eaten_today information currently in the nutrition log
                      to a string value called "currentLog". It does the same for the current values of total calories,
                      total carbs, total protein, and total fat, except the calories are stored as an int and the micronutrients
                      are stored as floats.
            
                    * Then, using those retrieved and set values, the program increments the innerHTML for those values based
                      on the food's nutrition facts and number of servings.
                    
                    * Lastly, the nutrition store is opened and all of those updated innerHTML values are inserted into the store.
                      The logNutritionForm is then reset so that its values are empty and the form is closed.

                */
                    const foodToLog = foodStore.get(name);
                    foodToLog.onsuccess = function () {

                        const nutritionTransaction = db.transaction("nutrition", "readwrite");
                        const nutritionStore = nutritionTransaction.objectStore("nutrition");

                        const eatenToday = nutritionStore.get('eatenToday');
                        eatenToday.onsuccess = function () {
                            const entry = {
                                name: foodToLog.result.name,
                                servings: parseFloat(numServings),
                                servingSize: foodToLog.result.serving_size,
                                measurementUnit: foodToLog.result.measurement_unit,
                                ingredients: null,
                                cals: Math.round(parseFloat(foodToLog.result.cals) * parseFloat(numServings) * 100) / 100,
                                carbs: Math.round(parseFloat(foodToLog.result.carbs) * parseFloat(numServings) * 100) / 100,
                                protein: Math.round(parseFloat(foodToLog.result.protein) * parseFloat(numServings) * 100) / 100,
                                fat: Math.round(parseFloat(foodToLog.result.fat) * parseFloat(numServings) * 100) / 100,
                                type: "food"
                            };
                            if (eatenToday.result === undefined) {
                                nutritionStore.put({ name: "eatenToday", content: [entry] });
                            } else {
                                eatenToday.result.content.push(entry);
                                nutritionStore.put({ name: "eatenToday", content: eatenToday.result.content });
                            }
                        };

                        const totalCals = parseFloat(document.getElementById("total_calories").innerHTML);
                        const totalCarbs = parseFloat(document.getElementById("total_carbs").innerHTML);
                        const totalProtein = parseFloat(document.getElementById("total_protein").innerHTML);
                        const totalFat = parseFloat(document.getElementById("total_fat").innerHTML);        

                        nutritionStore.put({ name: "totalCals", content: Math.round((totalCals + parseFloat(foodToLog.result.cals) * numServings) * 100) / 100 });
                        nutritionStore.put({ name: "totalCarbs", content: Math.round((totalCarbs + parseFloat(foodToLog.result.carbs) * numServings) * 100) / 100 });
                        nutritionStore.put({ name: "totalProtein", content: Math.round((totalProtein + parseFloat(foodToLog.result.protein) * numServings) * 100) / 100 });
                        nutritionStore.put({ name: "totalFat", content: Math.round((totalFat + parseFloat(foodToLog.result.fat) * numServings) * 100) / 100 });
                        nutritionStore.put({ name: "currentDate", content: String(document.getElementById('current_date').innerHTML) })

                        nutritionTransaction.oncomplete = function () {
                            setNutritionToday();
                        };
                    };

                    document.getElementById("log_nutrition_name").value = '';
                    document.getElementById("log_nutrition_servings").value = '1';
                    closeForm(form);
                }
                else {
                    const mealTransaction = db.transaction("meals", "readwrite");
                    const mealStore = mealTransaction.objectStore("meals");
                    const mealStoreList = mealStore.getAll(); 

                    mealStoreList.onsuccess = function () {
                        let mealFound = false;
                        for (let i = 0; i < mealStoreList.result.length; i++) {
                            if (name === mealStoreList.result[i].name) {
                                mealFound = true;
                                break
                            }
                        }

                        if (mealFound === true) {
                        /** 
                            * If a meal is found:

                            * The program sets the same variables and information as it would have in the foodFound scenario.
                  
                            * Then it iterates through each ingredient, or food, in the ingredient_list. This is so that the program
                              can format a string that will list all of the ingredients of the meal when it is logged.

                            * Once that is complete, the program increments the innerHTML values for the previously retrieved variables
                              in the same way it would do for the foodFound scenario, but this time incrememting with the meal's nutrition facts.
                  
                            * Lastly, the nutrition store is opened and all of those updated innerHTML values are inserted into the store.
                              The logNutritionForm is then reset so that its values are empty and the form is closed.
                        */
                            const mealToLog = mealStore.get(name);
                            mealToLog.onsuccess = function () {

                                const nutritionTransaction = db.transaction("nutrition", "readwrite");
                                const nutritionStore = nutritionTransaction.objectStore("nutrition");

                                const eatenToday = nutritionStore.get('eatenToday');
                                eatenToday.onsuccess = function () {
                                    let ingredientStrings = [];
                                    for (let i = 0; i < mealToLog.result.ingredient_list.length; i++) {
                                        ingredientStrings.push(mealToLog.result.serving_list[i] + "x " + mealToLog.result.ingredient_list[i]);
                                    }
                                    const entry = {
                                        name: mealToLog.result.name,
                                        servings: parseFloat(numServings),
                                        servingSize: null,
                                        measurementUnit: null,
                                        ingredients: ingredientStrings,
                                        cals: Math.round(parseFloat(mealToLog.result.cals) * parseFloat(numServings) * 100) / 100,
                                        carbs: Math.round(parseFloat(mealToLog.result.carbs) * parseFloat(numServings) * 100) / 100,
                                        protein: Math.round(parseFloat(mealToLog.result.protein) * parseFloat(numServings) * 100) / 100,
                                        fat: Math.round(parseFloat(mealToLog.result.fat) * parseFloat(numServings) * 100) / 100,
                                        type: "meal"
                                    };
                                    if (eatenToday.result === undefined) {
                                        nutritionStore.put({ name: "eatenToday", content: [entry] });
                                    } else {
                                        eatenToday.result.content.push(entry);
                                        nutritionStore.put({ name: "eatenToday", content: eatenToday.result.content });
                                    }
                                };

                                const totalCals = parseFloat(document.getElementById("total_calories").innerHTML);
                                const totalCarbs = parseFloat(document.getElementById("total_carbs").innerHTML);
                                const totalProtein = parseFloat(document.getElementById("total_protein").innerHTML);
                                const totalFat = parseFloat(document.getElementById("total_fat").innerHTML);
                                
                                nutritionStore.put({ name: "totalCals", content: Math.round((totalCals + parseFloat(mealToLog.result.cals) * numServings) * 100) / 100 });
                                nutritionStore.put({ name: "totalCarbs", content: Math.round((totalCarbs + parseFloat(mealToLog.result.carbs) * numServings) * 100) / 100 });
                                nutritionStore.put({ name: "totalProtein", content: Math.round((totalProtein + parseFloat(mealToLog.result.protein) * numServings) * 100) / 100 });
                                nutritionStore.put({ name: "totalFat", content: Math.round((totalFat + parseFloat(mealToLog.result.fat) * numServings) * 100) / 100 });
                                nutritionStore.put({ name: "currentDate", content: String(document.getElementById('current_date').innerHTML) })

                                nutritionTransaction.oncomplete = function () {
                                    setNutritionToday();
                                };
                            };
                            document.getElementById("log_nutrition_name").value = '';
                            document.getElementById("log_nutrition_servings").value = '1';
                            closeForm(form);
                        }
                        else {
                            error = document.getElementsByClassName('error');
                            for (i = 0; i < error.length; i++) {
                                error[i].innerHTML = "The food/meal you entered is not registered.";
                            }
                            return
                        }
                    };
                }
            }
        }
    }

    else if (form === removeNutritionForm) {
        let name = document.getElementById("remove_nutrition_name").value;
        let index = parseInt(document.getElementById("remove_nutrition_index").value);

        const request = openDatabase();
        request.onsuccess = function () {
            const db = request.result;
            const nutritionTransaction = db.transaction("nutrition", "readwrite");
            const nutritionStore = nutritionTransaction.objectStore("nutrition");
            const eatenToday = nutritionStore.get("eatenToday");

            eatenToday.onsuccess = function () {
                if (isNaN(index) || index < 0 || index >= eatenToday.result.content.length) return;

                const entry = eatenToday.result.content[index];
                if (entry.name !== name) return;

                eatenToday.result.content.splice(index, 1);
                nutritionStore.put({ name: "eatenToday", content: eatenToday.result.content });

                const totalCals = parseFloat(document.getElementById("total_calories").innerHTML);
                const totalCarbs = parseFloat(document.getElementById("total_carbs").innerHTML);
                const totalProtein = parseFloat(document.getElementById("total_protein").innerHTML);
                const totalFat = parseFloat(document.getElementById("total_fat").innerHTML);

                nutritionStore.put({ name: "totalCals", content: Math.round((totalCals - entry.cals) * 100) / 100 });
                nutritionStore.put({ name: "totalCarbs", content: Math.round((totalCarbs - entry.carbs) * 100) / 100 });
                nutritionStore.put({ name: "totalProtein", content: Math.round((totalProtein - entry.protein) * 100) / 100 });
                nutritionStore.put({ name: "totalFat", content: Math.round((totalFat - entry.fat) * 100) / 100 });

                document.getElementById("remove_nutrition_name").value = '';
                document.getElementById("remove_nutrition_index").value = '';

                nutritionTransaction.oncomplete = function () {
                    setNutritionToday();
                };
            }
        }
    }
}