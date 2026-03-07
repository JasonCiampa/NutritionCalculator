var labelStream = null;
var labelImageData = null;
var labelScanActive = false;

var LABEL_PATTERNS = [
    { pattern: /calories\s*[:\s]*(\d+)/i, key: 'calories', field: 'food_calories' },
    { pattern: /total\s*fat\s*[:\s]*([\d.]+)\s*g/i, key: 'fat', field: 'food_fat' },
    { pattern: /saturated\s*fat\s*[:\s]*([\d.]+)\s*g/i, key: 'saturatedFat', field: 'food_saturatedFat' },
    { pattern: /trans\s*fat\s*[:\s]*([\d.]+)\s*g/i, key: 'transFat', field: 'food_transFat' },
    { pattern: /cholesterol\s*[:\s]*([\d.]+)\s*mg/i, key: 'cholesterol', field: 'food_cholesterol' },
    { pattern: /sodium\s*[:\s]*([\d.]+)\s*mg/i, key: 'sodium', field: 'food_sodium' },
    { pattern: /total\s*carb(?:ohydrate)?s?\s*[:\s]*([\d.]+)\s*g/i, key: 'carbs', field: 'food_carbs' },
    { pattern: /dietary\s*fiber\s*[:\s]*([\d.]+)\s*g/i, key: 'fiber', field: 'food_fiber' },
    { pattern: /total\s*sugars?\s*[:\s]*([\d.]+)\s*g/i, key: 'sugars', field: 'food_sugars' },
    { pattern: /(?:incl\.\s*)?added\s*sugars?\s*[:\s]*([\d.]+)\s*g/i, key: 'addedSugars', field: 'food_addedSugars' },
    { pattern: /protein\s*[:\s]*([\d.]+)\s*g/i, key: 'protein', field: 'food_protein' },
    { pattern: /vitamin\s*d\s*[:\s]*([\d.]+)\s*mcg/i, key: 'vitaminD', field: 'food_vitaminD' },
    { pattern: /calcium\s*[:\s]*([\d.]+)\s*mg/i, key: 'calcium', field: 'food_calcium' },
    { pattern: /iron\s*[:\s]*([\d.]+)\s*mg/i, key: 'iron', field: 'food_iron' },
    { pattern: /potassium\s*[:\s]*([\d.]+)\s*mg/i, key: 'potassium', field: 'food_potassium' },
    { pattern: /vitamin\s*a\s*[:\s]*([\d.]+)\s*mcg/i, key: 'vitaminA', field: 'food_vitaminA' },
    { pattern: /vitamin\s*c\s*[:\s]*([\d.]+)\s*mg/i, key: 'vitaminC', field: 'food_vitaminC' },
    { pattern: /vitamin\s*e\s*[:\s]*([\d.]+)\s*mg/i, key: 'vitaminE', field: 'food_vitaminE' },
    { pattern: /vitamin\s*k\s*[:\s]*([\d.]+)\s*mcg/i, key: 'vitaminK', field: 'food_vitaminK' },
    { pattern: /thiamin\s*[:\s]*([\d.]+)\s*mg/i, key: 'thiamin', field: 'food_thiamin' },
    { pattern: /riboflavin\s*[:\s]*([\d.]+)\s*mg/i, key: 'riboflavin', field: 'food_riboflavin' },
    { pattern: /niacin\s*[:\s]*([\d.]+)\s*mg/i, key: 'niacin', field: 'food_niacin' },
    { pattern: /vitamin\s*b-?6\s*[:\s]*([\d.]+)\s*mg/i, key: 'vitaminB6', field: 'food_vitaminB6' },
    { pattern: /folate\s*[:\s]*([\d.]+)\s*mcg/i, key: 'folate', field: 'food_folate' },
    { pattern: /vitamin\s*b-?12\s*[:\s]*([\d.]+)\s*mcg/i, key: 'vitaminB12', field: 'food_vitaminB12' },
    { pattern: /phosphorus\s*[:\s]*([\d.]+)\s*mg/i, key: 'phosphorus', field: 'food_phosphorus' },
    { pattern: /magnesium\s*[:\s]*([\d.]+)\s*mg/i, key: 'magnesium', field: 'food_magnesium' },
    { pattern: /zinc\s*[:\s]*([\d.]+)\s*mg/i, key: 'zinc', field: 'food_zinc' }
];

var SERVING_SIZE_PATTERN = /serving\s*size\s*[:\s]*([\d.\/]+)\s*([a-zA-Z()\/\s]+?)(?:\s*\([\d.]+\s*g\))?$/im;

function initLabelReader() {
    var cameraBtn = document.getElementById('label_camera_btn');
    var uploadBtn = document.getElementById('label_upload_btn');
    var fileInput = document.getElementById('label_file_input');
    var captureBtn = document.getElementById('label_capture_btn');
    var scanBtn = document.getElementById('label_scan_btn');

    if (cameraBtn) {
        cameraBtn.addEventListener('click', startCamera);
    }
    if (uploadBtn) {
        uploadBtn.addEventListener('click', function () {
            fileInput.click();
        });
    }
    if (fileInput) {
        fileInput.addEventListener('change', handleFileUpload);
    }
    if (captureBtn) {
        captureBtn.addEventListener('click', capturePhoto);
    }
    if (scanBtn) {
        scanBtn.addEventListener('click', scanLabel);
    }
}

function startCamera() {
    document.getElementById('label_source_buttons').style.display = 'none';

    var cameraContainer = document.getElementById('label_camera_container');
    var video = document.getElementById('label_camera_video');
    cameraContainer.style.display = 'flex';

    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(function (stream) {
            labelStream = stream;
            video.srcObject = stream;
        })
        .catch(function (err) {
            console.error('Camera access error:', err);
            cameraContainer.style.display = 'none';
            document.getElementById('label_source_buttons').style.display = '';
            alert('Could not access camera. Please try uploading an image instead.');
        });
}

function stopCamera() {
    if (labelStream) {
        var tracks = labelStream.getTracks();
        for (var i = 0; i < tracks.length; i++) {
            tracks[i].stop();
        }
        labelStream = null;
    }
    var cameraContainer = document.getElementById('label_camera_container');
    if (cameraContainer) cameraContainer.style.display = 'none';
}

function capturePhoto() {
    var video = document.getElementById('label_camera_video');
    var canvas = document.getElementById('label_canvas');
    var preview = document.getElementById('label_preview');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    var ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    var dataUrl = canvas.toDataURL('image/png');
    labelImageData = dataUrl;
    preview.src = dataUrl;
    preview.style.display = 'block';

    stopCamera();

    document.getElementById('label_scan_btn').style.display = 'block';
}

function handleFileUpload(e) {
    var file = e.target.files[0];
    if (!file) return;

    document.getElementById('label_source_buttons').style.display = 'none';

    var reader = new FileReader();
    reader.onload = function (ev) {
        labelImageData = ev.target.result;
        var preview = document.getElementById('label_preview');
        preview.src = labelImageData;
        preview.style.display = 'block';
        document.getElementById('label_scan_btn').style.display = 'block';
    };
    reader.readAsDataURL(file);
}

function scanLabel() {
    if (!labelImageData) return;
    if (typeof Tesseract === 'undefined') {
        alert('Tesseract.js is not loaded. Please check your internet connection.');
        return;
    }

    var loading = document.getElementById('label_loading');
    loading.style.display = 'block';
    document.getElementById('label_scan_btn').style.display = 'none';

    Tesseract.recognize(labelImageData, 'eng', {
        logger: function () {}
    }).then(function (result) {
        loading.style.display = 'none';
        var text = result.data.text;
        var parsed = parseLabelText(text);
        populateManualAddForm(parsed);
    }).catch(function (err) {
        loading.style.display = 'none';
        console.error('OCR error:', err);
        alert('Failed to scan the label. Please try again with a clearer image.');
        document.getElementById('label_scan_btn').style.display = 'block';
    });
}

function parseLabelText(text) {
    var results = {};

    for (var i = 0; i < LABEL_PATTERNS.length; i++) {
        var match = text.match(LABEL_PATTERNS[i].pattern);
        if (match) {
            results[LABEL_PATTERNS[i].key] = parseFloat(match[1]);
        }
    }

    var servingMatch = text.match(SERVING_SIZE_PATTERN);
    if (servingMatch) {
        results.servingSize = servingMatch[1];
        results.servingUnit = servingMatch[2].trim();
    }

    return results;
}

function parseFraction(value) {
    if (typeof value !== 'string') return parseFloat(value);
    var parts = value.split('/');
    if (parts.length === 2) {
        var num = parseFloat(parts[0]);
        var den = parseFloat(parts[1]);
        if (!isNaN(num) && !isNaN(den) && den !== 0) return num / den;
    }
    return parseFloat(value);
}

function scanAgain() {
    labelScanActive = false;
    removeScanAgainButton();

    if (typeof closeForm === 'function' && typeof addFoodForm !== 'undefined') {
        closeForm(addFoodForm);
    }

    var scanForm = document.getElementById('scan_label_form');
    if (scanForm) {
        if (typeof openedFile !== 'undefined') openedFile = scanForm;
        scanForm.style.display = 'flex';
    }

    startCamera();
}

function addScanAgainButton() {
    removeScanAgainButton();
    var form = document.getElementById('add_food_form');
    if (!form) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'scan_again_btn';
    btn.textContent = 'Scan Again';
    btn.addEventListener('click', scanAgain);
    form.insertBefore(btn, form.firstChild);
}

function removeScanAgainButton() {
    var existing = document.getElementById('scan_again_btn');
    if (existing) existing.remove();
}

function populateManualAddForm(parsed) {
    closeLabelReader();
    labelScanActive = true;

    if (typeof renderMicroFieldsInForm === 'function') renderMicroFieldsInForm();
    if (typeof displayForm === 'function' && typeof addFoodForm !== 'undefined') {
        displayForm(addFoodForm);
    }

    addScanAgainButton();

    if (parsed.servingSize != null) {
        var numericSize = parseFraction(String(parsed.servingSize));
        if (!isNaN(numericSize)) {
            document.getElementById('food_serving_size').value = numericSize;
        }
    }
    if (parsed.servingUnit) {
        document.getElementById('food_measurement_unit').value = parsed.servingUnit;
    }
    if (parsed.calories != null) {
        document.getElementById('food_calories').value = parsed.calories;
    }
    if (parsed.fat != null) {
        document.getElementById('food_fat').value = parsed.fat;
    }
    if (parsed.carbs != null) {
        document.getElementById('food_carbs').value = parsed.carbs;
    }
    if (parsed.protein != null) {
        document.getElementById('food_protein').value = parsed.protein;
    }

    var enabledMicros = getEnabledMicronutrients();
    for (var i = 0; i < enabledMicros.length; i++) {
        var mk = enabledMicros[i];
        var formInput = document.getElementById('food_' + mk);
        if (formInput && parsed[mk] != null) {
            formInput.value = parsed[mk];
        }
    }

    var microContent = document.getElementById('micro_fields_content');
    if (microContent && enabledMicros.length > 0) {
        var hasMicroData = false;
        for (var j = 0; j < enabledMicros.length; j++) {
            if (parsed[enabledMicros[j]] != null) { hasMicroData = true; break; }
        }
        if (hasMicroData) microContent.classList.add('expanded');
    }
}

function closeLabelReader() {
    stopCamera();
    labelImageData = null;

    var form = document.getElementById('scan_label_form');
    if (form) form.style.display = 'none';

    var preview = document.getElementById('label_preview');
    if (preview) { preview.src = ''; preview.style.display = 'none'; }

    var scanBtn = document.getElementById('label_scan_btn');
    if (scanBtn) scanBtn.style.display = 'none';

    var loading = document.getElementById('label_loading');
    if (loading) loading.style.display = 'none';

    var fileInput = document.getElementById('label_file_input');
    if (fileInput) fileInput.value = '';

    var sourceButtons = document.getElementById('label_source_buttons');
    if (sourceButtons) sourceButtons.style.display = '';

    if (typeof openedFile !== 'undefined') openedFile = '';
}

document.addEventListener('DOMContentLoaded', initLabelReader);
