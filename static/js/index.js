const fileDropArea = document.getElementById('file-drop-area');
const fileInput = document.getElementById('file-input');
const progressContainer = document.getElementById('progress-container');
const uploadedImagesGallery = document.getElementById('uploaded-images');
const restoredImagesGallery = document.getElementById('restored-images');
const enhanceButton = document.getElementById('enhance-btn');
const downloadAllButton = document.getElementById('download-all-button');
const themeMenu = document.getElementById('theme-menu');
const themeToggle = document.getElementById('theme-toggle');
const closeThemeMenu = document.getElementById('close-theme-menu');
const gpuNameElement = document.getElementById('gpu-name');
const halfPrecisionElement = document.getElementById('half-precision');
const uploadedCountElement = document.getElementById('uploaded-count');

const progressNotification = document.getElementById('progress-notification');
const downloadProgressPercentage = document.getElementById('download-progress-percentage');
const downloadProgressFill = document.getElementById('download-progress-fill');
const downloadSpeedDisplay = document.getElementById('download-speed');
const errorNotification = document.getElementById('error-notification');
const errorMessageHeader = document.getElementById('error-message-header');
const errorMessageDetail = document.getElementById('error-message-detail');
const downloadingModelNameElement = document.getElementById('downloading-model-name');

// File Drop Functionality
fileDropArea.addEventListener('click', () => fileInput.click());

fileDropArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    fileDropArea.style.borderColor = 'var(--primary)';
    fileDropArea.style.backgroundColor = 'rgba(0, 150, 136, 0.1)';
});

fileDropArea.addEventListener('dragleave', () => {
    fileDropArea.style.borderColor = 'var(--primary-light)';
    fileDropArea.style.backgroundColor = 'rgba(0, 150, 136, 0.05)';
});

fileDropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    fileDropArea.style.borderColor = 'var(--primary-light)';
    fileDropArea.style.backgroundColor = 'rgba(0, 150, 136, 0.05)';
    const files = e.dataTransfer.files;
    fileInput.files = files;
    updateUploadedCount(files.length);
    uploadedImagesGallery.innerHTML = '';
    Array.from(files).forEach(file => createImagePreview(file, uploadedImagesGallery, true));
    toggleEnhanceButton(files.length);
});

fileInput.addEventListener('change', () => {
    const files = Array.from(fileInput.files);
    updateUploadedCount(files.length);
    uploadedImagesGallery.innerHTML = '';
    files.forEach(file => createImagePreview(file, uploadedImagesGallery, true));
    toggleEnhanceButton(files.length);
});

function updateUploadedCount(count) {
    uploadedCountElement.textContent = count + ' image(s) selected';
    uploadedCountElement.style.display = count > 0 ? 'block' : 'none';
}

function toggleEnhanceButton(count) {
    enhanceButton.disabled = count === 0;
}

function createImagePreview(file, container, isUpload = false) {
    const imageContainer = document.createElement('div');
    imageContainer.className = 'image-container';
    if (isUpload) imageContainer.id = `uploaded-${file.name}`;

    const image = document.createElement('img');
    image.src = isUpload ? URL.createObjectURL(file) : `/output/${file}`;
    image.alt = isUpload ? file.name : file;

    const overlay = document.createElement('div');
    overlay.className = 'image-overlay';

    if (isUpload) {
        const removeButton = document.createElement('button');
        removeButton.className = 'overlay-btn';
        removeButton.innerHTML = '<span class="material-symbols-outlined">delete</span>';
        removeButton.onclick = () => removeImage(file.name);
        overlay.appendChild(removeButton);
    } else {
        const downloadButton = document.createElement('button');
        downloadButton.className = 'overlay-btn';
        downloadButton.innerHTML = '<span class="material-symbols-outlined">download</span>';
        downloadButton.onclick = () => downloadImage(file);
        overlay.appendChild(downloadButton);
    }

    imageContainer.appendChild(image);
    imageContainer.appendChild(overlay);
    container.appendChild(imageContainer);
}

// Form Submission
document.getElementById('upload-form').addEventListener('submit', function (e) {
    e.preventDefault();
    progressContainer.style.display = 'block';
    fileDropArea.style.display = 'none';
    enhanceButton.disabled = true;

    const formData = new FormData(this);
    fetch('/', {
        method: 'POST',
        body: formData
    })
        .then(response => {
            if (!response.ok) {
                return response.json().then(errData => {
                    throw new Error(`${response.status} ${response.statusText}: ${errData.message}`);
                });
            }
            return response.json();
        })
        .then(data => {
            if (data.status === 'success') {
                updateEnhancedImages(data.images);
                progressContainer.style.display = 'none';
                fileDropArea.style.display = 'block';
                enhanceButton.disabled = false;
            }
        })
        .catch(error => {
            console.error('Error:', error);
            progressContainer.style.display = 'none';
            fileDropArea.style.display = 'block';
            enhanceButton.disabled = false;
            showErrorNotification("Image Enhancement Failed", error.message || "An unexpected error occurred");
        });
});

function updateEnhancedImages(images) {
    restoredImagesGallery.innerHTML = '';
    images.forEach(image => createImagePreview(image, restoredImagesGallery));
    downloadAllButton.disabled = images.length === 0;
}

function downloadImage(filename) {
    fetch(`/output/${filename}`).then(response => response.blob()).then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    });
}

function downloadAll() {
    fetch('/download_all', { method: 'POST' }).then(response => response.blob()).then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'Enhanced-Images.zip';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    });
}

function clearHistory() {
    fetch('/clear_history', { method: 'POST' }).then(response => {
        if (response.redirected) window.location.href = response.url;
    });
}

function removeImage(filename) {
    fetch('/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remove_file: filename })
    })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                const uploadedImageElement = document.getElementById(`uploaded-${filename}`);
                if (uploadedImageElement) {
                    uploadedImageElement.remove();
                    const remainingFiles = Array.from(fileInput.files).filter(file => file.name !== filename);
                    const dataTransfer = new DataTransfer();
                    remainingFiles.forEach(file => dataTransfer.items.add(file));
                    fileInput.files = dataTransfer.files;
                    updateUploadedCount(fileInput.files.length);
                    toggleEnhanceButton(fileInput.files.length);
                }
            }
        });
}

function reloadUI() {
    window.location.reload();
}

// Theme Functionality
themeToggle.addEventListener('click', () => themeMenu.classList.toggle('active'));
closeThemeMenu.addEventListener('click', () => themeMenu.classList.remove('active'));

document.querySelectorAll('.theme-option').forEach(option => {
    option.addEventListener('click', () => {
        const theme = option.dataset.theme;
        applyTheme(theme);
        document.querySelectorAll('.theme-option').forEach(opt => opt.classList.remove('active'));
        option.classList.add('active');
        localStorage.setItem('selectedTheme', theme);
    });
});

function applyTheme(theme) {
    let primary, primaryLight, secondary, accent, dark, light, success, danger, background;

    switch (theme) {
        case 'minimalistic':
            primary = '#000000';      // Light Gray
            primaryLight = '#878787'; // White (lighter shade)
            secondary = '#818181';    // Cool Gray
            accent = '#6B7280';      // Gray
            dark = '#1F2937';        // Dark Gray (Text)
            light = '#FFFFFF';       // White (for cards)
            success = '#10B981';     // Green
            danger = '#EF4444';      // Red
            background = '#F9FAFB';  // Light Gray
            break;

        case 'nature':
            primary = '#A3B18A';      // Moss Green
            primaryLight = '#C1CDAF'; // Lighter Moss Green
            secondary = '#3A5A40';    // Dark Green (Highlight)
            accent = '#588157';      // Olive Green
            dark = '#2B2D42';        // Deep Charcoal (Text)
            light = '#FFFFFF';       // White (for cards)
            success = '#4CAF50';     // Green
            danger = '#D32F2F';      // Red
            background = '#FAF3E0';  // Cream
            break;

        case 'pastel':
            primary = '#ff0026';      // Light Pink
            primaryLight = '#ff0000'; // Lighter Pink
            secondary = '#ff0000';    // Sky Blue (Highlight)
            accent = '#B5EAD7';       // Mint Green
            dark = '#4B5563';        // Soft Gray (Text)
            light = '#FFFFFF';       // White (for cards)
            success = '#4CAF50';     // Green
            danger = '#D32F2F';      // Red
            background = '#FDF6F0';   // Creamy White
            break;

        default: // Default theme
            primary = '#009688';
            primaryLight = '#52c7b8';
            secondary = '#00b9a7';
            accent = '#00BCD4';
            dark = '#121212';
            light = '#ffffff';
            success = '#4CAF50';
            danger = '#F44336';
            background = '#f3f4f6';
            break;
    }

    // Apply the CSS variables
    document.documentElement.style.setProperty('--primary', primary);
    document.documentElement.style.setProperty('--primary-light', primaryLight);
    document.documentElement.style.setProperty('--secondary', secondary);
    document.documentElement.style.setProperty('--accent', accent);
    document.documentElement.style.setProperty('--dark', dark);
    document.documentElement.style.setProperty('--light', light);
    document.documentElement.style.setProperty('--success', success);
    document.documentElement.style.setProperty('--danger', danger);
    document.documentElement.style.setProperty('--background', background);


    // Adjust drop-area background tint based on theme
    const tintColor = theme === 'minimalistic' ? '249, 250, 251' : // #F9FAFB
        theme === 'dark-neon' ? '79, 70, 229' :      // #4F46E5
            theme === 'nature' ? '163, 177, 138' :      // #A3B18A
                theme === 'vibrant' ? '255, 61, 0' :        // #FF3D00
                    theme === 'sunset' ? '255, 126, 95' :       // #FF7E5F
                        theme === 'cyberpunk' ? '230, 0, 255' :     // #E600FF
                            theme === 'pastel' ? '255, 182, 193' :      // #FFB6C1
                                theme === 'corporate' ? '30, 58, 138' :     // #1E3A8A
                                    '0, 150, 136';                              // Default #009688
    fileDropArea.style.backgroundColor = `rgba(${tintColor}, 0.05)`;
    fileDropArea.addEventListener('dragover', () => fileDropArea.style.backgroundColor = `rgba(${tintColor}, 0.1)`);
    fileDropArea.addEventListener('dragleave', () => fileDropArea.style.backgroundColor = `rgba(${tintColor}, 0.05)`);
    fileDropArea.addEventListener('drop', () => fileDropArea.style.backgroundColor = `rgba(${tintColor}, 0.05)`);
}

function loadTheme() {
    const selectedTheme = localStorage.getItem('selectedTheme') || 'default';
    applyTheme(selectedTheme);
    document.querySelectorAll('.theme-option').forEach(opt => {
        opt.classList.remove('active');
        if (opt.dataset.theme === selectedTheme) opt.classList.add('active');
    });
}

// Call on page load
document.addEventListener('DOMContentLoaded', loadTheme);

// Notifications
function showErrorNotification(header, message) {
    errorMessageHeader.textContent = header;
    errorMessageDetail.textContent = message;
    errorNotification.style.display = 'block';
    setTimeout(() => errorNotification.style.display = 'none', 5000);
}

// SSE for Model Downloading
let eventSource;

function startEventSource() {
    eventSource = new EventSource('/initialize_models');
    eventSource.onmessage = function (event) {
        const data = JSON.parse(event.data);
        if (data.status === 'downloading') {
            progressNotification.style.display = 'block';
            downloadProgressPercentage.textContent = data.percentage + '%';
            downloadProgressFill.style.width = data.percentage + '%';
            downloadSpeedDisplay.textContent = data.speed;
            downloadingModelNameElement.textContent = `Downloading Model: ${data.model_name}`;
        } else if (data.status === 'completed' || data.status === 'ready') {
            progressNotification.style.display = 'none';
            downloadingModelNameElement.textContent = `Downloading Model Files`;
        } else if (data.status === 'info') {
            gpuNameElement.textContent = data.gpu_detected;
            halfPrecisionElement.textContent = data.half_precision;
        } else if (data.status === 'model_init_error') {
            progressNotification.style.display = 'none';
            downloadingModelNameElement.textContent = `Downloading Model Files`;
            showErrorNotification("Model Initialization Error", `Error: ${data.error_message}`);
        }
    };

    eventSource.onerror = function () {
        if (eventSource.readyState === EventSource.CLOSED) {
            showErrorNotification("Model Download Failed", "Attempting to Reconnect");
            setTimeout(startEventSource, 3000);
        }
    };
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadTheme();
    startEventSource();
});