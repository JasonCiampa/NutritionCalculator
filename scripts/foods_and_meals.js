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
                document.getElementById('list_of_foods').innerHTML = '';
                foodList = [];

                for (let i = 0; i < foodStoreList.result.length; i++) {
                    foodList.push(foodStoreList.result[i]);
                    document.getElementById('list_of_foods').innerHTML += (foodList[i].name) + "<br>";
                    // IF WE MAKE EACH ADDITION TO THE INNERHTML A BUTTON RATHER THAN A SINGLE STRING, CAN WE DO THE HOVER/EXPAND FOR NUTRITION INFORMATION?
                }

                foodTransaction.oncomplete = function () {
                    db.close();
                  };
            };
        
            mealStoreList.onsuccess = function () {
                document.getElementById('list_of_meals').innerHTML = '';
                mealList = [];

                for (let i = 0; i < mealStoreList.result.length; i++) {
                    mealList.push(mealStoreList.result[i]);
                    document.getElementById('list_of_meals').innerHTML += (mealList[i].name) + "<br>";
                }

                mealTransaction.oncomplete = function () {
                    db.close();
                };
            };
        };
}

window.addEventListener("load", function() {
    setNutritionLists();
});