// static/js/index.js
document.addEventListener("DOMContentLoaded", () => {
  // --- Element Selectors ---
  const fileDropArea = document.getElementById("file-drop-area");
  const fileInput = document.getElementById("file-input");
  const uploadForm = document.getElementById("upload-form");
  const processingIndicator = document.getElementById("processing-indicator");
  const processingText = document.getElementById("processing-text");
  const uploadedImagesContainer = document.getElementById("uploaded-images");
  const restoredImagesContainer = document.getElementById("restored-images");
  const enhanceBtn = document.getElementById("enhance-btn");
  const downloadAllBtn = document.getElementById("download-all-btn");
  const gpuNameEl = document.getElementById("gpu-name");
  const halfPrecisionEl = document.getElementById("half-precision");
  const appVersionEl = document.getElementById("app-version");
  const uploadedCountEl = document.getElementById("uploaded-count");
  const bgUpscaleCheckbox = document.getElementById("bg-upscale-checkbox");

  let uploadedFiles = [];
  let isFirstRun = true;

  // --- App Initialization ---
  function initializeApp() {
    fetch("/api/info") // MODIFIED: Fetches from the new API endpoint
      .then((res) => res.json())
      .then((data) => {
        appVersionEl.textContent = data.app_version;
        gpuNameEl.textContent = data.gpu_name;
        const isCPU = data.gpu_name.toLowerCase() === "cpu";
        halfPrecisionEl.textContent = isCPU ? "Disabled" : "Enabled";
      })
      .catch((err) => {
        console.error("Could not fetch app info:", err);
        appVersionEl.textContent = "N/A";
        gpuNameEl.textContent = "Error";
      });
  }

  // --- File Handling & UI Updates ---
  fileDropArea.addEventListener("click", () => fileInput.click());
  fileDropArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    fileDropArea.classList.add("dragover");
  });
  fileDropArea.addEventListener("dragleave", () =>
    fileDropArea.classList.remove("dragover")
  );
  fileDropArea.addEventListener("drop", (e) => {
    e.preventDefault();
    fileDropArea.classList.remove("dragover");
    handleFiles(e.dataTransfer.files);
  });
  fileInput.addEventListener("change", () => handleFiles(fileInput.files));

  function handleFiles(files) {
    uploadedFiles = Array.from(files);
    updateUploadedPreviews();
    enhanceBtn.disabled = uploadedFiles.length === 0;
  }

  function updateUploadedPreviews() {
    uploadedImagesContainer.innerHTML = "";
    uploadedFiles.forEach((file) =>
      createImagePreview(file, uploadedImagesContainer, true)
    );
    uploadedCountEl.textContent =
      uploadedFiles.length > 0
        ? `${uploadedFiles.length} image(s) selected`
        : "";
  }

  function createImagePreview(file, container, isUpload) {
    const imageName = isUpload ? file.name : file;
    const imageSrc = isUpload
      ? URL.createObjectURL(file)
      : `/output/${imageName}`;
    const wrapper = document.createElement("div");
    wrapper.className = "image-container";
    const img = document.createElement("img");
    img.src = imageSrc;
    const overlay = document.createElement("div");
    overlay.className = "image-overlay";
    const button = document.createElement("button");
    button.className = "overlay-btn";
    if (isUpload) {
      button.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
      button.onclick = () => {
        uploadedFiles = uploadedFiles.filter((f) => f.name !== imageName);
        updateUploadedPreviews();
        enhanceBtn.disabled = uploadedFiles.length === 0;
      };
    } else {
      button.innerHTML = '<i class="fa-solid fa-download"></i>';
      button.onclick = () => (window.location.href = `/output/${imageName}`);
    }
    overlay.appendChild(button);
    wrapper.appendChild(img);
    wrapper.appendChild(overlay);
    container.appendChild(wrapper);
  }

  // --- Server Communication ---
  uploadForm.addEventListener("submit", function (e) {
    e.preventDefault();
    processingText.textContent = isFirstRun
      ? "First run: Loading models... this will be slow."
      : "Enhancing images, please wait...";
    processingIndicator.style.display = "flex";
    enhanceBtn.disabled = true;

    const formData = new FormData();
    uploadedFiles.forEach((file) => formData.append("files[]", file));
    if (bgUpscaleCheckbox.checked) {
      formData.append("bg_upscale", "on");
    }

    fetch("/process", { method: "POST", body: formData })
      .then((res) => {
        if (!res.ok) {
          return res.json().then((err) => {
            throw new Error(err.message);
          });
        }
        return res.json();
      })
      .then((data) => {
        if (data.status === "success") {
          isFirstRun = false;
          restoredImagesContainer.innerHTML = "";
          data.images.forEach((filename) =>
            createImagePreview(filename, restoredImagesContainer, false)
          );
          downloadAllBtn.disabled = data.images.length === 0;
        }
      })
      .catch((err) => {
        alert(`An error occurred: ${err.message}`);
        console.error(err);
      })
      .finally(() => {
        processingIndicator.style.display = "none";
        enhanceBtn.disabled = uploadedFiles.length === 0;
      });
  });

  // --- Global Helper Functions ---
  window.clearHistory = () => {
    fetch("/clear", { method: "POST" }).then(() => {
      uploadedFiles = [];
      updateUploadedPreviews();
      restoredImagesContainer.innerHTML = "";
      enhanceBtn.disabled = true;
      downloadAllBtn.disabled = true;
    });
  };

  window.downloadAll = () => {
    fetch("/download_all", { method: "POST" })
      .then((res) => res.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "Enhanced-Images.zip";
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      });
  };

  // --- Start the App ---
  initializeApp();
});
