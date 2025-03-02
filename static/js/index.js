const fileDropArea = document.getElementById('file-drop-area');
const fileInput = document.getElementById('file-input');
const progressBar = document.getElementById('progress-bar');
const progressContainer = document.getElementById('progress-container');
const imagePreviewsDiv = document.querySelector('.uploaded-images');
const restoredPreviewsDiv = document.querySelector('.restored-images');
const uploadButton = document.querySelector('.upload-button');
const downloadAllButton = document.getElementById('download-all-button');
const themeMenu = document.getElementById('theme-menu');
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

let eventSource;

// Function to start the EventSource connection
function startEventSource() {
    if (!eventSource || eventSource.readyState === EventSource.CLOSED) {
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

        eventSource.onerror = function (event) {
            console.error("EventSource failed:", event);
            if (eventSource.readyState === EventSource.CLOSED) {
                showErrorNotification("Model Download Failed", "Attempting to Reconnect");
                // Retry connection after a delay
                setTimeout(startEventSource, 3000);
            }
        };

        eventSource.onopen = function (event) {
            console.log("EventSource opened:", event);
        };
    }
}

// Load the saved theme when the page is loaded
function loadTheme() {
    const selectedTheme = localStorage.getItem('selectedTheme');
    if (selectedTheme) {
        applyTheme(selectedTheme);
    }
}

// Apply a theme based on the selected theme
function applyTheme(theme) {
    localStorage.setItem('selectedTheme', theme);
    if (theme === 'gfpgan') {
        document.documentElement.style.setProperty('--color-1', '#FE8863');
        document.documentElement.style.setProperty('--color-2', '#D93B2C');
        document.documentElement.style.setProperty('--color-3', '#F3CDBF');
        document.documentElement.style.setProperty('--color-4', '#E7C9C0');
    } else if (theme === 'black') {
        document.documentElement.style.setProperty('--color-1', '#444');
        document.documentElement.style.setProperty('--color-2', '#eee');
        document.documentElement.style.setProperty('--color-3', '#222');
        document.documentElement.style.setProperty('--color-4', '#111');
    } else if (theme === 'light') {
        document.documentElement.style.setProperty('--color-1', '#bbb');
        document.documentElement.style.setProperty('--color-2', '#333');
        document.documentElement.style.setProperty('--color-3', '#ddd');
        document.documentElement.style.setProperty('--color-4', '#fff');
    } else if (theme === 'crimson') {
        document.documentElement.style.setProperty('--color-1', '#ff0056');
        document.documentElement.style.setProperty('--color-2', '#ff0056');
        document.documentElement.style.setProperty('--color-3', '#FFFFFF');
        document.documentElement.style.setProperty('--color-4', '#FFFFFF');
    }
    themeMenu.style.display = 'none';
}

// Show error notifications
function showErrorNotification(header, message) {
    errorMessageHeader.textContent = header;
    errorMessageDetail.textContent = message;
    errorNotification.style.display = 'block';
    setTimeout(() => {
        errorNotification.style.display = 'none';
    }, 5000);
}

// Toggle the theme menu visibility
function toggleThemeMenu() {
    themeMenu.style.display = themeMenu.style.display === 'block' ? 'none' : 'block';
}

// Toggle the upload button based on the number of files
function toggleUploadButton(count) {
    uploadButton.disabled = count === 0;
}

// Handle file drop area click to open file input
fileDropArea.addEventListener('click', () => fileInput.click());

// Handle dragover event to change border color
fileDropArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    fileDropArea.style.borderColor = 'var(--color-2)';
});

// Handle dragleave event to reset border color
fileDropArea.addEventListener('dragleave', () => {
    fileDropArea.style.borderColor = 'var(--color-1)';
});

// Handle drop event to process dropped files
fileDropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    fileDropArea.style.borderColor = 'var(--color-1)';
    const files = e.dataTransfer.files;
    fileInput.files = files;
    updateUploadedCount(files.length);

    imagePreviewsDiv.innerHTML = '';
    Array.from(files).forEach(file => {
        const previewContainer = document.createElement('div');
        previewContainer.className = 'preview-image-container';
        previewContainer.id = `uploaded-${file.name}`;

        const previewImg = document.createElement('img');
        previewImg.src = URL.createObjectURL(file);
        previewImg.className = 'preview-image';

        const removeButton = document.createElement('button');
        removeButton.className = 'icon-button-overlay';
        removeButton.innerHTML = '<span class="material-symbols-outlined">cancel</span>';
        removeButton.onclick = () => removeImage(file.name);

        previewContainer.appendChild(previewImg);
        previewContainer.appendChild(removeButton);
        imagePreviewsDiv.appendChild(previewContainer);
    });

    uploadedCountElement.style.display = 'block';
    toggleUploadButton(files.length);
});

// Handle file input change event
fileInput.addEventListener('change', () => {
    const files = Array.from(fileInput.files);
    updateUploadedCount(files.length);

    imagePreviewsDiv.innerHTML = '';
    files.forEach(file => {
        const previewContainer = document.createElement('div');
        previewContainer.className = 'preview-image-container';
        previewContainer.id = `uploaded-${file.name}`;

        const previewImg = document.createElement('img');
        previewImg.src = URL.createObjectURL(file);
        previewImg.className = 'preview-image';

        const removeButton = document.createElement('button');
        removeButton.className = 'icon-button-overlay';
        removeButton.innerHTML = '<span class="material-symbols-outlined">cancel</span>';
        removeButton.onclick = () => removeImage(file.name);

        previewContainer.appendChild(previewImg);
        previewContainer.appendChild(removeButton);
        imagePreviewsDiv.appendChild(previewContainer);
    });
    toggleUploadButton(files.length);
});

// Handle form submission
document.getElementById('upload-form').addEventListener('submit', function (e) {
    e.preventDefault();
    progressContainer.style.display = 'block';
    progressBar.style.animationPlayState = 'running';
    fileDropArea.style.display = 'none';
    uploadButton.style.display = 'none';
    document.querySelector('button[onclick="toggleThemeMenu()"]').style.display = 'none';

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
            }
        })
        .catch(error => {
            console.error('Error:', error);
            progressContainer.style.display = 'none';
            showErrorNotification("Image Enhancement Failed", error.message || "An unexpected error occurred");
        });
});

// Update the enhanced images display
function updateEnhancedImages(images) {
    restoredPreviewsDiv.innerHTML = '';
    images.forEach(image => {
        const previewContainer = document.createElement('div');
        previewContainer.className = 'preview-image-container';

        const imgElement = document.createElement('img');
        imgElement.src = `/output/${image}`;
        imgElement.className = 'preview-image';

        const downloadButton = document.createElement('button');
        downloadButton.className = 'icon-button-overlay';
        downloadButton.innerHTML = '<span class="material-symbols-outlined">download</span>';
        downloadButton.onclick = () => downloadImage(image);

        previewContainer.appendChild(imgElement);
        previewContainer.appendChild(downloadButton);
        restoredPreviewsDiv.appendChild(previewContainer);
    });
    downloadAllButton.disabled = images.length === 0;
}

// Download a single image
function downloadImage(filename) {
    fetch(`/output/${filename}`, {
        method: 'GET',
    }).then(response => response.blob()).then(blob => {
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

// Download all enhanced images as a zip file
function downloadAll() {
    fetch('/download_all', {
        method: 'POST',
    }).then(response => response.blob()).then(blob => {
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

// Clear the history of uploaded and enhanced images
function clearHistory() {
    fetch('/clear_history', {
        method: 'POST',
    }).then(response => {
        if (response.redirected) {
            window.location.href = response.url;
        }
    });
}

// Remove a specific image from the uploaded list
function removeImage(filename) {
    fetch('/remove', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ remove_file: filename }),
    })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                const uploadedImageElement = document.getElementById(`uploaded-${filename}`);
                if (uploadedImageElement) {
                    uploadedImageElement.remove();
                    const remainingFiles = Array.from(fileInput.files).filter(file => file.name !== filename);
                    fileInput.files = new DataTransfer().files;
                    remainingFiles.forEach(file => fileInput.files.add(file));
                    updateUploadedCount(fileInput.files.length);
                }
            }
        });
}

// Reload the UI
function reloadUI() {
    window.location.reload();
}

// Load the saved theme and start the EventSource connection when the page loads
loadTheme();
startEventSource();