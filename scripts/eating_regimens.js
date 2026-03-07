var editingRegimen = null;

function loadRegimens() {
    var request = openDatabase();
    request.onsuccess = function () {
        var db = request.result;
        var tx = db.transaction("regimens", "readonly");
        var store = tx.objectStore("regimens");
        var getAll = store.getAll();
        getAll.onsuccess = function () {
            renderRegimenList(getAll.result || []);
        };
    };
}

function renderRegimenList(regimens) {
    var container = document.getElementById('regimen_entries');
    if (!container) return;
    container.innerHTML = '';
    var activeRegimen = localStorage.getItem('activeRegimen') || '';
    var enabledMicros = getEnabledMicronutrients();

    if (regimens.length === 0) {
        container.innerHTML = '<p>No regimens created yet.</p>';
        return;
    }

    for (var i = 0; i < regimens.length; i++) {
        var reg = regimens[i];
        var box = document.createElement('div');
        box.className = 'regimen-box';

        var title = document.createElement('span');
        title.className = 'entry-title';
        title.textContent = reg.name;
        if (reg.name === activeRegimen) {
            var badge = document.createElement('span');
            badge.className = 'regimen-active-badge';
            badge.textContent = 'ACTIVE';
            title.appendChild(badge);
        }
        box.appendChild(title);

        var details = document.createElement('div');
        details.className = 'entry-details';

        details.appendChild(makeDetail('Max Calories: ' + formatNumber(reg.maxCalories), 'regimen-detail-cals'));
        details.appendChild(makeDetail('Max Fat: ' + formatNumber(reg.maxFat) + 'g', 'regimen-detail-fat'));
        details.appendChild(makeDetail('Max Carbs: ' + formatNumber(reg.maxCarbs) + 'g', 'regimen-detail-carbs'));
        details.appendChild(makeDetail('Max Protein: ' + formatNumber(reg.maxProtein) + 'g', 'regimen-detail-protein'));

        var hasMicroGoals = false;
        for (var j = 0; j < enabledMicros.length; j++) {
            var mk = enabledMicros[j];
            var maxKey = 'max' + mk.charAt(0).toUpperCase() + mk.slice(1);
            if (reg[maxKey] != null && reg[maxKey] !== '') {
                hasMicroGoals = true;
                break;
            }
        }
        if (hasMicroGoals) {
            var microContainer = document.createElement('div');
            microContainer.className = 'entry-micro-container';
            var microToggle = document.createElement('button');
            microToggle.className = 'entry-micro-toggle-btn';
            microToggle.textContent = 'Micronutrients';
            var microContent = document.createElement('div');
            microContent.className = 'entry-micro-content';
            microToggle.addEventListener('click', function (e) {
                e.stopPropagation();
                microContent.classList.toggle('expanded');
            });
            for (var j = 0; j < enabledMicros.length; j++) {
                var mk = enabledMicros[j];
                var maxKey = 'max' + mk.charAt(0).toUpperCase() + mk.slice(1);
                if (reg[maxKey] != null && reg[maxKey] !== '') {
                    var def = getMicroDef(mk);
                    if (def) {
                        var microLine = document.createElement('span');
                        microLine.className = 'regimen-detail entry-detail-micro';
                        microLine.textContent = 'Max ' + def.label + ': ' + formatNumber(reg[maxKey]) + def.unit;
                        microContent.appendChild(microLine);
                    }
                }
            }
            microContainer.appendChild(microToggle);
            microContainer.appendChild(microContent);
            details.appendChild(microContainer);
        }

        var actions = document.createElement('div');
        actions.className = 'regimen-action-buttons';

        if (reg.name === activeRegimen) {
            var deactivateBtn = document.createElement('button');
            deactivateBtn.className = 'regimen-deactivate-btn';
            deactivateBtn.textContent = 'Deactivate';
            deactivateBtn.addEventListener('click', (function(n) {
                return function(e) { e.stopPropagation(); deactivateRegimen(); };
            })(reg.name));
            actions.appendChild(deactivateBtn);
        } else {
            var activateBtn = document.createElement('button');
            activateBtn.className = 'regimen-activate-btn';
            activateBtn.textContent = 'Set Active';
            activateBtn.addEventListener('click', (function(n) {
                return function(e) { e.stopPropagation(); activateRegimen(n); };
            })(reg.name));
            actions.appendChild(activateBtn);
        }

        var editBtn = document.createElement('button');
        editBtn.className = 'regimen-edit-btn';
        editBtn.textContent = 'Edit';
        editBtn.addEventListener('click', (function(r) {
            return function(e) { e.stopPropagation(); editRegimen(r); };
        })(reg));
        actions.appendChild(editBtn);

        var deleteBtn = document.createElement('button');
        deleteBtn.className = 'regimen-delete-btn';
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', (function(n, boxEl) {
            return function(e) { e.stopPropagation(); confirmDeleteRegimen(n, boxEl); };
        })(reg.name, box));
        actions.appendChild(deleteBtn);

        details.appendChild(actions);
        box.appendChild(details);

        box.addEventListener('click', (function(b) {
            return function() { b.classList.toggle('expanded'); };
        })(box));

        container.appendChild(box);
    }
}

function makeDetail(text, extraClass) {
    var span = document.createElement('span');
    span.className = 'regimen-detail' + (extraClass ? ' ' + extraClass : '');
    span.textContent = text;
    return span;
}

function showAddRegimenForm() {
    editingRegimen = null;
    var form = document.getElementById('add_regimen_form');
    clearRegimenForm();
    form.style.display = 'flex';
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    renderRegimenMicroGoalFields();
}

function hideRegimenForm() {
    document.getElementById('add_regimen_form').style.display = 'none';
    editingRegimen = null;
    clearRegimenForm();
}

function clearRegimenForm() {
    document.getElementById('regimen_name').value = '';
    document.getElementById('regimen_max_calories').value = '';
    document.getElementById('regimen_max_fat').value = '';
    document.getElementById('regimen_max_carbs').value = '';
    document.getElementById('regimen_max_protein').value = '';
    var errorEls = document.getElementsByClassName('error');
    for (var i = 0; i < errorEls.length; i++) errorEls[i].innerHTML = '';
    var content = document.getElementById('regimen_micro_goals_content');
    if (content) {
        content.innerHTML = '';
        content.classList.remove('expanded');
    }
}

function renderRegimenMicroGoalFields() {
    var container = document.getElementById('regimen_micro_goals_content');
    if (!container) return;
    container.innerHTML = '';
    var enabled = getEnabledMicronutrients();
    if (enabled.length === 0) {
        document.getElementById('regimen_micro_goals').style.display = 'none';
        return;
    }
    document.getElementById('regimen_micro_goals').style.display = 'block';

    for (var i = 0; i < enabled.length; i++) {
        var def = getMicroDef(enabled[i]);
        if (!def) continue;
        var p = document.createElement('p');
        var maxKey = 'max' + def.key.charAt(0).toUpperCase() + def.key.slice(1);
        p.textContent = 'Max ' + def.label + ' (' + def.unit + '): ';
        var input = document.createElement('input');
        input.type = 'number';
        input.id = 'regimen_' + maxKey;
        input.step = 'any';
        input.min = '0';
        input.autocomplete = 'off';
        if (editingRegimen && editingRegimen[maxKey] != null) {
            input.value = editingRegimen[maxKey];
        }
        p.appendChild(input);
        container.appendChild(p);
    }
}

function toggleRegimenMicroGoals() {
    var content = document.getElementById('regimen_micro_goals_content');
    if (content) content.classList.toggle('expanded');
}

function submitRegimen() {
    var name = document.getElementById('regimen_name').value.trim();
    var maxCalories = document.getElementById('regimen_max_calories').value;
    var maxFat = document.getElementById('regimen_max_fat').value;
    var maxCarbs = document.getElementById('regimen_max_carbs').value;
    var maxProtein = document.getElementById('regimen_max_protein').value;

    if (!name || !maxCalories || !maxFat || !maxCarbs || !maxProtein) {
        var errorEls = document.getElementsByClassName('error');
        for (var i = 0; i < errorEls.length; i++) {
            errorEls[i].innerHTML = 'Please fill in the name and all macronutrient goals.';
        }
        return;
    }

    var regimen = {
        name: name,
        maxCalories: parseFloat(maxCalories),
        maxFat: parseFloat(maxFat),
        maxCarbs: parseFloat(maxCarbs),
        maxProtein: parseFloat(maxProtein)
    };

    var enabled = getEnabledMicronutrients();
    for (var i = 0; i < enabled.length; i++) {
        var def = getMicroDef(enabled[i]);
        if (!def) continue;
        var maxKey = 'max' + def.key.charAt(0).toUpperCase() + def.key.slice(1);
        var el = document.getElementById('regimen_' + maxKey);
        if (el && el.value !== '') {
            regimen[maxKey] = parseFloat(el.value);
        }
    }

    var request = openDatabase();
    request.onsuccess = function () {
        var db = request.result;

        function saveRegimen() {
            var tx = db.transaction("regimens", "readwrite");
            var store = tx.objectStore("regimens");
            if (editingRegimen && editingRegimen.name !== name) {
                store.delete(editingRegimen.name);
                var activeRegimen = localStorage.getItem('activeRegimen') || '';
                if (activeRegimen === editingRegimen.name) {
                    localStorage.setItem('activeRegimen', name);
                }
            }
            store.put(regimen);
            tx.oncomplete = function () {
                markDataModified();
                hideRegimenForm();
                loadRegimens();
            };
        }

        if (!editingRegimen || editingRegimen.name === name) {
            if (!editingRegimen) {
                var checkTx = db.transaction("regimens", "readonly");
                var checkStore = checkTx.objectStore("regimens");
                var check = checkStore.get(name);
                check.onsuccess = function () {
                    if (check.result) {
                        var errorEls = document.getElementsByClassName('error');
                        for (var i = 0; i < errorEls.length; i++) {
                            errorEls[i].innerHTML = 'A regimen with this name already exists.';
                        }
                        return;
                    }
                    saveRegimen();
                };
            } else {
                saveRegimen();
            }
        } else {
            var checkTx = db.transaction("regimens", "readonly");
            var checkStore = checkTx.objectStore("regimens");
            var check = checkStore.get(name);
            check.onsuccess = function () {
                if (check.result) {
                    var errorEls = document.getElementsByClassName('error');
                    for (var i = 0; i < errorEls.length; i++) {
                        errorEls[i].innerHTML = 'A regimen with this name already exists.';
                    }
                    return;
                }
                saveRegimen();
            };
        }
    };
}

function editRegimen(reg) {
    editingRegimen = reg;
    document.getElementById('regimen_name').value = reg.name;
    document.getElementById('regimen_max_calories').value = reg.maxCalories;
    document.getElementById('regimen_max_fat').value = reg.maxFat;
    document.getElementById('regimen_max_carbs').value = reg.maxCarbs;
    document.getElementById('regimen_max_protein').value = reg.maxProtein;
    renderRegimenMicroGoalFields();
    var form = document.getElementById('add_regimen_form');
    form.style.display = 'flex';
    form.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function activateRegimen(name) {
    localStorage.setItem('activeRegimen', name);
    loadRegimens();
}

function deactivateRegimen() {
    localStorage.setItem('activeRegimen', '');
    loadRegimens();
}

function confirmDeleteRegimen(name, boxEl) {
    var existing = boxEl.querySelector('.delete-confirm-panel');
    if (existing) { existing.remove(); return; }

    var panel = document.createElement('div');
    panel.className = 'delete-confirm-panel';
    var h4 = document.createElement('h4');
    h4.textContent = 'Delete "' + name + '"?';
    panel.appendChild(h4);

    var btns = document.createElement('div');
    btns.className = 'delete-confirm-buttons';

    var yesBtn = document.createElement('button');
    yesBtn.className = 'delete-confirm-yes';
    yesBtn.textContent = 'Delete';
    yesBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        deleteRegimen(name);
    });
    btns.appendChild(yesBtn);

    var cancelBtn = document.createElement('button');
    cancelBtn.className = 'delete-confirm-cancel';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        panel.remove();
    });
    btns.appendChild(cancelBtn);

    panel.appendChild(btns);
    boxEl.querySelector('.entry-details').appendChild(panel);
}

function deleteRegimen(name) {
    var request = openDatabase();
    request.onsuccess = function () {
        var db = request.result;
        var tx = db.transaction("regimens", "readwrite");
        var store = tx.objectStore("regimens");
        store.delete(name);
        tx.oncomplete = function () {
            markDataModified();
            var active = localStorage.getItem('activeRegimen') || '';
            if (active === name) localStorage.setItem('activeRegimen', '');
            loadRegimens();
        };
    };
}

document.addEventListener('DOMContentLoaded', loadRegimens);
