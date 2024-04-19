function setNutritionLists() {
    /**
    
    * This function gathers all of the registered foods and meals from the database
      and organizes them into lists that are seen on the "Foods and Meals" page.
    
    * The lists are updated everytime the page loads (or is refreshed), but
      only when the current page is the "Foods and Meals" page.
    
    */
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
                        const nutritionViewer = document.getElementById("nutritionViewer");                                                                                 // Store a reference to the section element with the id nutritionViewer
                        
                        nutritionViewer.innerHTML = ""                                                                                                                      // Reset the Nutrition Viewer
                        nutritionViewer.appendChild(document.createElement("h3")).innerHTML = "View Nutrition"                                                              // Add back the first default element
                        nutritionViewer.appendChild(document.createElement("h5")).innerHTML = "Click any of the foods or meals below to view their nutrition"               // Add back the second default element
                        nutritionViewer.appendChild(document.createElement("br"));                                                                                          // Append a line break to the foodButtons unordered list (so that buttons stack)
                        nutritionViewer.appendChild(document.createElement("h3")).innerHTML = food.name;                                                                    // Create a new h4 element, set it's text to be the name of the food, and store it as a child of the nutritionInformation list

                        let nutritionInformation = document.createElement("ul");                                                                                            // Create a new Unordered List element
                        nutritionInformation.id = "nutritionInformation";                                                                                                   // Give the nutritionInformation an id of "nutritionInformation"
                        
                        nutritionInformation.appendChild(document.createElement("li")).innerHTML = "Serving Size: " + food.serving_size + " " + food.measurement_unit;      // Create a new List Item element, set it's text to be the serving size of this food, and store it as a child of the nutritionInformation list
                        nutritionInformation.appendChild(document.createElement("li")).innerHTML = "Calories: " + food.cals;                                                // Create a new List Item element, set it's text to be the number of calories this food contains, and store it as a child of the nutritionInformation list
                        nutritionInformation.appendChild(document.createElement("li")).innerHTML = "Fat: " + food.fat;                                                      // Create a new List Item element, set it's text to be the number of grams of fat this food contains, and store it as a child of the nutritionInformation list
                        nutritionInformation.appendChild(document.createElement("li")).innerHTML = "Carbs: " + food.carbs;                                                  // Create a new List Item element, set it's text to be the number of grams of carbs this food contains, and store it as a child of the nutritionInformation list
                        nutritionInformation.appendChild(document.createElement("li")).innerHTML = "Protein: " + food.protein;                                              // Create a new List Item element, set it's text to be the number of grams of protein this food contains, and store it as a child of the nutritionInformation list

                        nutritionViewer.appendChild(nutritionInformation);                                                                                                  // Store the nutritionInformation list as a child of the Button
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
                        const nutritionViewer = document.getElementById("nutritionViewer");                                                                                 // Store a reference to the section element with the id nutritionViewer
                        
                        nutritionViewer.innerHTML = ""                                                                                                                      // Reset the Nutrition Viewer
                        nutritionViewer.appendChild(document.createElement("h3")).innerHTML = "View Nutrition"                                                              // Add back the first default element
                        nutritionViewer.appendChild(document.createElement("h5")).innerHTML = "Click any of the meals or meals below to view their nutrition"               // Add back the second default element
                        nutritionViewer.appendChild(document.createElement("br"));                                                                                          // Append a line break to the mealButtons unordered list (so that buttons stack)
                        nutritionViewer.appendChild(document.createElement("h3")).innerHTML = meal.name;                                                                    // Create a new h4 element, set it's text to be the name of the meal, and store it as a child of the nutritionInformation list

                        let nutritionInformation = document.createElement("ul");                                                                                            // Create a new Unordered List element
                        nutritionInformation.id = "nutritionInformation";                                                                                                   // Give the nutritionInformation an id of "nutritionInformation"
                        
                        nutritionInformation.appendChild(document.createElement("li")).innerHTML = "Calories: " + meal.cals;                                                // Create a new List Item element, set it's text to be the number of calories this meal contains, and store it as a child of the nutritionInformation list
                        nutritionInformation.appendChild(document.createElement("li")).innerHTML = "Fat: " + meal.fat;                                                      // Create a new List Item element, set it's text to be the number of grams of fat this meal contains, and store it as a child of the nutritionInformation list
                        nutritionInformation.appendChild(document.createElement("li")).innerHTML = "Carbs: " + meal.carbs;                                                  // Create a new List Item element, set it's text to be the number of grams of carbs this meal contains, and store it as a child of the nutritionInformation list
                        nutritionInformation.appendChild(document.createElement("li")).innerHTML = "Protein: " + meal.protein;                                              // Create a new List Item element, set it's text to be the number of grams of protein this meal contains, and store it as a child of the nutritionInformation list

                        nutritionViewer.appendChild(nutritionInformation);                                                                                                  // Store the nutritionInformation list as a child of the Button
                        nutritionViewer.appendChild(document.createElement("br"));                                                                                          // Append a line break to the mealButtons unordered list (so that buttons stack)
                        
                        nutritionViewer.appendChild(document.createElement("h4")).innerHTML = "Ingredients:";                                                               // Create an h4 element, set its text, and store it as a child of the nutritionViewer
                        let ingredientsList = document.createElement("ul");                                                                                                 // Create an unordered list element to store the Meal's ingredients in
                        ingredientsList.id = "ingredientsList";

                        for (let i = 0; i < meal.ingredient_list.length; i++) {                                                                                             // For every ingredient in this meal...
                            ingredientsList.appendChild(document.createElement("li")).innerHTML = meal.serving_list[i] + "x " + meal.ingredient_list[i]                         // Create a list item, set its text to the number of servings, and store it in the ingredientsList
                        }

                        nutritionViewer.appendChild(ingredientsList)                                                                                                        // Append the ingredients list as a child of nutritionViewer
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

window.addEventListener("load", function() {
    setNutritionLists();
});