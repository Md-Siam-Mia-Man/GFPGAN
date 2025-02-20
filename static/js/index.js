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

const progressNotification = document.getElementById('progress-notification'); // Get notification element
const downloadProgressPercentage = document.getElementById('download-progress-percentage'); // Corrected ID
const downloadProgressFill = document.getElementById('download-progress-fill'); // Corrected ID
const downloadSpeedDisplay = document.getElementById('download-speed');
const errorNotification = document.getElementById('error-notification'); // Error notification
const errorMessageHeader = document.getElementById('error-message-header');
const errorMessageDetail = document.getElementById('error-message-detail');


fileDropArea.addEventListener('click', () => fileInput.click());

fileDropArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    fileDropArea.style.borderColor = 'white';
});

fileDropArea.addEventListener('dragleave', () => {
    fileDropArea.style.borderColor = 'white';
});

fileDropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    fileDropArea.style.borderColor = 'white';
    const files = e.dataTransfer.files;
    fileInput.files = files;
    toggleUploadButton(files.length);

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

    document.getElementById('uploaded-count').style.display = 'block';
    document.getElementById('uploaded-count').innerText = files.length + ' Image(s) Added';
});

fileInput.addEventListener('change', () => {
    const files = Array.from(fileInput.files);
    const uploadedCount = files.length;
    document.getElementById('uploaded-count').innerText = uploadedCount + ' Image(s) Added';

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
    toggleUploadButton(uploadedCount);
});

function toggleUploadButton(count) {
    uploadButton.disabled = count === 0;
}

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
            if (!response.ok) { // Check for error HTTP status
                return response.json().then(errData => { // Parse error JSON
                    throw new Error(`${response.status} ${response.statusText}: ${errData.message}`); // Create error with message
                });
            }
            return response.json(); // Proceed with parsing JSON for success
        })
        .then(data => {
            if (data.status === 'success') {
                updateEnhancedImages(data.images);
                progressContainer.style.display = 'none';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            progressContainer.style.display = 'none'; // Hide progress bar on error
            showErrorNotification("Image Enhancement Failed", error.message || "An unexpected error occurred during image enhancement."); // Show error notification
        });
});

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

function clearHistory() {
    fetch('/clear_history', {
        method: 'POST',
    }).then(response => {
        if (response.redirected) {
            window.location.href = response.url;
        }
    });
}

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
                }
            }
        });
}

function reloadUI() {
    window.location.reload();
}

function toggleThemeMenu() {
    themeMenu.style.display = themeMenu.style.display === 'block' ? 'none' : 'block';
}

function applyTheme(theme) {
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
    } else if (theme === 'pink') {
        document.documentElement.style.setProperty('--color-1', '#F48FB1');
        document.documentElement.style.setProperty('--color-2', '#E91E63');
        document.documentElement.style.setProperty('--color-3', '#FCE4EC');
        document.documentElement.style.setProperty('--color-4', '#F8BBD0');
    }
    themeMenu.style.display = 'none';
}

function showErrorNotification(header, message) {
    errorMessageHeader.textContent = header;
    errorMessageDetail.textContent = message;
    errorNotification.style.display = 'block'; // Show error notification
    setTimeout(() => {
        errorNotification.style.display = 'none'; // Hide after a delay (e.g., 5 seconds)
    }, 5000); // Adjust timeout as needed
}


// Initialize model download status via SSE
const eventSource = new EventSource('/initialize_models');

eventSource.onmessage = function (event) {
    const data = JSON.parse(event.data);
    if (data.status === 'downloading') {
        progressNotification.style.display = 'block'; // Show notification
        downloadProgressPercentage.textContent = data.percentage + '%'; // Corrected ID
        downloadProgressFill.style.width = data.percentage + '%'; // Corrected ID
        downloadSpeedDisplay.textContent = data.speed;

    } else if (data.status === 'completed') {
        progressNotification.style.display = 'none'; // Hide notification on complete
    } else if (data.status === 'info') {
        gpuNameElement.textContent = data.gpu_detected;
        halfPrecisionElement.textContent = data.half_precision;
    } else if (data.status === 'ready') {
        progressNotification.style.display = 'none'; // Ensure download notification is hidden when ready
    } else if (data.status === 'error') {
        progressNotification.style.display = 'none'; // Hide download notification
        showErrorNotification("Model Initialization Error", data.message || "Failed to initialize models."); // Show error notification for model init failure
    }
};

eventSource.onerror = function (error) {
    console.error("SSE error:", error);
    eventSource.close();
    progressNotification.style.display = 'none'; // Hide notification on SSE error
    showErrorNotification("Connection Error", "Error connecting to server for model download updates."); // Show error for SSE connection issues
};