
const imageInput = document.getElementById("imageInput");
const previewImage = document.getElementById("previewImage");
const emptyState = document.getElementById("emptyState");
const imageInfo = document.getElementById("imageInfo");
const status = document.getElementById("status");
const message = document.getElementById("message");
const compareBtn = document.getElementById("compareBtn");
const downloadBtn = document.getElementById("downloadBtn");
const resetBtn = document.getElementById("resetBtn");
const intensity = document.getElementById("intensity");
const intensityValue = document.getElementById("intensityValue");
const toolButtons = [...document.querySelectorAll(".tool-btn")];

const operations = {
    "Grayscale": "grayscale",
    "Negative": "negative",
    "RGB Channels": "red",
    "Average Blur": "average_blur",
    "Gaussian Blur": "gaussian_blur",
    "Median Blur": "median_blur",
    "Bilateral Blur": "bilateral_blur",
    "Sharpen": "sharpen",
    "Unsharp Mask": "unsharp_mask",
    "Sobel": "sobel",
    "Canny": "canny",
    "Laplacian": "laplacian",
    "Brightness": "brightness",
    "Contrast": "contrast",
    "Threshold": "threshold",
    "Histogram Equalization": "histogram_equalization"
};

let originalImage = "";
let processedImage = "";
let currentFilename = "processed-image.png";
let showingOriginal = false;
let selectedOperation = null;
let processing = false;

function showMessage(text, isError = false) {
    message.textContent = text;
    message.classList.toggle("error", isError);
}

function setToolsEnabled(enabled) {
    toolButtons.forEach(button => {
        button.disabled = !enabled;
    });

    intensity.disabled = !enabled;
}

function showCurrentImage() {
    previewImage.src = showingOriginal ? originalImage : processedImage;
    compareBtn.textContent = showingOriginal
        ? "Show Processed Image"
        : "Show Original";

    status.textContent = showingOriginal
        ? "Original Image"
        : selectedOperation
            ? "Processed Image"
            : "Original Image";
}

async function runProcessing() {
    if (!originalImage || !selectedOperation || processing) return;

    processing = true;
    status.textContent = "Processing...";
    showMessage("Applying " + selectedOperation.replaceAll("_", " ") + "...");

    try {
        const response = await fetch("/process", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                image: originalImage,
                operation: selectedOperation,
                intensity: Number(intensity.value)
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Processing failed.");
        }

        processedImage = data.image;
        showingOriginal = false;
        showCurrentImage();
        showMessage("Processing completed successfully.");
    } catch (error) {
        showMessage(error.message, true);
        status.textContent = "Error";
    } finally {
        processing = false;
    }
}

imageInput.addEventListener("change", async () => {
    const file = imageInput.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
        showMessage("Please select a valid image.", true);
        imageInput.value = "";
        return;
    }

    const formData = new FormData();
    formData.append("image", file);

    status.textContent = "Uploading...";
    showMessage("Uploading image...");
    setToolsEnabled(false);

    try {
        const response = await fetch("/upload", {
            method: "POST",
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Upload failed.");
        }

        originalImage = data.image;
        processedImage = data.image;
        selectedOperation = null;
        showingOriginal = false;

        currentFilename =
            file.name.replace(/\.[^.]+$/, "") + "-processed.png";

        previewImage.src = originalImage;
        previewImage.hidden = false;
        emptyState.hidden = true;

        imageInfo.textContent =
            `${data.width} × ${data.height} pixels · ${file.name}`;

        compareBtn.disabled = false;
        downloadBtn.disabled = false;
        setToolsEnabled(true);

        status.textContent = "Image Loaded";
        showMessage("Image ready. Select a processing operation.");
    } catch (error) {
        showMessage(error.message, true);
        status.textContent = "Upload Failed";
    }
});

toolButtons.forEach(button => {
    button.addEventListener("click", async () => {
        if (!originalImage) return;

        const operation = operations[button.textContent.trim()];

        if (!operation) {
            showMessage("This operation is not configured yet.", true);
            return;
        }

        selectedOperation = operation;
        showingOriginal = false;

        toolButtons.forEach(item => item.classList.remove("active"));
        button.classList.add("active");

        await runProcessing();
    });
});

intensity.addEventListener("input", () => {
    intensityValue.textContent = intensity.value;
});

intensity.addEventListener("change", runProcessing);

compareBtn.addEventListener("click", () => {
    if (!originalImage) return;

    showingOriginal = !showingOriginal;
    showCurrentImage();
});

downloadBtn.addEventListener("click", () => {
    if (!processedImage) return;

    const link = document.createElement("a");
    link.href = processedImage;
    link.download = currentFilename;
    link.click();
});

resetBtn.addEventListener("click", () => {
    imageInput.value = "";
    originalImage = "";
    processedImage = "";
    selectedOperation = null;
    showingOriginal = false;

    previewImage.src = "";
    previewImage.hidden = true;
    emptyState.hidden = false;

    imageInfo.textContent = "No image uploaded";
    status.textContent = "Waiting";
    compareBtn.textContent = "Show Original";
    compareBtn.disabled = true;
    downloadBtn.disabled = true;

    intensity.value = 50;
    intensityValue.textContent = "50";

    toolButtons.forEach(button => button.classList.remove("active"));
    setToolsEnabled(false);
    showMessage("Upload an image to get started.");
});

setToolsEnabled(false);
