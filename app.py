# app.py
import os
import cv2
import json
import yaml
import torch
import zipfile
import threading
import requests

from flask import (Flask, request, send_from_directory, jsonify)
from werkzeug.utils import secure_filename
from basicsr.utils import imwrite
from basicsr.archs.rrdbnet_arch import RRDBNet
from requests.adapters import HTTPAdapter
from requests.exceptions import RequestException
from gfpgan import GFPGANer
from realesrgan import RealESRGANer

# --- 1. Configuration and Globals ---
try:
    with open('config.yaml', 'r') as f:
        config = yaml.safe_load(f)
except Exception as e:
    print(f"FATAL: Could not load config.yaml. Error: {e}")
    exit()

def get_app_version():
    try:
        with open('VERSION', 'r') as f:
            return f.read().strip()
    except FileNotFoundError:
        return "N/A"

APP_VERSION = get_app_version()
app = Flask(__name__)
UPLOAD_FOLDER = config['input_folder']
OUTPUT_FOLDER = config['output_folder']
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

gfpganer = None
model_lock = threading.Lock()

# --- 2. Core Model Loading Function ---
def ensure_models_loaded():
    global gfpganer
    with model_lock:
        if gfpganer is None:
            print("--- First request: Initializing models. This may take a moment... ---")
            
            for model_info in config['models'].values():
                if not os.path.exists(model_info['path']):
                    print(f"Downloading required model: {model_info['name']}...")
                    os.makedirs(os.path.dirname(model_info['path']), exist_ok=True)
                    response = requests.get(model_info['url'], stream=True)
                    response.raise_for_status()
                    with open(model_info['path'], 'wb') as f:
                        for chunk in response.iter_content(chunk_size=8192): f.write(chunk)
                    print(f"Download complete: {model_info['name']}")

            model_paths = config['models']
            half_precision = torch.cuda.is_available()
            bg_upsampler = RealESRGANer(
                scale=4,
                model_path=model_paths['realesrgan']['path'],
                model=RRDBNet(num_in_ch=3, num_out_ch=3, num_feat=64, num_block=23, num_grow_ch=32, scale=4),
                tile=config['bg_tile_size'],
                half=half_precision
            )
            gfpganer = GFPGANer(
                model_path=model_paths['gfpgan']['path'],
                upscale=config['default_upscale_factor'],
                arch='clean',
                channel_multiplier=2,
                bg_upsampler=bg_upsampler
            )
            print("--- Models loaded successfully into memory. ---")

# --- 3. Flask Routes ---
@app.route("/")
def serve_ui():
    """Serves the main HTML user interface at the root URL."""
    return send_from_directory("static", "index.html")

@app.route("/api/info")
def get_app_info():
    """Provides initial info to the frontend on page load."""
    gpu_name = torch.cuda.get_device_name(0) if torch.cuda.is_available() else "CPU"
    return jsonify({'app_version': APP_VERSION, 'gpu_name': gpu_name})

@app.route('/static/<path:path>')
def send_static(path):
    return send_from_directory('static', path)

@app.route("/process", methods=["POST"])
def process_route():
    try:
        ensure_models_loaded()
    except Exception as e:
        print(f"FATAL ERROR: Could not load models. {e}")
        return jsonify({"status": "error", "message": f"Model loading failed: {e}"}), 500
        
    use_bg_upsampler = request.form.get('bg_upscale') == 'on'
    if gfpganer and hasattr(gfpganer, 'bg_upsampler'):
        if use_bg_upsampler:
            gfpganer.bg_upsampler.model_path = config['models']['realesrgan']['path'] # Ensure it's set
        else:
            gfpganer.bg_upsampler = None # Disable for this run
    
    processed_images = []
    for file in request.files.getlist("files[]"):
        filename = secure_filename(file.filename)
        input_path = os.path.join(UPLOAD_FOLDER, filename)
        output_filename = f"Enhanced_{os.path.splitext(filename)[0]}.png"
        output_path = os.path.join(OUTPUT_FOLDER, output_filename)
        file.save(input_path)
        try:
            img = cv2.imread(input_path, cv2.IMREAD_COLOR)
            if img is None: continue
            _, _, output = gfpganer.enhance(img, has_aligned=False, only_center_face=False, paste_back=True)
            imwrite(output, output_path)
            processed_images.append(output_filename)
        except Exception as e:
            print(f"Error processing {filename}: {e}")
    return jsonify({"status": "success", "images": processed_images})

@app.route("/output/<filename>")
def output_file_route(filename):
    return send_from_directory(OUTPUT_FOLDER, filename)

@app.route("/clear", methods=["POST"])
def clear_route():
    for folder in [UPLOAD_FOLDER, OUTPUT_FOLDER]:
        for filename in os.listdir(folder):
            file_path = os.path.join(folder, filename)
            if os.path.isfile(file_path): os.unlink(file_path)
    return jsonify({"status": "cleared"})

@app.route("/download_all", methods=["POST"])
def download_all_route():
    zip_path = os.path.join(OUTPUT_FOLDER, "Enhanced-Images.zip")
    with zipfile.ZipFile(zip_path, 'w') as zipf:
        for filename in os.listdir(OUTPUT_FOLDER):
            if filename.endswith(".png"):
                zipf.write(os.path.join(OUTPUT_FOLDER, filename), arcname=filename)
    return send_from_directory(OUTPUT_FOLDER, "Enhanced-Images.zip", as_attachment=True)

if __name__ == "__main__":
    host = config['server']['host']
    port = config['server']['port']
    print(f"--- GFPGAN UI v{APP_VERSION} ---")
    print(f"Server is running. Open your browser to: http://127.0.0.1:{port}")
    print("NOTE: The first image enhancement will be slow as models are loaded into memory.")
    app.run(host=host, port=port, debug=False)