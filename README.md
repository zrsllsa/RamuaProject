# Ramua

Aplikasi mobile untuk mendeteksi bahan makanan dari foto, merekomendasikan resep masakan Indonesia berbasis AI (Gemini), serta menyimpan resep favorit ke Supabase.

## Struktur Proyek

```text
ramua/
├── backend/       # FastAPI, deteksi bahan (YOLO), rekomendasi resep (Gemini), integrasi Supabase
├── frontend/      # Aplikasi mobile React Native (Expo Router)
├── .gitignore
├── LICENSE
└── README.md
```

## Prasyarat

- **Python** 3.10+ (untuk `backend/`)
- **Node.js** 18+ & **npm** (untuk `frontend/`)
- Akun/project **Supabase** dan **Google Gemini API Key**

---

## 1. Menjalankan Backend (`backend/`)

1. Masuk ke folder `backend`:
   ```bash
   cd backend
   ```
2. Buat dan aktifkan virtual environment:
   ```bash
   python -m venv .venv
   # Windows PowerShell:
   .venv\Scripts\Activate.ps1
   # macOS/Linux:
   source .venv/bin/activate
   ```
3. Install dependensi:
   ```bash
   pip install -r requirements.txt
   ```
4. Salin `.env.example` menjadi `.env`, lalu isi kredensial yang diperlukan:
   ```bash
   cp .env.example .env
   ```
   Variabel pada `backend/.env`:
   - `SUPABASE_URL`
   - `SUPABASE_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SMTP_EMAIL`
   - `SMTP_PASSWORD`
   - `GEMINI_API_KEY`
5. Jalankan server FastAPI:
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

---

## 2. Menjalankan Frontend (`frontend/`)

1. Masuk ke folder `frontend`:
   ```bash
   cd frontend
   ```
2. Install dependensi:
   ```bash
   npm install
   ```
3. Salin `.env.example` menjadi `.env`, lalu isi URL Supabase dan alamat backend lokal:
   ```bash
   cp .env.example .env
   ```
   Variabel pada `frontend/.env`:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - `EXPO_PUBLIC_API_URL` (contoh: `http://<IP_LOKAL_KOMPUTER>:8000`)

   > **Catatan:** Pastikan `BASE_URL` di `frontend/src/lib/api.ts` dan konfigurasi di `frontend/src/lib/supabase.ts` sesuai dengan lingkungan Anda.
4. Jalankan Expo dev server:
   ```bash
   npx expo start
   ```
