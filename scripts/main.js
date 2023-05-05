function currentYear() {
    let d = new Date();
    document.getElementById('copyright').innerHTML = d.getFullYear();
}

function currentDate() {
    let d = new Date();
    const month = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    document.getElementById('current_date').innerHTML = (String(month[d.getMonth()]) + ' ' + String(d.getDate()) + ',' + ' ' + String(d.getFullYear()));
}

window.onload = function() {
    currentYear();
    var path = window.location.pathname;

    if (path === "/todays_nutrition.html") {
        currentDate();
    }
}

// Code received from https://masteringjs.io/tutorials/fundamentals/wait-1-second-then
function delay(time) {
    return new Promise(resolve => setTimeout(resolve, time));
  }

// function checkBrowserSize()  {
//     if (window.innerWidth >= 767) {
//         let nav_menu = document.getElementById('navigation_menu');
//         nav_menu.getElementsByTagName('ul').style.display = 'flex';
//         console.log('hheahaha');
//     }
// }

// window.addEventListener("resize", checkBrowserSize());
  
const fullscreen_nav_menu = document.getElementById('navigation_menu');
const displayButton = document.getElementById('show_nav_menu_button');

function slideMenu() {
    let visibility = fullscreen_nav_menu.getAttribute('data-visible');

    if (visibility === 'false') {
        document.getElementById('navigation_menu').style.display = 'block';
        delay(1).then(() => fullscreen_nav_menu.setAttribute('data-visible', 'true'));
        displayButton.setAttribute('data-visible', 'true');
    }
    else {
        fullscreen_nav_menu.setAttribute('data-visible', 'false');
        displayButton.setAttribute('data-visible', 'false');
        delay(300).then(() => document.getElementById('navigation_menu').style.display = 'none');
    }
}

displayButton.addEventListener('click', slideMenu);