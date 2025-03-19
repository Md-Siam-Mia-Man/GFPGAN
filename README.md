<img src="https://github.com/Md-Siam-Mia-Code/GFPGAN/blob/main/assets/Banner.png"></img>
# 🌟 GFPGAN Image Enhancer
# 💻 WebUI
<img src="https://github.com/Md-Siam-Mia-Code/GFPGAN/blob/main/assets/GFPGAN.png"></img>

## 🗂 Table of Contents
- 📖 [Introduction](#-introduction)
- ✨ [Features](#-features)
- 🛠️ [Installation](#️-installation)
- 💻 [Usage](#-usage)
- 🤝 [Contributing](#-contributing)
- 📜 [License](#-license)

---

## 📖 Introduction
GFPGAN Image Enhancement is a powerful tool designed to enhance and restore images using advanced deep-learning techniques. This project leverages [**GFPGAN**](https://github.com/TencentARC/GFPGAN) and [**Real-ESRGAN** ](https://github.com/xinntao/Real-ESRGAN) models to improve image quality, making them sharper and more detailed.

---

## ✨ Features
- 🚀 **Image Enhancement:** Uses **GFPGAN** and **Real-ESRGAN** models for high-quality image restoration.
- ⚡ **GPU Support:** Automatically utilizes available GPUs for faster processing.
- 🧪 **Half Precision:** Supports half precision for better performance on compatible GPUs.
- 🖥️ **Web Interface:** User-friendly web interface for easy image uploading and enhancement.
- 📢 **Real-Time Notifications:** Displays download progress and real-time GPU detection status.
- 🕊️ **Simplicity:** Simple installation process and user-friendly.
- 🖱️ **Drag and Drop Support:** Enjoy the ease of drag and drop functionality for file uploads.
- 🚋 **Batch Processing:** Upscale multiple images simultaneously and download them as a single ZIP file.
- 🧱 **Preview Grid:** View previews of both original and processed images side-by-side within the browser.
- 🏎️ **Download Options:** Download enhanced images individually or as a batch in a ZIP archive for convenience.
- 💻 **Responsive Design:**  The interface is designed to be responsive and work seamlessly across desktop and mobile browsers.

---

## 🛠️ Installation
### 📋 Prerequisites
- 🐉 [Anaconda](https://www.anaconda.com/download) or [Miniconda](https://docs.conda.io/projects/conda/en/stable/user-guide/install/index.html)
- 🐍 [Python](https://www.python.org/) 3.7 or Higher
- 📦 [pip](https://pypi.org/project/pip/) (Python Package Installer)
- ♨️ [PyTorch](https://pytorch.org/) >= 1.7
- ➕ [Git](https://git-scm.com/) Installed
- ❗[NVIDIA GPU](https://www.nvidia.com/en-us/geforce/graphics-cards/) + [CUDA](https://developer.nvidia.com/cuda-downloads) (Optional)
- 🐧[Linux](https://www.linux.org/pages/download/) (Optional)

### 💾 Steps
1. **Clone the Repository**
```bash
git clone https://github.com/Md-Siam-Mia-Code/GFPGAN.git
cd GFPGAN
```

2. **Create a Virtual Environment**
```bash
conda create -n GFPGAN python=3.7 -y
conda activate GFPGAN
```
3. **Install PyTorch**
 ```bash
# Try to make sure your drivers are updated
# For NVIDIA GPU
conda install pytorch torchvision torchaudio pytorch-cuda=<your_cuda_version> -c pytorch -c nvidia -y

# For CPU
conda install pytorch torchvision torchaudio cpuonly -c pytorch -y
```

4. **Install Dependencies**
```bash
pip install -r requirements.txt
```

5. **Run Setup**
```bash
python setup.py develop
```
6. **Download Models**
   🚀 *The models will be automatically downloaded when you run the application for the first time.*

---

## 💻 Usage
### ▶️ Running the Application
**Start the Flask Server:**
```bash
python gfpgan.py
```

**For one-click RUN**
    Create a new GFPGAN.bat Batch File on your GFPGAN directory using the script given below:

    @echo off

    :: Activate the conda environment for GFPGAN
    CALL "C:\ProgramData\<Your Anaconda distribution name>\Scripts\activate.bat" GFPGAN

    :: Navigate to the GFPGAN directory (Change path according to yours)
    cd /D path/to/your/GFPGAN
    
    :: Run the GFPGAN web interface script
    python gfpgan.py

**Access the Web Interface:**  
🌐 Open your browser and visit: [http://127.0.0.1:3005](http://127.0.0.1:3005)

### 📸 Enhancing Images
- **Upload Images:** Drag and drop or select `.jpg`, `.jpeg`, and `.png` files.
- **Enhance:** Click the "✨ Enhance" button.
- **View:** Enhanced images will appear in the results section.
- **Download:** Save results individually or as a ZIP file using the "📥 Download All" button.
- **Clear History:** Clear both input and output images from the server with one click.
- **Reload Backend:** A dedicated button to reload your backend.

---

## 🤝 Contributing
🎉 **Contributions are welcome!** 
- 🌟 Fork the repository
- 📂 Create a new branch (`git checkout -b feature/YourFeature`)
- 📝 Commit your changes (`git commit -m 'Add some feature'`)
- 📤 Push to the branch (`git push origin feature/YourFeature`)
- 🔃 Open a Pull Request

---

## 📜 License
The main source code and models are provided by an open-source project named [GFPGAN](https://github.com/TencentARC/GFPGAN) by [TencentARC](https://github.com/TencentARC/GFPGAN)

---

### 🎨 Emojis & Style Highlights
- 🚀 **Features**: Image enhancement, GPU support, half precision.
- 🛠️ **Installation**: Simple and easy setup.
- 💻 **Usage**: Seamless web interface.
- 🤝 **Contributing**: Open for community collaboration.
- 📜 **License**: Open-source.

# ❤️ *Happy Enhancing!* 💯
