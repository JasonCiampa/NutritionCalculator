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
        
                for (let i = 0; i < foodStoreList.result.length; i++) {
                    foodList.push(foodStoreList.result[i].name);
                    document.getElementById('list_of_foods').innerHTML += (foodList[i]) + "<br>";
                }
            };
        
            mealStoreList.onsuccess = function () {
                document.getElementById('list_of_meals').innerHTML = '';
                for (let i = 0; i < mealStoreList.result.length; i++) {
                    mealList.push(mealStoreList.result[i].name);
                    document.getElementById('list_of_meals').innerHTML += (mealList[i]) + "<br>";
                }
            };
        };
}

window.addEventListener("load", function() {
    setNutritionLists();
});