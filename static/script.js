
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
const toolButtons = document.querySelectorAll(".tool-btn");

let originalImage = "";
let processedImage = "";
let showingOriginal = false;
let originalLocked = false;
let isProcessing = false;
let currentFilename = "processed-image.png";
let lastTapTime = 0;
let holdActive = false;
let holdPointerId = null;

function showMessage(text, isError = false) {
    message.textContent = text;
    message.classList.toggle("error", isError);
}

function updatePreview() {
    if (!originalImage || !processedImage) return;

    previewImage.src = showingOriginal
        ? originalImage
        : processedImage;
}

function updateStatus() {
    if (isProcessing) {
        status.textContent = "Processing...";
    } else if (!originalImage) {
        status.textContent = "Waiting";
    } else if (showingOriginal) {
        status.textContent = originalLocked
            ? "Original Locked"
            : "Original Image";
    } else {
        status.textContent = "Processed Image";
    }
}

function showOriginal() {
    if (!originalImage || !processedImage) return;

    showingOriginal = true;
    updatePreview();
    updateStatus();
}

function showProcessed() {
    if (!originalImage || !processedImage) return;

    showingOriginal = false;
    updatePreview();
    updateStatus();
}

function enableTools(enabled) {
    toolButtons.forEach(button => {
        button.disabled = !enabled || isProcessing;
    });

    intensity.disabled = !enabled || isProcessing;
    compareBtn.disabled = !enabled || isProcessing;
    downloadBtn.disabled = !enabled || isProcessing;
    resetBtn.disabled = isProcessing;
}

function resetComparison() {
    originalLocked = false;
    holdActive = false;
    holdPointerId = null;
    lastTapTime = 0;
    showingOriginal = false;
}

// Upload an image
imageInput.addEventListener("change", async () => {
    const file = imageInput.files[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
        showMessage("Please select a valid image.", true);
        return;
    }

    const formData = new FormData();
    formData.append("image", file);

    status.textContent = "Uploading...";
    showMessage("Uploading and validating your image...");

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
        resetComparison();

        currentFilename =
            file.name.replace(/\.[^.]+$/, "") + "-processed.png";

        previewImage.src = processedImage;
        previewImage.hidden = false;
        emptyState.hidden = true;

        imageInfo.textContent =
            `${data.width} × ${data.height} pixels · ${file.name}`;

        enableTools(true);
        updateStatus();
        showMessage(
            "Image uploaded successfully. Choose a processing operation."
        );

    } catch (error) {
        showMessage(error.message || "Unable to upload the image.", true);
        status.textContent = "Upload Failed";
    }
});

// Apply a filter through the Flask backend
toolButtons.forEach(button => {
    button.addEventListener("click", async () => {
        const operation = button.dataset.operation;

        if (!originalImage || isProcessing) return;

        isProcessing = true;
        enableTools(true);
        updateStatus();
        showMessage(`Applying ${button.textContent}...`);

        try {
            const response = await fetch("/process", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    image: originalImage,
                    operation: operation,
                    intensity: Number(intensity.value)
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error || "Image processing failed."
                );
            }

            if (!data.image) {
                throw new Error("The server did not return a processed image.");
            }

            processedImage = data.image;
            resetComparison();

            updatePreview();
            updateStatus();
            showMessage(`${button.textContent} applied successfully.`);

        } catch (error) {
            showMessage(
                error.message || "Image processing failed.",
                true
            );
        } finally {
            isProcessing = false;
            enableTools(Boolean(originalImage));
            updateStatus();
        }
    });
});

// Show Original: hold temporarily, or double-tap to lock
compareBtn.addEventListener("pointerdown", event => {
    if (compareBtn.disabled || isProcessing) return;

    event.preventDefault();

    const now = Date.now();
    const isDoubleTap =
        lastTapTime !== 0 && now - lastTapTime <= 350;

    lastTapTime = now;

    if (isDoubleTap) {
        // Prevent the second tap from acting like a temporary hold.
        holdActive = false;
        holdPointerId = null;
        originalLocked = !originalLocked;

        if (originalLocked) {
            showOriginal();
        } else {
            showProcessed();
        }

        try {
            compareBtn.setPointerCapture(event.pointerId);
        } catch (_) {}

        return;
    }

    holdActive = true;
    holdPointerId = event.pointerId;

    if (originalLocked) {
        showOriginal();
    } else {
        showOriginal();
    }

    try {
        compareBtn.setPointerCapture(event.pointerId);
    } catch (_) {}
});

function finishHold(event) {
    if (!holdActive) return;

    if (
        event &&
        holdPointerId !== null &&
        event.pointerId !== holdPointerId
    ) {
        return;
    }

    holdActive = false;
    holdPointerId = null;

    if (!originalLocked) {
        showProcessed();
    }
}

compareBtn.addEventListener("pointerup", finishHold);
compareBtn.addEventListener("pointercancel", finishHold);
compareBtn.addEventListener("lostpointercapture", finishHold);

compareBtn.addEventListener("contextmenu", event => {
    event.preventDefault();
});

// Download the processed image
downloadBtn.addEventListener("click", () => {
    if (!processedImage) return;

    const link = document.createElement("a");
    link.href = processedImage;
    link.download = currentFilename;

    document.body.appendChild(link);
    link.click();
    link.remove();
});

// Reset the workspace
resetBtn.addEventListener("click", () => {
    imageInput.value = "";
    originalImage = "";
    processedImage = "";

    resetComparison();

    previewImage.src = "";
    previewImage.hidden = true;
    emptyState.hidden = false;

    imageInfo.textContent = "No image uploaded";

    intensity.value = 50;
    intensityValue.textContent = "50";

    enableTools(false);
    updateStatus();

    showMessage("Upload an image to get started.");
});

// Update intensity display
intensity.addEventListener("input", () => {
    intensityValue.textContent = intensity.value;
});
