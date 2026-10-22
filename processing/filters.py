
import cv2
import numpy as np


def apply_filter(image, operation, intensity=50):
    intensity = max(0, min(100, int(intensity)))
    img = image.copy()

    if operation == "grayscale":
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        return cv2.cvtColor(gray, cv2.COLOR_GRAY2BGR)

    elif operation == "negative":
        return 255 - img

    elif operation == "red":
        result = np.zeros_like(img)
        result[:, :, 2] = img[:, :, 2]
        return result

    elif operation == "green":
        result = np.zeros_like(img)
        result[:, :, 1] = img[:, :, 1]
        return result

    elif operation == "blue":
        result = np.zeros_like(img)
        result[:, :, 0] = img[:, :, 0]
        return result

    elif operation == "average_blur":
        k = max(1, int(intensity / 5) * 2 + 1)
        return cv2.blur(img, (k, k))

    elif operation == "gaussian_blur":
        k = max(1, int(intensity / 5) * 2 + 1)
        return cv2.GaussianBlur(img, (k, k), 0)

    
    elif operation == "median_blur":
        k = max(3, int(intensity / 5) * 2 + 1)
        return cv2.medianBlur(img, k)


    elif operation == "bilateral_blur":
        diameter = max(1, int(intensity / 10) * 2 + 1)
        return cv2.bilateralFilter(
            img, diameter, 20 + intensity * 2, 20 + intensity * 2
        )

    elif operation == "sharpen":
        amount = intensity / 100
        kernel = np.array([
            [0, -1, 0],
            [-1, 5 + amount * 4, -1],
            [0, -1, 0]
        ], dtype=np.float32)
        return cv2.filter2D(img, -1, kernel)

    elif operation == "unsharp_mask":
        blurred = cv2.GaussianBlur(img, (0, 0), 3)
        amount = intensity / 50
        return cv2.addWeighted(img, 1 + amount, blurred, -amount, 0)

    elif operation == "sobel":
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        gx = cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=3)
        gy = cv2.Sobel(gray, cv2.CV_32F, 0, 1, ksize=3)
        magnitude = cv2.magnitude(gx, gy)
        result = cv2.normalize(magnitude, None, 0, 255, cv2.NORM_MINMAX)
        return cv2.cvtColor(result.astype(np.uint8), cv2.COLOR_GRAY2BGR)

    elif operation == "canny":
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        threshold1 = max(1, int(150 - intensity))
        threshold2 = max(threshold1 + 1, int(250 - intensity))
        edges = cv2.Canny(gray, threshold1, threshold2)
        return cv2.cvtColor(edges, cv2.COLOR_GRAY2BGR)

    elif operation == "laplacian":
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        edges = cv2.Laplacian(gray, cv2.CV_64F)
        edges = cv2.convertScaleAbs(edges)
        return cv2.cvtColor(edges, cv2.COLOR_GRAY2BGR)

    elif operation == "brightness":
        adjustment = int((intensity - 50) * 2)
        return cv2.convertScaleAbs(img, alpha=1, beta=adjustment)

    elif operation == "contrast":
        alpha = 0.5 + intensity / 50
        return cv2.convertScaleAbs(img, alpha=alpha, beta=0)

    elif operation == "threshold":
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        threshold_value = int(intensity * 2.55)
        _, result = cv2.threshold(
            gray, threshold_value, 255, cv2.THRESH_BINARY
        )
        return cv2.cvtColor(result, cv2.COLOR_GRAY2BGR)

    elif operation == "histogram_equalization":
        ycrcb = cv2.cvtColor(img, cv2.COLOR_BGR2YCrCb)
        y, cr, cb = cv2.split(ycrcb)
        equalized = cv2.equalizeHist(y)
        strength = intensity / 100
        blended = cv2.addWeighted(y, 1 - strength, equalized, strength, 0)
        merged = cv2.merge((blended, cr, cb))
        return cv2.cvtColor(merged, cv2.COLOR_YCrCb2BGR)

    else:
        raise ValueError("Unknown image-processing operation.")
