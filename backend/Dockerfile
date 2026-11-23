FROM python:3.10-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    HOME=/tmp \
    YOLO_CONFIG_DIR=/tmp/Ultralytics

WORKDIR /app

# Dependency sistem Linux yang dibutuhkan OpenCV & Ultralytics YOLO
RUN apt-get update && \
    apt-get install -y --no-install-recommends libgl1 libglib2.0-0 && \
    rm -rf /var/lib/apt/lists/*

# Install dependency Python (pastikan opencv-python-headless aktif tanpa konflik GUI)
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt && \
    pip uninstall -y opencv-python 2>/dev/null || true && \
    pip install --no-cache-dir --force-reinstall opencv-python-headless

# Salin seluruh source code backend termasuk model YOLO (models/best.pt) & data/
COPY . .

RUN chmod -R a+rX /app

EXPOSE 7860

CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-7860}
