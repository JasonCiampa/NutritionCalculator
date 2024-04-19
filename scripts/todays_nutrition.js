function currentDate() {
    let d = new Date();
    const month = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    document.getElementById('current_date').innerHTML = (String(month[d.getMonth()]) + ' ' + String(d.getDate()) + ',' + ' ' + String(d.getFullYear()));
}

function setNutritionToday() {
    /**
    
    * This function gathers all of the information for calories, carbs, protein, and fat from the database
      and updates their values in the innerHTML.
    
    * The lists are updated everytime the "Today's Nutrition" page loads (or is refreshed).
    
    */
    const request = openDatabase();
    request.onsuccess = function () {
        console.log("Database opened successfully");
        const db = request.result;
        
        const nutritionTransaction = db.transaction("nutrition", "readwrite");
        const nutritionStore = nutritionTransaction.objectStore("nutrition");
                
        const currentDate = nutritionStore.get("currentDate");
    
        currentDate.onsuccess = function () {
            if ((currentDate.result != undefined) && (currentDate.result.content === document.getElementById('current_date').innerHTML)) {
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
                    const foodsAndMealsEatenToday = document.getElementById('eaten_today');
                    foodsAndMealsEatenToday.innerHTML = ""

                    for (let i = 0; i < eatenToday.result.content.length; i++){

                        const button = document.createElement("button");
                        button.innerHTML = eatenToday.result.content[i]

                        button.onclick = () => {
                            let currentCharIndex = 1;

                            while (eatenToday.result.content[i].slice(currentCharIndex - 1, currentCharIndex) != "x") {
                                currentCharIndex++; 
                            }

                            let nameIndexStart = currentCharIndex + 1;
                            currentCharIndex += 2;


                            while (eatenToday.result.content[i].slice(currentCharIndex - 1, currentCharIndex) != "(") {
                                currentCharIndex++; 
                            }

                            let foodName = eatenToday.result.content[i].slice(nameIndexStart, currentCharIndex - 2)

                            document.getElementById("remove_nutrition_name").value = foodName;
                            processForm(removeNutritionForm);
                            setNutritionToday();
                        }

                        foodsAndMealsEatenToday.appendChild(button);
                        foodsAndMealsEatenToday.appendChild(document.createElement("br"));
                    }
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
            const foodList = document.getElementById('food_list');                                                                                              // Get a reference to the section element with the id food_list
            foodList.innerHTML = "";
            foodList.appendChild(document.createElement("h3")).innerHTML = "Foods";                                                                             // Create the "Foods" Text
            foodList.appendChild(document.createElement("br"));                                                                                                 // Append a line break to the foodButtons unordered list (so that buttons stack)

            const foodButtons = document.createElement("ul");                                                                                                   // Create an Unordered List element to store the Buttons for each Food
            foodButtons.id = "foodButtons";                                                                                                                     // Set the id for the foodButtons list to be "foodButtons"
            
            for (let i = 0; i < foodStoreList.result.length; i++) {                                                                                             // For every Food registered to the database...
                const food = foodStoreList.result[i];                                                                                                               // Store a reference to the Food of this iteration
                
                const button = document.createElement("button");                                                                                                    // Create a new Button
                button.innerHTML = food.name;                                                                                                                       // Set the Button's text to the food's name
                
                button.onclick = () => {                                                                                                                            // When the Button is clicked...
                    document.getElementById("log_nutrition_name").value = food.name
                    displayForm(logNutritionForm)
                };


                foodButtons.appendChild(button);                                                                                                                // Append the Button to the foodButtons unordered list
                foodButtons.appendChild(document.createElement("br"));                                                                                          // Append a line break to the foodButtons unordered list (so that buttons stack)
                foodButtons.appendChild(document.createElement("br"));                                                                                          // Append a line break to the foodButtons unordered list (so that buttons stack)
            }

            foodTransaction.oncomplete = function () {
                db.close();                                                                                                                                     // Close the database
            };

            foodList.appendChild(foodButtons);                                                                                                                  // Add all of the newly created Food Buttons to the foodList
        };



        mealStoreList.onsuccess = function () {
            const mealList = document.getElementById('meal_list');                                                                                              // Get a reference to the section element with the id meal_list
            mealList.innerHTML = "";
            mealList.appendChild(document.createElement("h3")).innerHTML = "Meals";                                                                             // Create the "Meals" Text
            mealList.appendChild(document.createElement("br"));                                                                                                 // Append a line break to the meal list unordered list

            const mealButtons = document.createElement("ul");                                                                                                   // Create an Unordered List element to store the Buttons for each meal
            mealButtons.id = "mealButtons";                                                                                                                     // Set the id for the mealButtons list to be "mealButtons"
            
            for (let i = 0; i < mealStoreList.result.length; i++) {                                                                                             // For every meal registered to the database...
                const meal = mealStoreList.result[i];                                                                                                               // Store a reference to the meal of this iteration
                
                const button = document.createElement("button");                                                                                                    // Create a new Button
                button.innerHTML = meal.name;                                                                                                                       // Set the Button's text to the meal's name
                
                button.onclick = () => {                                                                                                                            // When the Button is clicked...
                    document.getElementById("log_nutrition_name").value = meal.name
                    displayForm(logNutritionForm)
                };

                mealButtons.appendChild(button);                                                                                                                // Append the Button to the mealButtons unordered list
                mealButtons.appendChild(document.createElement("br"));                                                                                          // Append a line break to the mealButtons unordered list (so that buttons stack)
                mealButtons.appendChild(document.createElement("br"));                                                                                          // Append a line break to the mealButtons unordered list (so that buttons stack)
            }

            mealTransaction.oncomplete = function () {
                db.close();                                                                                                                                     // Close the database
            };

            mealList.appendChild(mealButtons);                                                                                                                  // Add all of the newly created meal Buttons to the mealList
        };



    };
}

// Calls the function whenever the page loads
window.addEventListener("load", function() {
    currentDate();
    setNutritionToday();
    loadFoodsAndMeals();
});
