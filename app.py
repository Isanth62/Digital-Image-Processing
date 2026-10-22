
from flask import Flask, render_template, request, jsonify
from PIL import Image, UnidentifiedImageError
from processing.filters import apply_filter
import io
import base64
import cv2
import numpy as np

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp"}


def image_to_data_url(image):
    success, encoded = cv2.imencode(".png", image)

    if not success:
        raise ValueError("Could not encode the processed image.")

    data = base64.b64encode(encoded.tobytes()).decode("utf-8")
    return "data:image/png;base64," + data


def decode_data_url(data_url):
    if not isinstance(data_url, str) or "," not in data_url:
        raise ValueError("Invalid image data.")

    header, encoded = data_url.split(",", 1)

    if header != "data:image/png;base64":
        raise ValueError("Unsupported image data format.")

    raw = base64.b64decode(encoded, validate=True)
    array = np.frombuffer(raw, dtype=np.uint8)
    image = cv2.imdecode(array, cv2.IMREAD_COLOR)

    if image is None:
        raise ValueError("Could not read the image.")

    if image.shape[0] * image.shape[1] > 16_000_000:
        raise ValueError("Image dimensions are too large.")

    return image


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/upload", methods=["POST"])
def upload_image():
    if "image" not in request.files:
        return jsonify({"error": "No image was selected."}), 400

    file = request.files["image"]

    if not file.filename:
        return jsonify({"error": "Please select an image."}), 400

    if "." not in file.filename:
        return jsonify({"error": "Unsupported file type."}), 400

    extension = file.filename.rsplit(".", 1)[-1].lower()

    if extension not in ALLOWED_EXTENSIONS:
        return jsonify({"error": "Upload PNG, JPG, JPEG, or WEBP."}), 400

    try:
        with Image.open(file.stream) as source:
            source.load()
            image = source.convert("RGB")

        width, height = image.size

        if width * height > 16_000_000:
            return jsonify({"error": "Image dimensions are too large."}), 400

        buffer = io.BytesIO()
        image.save(buffer, format="PNG")
        encoded = base64.b64encode(buffer.getvalue()).decode("utf-8")

        return jsonify({
            "image": "data:image/png;base64," + encoded,
            "width": width,
            "height": height,
            "filename": file.filename
        })

    except (UnidentifiedImageError, OSError, Image.DecompressionBombError):
        return jsonify({"error": "The uploaded file is not a valid image."}), 400


@app.route("/process", methods=["POST"])
def process_image():
    data = request.get_json(silent=True) or {}

    try:
        image = decode_data_url(data.get("image"))
        operation = data.get("operation")
        intensity = int(data.get("intensity", 50))

        if not isinstance(operation, str):
            return jsonify({"error": "Choose a valid operation."}), 400

        result = apply_filter(image, operation, intensity)

        return jsonify({
            "image": image_to_data_url(result),
            "operation": operation
        })

    except (ValueError, TypeError, cv2.error) as error:
        return jsonify({"error": str(error)}), 400

    except Exception:
        app.logger.exception("Unexpected image-processing error")
        return jsonify({"error": "Image processing failed."}), 500


if __name__ == "__main__":
    app.run(debug=True)
