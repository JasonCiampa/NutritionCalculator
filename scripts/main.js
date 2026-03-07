(function() {
    var theme = localStorage.getItem('colorScheme') || 'blue';
    document.documentElement.setAttribute('data-theme', theme);

    if (navigator.storage && navigator.storage.persist) {
        navigator.storage.persist();
    }
})();

function currentYear() {
    let d = new Date();
    document.getElementById('copyright').innerHTML = d.getFullYear();
}

window.onload = function() {
    currentYear();
    checkBackupReminder();
}

function checkBackupReminder() {
    var dismissed = sessionStorage.getItem('backupReminderDismissed');
    if (dismissed) return;

    var lastModified = localStorage.getItem('lastDataModified');
    if (!lastModified) return;

    var modifiedTime = new Date(lastModified).getTime();
    var daysSinceModified = (Date.now() - modifiedTime) / (1000 * 60 * 60 * 24);
    if (daysSinceModified < 7) return;

    var lastExport = localStorage.getItem('lastExportDate');
    if (lastExport && new Date(lastExport).getTime() >= modifiedTime) return;

    var banner = document.createElement('div');
    banner.id = 'backup_reminder_banner';

    var msg = document.createElement('span');
    if (!lastExport) {
        msg.textContent = "You haven't backed up your data yet. Export a backup in Settings to keep your foods, meals, and regimens safe.";
    } else {
        var d = new Date(lastExport);
        msg.textContent = "Your data has changed since your last backup (" + d.toLocaleDateString() + "). Consider exporting a new backup in Settings.";
    }

    var actions = document.createElement('span');
    actions.className = 'backup-reminder-actions';

    var settingsLink = document.createElement('a');
    settingsLink.href = 'settings.html';
    settingsLink.textContent = 'Go to Settings';
    settingsLink.className = 'backup-reminder-link';

    var dismissBtn = document.createElement('button');
    dismissBtn.textContent = 'Dismiss';
    dismissBtn.className = 'backup-reminder-dismiss';
    dismissBtn.addEventListener('click', function () {
        sessionStorage.setItem('backupReminderDismissed', '1');
        banner.remove();
    });

    actions.appendChild(settingsLink);
    actions.appendChild(dismissBtn);
    banner.appendChild(msg);
    banner.appendChild(actions);

    document.body.insertBefore(banner, document.body.firstChild);
}

function delay(time) {
    return new Promise(resolve => setTimeout(resolve, time));
}

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

function getEnabledMicronutrients() {
    try {
        var stored = localStorage.getItem('enabledMicronutrients');
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        return [];
    }
}

var MICRONUTRIENT_DEFINITIONS = [
    { key: 'saturatedFat', label: 'Saturated Fat', unit: 'g', group: 'Fats' },
    { key: 'transFat', label: 'Trans Fat', unit: 'g', group: 'Fats' },
    { key: 'cholesterol', label: 'Cholesterol', unit: 'mg', group: 'Minerals' },
    { key: 'sodium', label: 'Sodium', unit: 'mg', group: 'Minerals' },
    { key: 'fiber', label: 'Dietary Fiber', unit: 'g', group: 'Carb Details' },
    { key: 'sugars', label: 'Total Sugars', unit: 'g', group: 'Carb Details' },
    { key: 'addedSugars', label: 'Added Sugars', unit: 'g', group: 'Carb Details' },
    { key: 'vitaminD', label: 'Vitamin D', unit: 'mcg', group: 'Vitamins' },
    { key: 'calcium', label: 'Calcium', unit: 'mg', group: 'Minerals' },
    { key: 'iron', label: 'Iron', unit: 'mg', group: 'Minerals' },
    { key: 'potassium', label: 'Potassium', unit: 'mg', group: 'Minerals' },
    { key: 'vitaminA', label: 'Vitamin A', unit: 'mcg', group: 'Vitamins' },
    { key: 'vitaminC', label: 'Vitamin C', unit: 'mg', group: 'Vitamins' },
    { key: 'vitaminE', label: 'Vitamin E', unit: 'mg', group: 'Vitamins' },
    { key: 'vitaminK', label: 'Vitamin K', unit: 'mcg', group: 'Vitamins' },
    { key: 'thiamin', label: 'Thiamin (B1)', unit: 'mg', group: 'Vitamins' },
    { key: 'riboflavin', label: 'Riboflavin (B2)', unit: 'mg', group: 'Vitamins' },
    { key: 'niacin', label: 'Niacin (B3)', unit: 'mg', group: 'Vitamins' },
    { key: 'vitaminB6', label: 'Vitamin B6', unit: 'mg', group: 'Vitamins' },
    { key: 'folate', label: 'Folate', unit: 'mcg', group: 'Vitamins' },
    { key: 'vitaminB12', label: 'Vitamin B12', unit: 'mcg', group: 'Vitamins' },
    { key: 'phosphorus', label: 'Phosphorus', unit: 'mg', group: 'Minerals' },
    { key: 'magnesium', label: 'Magnesium', unit: 'mg', group: 'Minerals' },
    { key: 'zinc', label: 'Zinc', unit: 'mg', group: 'Minerals' }
];

function getMicroDef(key) {
    for (var i = 0; i < MICRONUTRIENT_DEFINITIONS.length; i++) {
        if (MICRONUTRIENT_DEFINITIONS[i].key === key) return MICRONUTRIENT_DEFINITIONS[i];
    }
    return null;
}

function getDecimalPrecision() {
    var stored = localStorage.getItem('decimalPrecision');
    if (stored === '0' || stored === '1' || stored === '2') return parseInt(stored);
    return 2;
}

function formatNumber(value) {
    var num = parseFloat(value);
    if (isNaN(num)) return value;
    return num.toFixed(getDecimalPrecision());
}

function markDataModified() {
    localStorage.setItem('lastDataModified', new Date().toISOString());
}

function buildMicroWarningIcon(item, enabledMicros) {
    if (!enabledMicros || enabledMicros.length === 0) return null;

    var isMeal = item.type === 'meal' || item.ingredient_list != null;
    var missing = [];

    if (isMeal && item._missingMicros && item._missingMicros.length > 0) {
        for (var i = 0; i < enabledMicros.length; i++) {
            if (item._missingMicros.indexOf(enabledMicros[i]) !== -1) {
                var def = getMicroDef(enabledMicros[i]);
                if (def) missing.push(def.label);
            }
        }
    } else if (!isMeal) {
        for (var i = 0; i < enabledMicros.length; i++) {
            var key = enabledMicros[i];
            if (item[key] == null || item[key] === '' || item[key] === undefined) {
                var def = getMicroDef(key);
                if (def) missing.push(def.label);
            }
        }
    }

    if (missing.length === 0) return null;

    var icon = document.createElement('span');
    icon.className = 'micro-warning-icon';
    icon.setAttribute('tabindex', '0');
    icon.innerHTML = '&#9888;';
    var tooltip = document.createElement('span');
    tooltip.className = 'micro-warning-tooltip';
    if (isMeal) {
        tooltip.textContent = "This meal includes ingredients that are collectively missing data for the following micronutrients: " + missing.join(', ');
    } else {
        tooltip.textContent = "This food doesn't have data for the following micronutrients: " + missing.join(', ');
    }
    icon.appendChild(tooltip);
    return icon;
}
