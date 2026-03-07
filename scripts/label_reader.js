var labelStream = null;
var labelImageData = null;
var labelScanActive = false;

var LABEL_PATTERNS = [
    { pattern: /ca[il1|]or[il1|]es\s*[:\s]*([\d,.]+)/i, key: 'calories', field: 'food_calories' },
    { pattern: /tota[il1|]\s*fat\s*[:\s]*([\d,.]+)\s*g/i, key: 'fat', field: 'food_fat' },
    { pattern: /saturated\s*fat\s*[:\s]*([\d,.]+)\s*g/i, key: 'saturatedFat', field: 'food_saturatedFat' },
    { pattern: /trans\s*fat\s*[:\s]*([\d,.]+)\s*g/i, key: 'transFat', field: 'food_transFat' },
    { pattern: /cho[il1|]estero[il1|]\s*[:\s]*([\d,.]+)\s*m?g/i, key: 'cholesterol', field: 'food_cholesterol' },
    { pattern: /sod[il1|]um\s*[:\s]*([\d,.]+)\s*m?g/i, key: 'sodium', field: 'food_sodium' },
    { pattern: /tota[il1|]\s*carb(?:ohydrate)?s?\s*[:\s]*([\d,.]+)\s*g/i, key: 'carbs', field: 'food_carbs' },
    { pattern: /d[il1|]etary\s*f[il1|]ber\s*[:\s]*([\d,.]+)\s*g/i, key: 'fiber', field: 'food_fiber' },
    { pattern: /tota[il1|]\s*sugars?\s*[:\s]*([\d,.]+)\s*g/i, key: 'sugars', field: 'food_sugars' },
    { pattern: /(?:inc[il1|]\.?\s*)?added\s*sugars?\s*[:\s]*([\d,.]+)\s*g/i, key: 'addedSugars', field: 'food_addedSugars' },
    { pattern: /prote[il1|]n\s*[:\s]*([\d,.]+)\s*g/i, key: 'protein', field: 'food_protein' },
    { pattern: /v[il1|]tam[il1|]n\s*d\s*[:\s]*([\d,.]+)\s*m?cg/i, key: 'vitaminD', field: 'food_vitaminD' },
    { pattern: /ca[il1|]c[il1|]um\s*[:\s]*([\d,.]+)\s*m?g/i, key: 'calcium', field: 'food_calcium' },
    { pattern: /[il1|]ron\s*[:\s]*([\d,.]+)\s*m?g/i, key: 'iron', field: 'food_iron' },
    { pattern: /potass[il1|]um\s*[:\s]*([\d,.]+)\s*m?g/i, key: 'potassium', field: 'food_potassium' },
    { pattern: /v[il1|]tam[il1|]n\s*a\s*[:\s]*([\d,.]+)\s*m?cg/i, key: 'vitaminA', field: 'food_vitaminA' },
    { pattern: /v[il1|]tam[il1|]n\s*c\s*[:\s]*([\d,.]+)\s*m?g/i, key: 'vitaminC', field: 'food_vitaminC' },
    { pattern: /v[il1|]tam[il1|]n\s*e\s*[:\s]*([\d,.]+)\s*m?g/i, key: 'vitaminE', field: 'food_vitaminE' },
    { pattern: /v[il1|]tam[il1|]n\s*k\s*[:\s]*([\d,.]+)\s*m?cg/i, key: 'vitaminK', field: 'food_vitaminK' },
    { pattern: /th[il1|]am[il1|]n\s*[:\s]*([\d,.]+)\s*m?g/i, key: 'thiamin', field: 'food_thiamin' },
    { pattern: /r[il1|]bof[il1|]av[il1|]n\s*[:\s]*([\d,.]+)\s*m?g/i, key: 'riboflavin', field: 'food_riboflavin' },
    { pattern: /n[il1|]ac[il1|]n\s*[:\s]*([\d,.]+)\s*m?g/i, key: 'niacin', field: 'food_niacin' },
    { pattern: /v[il1|]tam[il1|]n\s*b-?6\s*[:\s]*([\d,.]+)\s*m?g/i, key: 'vitaminB6', field: 'food_vitaminB6' },
    { pattern: /fo[il1|]ate\s*[:\s]*([\d,.]+)\s*m?cg/i, key: 'folate', field: 'food_folate' },
    { pattern: /v[il1|]tam[il1|]n\s*b-?12\s*[:\s]*([\d,.]+)\s*m?cg/i, key: 'vitaminB12', field: 'food_vitaminB12' },
    { pattern: /phosphorus\s*[:\s]*([\d,.]+)\s*m?g/i, key: 'phosphorus', field: 'food_phosphorus' },
    { pattern: /magnes[il1|]um\s*[:\s]*([\d,.]+)\s*m?g/i, key: 'magnesium', field: 'food_magnesium' },
    { pattern: /z[il1|]nc\s*[:\s]*([\d,.]+)\s*m?g/i, key: 'zinc', field: 'food_zinc' }
];

var SERVING_SIZE_PATTERN = /serv[il1|]ng\s*s[il1|]ze\s*[:\s]*([\d.\/]+)\s*([a-zA-Z()\/\s]+?)(?:\s*\([\d.]+\s*g\))?$/im;

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

    navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
    })
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

function preprocessImage(imageDataUrl, callback) {
    var img = new Image();
    img.onload = function () {
        var canvas = document.createElement('canvas');
        var scale = Math.max(1, 2000 / Math.max(img.width, img.height));
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        var ctx = canvas.getContext('2d');

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        var data = imageData.data;

        for (var i = 0; i < data.length; i += 4) {
            var gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
            var contrast = ((gray / 255 - 0.5) * 1.8 + 0.5) * 255;
            var bw = contrast > 140 ? 255 : 0;
            data[i] = bw;
            data[i + 1] = bw;
            data[i + 2] = bw;
        }

        ctx.putImageData(imageData, 0, 0);
        callback(canvas.toDataURL('image/png'));
    };
    img.src = imageDataUrl;
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

    preprocessImage(labelImageData, function (processedImage) {
        Tesseract.recognize(processedImage, 'eng', {
            logger: function () {}
        }).then(function (result) {
            loading.style.display = 'none';
            var text = result.data.text;
            console.log('OCR raw text:', text);
            var parsed = parseLabelText(text);
            populateManualAddForm(parsed);
        }).catch(function (err) {
            loading.style.display = 'none';
            console.error('OCR error:', err);
            alert('Failed to scan the label. Please try again with a clearer image.');
            document.getElementById('label_scan_btn').style.display = 'block';
        });
    });
}

function parseLabelText(text) {
    var results = {};

    var cleaned = text
        .replace(/[—–]/g, '-')
        .replace(/[''`]/g, "'")
        .replace(/[""]/g, '"')
        .replace(/\r\n/g, '\n');

    for (var i = 0; i < LABEL_PATTERNS.length; i++) {
        var match = cleaned.match(LABEL_PATTERNS[i].pattern);
        if (match) {
            var numStr = match[1].replace(/,/g, '');
            results[LABEL_PATTERNS[i].key] = parseFloat(numStr);
        }
    }

    var servingMatch = cleaned.match(SERVING_SIZE_PATTERN);
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
