import io
import json
from pathlib import Path

import numpy as np
import tensorflow as tf
from PIL import Image

from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.applications.mobilenet_v2 import (
    preprocess_input,
    decode_predictions,
)


BASE_DIR = Path(__file__).resolve().parent.parent

MODEL_PATH = BASE_DIR / "models" / "plant_disease_model.keras"
CLASS_NAMES_PATH = BASE_DIR / "class_names.json"


# ============================================================
# DISEASE MODEL
# ============================================================

disease_model = tf.keras.models.load_model(MODEL_PATH)

with open(CLASS_NAMES_PATH, "r", encoding="utf-8") as f:
    CLASS_NAMES = json.load(f)


# ============================================================
# PLANT VALIDATION MODEL
# ============================================================

plant_validator = MobileNetV2(
    weights="imagenet",
    include_top=True,
)


# ImageNet classes that indicate plant/vegetation/produce.
# This is intentionally broad because a leaf may be classified
# under a related plant/vegetable/fruit category.
PLANT_LABEL_KEYWORDS = {
    "acorn",
    "agaric",
    "artichoke",
    "banana",
    "bell_pepper",
    "broccoli",
    "cabbage",
    "cauliflower",
    "cucumber",
    "daisy",
    "fig",
    "flower",
    "fungus",
    "mushroom",
    "orange",
    "pineapple",
    "pot",
    "strawberry",
    "zucchini",
}


def _load_image(image_bytes: bytes):
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

    image = image.resize((224, 224))

    return image


def _validate_plant_image(image: Image.Image):
    """
    Check whether the uploaded image appears to contain
    a plant/vegetation/produce object.

    Returns:
        {
            "is_plant": bool,
            "validator_confidence": float,
            "validator_label": str
        }
    """

    image_array = np.asarray(image).astype(np.float32)

    image_array = np.expand_dims(image_array, axis=0)

    image_array = preprocess_input(image_array)

    predictions = plant_validator.predict(
        image_array,
        verbose=0,
    )

    decoded = decode_predictions(
        predictions,
        top=5,
    )[0]

    plant_score = 0.0
    best_plant_label = None

    for _, label, probability in decoded:
        normalized_label = label.lower().replace("-", "_")

        # Check whether the ImageNet label belongs to our
        # broad plant-related category.
        is_plant_label = any(
            keyword in normalized_label
            for keyword in PLANT_LABEL_KEYWORDS
        )

        if is_plant_label:
            plant_score += float(probability)

            if best_plant_label is None:
                best_plant_label = label

    # Require meaningful plant evidence.
    is_plant = plant_score >= 0.20

    return {
        "is_plant": is_plant,
        "validator_confidence": round(plant_score * 100, 2),
        "validator_label": best_plant_label,
    }


# ============================================================
# DISEASE PREDICTION
# ============================================================

def predict_image(image_bytes: bytes):

    try:
        image = _load_image(image_bytes)

    except Exception as exc:
        raise ValueError(
            f"Invalid image file: {exc}"
        ) from exc


    # --------------------------------------------------------
    # STEP 1: PLANT VALIDATION
    # --------------------------------------------------------

    validation = _validate_plant_image(image)

    if not validation["is_plant"]:
        return {
            "valid_image": False,
            "is_plant": False,
            "message": (
                "The uploaded image does not appear to contain "
                "a plant or leaf. Please upload a clear plant image."
            ),
            "validator_confidence": validation["validator_confidence"],
            "validator_label": validation["validator_label"],
        }


    # --------------------------------------------------------
    # STEP 2: DISEASE MODEL
    # --------------------------------------------------------

    image_array = np.asarray(image).astype(np.float32)

    image_array = np.expand_dims(
        image_array,
        axis=0,
    )

    # MobileNetV2 preprocessing
    image_array = preprocess_input(image_array)

    predictions = disease_model.predict(
        image_array,
        verbose=0,
    )[0]

    class_index = int(
        np.argmax(predictions)
    )

    confidence = float(
        predictions[class_index] * 100
    )

    class_name = CLASS_NAMES[class_index]


    # --------------------------------------------------------
    # PARSE CLASS NAME
    # --------------------------------------------------------

    if "___" in class_name:
        plant, disease = class_name.split(
            "___",
            1,
        )
    elif "__" in class_name:
        parts = class_name.split("__", 1)
        plant = parts[0]
        disease = parts[1]
    else:
        plant = class_name
        disease = class_name


    plant = (
        plant
        .replace("_", " ")
        .strip()
    )

    disease = (
        disease
        .replace("_", " ")
        .strip()
    )


    # Friendly disease names
    if disease.lower() == "healthy":
        disease = "Healthy"

    elif disease.lower() == "early blight":
        disease = "Early Blight"

    elif disease.lower() == "late blight":
        disease = "Late Blight"


    is_healthy = disease.lower() == "healthy"


    return {
    "valid_image": True,
    "is_plant": True,

    "class_name": class_name,

    "plant": plant,
    "disease": disease,
    "confidence": round(confidence, 2),
    "is_healthy": is_healthy,

    "validator_confidence": validation[
        "validator_confidence"
    ],

    "validator_label": validation[
        "validator_label"
    ],
}