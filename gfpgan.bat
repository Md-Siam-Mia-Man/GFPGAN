@echo off

:: Activate the conda environment for GFPGAN
CALL "C:\ProgramData\<your anaconda distribution name>\Scripts\activate.bat" GFPGAN

:: Navigate to the GFPGAN directory (Change path according to yourself)
cd /D path/to/your/GFPGAN

:: Run the GFPGAN web interface script
python gfpgan.py