var labelStream = null;
var labelImageData = null;
var labelScanActive = false;

var S = '[\\s\\n]*';
var V = '([\\d,.]+)';
var OCR_L = '[il1|!]';

var LABEL_PATTERNS = [
    { pattern: new RegExp('ca' + OCR_L + 'or' + OCR_L + 'es' + S + '[:\\s]?' + S + V, 'i'), key: 'calories' },
    { pattern: new RegExp('tota' + OCR_L + S + 'fat' + S + '[:\\s]?' + S + V + S + 'g', 'i'), key: 'fat' },
    { pattern: new RegExp('saturated' + S + 'fat' + S + '[:\\s]?' + S + V + S + 'g', 'i'), key: 'saturatedFat' },
    { pattern: new RegExp('trans' + S + 'fat' + S + '[:\\s]?' + S + V + S + 'g', 'i'), key: 'transFat' },
    { pattern: new RegExp('cho' + OCR_L + 'estero' + OCR_L + S + '[:\\s]?' + S + V + S + 'm?g', 'i'), key: 'cholesterol' },
    { pattern: new RegExp('sod' + OCR_L + 'um' + S + '[:\\s]?' + S + V + S + 'm?g', 'i'), key: 'sodium' },
    { pattern: new RegExp('tota' + OCR_L + S + 'carb(?:ohydrate)?' + 's?' + S + '[:\\s]?' + S + V + S + 'g', 'i'), key: 'carbs' },
    { pattern: new RegExp('d' + OCR_L + 'etary' + S + 'f' + OCR_L + 'ber' + S + '[:\\s]?' + S + V + S + 'g', 'i'), key: 'fiber' },
    { pattern: new RegExp('tota' + OCR_L + S + 'sugars?' + S + '[:\\s]?' + S + V + S + 'g', 'i'), key: 'sugars' },
    { pattern: new RegExp('(?:' + OCR_L + 'nc' + OCR_L + '\\.?\\s*)?added' + S + 'sugars?' + S + '[:\\s]?' + S + V + S + 'g', 'i'), key: 'addedSugars' },
    { pattern: new RegExp('prote' + OCR_L + 'n' + S + '[:\\s]?' + S + V + S + 'g', 'i'), key: 'protein' },
    { pattern: new RegExp('v' + OCR_L + 'tam' + OCR_L + 'n' + S + 'd' + S + '[:\\s]?' + S + V + S + 'm?cg', 'i'), key: 'vitaminD' },
    { pattern: new RegExp('ca' + OCR_L + 'c' + OCR_L + 'um' + S + '[:\\s]?' + S + V + S + 'm?g', 'i'), key: 'calcium' },
    { pattern: new RegExp(OCR_L + 'ron' + S + '[:\\s]?' + S + V + S + 'm?g', 'i'), key: 'iron' },
    { pattern: new RegExp('potass' + OCR_L + 'um' + S + '[:\\s]?' + S + V + S + 'm?g', 'i'), key: 'potassium' },
    { pattern: new RegExp('v' + OCR_L + 'tam' + OCR_L + 'n' + S + 'a' + S + '[:\\s]?' + S + V + S + 'm?cg', 'i'), key: 'vitaminA' },
    { pattern: new RegExp('v' + OCR_L + 'tam' + OCR_L + 'n' + S + 'c' + S + '[:\\s]?' + S + V + S + 'm?g', 'i'), key: 'vitaminC' },
    { pattern: new RegExp('v' + OCR_L + 'tam' + OCR_L + 'n' + S + 'e' + S + '[:\\s]?' + S + V + S + 'm?g', 'i'), key: 'vitaminE' },
    { pattern: new RegExp('v' + OCR_L + 'tam' + OCR_L + 'n' + S + 'k' + S + '[:\\s]?' + S + V + S + 'm?cg', 'i'), key: 'vitaminK' },
    { pattern: new RegExp('th' + OCR_L + 'am' + OCR_L + 'n' + S + '[:\\s]?' + S + V + S + 'm?g', 'i'), key: 'thiamin' },
    { pattern: new RegExp('r' + OCR_L + 'bof' + OCR_L + 'av' + OCR_L + 'n' + S + '[:\\s]?' + S + V + S + 'm?g', 'i'), key: 'riboflavin' },
    { pattern: new RegExp('n' + OCR_L + 'ac' + OCR_L + 'n' + S + '[:\\s]?' + S + V + S + 'm?g', 'i'), key: 'niacin' },
    { pattern: new RegExp('v' + OCR_L + 'tam' + OCR_L + 'n' + S + 'b-?6' + S + '[:\\s]?' + S + V + S + 'm?g', 'i'), key: 'vitaminB6' },
    { pattern: new RegExp('fo' + OCR_L + 'ate' + S + '[:\\s]?' + S + V + S + 'm?cg', 'i'), key: 'folate' },
    { pattern: new RegExp('v' + OCR_L + 'tam' + OCR_L + 'n' + S + 'b-?12' + S + '[:\\s]?' + S + V + S + 'm?cg', 'i'), key: 'vitaminB12' },
    { pattern: new RegExp('phosphorus' + S + '[:\\s]?' + S + V + S + 'm?g', 'i'), key: 'phosphorus' },
    { pattern: new RegExp('magnes' + OCR_L + 'um' + S + '[:\\s]?' + S + V + S + 'm?g', 'i'), key: 'magnesium' },
    { pattern: new RegExp('z' + OCR_L + 'nc' + S + '[:\\s]?' + S + V + S + 'm?g', 'i'), key: 'zinc' }
];

var SERVING_SIZE_PATTERN = new RegExp('serv' + OCR_L + 'ng' + S + 's' + OCR_L + 'ze' + S + '[:\\s]?' + S + '([\\d.\\/]+)' + S + '([a-zA-Z()\\/\\s]+?)(?:\\s*\\([\\d.]+\\s*g\\))?$', 'im');

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
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        var ctx = canvas.getContext('2d');

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        var data = imageData.data;

        var sumGray = 0;
        var pixelCount = data.length / 4;
        for (var i = 0; i < data.length; i += 4) {
            sumGray += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        }
        var avgGray = sumGray / pixelCount;
        var threshold = avgGray > 160 ? 140 : avgGray > 100 ? 120 : 100;

        for (var j = 0; j < data.length; j += 4) {
            var gray = 0.299 * data[j] + 0.587 * data[j + 1] + 0.114 * data[j + 2];
            var bw = gray > threshold ? 255 : 0;
            data[j] = bw;
            data[j + 1] = bw;
            data[j + 2] = bw;
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
        .replace(/\r\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n');

    for (var i = 0; i < LABEL_PATTERNS.length; i++) {
        var match = cleaned.match(LABEL_PATTERNS[i].pattern);
        if (match) {
            var numStr = match[1].replace(/,/g, '');
            results[LABEL_PATTERNS[i].key] = parseFloat(numStr);
        }
    }

    if (Object.keys(results).length < 3) {
        var collapsed = cleaned.replace(/\n/g, ' ').replace(/\s{2,}/g, ' ');
        for (var j = 0; j < LABEL_PATTERNS.length; j++) {
            if (results[LABEL_PATTERNS[j].key] != null) continue;
            var match2 = collapsed.match(LABEL_PATTERNS[j].pattern);
            if (match2) {
                var numStr2 = match2[1].replace(/,/g, '');
                results[LABEL_PATTERNS[j].key] = parseFloat(numStr2);
            }
        }
    }

    var servingMatch = cleaned.match(SERVING_SIZE_PATTERN);
    if (!servingMatch) {
        var collapsed2 = cleaned.replace(/\n/g, ' ').replace(/\s{2,}/g, ' ');
        servingMatch = collapsed2.match(SERVING_SIZE_PATTERN);
    }
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
