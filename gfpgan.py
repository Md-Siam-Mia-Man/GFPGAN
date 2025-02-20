import os
import secrets
import requests
import json
import subprocess
import time
import torch
from flask import (
    Flask,
    request,
    send_from_directory,
    session,
    redirect,
    url_for,
    jsonify,
)
from werkzeug.utils import secure_filename
import cv2
from basicsr.utils import imwrite
from gfpgan import GFPGANer
from realesrgan import RealESRGANer
from basicsr.archs.rrdbnet_arch import RRDBNet
import zipfile
import threading
import logging # Import logging module
from requests.adapters import Retry, HTTPAdapter # Import for retry mechanism
from requests.exceptions import RequestException # Import for catching request exceptions

app = Flask(__name__)

# Generate a random secret key
app.secret_key = secrets.token_hex(16)

# Create directories for input and output
UPLOAD_FOLDER = "Input"
OUTPUT_FOLDER = "Output"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

# Model paths
GFPGAN_MODEL_PATH = "gfpgan/weights/GFPGANv1.4.pth"
REALESRGAN_MODEL_PATH = "gfpgan/weights/RealESRGAN_x4plus.pth"
DETECTION_MODEL_PATH = "gfpgan/weights/detection_Resnet50_Final.pth"
PARSING_MODEL_PATH = "gfpgan/weights/parsing_parsenet.pth"

# Initialize GFPGAN and Real-ESRGAN
gfpganer = None
bg_upsampler = None
model_initialization_lock = threading.Lock()
model_initialized = False

version_file = "gfpgan/version.py"

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__) # Get logger instance


def readme():
    with open("README.md", encoding="utf-8") as f:
        content = f.read()
    return content


def get_git_hash():
    def _minimal_ext_cmd(cmd):
        env = {
            k: v for k, v in os.environ.items() if k in ["SYSTEMROOT", "PATH", "HOME"]
        }
        env.update({"LANGUAGE": "C", "LANG": "C", "LC_ALL": "C"})
        out = subprocess.Popen(cmd, stdout=subprocess.PIPE, env=env).communicate()[0]
        return out

    try:
        out = _minimal_ext_cmd(["git", "rev-parse", "HEAD"])
        sha = out.strip().decode("ascii")
    except OSError:
        sha = "unknown"

    return sha


def get_hash():
    if os.path.exists(".git"):
        sha = get_git_hash()[:7]
    else:
        sha = "unknown"
    return sha


def write_version_py():
    content = """# GENERATED VERSION FILE
# TIME: {}
__version__ = '{}'
__gitsha__ = '{}'
version_info = ({})
"""
    sha = get_hash()
    with open("VERSION", "r") as f:
        SHORT_VERSION = f.read().strip()
    VERSION_INFO = ", ".join(
        [x if x.isdigit() else f'"{x}"' for x in SHORT_VERSION.split(".")]
    )

    version_file_str = content.format(time.asctime(), SHORT_VERSION, sha, VERSION_INFO)
    with open(version_file, "w") as f:
        f.write(version_file_str)


def get_version():
    with open(version_file, "r") as f:
        exec(compile(f.read(), version_file, "exec"))
    return locals()["__version__"]


def get_requirements(filename="requirements.txt"):
    here = os.path.dirname(os.path.realpath(__file__))
    with open(os.path.join(here, filename), "r") as f:
        requires = [line.replace("\n", "") for line in f.readlines()]
    return requires


def format_size(bytes):
    if bytes < 1024:
        return f"{bytes} B"
    elif bytes < 1024 * 1024:
        return f"{bytes / 1024:.2f} KB"
    elif bytes < 1024 * 1024 * 1024:
        return f"{bytes / (1024 * 1024):.2f} MB"
    else:
        return f"{bytes / (1024 * 1024 * 1024):.2f} GB"

def download_model(url, destination, model_name): # Added model_name
    logger.info(f"Downloading model: {model_name} from {url} to {destination}") # Log model download start

    session = requests.Session()
    retry_strategy = Retry(
        total=5, # Number of retries
        status_forcelist=[429, 500, 502, 503, 504], # Status codes to retry on
        method_whitelist=["HEAD", "GET", "OPTIONS"] # Methods to retry
    )
    adapter = HTTPAdapter(max_retries=retry_strategy)
    session.mount("https://", adapter)
    session.mount("http://", adapter)


    try:
        response = session.get(url, stream=True, timeout=10) # Added timeout
        response.raise_for_status()  # Raise HTTPError for bad responses (4xx or 5xx)
        total_size = int(response.headers.get("content-length", 0))
        downloaded_size = 0
        start_time = time.time()
        last_bytes_downloaded = 0
        last_time = start_time

        with open(destination, "wb") as file:
            for data in response.iter_content(chunk_size=1024):
                file.write(data)
                downloaded_size += len(data)

                current_time = time.time()
                time_interval = current_time - last_time
                bytes_in_interval = downloaded_size - last_bytes_downloaded

                if time_interval >= 0.1:  # Update speed every 100ms
                    speed_bps = bytes_in_interval / time_interval
                    speed_kbs = speed_bps / 1024
                    yield {
                        "status": "downloading",
                        "model_name": model_name, # Include model_name in update
                        "progress": (downloaded_size / total_size) * 100,
                        "percentage": int(
                            (downloaded_size / total_size) * 100
                        ),  # Adding percentage for frontend
                        "speed": format_size(int(speed_bps))
                        + "/s",  # Speed in KB/s or MB/s
                    }
                    last_bytes_downloaded = downloaded_size
                    last_time = current_time

        yield {"status": "completed", "model_name": model_name} # Indicate completion and model_name

    except RequestException as e: # Catch request exceptions for more robust error handling
        logger.error(f"Download failed for model {model_name} from {url} to {destination}. Error: {e}") # Log detailed error
        if os.path.exists(destination): # Remove partially downloaded file if download failed
            os.remove(destination)
        yield {"status": "error", "model_name": model_name, "error_message": str(e)} # Yield error status and message


def initialize_models():
    global gfpganer, bg_upsampler, model_initialized
    with model_initialization_lock:
        if model_initialized:
            return

        model_paths = [
            (
                GFPGAN_MODEL_PATH,
                "https://github.com/TencentARC/GFPGAN/releases/download/v1.3.4/GFPGANv1.4.pth",
                "GFPGANv1.4"
            ),
            (
                REALESRGAN_MODEL_PATH,
                "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/RealESRGAN_x4plus.pth",
                "RealESRGAN_x4plus"
            ),
            (
                DETECTION_MODEL_PATH,
                "https://github.com/xinntao/facexlib/releases/download/v0.1.0/detection_Resnet50_Final.pth",
                "Face Detection"
            ),
            (
                PARSING_MODEL_PATH,
                "https://github.com/xinntao/facexlib/releases/download/v0.2.2/parsing_parsenet.pth",
                "Face Parsing"
            ),
        ]

        for path, url, model_name in model_paths:
            if not os.path.exists(path):
                os.makedirs("gfpgan/weights", exist_ok=True)
                for update in download_model(url, path, model_name):
                    yield update
                    if update.get("status") == "error":
                        yield {"status": "model_init_error", "model_name": model_name, "error_message": update.get("error_message")}
                        return

        gfpganer = GFPGANer(
            model_path=GFPGAN_MODEL_PATH,
            upscale=2,
            arch="clean",
            channel_multiplier=2,
            bg_upsampler=None,
        )

        bg_model = RRDBNet(
            num_in_ch=3,
            num_out_ch=3,
            num_feat=64,
            num_block=23,
            num_grow_ch=32,
            scale=4,
        )

        half_precision = torch.cuda.is_available()
        gpu_name = torch.cuda.get_device_name(0) if half_precision else "CPU"

        bg_upsampler = RealESRGANer(
            scale=2,
            model_path=REALESRGAN_MODEL_PATH,
            model=bg_model,
            tile=0,
            tile_pad=10,
            pre_pad=0,
            half=half_precision,
        )
        gfpganer.bg_upsampler = bg_upsampler
        model_initialized = True

        yield {
            "status": "info",
            "gpu_detected": gpu_name,
            "half_precision": half_precision,
        }
        yield {"status": "ready"}


@app.route("/", methods=["GET", "POST"])
def index():
    if request.method == "POST":
        # Ensure models are initialized
        if not model_initialized:
            for _ in initialize_models():
                pass  # Wait for models to initialize

        upscale_factor = int(request.form.get("upscale_factor", 4))
        gfpganer.upscale = upscale_factor

        uploaded_files = request.files.getlist("files[]")
        processed_images = []

        for uploaded_file in uploaded_files:
            filename = secure_filename(uploaded_file.filename)
            input_path = os.path.join(UPLOAD_FOLDER, filename)
            output_filename = f"Enhanced_{os.path.splitext(filename)[0]}.png"
            output_path = os.path.join(OUTPUT_FOLDER, output_filename)

            uploaded_file.save(input_path)

            try:
                img = cv2.imread(input_path, cv2.IMREAD_COLOR)
                if img is None:
                    raise ValueError(f"Corrupted file: {filename}")

                _, _, output = gfpganer.enhance(
                    img, has_aligned=False, only_center_face=False, paste_back=True
                )

                imwrite(output, output_path)

                # Verify the file was written correctly
                if not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
                    raise IOError(f"Failed to write file: {output_filename}")

                processed_images.append(output_filename)
            except Exception as e:
                logger.error(f"Error processing file {filename}: {e}") # Log error during processing

        return jsonify({"status": "success", "images": processed_images})

    return send_from_directory("static", "index.html")


@app.route("/initialize_models", methods=["GET"])
def initialize_models_route():
    def generate():
        for update in initialize_models():
            yield f"data: {json.dumps(update)}\n\n"

    return app.response_class(generate(), mimetype="text/event-stream")


@app.route("/output/<filename>")
def output(filename):
    return send_from_directory(OUTPUT_FOLDER, filename)


@app.route("/input/<filename>")
def input_images(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)


@app.route("/clear_history", methods=["POST"])
def clear_history():
    session.clear()

    for folder in [UPLOAD_FOLDER, OUTPUT_FOLDER]:
        for filename in os.listdir(folder):
            file_path = os.path.join(folder, filename)
            try:
                if os.path.isfile(file_path) or os.path.islink(file_path):
                    os.unlink(file_path)
            except Exception as e:
                logger.error(f"Failed to delete {file_path}. Reason: {e}") # Log error during clear history

    return redirect(url_for("index"))


@app.route("/download_all", methods=["POST"])
def download_all():
    zip_path = os.path.join(OUTPUT_FOLDER, "Enhanced-Images.zip")
    with zipfile.ZipFile(zip_path, "w") as zipf:
        for file_name in os.listdir(OUTPUT_FOLDER):
            file_path = os.path.join(OUTPUT_FOLDER, file_name)
            if os.path.isfile(file_path):
                try:
                    # Check if the file is readable and not empty
                    with open(file_path, "rb") as f:
                        if os.path.getsize(file_path) > 0:
                            zipf.writestr(file_name, f.read())
                        else:
                            raise IOError(f"File is empty: {file_name}")
                except Exception as e:
                    logger.error(f"Error adding file {file_name} to zip: {e}") # Log error during zip creation

    return send_from_directory(OUTPUT_FOLDER, "Enhanced-Images.zip", as_attachment=True)


@app.route("/remove", methods=["POST"])
def remove_file():
    data = request.get_json()
    filename = data.get("remove_file")
    if filename:
        file_path = os.path.join(UPLOAD_FOLDER, filename)
        if os.path.exists(file_path):
            os.remove(file_path)
            return jsonify({"status": "success"})
    return jsonify({"status": "failure"})


if __name__ == "__main__":
    write_version_py()
    app.run(host="0.0.0.0", port=3005, debug=True)
