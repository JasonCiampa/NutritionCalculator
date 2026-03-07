var THEME_OPTIONS = [
    { id: 'blue', label: 'Blue', gradient: 'linear-gradient(135deg, rgb(109, 196, 255), rgb(0, 102, 255))' },
    { id: 'green', label: 'Green', gradient: 'linear-gradient(135deg, rgb(144, 238, 144), rgb(34, 139, 34))' },
    { id: 'purple', label: 'Purple', gradient: 'linear-gradient(135deg, rgb(200, 162, 255), rgb(106, 27, 154))' },
    { id: 'redOrange', label: 'Red / Orange', gradient: 'linear-gradient(135deg, rgb(255, 183, 107), rgb(230, 74, 25))' },
    { id: 'dark', label: 'Dark Mode', gradient: 'linear-gradient(135deg, rgb(60, 60, 60), rgb(18, 18, 18))' }
];

function initSettingsPage() {
    renderColorSchemeOptions();
    renderDecimalPrecisionOptions();
    renderMicronutrientToggles();
    initBackupSection();
}

function renderColorSchemeOptions() {
    var container = document.getElementById('color_scheme_options');
    if (!container) return;
    container.innerHTML = '';
    var currentTheme = localStorage.getItem('colorScheme') || 'blue';

    for (var i = 0; i < THEME_OPTIONS.length; i++) {
        var theme = THEME_OPTIONS[i];
        var swatch = document.createElement('div');
        swatch.className = 'color-swatch' + (theme.id === currentTheme ? ' active' : '');
        swatch.setAttribute('data-theme-id', theme.id);

        var preview = document.createElement('div');
        preview.className = 'swatch-preview';
        preview.style.background = theme.gradient;

        var label = document.createElement('span');
        label.className = 'swatch-label';
        label.textContent = theme.label;

        swatch.appendChild(preview);
        swatch.appendChild(label);

        swatch.addEventListener('click', (function(themeId) {
            return function() {
                applyTheme(themeId);
            };
        })(theme.id));

        container.appendChild(swatch);
    }
}

function applyTheme(themeId) {
    localStorage.setItem('colorScheme', themeId);
    document.documentElement.setAttribute('data-theme', themeId);
    renderColorSchemeOptions();
}

var DECIMAL_OPTIONS = [
    { id: '0', label: 'Whole Numbers', example: '125' },
    { id: '1', label: 'Tenths', example: '125.3' },
    { id: '2', label: 'Hundredths', example: '125.33' }
];

function renderDecimalPrecisionOptions() {
    var container = document.getElementById('decimal_precision_options');
    if (!container) return;
    container.innerHTML = '';
    var current = localStorage.getItem('decimalPrecision');
    if (current !== '0' && current !== '1' && current !== '2') current = '2';

    for (var i = 0; i < DECIMAL_OPTIONS.length; i++) {
        var opt = DECIMAL_OPTIONS[i];
        var item = document.createElement('div');
        item.className = 'decimal-option' + (opt.id === current ? ' active' : '');

        var radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'decimal_precision';
        radio.id = 'decimal_opt_' + opt.id;
        radio.value = opt.id;
        radio.checked = opt.id === current;
        radio.addEventListener('change', (function(val) {
            return function() {
                localStorage.setItem('decimalPrecision', val);
                renderDecimalPrecisionOptions();
            };
        })(opt.id));

        var label = document.createElement('label');
        label.setAttribute('for', 'decimal_opt_' + opt.id);
        label.textContent = opt.label + '  (e.g. ' + opt.example + ')';

        item.appendChild(radio);
        item.appendChild(label);
        container.appendChild(item);
    }
}

function renderMicronutrientToggles() {
    var container = document.getElementById('micro_toggle_list');
    if (!container) return;
    container.innerHTML = '';
    var enabled = getEnabledMicronutrients();

    var groups = {};
    for (var i = 0; i < MICRONUTRIENT_DEFINITIONS.length; i++) {
        var def = MICRONUTRIENT_DEFINITIONS[i];
        if (!groups[def.group]) groups[def.group] = [];
        groups[def.group].push(def);
    }

    var groupOrder = ['Fats', 'Carb Details', 'Minerals', 'Vitamins'];
    for (var g = 0; g < groupOrder.length; g++) {
        var groupName = groupOrder[g];
        var items = groups[groupName];
        if (!items) continue;

        var groupDiv = document.createElement('div');
        groupDiv.className = 'micro-group';
        var groupTitle = document.createElement('h4');
        groupTitle.textContent = groupName;
        groupDiv.appendChild(groupTitle);

        var togglesDiv = document.createElement('div');
        togglesDiv.className = 'micro-toggles';

        for (var j = 0; j < items.length; j++) {
            var item = items[j];
            var toggleItem = document.createElement('div');
            toggleItem.className = 'micro-toggle-item';

            var checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = 'micro_toggle_' + item.key;
            checkbox.checked = enabled.indexOf(item.key) !== -1;
            checkbox.addEventListener('change', (function(key) {
                return function(e) {
                    toggleMicronutrient(key, e.target.checked);
                };
            })(item.key));

            var label = document.createElement('label');
            label.setAttribute('for', 'micro_toggle_' + item.key);
            label.textContent = item.label + ' (' + item.unit + ')';

            toggleItem.appendChild(checkbox);
            toggleItem.appendChild(label);
            togglesDiv.appendChild(toggleItem);
        }

        groupDiv.appendChild(togglesDiv);
        container.appendChild(groupDiv);
    }
}

function toggleMicronutrient(key, isEnabled) {
    var enabled = getEnabledMicronutrients();
    var idx = enabled.indexOf(key);
    if (isEnabled && idx === -1) {
        enabled.push(key);
    } else if (!isEnabled && idx !== -1) {
        enabled.splice(idx, 1);
    }
    localStorage.setItem('enabledMicronutrients', JSON.stringify(enabled));
}

function selectAllMicros() {
    var all = [];
    for (var i = 0; i < MICRONUTRIENT_DEFINITIONS.length; i++) {
        all.push(MICRONUTRIENT_DEFINITIONS[i].key);
    }
    localStorage.setItem('enabledMicronutrients', JSON.stringify(all));
    renderMicronutrientToggles();
}

function deselectAllMicros() {
    localStorage.setItem('enabledMicronutrients', JSON.stringify([]));
    renderMicronutrientToggles();
}

function initBackupSection() {
    renderLastExportInfo();

    var exportBtn = document.getElementById('export_data_btn');
    if (exportBtn) exportBtn.addEventListener('click', exportData);

    var importBtn = document.getElementById('import_data_btn');
    var fileInput = document.getElementById('import_file_input');
    if (importBtn && fileInput) {
        importBtn.addEventListener('click', function () { fileInput.click(); });
        fileInput.addEventListener('change', function () {
            if (fileInput.files.length > 0) {
                importData(fileInput.files[0]);
                fileInput.value = '';
            }
        });
    }
}

function renderLastExportInfo() {
    var container = document.getElementById('backup_last_export');
    if (!container) return;
    var lastExport = localStorage.getItem('lastExportDate');
    if (lastExport) {
        var d = new Date(lastExport);
        container.textContent = 'Last export: ' + d.toLocaleDateString() + ' at ' + d.toLocaleTimeString();
        container.style.textAlign = 'center';
        container.style.marginBottom = '1.5vh';
        container.style.fontSize = '90%';
        container.style.opacity = '0.8';
    } else {
        container.textContent = 'No backups have been exported yet.';
        container.style.textAlign = 'center';
        container.style.marginBottom = '1.5vh';
        container.style.fontSize = '90%';
        container.style.opacity = '0.8';
    }
}

function showBackupStatus(message, isError) {
    var el = document.getElementById('backup_status');
    if (!el) return;
    el.textContent = message;
    el.style.color = isError ? '#e74c3c' : '#27ae60';
    el.style.textAlign = 'center';
    el.style.marginTop = '1.5vh';
    el.style.fontWeight = 'bold';
    setTimeout(function () { el.textContent = ''; }, 5000);
}

function exportData() {
    var request = openDatabase();
    request.onsuccess = function () {
        var db = request.result;
        var storeNames = ['foods', 'meals', 'regimens', 'nutrition'];
        var exportObj = { _exportVersion: 1, _exportDate: new Date().toISOString(), settings: {} };

        var settingsKeys = ['colorScheme', 'decimalPrecision', 'enabledMicronutrients', 'activeRegimen', 'nutritionDataFormat_v2'];
        for (var i = 0; i < settingsKeys.length; i++) {
            var val = localStorage.getItem(settingsKeys[i]);
            if (val !== null) exportObj.settings[settingsKeys[i]] = val;
        }

        var storesRemaining = storeNames.length;

        for (var s = 0; s < storeNames.length; s++) {
            (function (storeName) {
                var tx = db.transaction(storeName, 'readonly');
                var store = tx.objectStore(storeName);
                var getAll = store.getAll();
                getAll.onsuccess = function () {
                    exportObj[storeName] = getAll.result || [];
                    storesRemaining--;
                    if (storesRemaining === 0) {
                        finishExport(exportObj);
                    }
                };
                getAll.onerror = function () {
                    exportObj[storeName] = [];
                    storesRemaining--;
                    if (storesRemaining === 0) {
                        finishExport(exportObj);
                    }
                };
            })(storeNames[s]);
        }
    };
    request.onerror = function () {
        showBackupStatus('Failed to open database for export.', true);
    };
}

function finishExport(exportObj) {
    var jsonStr = JSON.stringify(exportObj, null, 2);
    var blob = new Blob([jsonStr], { type: 'application/json' });
    var url = URL.createObjectURL(blob);

    var d = new Date();
    var dateStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    var filename = 'NutritionCalculator_Backup_' + dateStr + '.json';

    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    localStorage.setItem('lastExportDate', new Date().toISOString());
    renderLastExportInfo();
    showBackupStatus('Data exported successfully!', false);
}

function importData(file) {
    var reader = new FileReader();
    reader.onload = function (e) {
        var data;
        try {
            data = JSON.parse(e.target.result);
        } catch (err) {
            showBackupStatus('Invalid backup file. Could not parse JSON.', true);
            return;
        }

        if (!data._exportVersion) {
            showBackupStatus('This file does not appear to be a valid NutritionCalculator backup.', true);
            return;
        }

        if (!confirm('Importing will replace ALL your current data (foods, meals, regimens, and nutrition log) with the backup. Continue?')) {
            return;
        }

        var request = openDatabase();
        request.onsuccess = function () {
            var db = request.result;
            var storeNames = ['foods', 'meals', 'regimens', 'nutrition'];
            var storesRemaining = storeNames.length;

            for (var s = 0; s < storeNames.length; s++) {
                (function (storeName) {
                    var tx = db.transaction(storeName, 'readwrite');
                    var store = tx.objectStore(storeName);
                    store.clear();

                    var items = data[storeName] || [];
                    for (var i = 0; i < items.length; i++) {
                        store.put(items[i]);
                    }

                    tx.oncomplete = function () {
                        storesRemaining--;
                        if (storesRemaining === 0) {
                            if (data.settings) {
                                for (var key in data.settings) {
                                    if (data.settings.hasOwnProperty(key)) {
                                        localStorage.setItem(key, data.settings[key]);
                                    }
                                }
                            }
                            showBackupStatus('Data imported successfully! Refreshing...', false);
                            setTimeout(function () { location.reload(); }, 1500);
                        }
                    };

                    tx.onerror = function () {
                        showBackupStatus('Error importing ' + storeName + ' data.', true);
                    };
                })(storeNames[s]);
            }
        };
        request.onerror = function () {
            showBackupStatus('Failed to open database for import.', true);
        };
    };
    reader.onerror = function () {
        showBackupStatus('Failed to read the selected file.', true);
    };
    reader.readAsText(file);
}

document.addEventListener('DOMContentLoaded', initSettingsPage);
