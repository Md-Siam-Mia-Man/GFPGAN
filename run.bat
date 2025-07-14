@echo off
TITLE GFPGAN Project Setup & Launcher

:: =================================================================
:: == GFPGAN AUTOMATED SETUP & LAUNCH SCRIPT
:: == This script will:
:: == 1. Automatically find your Anaconda/Miniconda installation.
:: == 2. Check if the 'GFPGAN' conda environment exists.
:: == 3. If not, it will create it and install all dependencies.
:: ==    - It will detect NVIDIA GPUs and ask which CUDA version to use.
:: == 4. Activate the environment and run the Web UI.
:: =================================================================

ECHO.
ECHO  /-------------------------------------\
ECHO  |  GFPGAN Setup & Launcher Script   |
ECHO  \-------------------------------------/
ECHO.

:: --- Step 1: Find Conda Installation ---
ECHO [+] Searching for Anaconda or Miniconda installation...
SET "CONDA_PATH="
IF EXIST "%ProgramData%\Anaconda3\Scripts\conda.exe" SET "CONDA_PATH=%ProgramData%\Anaconda3"
IF EXIST "%ProgramData%\Miniconda3\Scripts\conda.exe" SET "CONDA_PATH=%ProgramData%\Miniconda3"
IF EXIST "%LOCALAPPDATA%\Continuum\anaconda3\Scripts\conda.exe" SET "CONDA_PATH=%LOCALAPPDATA%\Continuum\anaconda3"
IF EXIST "%LOCALAPPDATA%\Programs\miniconda3\Scripts\conda.exe" SET "CONDA_PATH=%LOCALAPPDATA%\Programs\miniconda3"
IF EXIST "%LOCALAPPDATA%\Programs\anaconda3\Scripts\conda.exe" SET "CONDA_PATH=%LOCALAPPDATA%\Programs\anaconda3"

IF NOT DEFINED CONDA_PATH (
    ECHO.
    ECHO [ERROR] Could not find Anaconda or Miniconda installation.
    ECHO Please make sure conda is installed and accessible.
    PAUSE
    EXIT /B 1
)
ECHO     Found Conda at: %CONDA_PATH%
ECHO.

:: --- Step 2: Check if GFPGAN Environment Exists ---
ECHO [+] Checking for 'GFPGAN' conda environment...
CALL "%CONDA_PATH%\Scripts\activate.bat" > NUL 2>&1
conda env list | findstr /I /C:"GFPGAN" > NUL
IF ERRORLEVEL 1 (
    ECHO     Environment 'GFPGAN' not found. Starting setup process...
    GOTO :SETUP
) ELSE (
    ECHO     Environment 'GFPGAN' already exists. Skipping setup.
    GOTO :LAUNCH
)

:SETUP
ECHO.
ECHO  /-------------------------------------\
ECHO  |  ONE-TIME ENVIRONMENT SETUP         |
ECHO  \-------------------------------------/
ECHO.

:: 3a. Create the environment
ECHO [+] Creating 'GFPGAN' environment with Python 3.7...
conda create -n GFPGAN python=3.7 -y
IF ERRORLEVEL 1 (
    ECHO [ERROR] Failed to create conda environment.
    PAUSE
    EXIT /B 1
)
ECHO.

:: Activate the new environment to install packages into it
CALL "%CONDA_PATH%\Scripts\activate.bat" GFPGAN

:: 3b. Install PyTorch (GPU or CPU)
ECHO [+] Detecting hardware for PyTorch installation...
SET "HAS_NVIDIA=0"
wmic path win32_VideoController get name | findstr /i "NVIDIA" > NUL
IF NOT ERRORLEVEL 1 SET "HAS_NVIDIA=1"

IF "%HAS_NVIDIA%"=="1" (
    ECHO     NVIDIA GPU Detected!
    ECHO.
    ECHO Please select the CUDA version supported by your PyTorch installation.
    ECHO If unsure, check NVIDIA's website or choose CPU mode.
    ECHO.
    ECHO  1. CUDA 11.8 (Recommended for many modern cards)
    ECHO  2. CUDA 12.1 (For the latest cards and drivers)
    ECHO  3. I don't have a supported NVIDIA GPU / Use CPU Mode
    ECHO.
    CHOICE /C 123 /M "Enter your choice: "
    SET CUDA_CHOICE=%ERRORLEVEL%
    
    IF "%CUDA_CHOICE%"=="1" (
        ECHO [+] Installing PyTorch for CUDA 11.8...
        conda install pytorch torchvision torchaudio pytorch-cuda=11.8 -c pytorch -c nvidia -y
    )
    IF "%CUDA_CHOICE%"=="2" (
        ECHO [+] Installing PyTorch for CUDA 12.1...
        conda install pytorch torchvision torchaudio pytorch-cuda=12.1 -c pytorch -c nvidia -y
    )
    IF "%CUDA_CHOICE%"=="3" (
        ECHO [+] Installing PyTorch for CPU...
        conda install pytorch torchvision torchaudio cpuonly -c pytorch -y
    )
) ELSE (
    ECHO     No NVIDIA GPU detected. Installing CPU-only version of PyTorch.
    conda install pytorch torchvision torchaudio cpuonly -c pytorch -y
)

IF ERRORLEVEL 1 (
    ECHO [ERROR] Failed to install PyTorch.
    PAUSE
    EXIT /B 1
)
ECHO.

:: 3c. Install pip dependencies
ECHO [+] Installing other required packages from requirements.txt...
pip install -r requirements.txt
IF ERRORLEVEL 1 (
    ECHO [ERROR] Failed to install packages from requirements.txt.
    PAUSE
    EXIT /B 1
)

ECHO.
ECHO [SUCCESS] Environment setup is complete!
ECHO.

:LAUNCH
ECHO  /-------------------------------------\
ECHO  |  LAUNCHING THE WEB UI               |
ECHO  \-------------------------------------/
ECHO.

ECHO [+] Activating 'GFPGAN' environment...
CALL "%CONDA_PATH%\Scripts\activate.bat" GFPGAN
ECHO.
ECHO [+] Starting the Python application...
ECHO     Open your web browser and go to http://127.0.0.1:3005
ECHO.
python app.py

ECHO.
ECHO Application has been closed.
PAUSE