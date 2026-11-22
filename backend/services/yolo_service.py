import io
import threading
from pathlib import Path

from PIL import Image, ImageOps
from ultralytics import YOLO

MODEL_PATH = Path(__file__).resolve().parent.parent / "models" / "best.pt"
CONFIDENCE_THRESHOLD = 0.25

CLASS_NAMES = [
    "beef",
    "bell_pepper",
    "cabbage",
    "carrot",
    "cauliflower",
    "chicken",
    "egg",
    "fish",
    "garlic",
    "ginger",
    "onion",
    "potato",
    "shrimp",
    "tofu",
    "tomato",
]

INGREDIENT_LABELS = {
    "beef": "Daging Sapi",
    "bell_pepper": "Paprika",
    "cabbage": "Kubis",
    "carrot": "Wortel",
    "cauliflower": "Kembang Kol",
    "chicken": "Ayam",
    "egg": "Telur",
    "fish": "Ikan",
    "garlic": "Bawang Putih",
    "ginger": "Jahe",
    "onion": "Bawang Bombay",
    "potato": "Kentang",
    "shrimp": "Udang",
    "tofu": "Tahu",
    "tomato": "Tomat",
}

_model: YOLO | None = None
_model_lock = threading.Lock()


def get_model() -> YOLO:
    global _model

    if _model is None:
        with _model_lock:
            if _model is None:
                if not MODEL_PATH.is_file():
                    raise FileNotFoundError(
                        f"Model YOLO tidak ditemukan: {MODEL_PATH}"
                    )
                _model = YOLO(str(MODEL_PATH))

    return _model


def open_image(image_bytes: bytes) -> Image.Image:
    if not image_bytes:
        raise ValueError("File gambar kosong.")

    try:
        image = Image.open(io.BytesIO(image_bytes))
        image = ImageOps.exif_transpose(image) or image
        return image.convert("RGB")
    except Exception as exc:
        raise ValueError("File bukan gambar yang valid.") from exc


def _class_name(class_id: int, model_names) -> str:
    raw = model_names.get(class_id) if model_names is not None else None

    if isinstance(raw, str) and raw in INGREDIENT_LABELS:
        return raw

    if 0 <= class_id < len(CLASS_NAMES):
        return CLASS_NAMES[class_id]

    return str(raw if raw is not None else class_id)


def detect_ingredients(image_bytes: bytes) -> list[dict]:
    image = open_image(image_bytes)
    model = get_model()

    with _model_lock:
        results = model.predict(
            source=image,
            conf=CONFIDENCE_THRESHOLD,
            verbose=False,
        )

    if not results:
        return []

    result = results[0]
    boxes = result.boxes

    if boxes is None or len(boxes) == 0:
        return []

    detections: list[dict] = []

    for box in boxes:
        confidence = float(box.conf.item())

        if confidence < CONFIDENCE_THRESHOLD:
            continue

        class_id = int(box.cls.item())
        class_name = _class_name(class_id, model.names)
        x1, y1, x2, y2 = (float(value) for value in box.xyxy[0].tolist())

        detections.append(
            {
                "class_id": class_id,
                "class_name": class_name,
                "name": INGREDIENT_LABELS.get(class_name, class_name),
                "confidence": round(confidence, 4),
                "bbox": {
                    "x1": round(x1, 1),
                    "y1": round(y1, 1),
                    "x2": round(x2, 1),
                    "y2": round(y2, 1),
                },
            }
        )

    detections.sort(key=lambda item: item["confidence"], reverse=True)
    return detections
