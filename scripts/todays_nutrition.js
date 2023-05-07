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
                    document.getElementById('eaten_today').innerHTML = '';
                    eatenTodayList = [];

                    for (let i = 0; i < eatenToday.result.content.length; i++){
                        eatenTodayList.push(eatenToday.result.content[i]);
                        document.getElementById('eaten_today').innerHTML += (eatenTodayList[i]) + "<br>";
                        // IF WE MAKE EACH ADDITION TO THE INNERHTML A BUTTON RATHER THAN A SINGLE STRING, CAN WE DO THE HOVER/EXPAND FOR NUTRITION INFORMATION?
                    }
                }
            }
            else {
                document.getElementById('total_calories').innerHTML = 0;
                document.getElementById('total_carbs').innerHTML = 0;
                document.getElementById('total_protein').innerHTML = 0;
                document.getElementById('total_fat').innerHTML = 0;
                document.getElementById('eaten_today').innerHTML = '';
            }
        }
    };
}

// Calls the function whenever the page loads
window.addEventListener("load", function() {
    currentDate();
    setNutritionToday();
});
