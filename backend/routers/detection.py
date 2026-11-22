from fastapi import APIRouter, File, HTTPException, UploadFile

from services.yolo_service import detect_ingredients, open_image


router = APIRouter(
    prefix="/api",
    tags=["Detection"],
)


@router.post("/detect")
async def detect(file: UploadFile = File(...)):
    contents = await file.read()

    try:
        image = open_image(contents)
        detections = detect_ingredients(contents)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except FileNotFoundError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:
        print("DETECT ERROR:", repr(exc))
        raise HTTPException(
            status_code=500,
            detail="Deteksi bahan gagal diproses.",
        ) from exc

    unique_ingredients: list[str] = []

    for item in detections:
        name = item["name"]
        if name not in unique_ingredients:
            unique_ingredients.append(name)

    width, height = image.size

    return {
        "image_size": {
            "width": width,
            "height": height,
        },
        "unique_ingredients": unique_ingredients,
        "detections": detections,
    }
