import json
import os
import re
import threading
import time
import uuid
from concurrent.futures import ThreadPoolExecutor, wait
from typing import Any, Literal

try:
    from ddgs import DDGS
except ImportError:
    from duckduckgo_search import DDGS
from google import genai
from google.genai import types
from fastapi import APIRouter, Body, Depends, HTTPException
from pydantic import BaseModel, Field, model_validator

from auth.dependencies import get_current_user
from supabase_client import get_supabase_admin, supabase


router = APIRouter(
    prefix="/api/recipes",
    tags=["Recipes"],
)

FALLBACK_RECIPE_IMAGES = (
    "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=800&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1617093727343-374698b1b08d?w=800&auto=format&fit=crop",
)
DEFAULT_RECIPE_IMAGE = FALLBACK_RECIPE_IMAGES[0]
GEMINI_MODELS = ("gemini-3.5-flash-lite", "gemini-3.8-flash")
IMAGE_FETCH_TIMEOUT_SECONDS = 7.0
IMAGE_SEARCH_MAX_RESULTS = 8
IMAGE_FETCH_MAX_WORKERS = 4
IMAGE_FETCH_STAGGER_SECONDS = 0.15
CATALOG_CACHE_TTL_SECONDS = 300.0
_CATALOG_CACHE_LOCK = threading.Lock()
_CATALOG_CACHE: dict[str, Any] = {
    "data": None,
    "expires_at": 0.0,
}
BLOCKED_IMAGE_DOMAINS = (
    "unsplash.com", "pexels.com", "istockphoto", "shutterstock", "dreamstime",
    "123rf", "alamy", "gettyimages", "vecteezy", "shopee", "tokopedia", "pinterest",
)
BLOCKED_IMAGE_KEYWORDS = frozenset({
    "shopee", "tokopedia", "bukalapak", "lazada", "blibli", "olx", "pinterest",
    "jersey", "baju", "kaos", "celana", "sepatu",
    "soal", "berhitung", "matematika", "worksheet", "pdf", "slideshare", "scribd",
    "clipart", "vector", "logo", "banner", "alat", "tiang",
})
PRIORITY_IMAGE_DOMAINS = (
    "cookpad", "sajiansedap", "endeus", "yummy", "kompas", "detik",
    "brilio", "fimela", "kumparan", "idntimes", "tribun", "grid.id",
    "merdeka", "liputan6", "resepkoki",
)
PRIORITY_CULINARY_WORDS = frozenset({
    "resep", "masak", "tumis", "goreng", "kuah", "sup", "soto",
    "udang", "ayam", "telur", "sayur", "kol", "makanan", "kuliner", "dish", "food",
})
QUERY_STOPWORDS = frozenset({"resep", "dan", "dengan", "yang", "ala", "khas", "untuk"})
NON_BASIC_SEASONING_KEYWORDS = (
    "daun bawang", "bawang", "cabai", "cabe", "tomat", "wortel", "seledri",
    "jahe", "kunyit", "lengkuas", "serai", "santan", "keju", "susu", "tepung",
    "jamur", "sosis", "bakso", "ayam", "daging", "udang", "ikan", "telur",
    "tahu", "tempe", "kentang", "kol", "sawi", "bayam", "kangkung",
)
_IMAGE_CACHE: dict[str, str] = {}
_IMAGE_CACHE_LOCK = threading.Lock()
CATEGORY_ALIASES = {
    "menu-satset": "menu satset",
    "makan-besar": "makan besar",
    "sup-kuah": "sup & kuah",
    "cemilan": "cemilan",
    "fit-diet": "fit & diet",
}


class RecipeRequest(BaseModel):
    bahan: list = Field(default_factory=list)
    kalori: int
    waktu: int
    porsi: int
    alat: list[str] = Field(default_factory=list)

    @model_validator(mode="before")
    @classmethod
    def accept_frontend_fields(cls, values):
        if not isinstance(values, dict):
            return values

        data = dict(values)
        if not data.get("bahan") and data.get("bahan_terdeteksi") is not None:
            data["bahan"] = data["bahan_terdeteksi"]
        if data.get("kalori") is None and data.get("target_kalori") is not None:
            data["kalori"] = data["target_kalori"]
        if data.get("waktu") is None and data.get("waktu_memasak") is not None:
            data["waktu"] = data["waktu_memasak"]
        if data.get("porsi") is None and data.get("jumlah_orang") is not None:
            data["porsi"] = data["jumlah_orang"]
        if not data.get("alat") and data.get("alat_terpilih") is not None:
            data["alat"] = data["alat_terpilih"]
        return data


class GeneratedIngredient(BaseModel):
    nama: str
    takaran: str
    status: Literal["Ada", "Kurang"]


class GeneratedStep(BaseModel):
    judul: str
    durasi: str
    deskripsi: str
    bahan_terkait: list[str]


class GeneratedRecipe(BaseModel):
    nama: str
    image_query: str
    kalori: int
    protein: str
    fats: str
    carbs: str
    waktu_masak: int
    kecocokan: int
    porsi: int
    alat_masak: list[str]
    bahan: list[GeneratedIngredient]
    bumbu_dasar: list[str]
    langkah: list[GeneratedStep]


def _ingredient_names(bahan: list) -> list[str]:
    names: list[str] = []
    for item in bahan:
        if isinstance(item, str) and item.strip():
            names.append(item.strip())
        elif isinstance(item, dict):
            name = item.get("nama") or item.get("name") or item.get("class_name")
            if name:
                names.append(str(name).strip())
    return names


def _normalize_ingredient_text(text: str) -> str:
    cleaned = re.sub(r"[^a-z0-9\s]", " ", text.lower())
    cleaned = re.sub(r"\bcabe\b", "cabai", cleaned)
    return " ".join(cleaned.split())


def _is_ingredient_owned(recipe_ingredient: str, owned_ingredients: list[str]) -> bool:
    ing_norm = _normalize_ingredient_text(recipe_ingredient)
    if not ing_norm:
        return False

    for owned in owned_ingredients:
        owned_norm = _normalize_ingredient_text(owned)
        if not owned_norm:
            continue
        if ing_norm == owned_norm:
            return True
        if re.search(rf"\b{re.escape(owned_norm)}\b", ing_norm):
            return True
        if re.search(rf"\b{re.escape(ing_norm)}\b", owned_norm):
            return True
    return False


def _extract_kcal(raw_kcal: Any) -> float:
    if isinstance(raw_kcal, (int, float)):
        return max(0.0, float(raw_kcal))
    if isinstance(raw_kcal, str):
        match = re.search(r"(\d+(?:[.,]\d+)?)", raw_kcal)
        if match:
            try:
                return max(0.0, float(match.group(1).replace(",", ".")))
            except ValueError:
                pass
    return 0.0


def _normalize_macro_value(value: Any, estimated_grams: int) -> str:
    if value is None:
        return f"{estimated_grams} g"
    if isinstance(value, (int, float)):
        return f"{round(value)} g"
    text = str(value).strip()
    if not text or text == "-":
        return f"{estimated_grams} g"
    if re.fullmatch(r"\d+(?:[.,]\d+)?", text):
        return f"{round(float(text.replace(',', '.')))} g"
    return text


def _apply_macro_estimates(item: dict[str, Any]) -> None:
    kcal = _extract_kcal(item.get("kalori") if item.get("kalori") is not None else item.get("kcal"))
    est_protein = round((kcal * 0.25) / 4)
    est_fats = round((kcal * 0.30) / 9)
    est_carbs = round((kcal * 0.45) / 4)

    raw_protein = item.get("protein")
    raw_fats = item.get("fats") if item.get("fats") is not None else item.get("fat")
    raw_carbs = item.get("carbs")

    item["protein"] = _normalize_macro_value(raw_protein, est_protein)
    item["fats"] = _normalize_macro_value(raw_fats, est_fats)
    item["carbs"] = _normalize_macro_value(raw_carbs, est_carbs)


def _is_non_basic_seasoning(text: str) -> bool:
    norm = _normalize_ingredient_text(text)
    if not norm:
        return False
    return any(re.search(rf"\b{re.escape(kw)}\b", norm) for kw in NON_BASIC_SEASONING_KEYWORDS)


def _split_seasoning_to_ingredient(entry: str) -> tuple[str, str]:
    text = " ".join(entry.strip().split())
    secukupnya = re.match(r"^(.+?)\s+(secukupnya)$", text, flags=re.IGNORECASE)
    if secukupnya:
        return secukupnya.group(1).strip(" ,-"), "secukupnya"
    measured = re.match(r"^(.+?)\s+(\d+(?:[.,/]\d+)?(?:\s+\S+)*)$", text)
    if measured:
        return measured.group(1).strip(" ,-"), measured.group(2).strip()
    return text, "secukupnya"


def _normalize_recipes(recipes: list, user_bahan: list) -> list[dict[str, Any]]:
    owned_ingredients = _ingredient_names(user_bahan)
    normalized: list[dict[str, Any]] = []

    for recipe in recipes:
        if not isinstance(recipe, dict):
            continue

        item = dict(recipe)
        raw_bahan = item.get("bahan") or item.get("ingredients") or item.get("bahan_dibutuhkan") or []
        normalized_bahan: list[dict[str, Any]] = []
        seen_bahan_norms: set[str] = set()

        if isinstance(raw_bahan, list):
            for entry in raw_bahan:
                if isinstance(entry, str):
                    nama_bahan = entry.strip()
                    takaran = ""
                elif isinstance(entry, dict):
                    nama_bahan = str(entry.get("nama") or entry.get("name") or "").strip()
                    takaran = str(entry.get("takaran") or entry.get("jumlah") or entry.get("amount") or "").strip()
                else:
                    continue

                if not nama_bahan:
                    continue

                norm_key = _normalize_ingredient_text(nama_bahan)
                if norm_key:
                    seen_bahan_norms.add(norm_key)

                status = "Ada" if _is_ingredient_owned(nama_bahan, owned_ingredients) else "Kurang"
                normalized_bahan.append({
                    "nama": nama_bahan,
                    "takaran": takaran,
                    "status": status,
                })

        raw_bumbu = item.get("bumbu_dasar")
        if isinstance(raw_bumbu, str):
            bumbu_entries = [part.strip() for part in re.split(r"[•,\n]+", raw_bumbu) if part.strip()]
        elif isinstance(raw_bumbu, list):
            bumbu_entries = [str(entry).strip() for entry in raw_bumbu if str(entry).strip()]
        else:
            bumbu_entries = []

        cleaned_bumbu: list[str] = []
        for bumbu_entry in bumbu_entries:
            if _is_non_basic_seasoning(bumbu_entry):
                nama_extra, takaran_extra = _split_seasoning_to_ingredient(bumbu_entry)
                norm_extra = _normalize_ingredient_text(nama_extra)
                if nama_extra and norm_extra not in seen_bahan_norms:
                    if norm_extra:
                        seen_bahan_norms.add(norm_extra)
                    normalized_bahan.append({
                        "nama": nama_extra,
                        "takaran": takaran_extra or "secukupnya",
                        "status": "Ada" if _is_ingredient_owned(nama_extra, owned_ingredients) else "Kurang",
                    })
            else:
                cleaned_bumbu.append(bumbu_entry)

        item["bumbu_dasar"] = cleaned_bumbu
        item["bahan"] = normalized_bahan

        total_bahan = len(normalized_bahan)
        cocok_count = sum(1 for b in normalized_bahan if b.get("status") == "Ada")
        missing_list = [b.get("nama", "") for b in normalized_bahan if b.get("status") != "Ada" and b.get("nama")]
        kurang_count = len(missing_list)
        match_percentage = round((cocok_count / total_bahan) * 100) if total_bahan > 0 else 100

        item["kecocokan"] = match_percentage
        item["bahan_cocok"] = cocok_count
        item["bahan_total"] = total_bahan
        item["jumlah_kurang"] = kurang_count
        item["bahan_kurang"] = missing_list
        _apply_macro_estimates(item)

        normalized.append(item)

    normalized.sort(
        key=lambda r: (r.get("kecocokan", 0), r.get("bahan_cocok", 0)),
        reverse=True,
    )
    return normalized


def _build_prompt(data: RecipeRequest) -> str:
    bahan = ", ".join(_ingredient_names(data.bahan)) or "-"
    alat = ", ".join(data.alat) or "-"
    schema = """
[
  {
    "nama": "Telur Dadar Tomat",
    "image_query": "resep telur dadar",
    "kalori": 320,
    "protein": "24 g",
    "fats": "18 g",
    "carbs": "35 g",
    "waktu_masak": 15,
    "kecocokan": 67,
    "porsi": 2,
    "alat_masak": ["Kompor", "Wajan"],
    "bahan": [
      {"nama": "Telur", "takaran": "3 butir", "status": "Ada"},
      {"nama": "Tomat", "takaran": "1 buah", "status": "Ada"},
      {"nama": "Daun bawang", "takaran": "1 batang", "status": "Kurang"}
    ],
    "bumbu_dasar": ["Garam secukupnya", "Merica 1/4 sdt", "Minyak goreng 2 sdm"],
    "langkah": [
      {
        "judul": "Siapkan dan Iris Bahan",
        "durasi": "3 menit",
        "deskripsi": "Cuci bersih tomat dan daun bawang, lalu potong tomat menjadi dadu kecil dan iris tipis daun bawang. Pecahkan telur ke dalam mangkuk agak besar agar mudah dikocok tanpa tumpah.",
        "bahan_terkait": ["Telur", "Tomat", "Daun bawang"]
      }
    ]
  }
]
""".strip()

    return f"""Kamu koki ahli masakan rumahan Indonesia. Buat rekomendasi tepat 10 resep yang bervariasi, realistis, dan mudah diikuti pemula sesuai bahan, preferensi kalori, waktu, dan alat masak pengguna.

Data pengguna:
- Bahan dimiliki: {bahan}
- Target kalori per porsi: {data.kalori} kkal
- Waktu memasak maksimal: {data.waktu} menit
- Jumlah porsi: {data.porsi} orang
- Alat tersedia: {alat}

INSTRUKSI KETAT:
1. Jumlah & Komposisi Resep:
   - Hasilkan tepat 10 resep yang bervariasi (berbeda teknik olahan dan cita rasa).
   - Buat komposisi realistis dan natural: sekitar 4-5 resep yang 100% hanya memakai bahan dimiliki pengguna ("Bahan lengkap"), dan 5-6 resep lainnya membutuhkan 1-2 bahan tambahan segar (seperti bawang bombay, wortel, daun bawang, cabai, tomat, dll.) agar variasi masakan lebih nikmat.
2. Pemisahan Ketat `bumbu_dasar` vs `bahan`:
   - Kolom `bumbu_dasar` HANYA boleh berisi bumbu dasar dapur standar seperti: garam, gula, lada/merica, kaldu bubuk, minyak goreng, air, kecap manis, atau saus tiram.
   - Bahan segar, sayuran, protein, dan aromatik seperti bawang bombay, bawang merah, bawang putih, cabai, tomat, daun bawang, seledri, wortel, jahe, kunyit, lengkuas, serai, santan, keju, susu, atau tepung DILARANG KERAS masuk ke `bumbu_dasar` — semuanya WAJIB masuk ke array `bahan` beserta takarannya!
   - Nilai "status" pada setiap item `bahan` adalah "Ada" jika termasuk bahan dimiliki pengguna, atau "Kurang" jika belum dimiliki pengguna.
3. Detail Langkah Memasak (`langkah`):
   - Setiap resep WAJIB memiliki 5 sampai 6 langkah memasak yang runtut dan aplikatif: mulai dari persiapan & pemotongan bahan, menumis bumbu hingga harum, proses memasak utama (sebutkan besar api kecil/sedang/besar dan ciri fisik masakan matang seperti berubah warna, mengental, atau empuk), koreksi rasa, hingga penyajian.
   - Setiap langkah HARUS ditulis dalam 2-3 kalimat yang informatif dan jelas bagi pemula (bukan 1 kalimat singkat), dengan `durasi` realistis per langkah dan `bahan_terkait` yang akurat.
4. Format & Metadata:
   - Respons HARUS berupa JSON array valid sesuai skema, tanpa teks di luar JSON.
   - Sertakan field "image_query" berisi nama masakan Indonesia yang umum dan populer (maksimal 2-3 kata inti, diawali "resep", tanpa kombinasi bumbu tambahan yang panjang). Contoh: untuk "Omelet Gulung Jahe Sayur" isi "resep telur dadar gulung" atau "resep omelet sayur"; untuk "Tumis Kembang Kol Telur Orak-Arik" isi "resep tumis kembang kol".
   - Sertakan estimasi makronutrisi per porsi yang realistis sesuai bahan dan kalori: "protein" (contoh: "24 g"), "fats" (contoh: "18 g"), dan "carbs" (contoh: "35 g").
   - "waktu_masak" dan "kalori" berupa angka bulat, mendekati target kalori dan <= waktu maksimal, memakai alat tersedia, dengan takaran menyesuaikan jumlah porsi.

Skema JSON:
{schema}
"""


def _build_gemini_config() -> types.GenerateContentConfig:
    return types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=list[GeneratedRecipe],
        max_output_tokens=16384,
    )


def _clean_json_text(raw: str) -> str:
    text = raw.strip()
    text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\s*```$", "", text)
    text = text.strip()

    first_arr = text.find("[")
    first_obj = text.find("{")
    if first_arr != -1 and (first_obj == -1 or first_arr < first_obj):
        last_arr = text.rfind("]")
        text = text[first_arr : last_arr + 1] if last_arr > first_arr else text[first_arr:]
    elif first_obj != -1:
        last_obj = text.rfind("}")
        text = text[first_obj : last_obj + 1] if last_obj > first_obj else text[first_obj:]

    text = re.sub(r",\s*([}\]])", r"\1", text)
    return text.strip()


def _salvage_recipe_objects(text: str) -> list[dict[str, Any]]:
    start = text.find("[")
    if start == -1:
        return []

    decoder = json.JSONDecoder()
    idx = start + 1
    length = len(text)
    salvaged: list[dict[str, Any]] = []

    while idx < length:
        while idx < length and text[idx] in " \t\r\n,":
            idx += 1
        if idx >= length or text[idx] == "]":
            break
        try:
            obj, next_idx = decoder.raw_decode(text, idx)
        except json.JSONDecodeError:
            break
        if isinstance(obj, dict) and obj.get("nama"):
            salvaged.append(obj)
        idx = next_idx

    return salvaged


def _parse_recipes(raw: str) -> list:
    cleaned = _clean_json_text(raw)
    if not cleaned:
        raise ValueError("Respons Gemini kosong.")

    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError:
        salvaged = _salvage_recipe_objects(cleaned)
        if salvaged:
            return salvaged
        raise

    if isinstance(data, dict):
        for key in ("resep", "recipes", "data"):
            if isinstance(data.get(key), list):
                return data[key]
    if not isinstance(data, list):
        raise ValueError("Respons Gemini bukan JSON array.")
    return data


def _fallback_image(index: int = 0) -> str:
    return FALLBACK_RECIPE_IMAGES[index % len(FALLBACK_RECIPE_IMAGES)]


def _build_image_search_query(recipe_name: str, image_query: str = "") -> str:
    cleaned = " ".join(str(image_query or "").strip().split())
    if cleaned:
        return cleaned
    base = " ".join(str(recipe_name or "").strip().split())
    if not base:
        return ""
    if not base.lower().startswith("resep "):
        base = f"resep {base}"
    return " ".join(base.split()[:5])


def _extract_tokens(text: str) -> set[str]:
    return set(re.findall(r"[a-z0-9]+", text.lower()))


def _valid_http_url(value: Any) -> str | None:
    if isinstance(value, str) and value.startswith(("http://", "https://")):
        return value
    return None


def _extract_query_core_terms(search_query: str, recipe_name: str) -> list[str]:
    source = search_query if search_query.strip() else recipe_name
    tokens = re.findall(r"[a-z0-9]+", source.lower())
    terms = [t for t in tokens if len(t) >= 3 and t not in QUERY_STOPWORDS and t not in {"cara", "membuat", "indonesia"}]
    if not terms and recipe_name.strip():
        tokens = re.findall(r"[a-z0-9]+", recipe_name.lower())
        terms = [t for t in tokens if len(t) >= 3 and t not in QUERY_STOPWORDS]
    return terms


def _build_fallback_food_query(core_terms: list[str], recipe_name: str) -> str:
    cooking_verbs = {"tumis", "goreng", "rebus", "bakar", "kukus", "oseng", "panggang", "orak", "arik", "cah"}
    nouns = [t for t in core_terms if t not in cooking_verbs]
    if nouns:
        main_part = " ".join(nouns[:2])
    elif core_terms:
        main_part = " ".join(core_terms[:2])
    else:
        main_part = " ".join(re.findall(r"[a-z0-9]+", recipe_name.lower())[:2])
    return f"resep {main_part} indonesia".strip()


def _score_image_candidate(candidate: dict, core_terms: set[str]) -> tuple[int, str] | None:
    title = str(candidate.get("title") or "")
    source_url = str(candidate.get("url") or "")
    thumb_url = _valid_http_url(candidate.get("thumbnail"))
    full_url = _valid_http_url(candidate.get("image"))
    chosen_url = thumb_url or full_url
    if not chosen_url:
        return None

    combined_urls = f"{source_url} {thumb_url or ''} {full_url or ''}".lower()
    if any(dom in combined_urls for dom in BLOCKED_IMAGE_DOMAINS):
        return None

    tokens = _extract_tokens(f"{title} {combined_urls}")
    if tokens & BLOCKED_IMAGE_KEYWORDS:
        return None

    title_and_url_tokens = _extract_tokens(f"{title} {source_url} {full_url or ''}")
    keyword_matches = title_and_url_tokens & core_terms
    # Wajib minimal 1 kata kunci utama nama masakan muncul di title atau url hasil gambar
    if core_terms and not keyword_matches:
        return None

    title_tokens = _extract_tokens(title)
    score = 2 * len(keyword_matches)

    if any(domain in combined_urls for domain in PRIORITY_IMAGE_DOMAINS):
        score += 4

    culinary_matches = title_tokens & PRIORITY_CULINARY_WORDS
    if culinary_matches:
        score += len(culinary_matches)

    if thumb_url:
        score += 1

    return score, chosen_url


def _query_ddgs_images(query: str, core_terms: set[str]) -> str | None:
    try:
        ddgs = DDGS()
        try:
            results = ddgs.images(
                query=query,
                region="id-id",
                safesearch="on",
                max_results=IMAGE_SEARCH_MAX_RESULTS,
            )
        except TypeError:
            results = ddgs.images(
                keywords=query,
                region="id-id",
                safesearch="on",
                max_results=IMAGE_SEARCH_MAX_RESULTS,
            )

        best_score = -1
        best_url: str | None = None
        for r in results or []:
            if not isinstance(r, dict):
                continue
            scored = _score_image_candidate(r, core_terms)
            if not scored:
                continue
            score, url = scored
            if score > best_score:
                best_score = score
                best_url = url
        return best_url
    except Exception:
        return None


def _fetch_ddgs_image(recipe_name: str, image_query: str = "", delay: float = 0.0) -> str | None:
    search_query = _build_image_search_query(recipe_name, image_query)
    if not search_query:
        return None

    cache_key = search_query.lower()
    with _IMAGE_CACHE_LOCK:
        cached = _IMAGE_CACHE.get(cache_key)
    if cached:
        return cached

    if delay > 0:
        time.sleep(delay)

    core_terms_list = _extract_query_core_terms(search_query, recipe_name)
    core_terms = set(core_terms_list)

    best_url = _query_ddgs_images(search_query, core_terms)
    if not best_url:
        fallback_query = _build_fallback_food_query(core_terms_list, recipe_name)
        if fallback_query and fallback_query.lower() != search_query.lower():
            fallback_terms = set(_extract_query_core_terms(fallback_query, recipe_name)) or core_terms
            best_url = _query_ddgs_images(fallback_query, fallback_terms)

    if best_url:
        with _IMAGE_CACHE_LOCK:
            _IMAGE_CACHE[cache_key] = best_url
        return best_url
    return None


def _get_image_for_recipe(
    recipe_name: str,
    image_query: str = "",
    fallback_index: int = 0,
) -> str:
    return _fetch_ddgs_image(recipe_name, image_query) or _fallback_image(fallback_index)


def _attach_images(recipes: list) -> list:
    if not recipes:
        return recipes

    pending: dict[Any, int] = {}
    executor = ThreadPoolExecutor(max_workers=IMAGE_FETCH_MAX_WORKERS)
    try:
        submit_idx = 0
        for idx, r in enumerate(recipes):
            if not isinstance(r, dict) or not r.get("nama"):
                continue
            name = str(r["nama"]).strip()
            image_query = str(r.get("image_query") or "").strip()
            search_query = _build_image_search_query(name, image_query)
            cache_key = search_query.lower()
            with _IMAGE_CACHE_LOCK:
                cached = _IMAGE_CACHE.get(cache_key)
            if cached:
                r["image_url"] = cached
                continue
            delay = IMAGE_FETCH_STAGGER_SECONDS * submit_idx
            submit_idx += 1
            fut = executor.submit(_fetch_ddgs_image, name, image_query, delay)
            pending[fut] = idx

        if pending:
            done, not_done = wait(pending.keys(), timeout=IMAGE_FETCH_TIMEOUT_SECONDS)
            for fut in done:
                idx = pending[fut]
                url = None
                try:
                    url = fut.result()
                except Exception:
                    url = None
                recipes[idx]["image_url"] = url or _fallback_image(idx)
            for fut in not_done:
                fut.cancel()
                idx = pending[fut]
                recipes[idx]["image_url"] = _fallback_image(idx)
    finally:
        # Tidak menunggu thread DuckDuckGo yang masih menggantung melewati batas timeout
        executor.shutdown(wait=False, cancel_futures=True)

    return recipes


def _slugify_recipe_id(nama: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", nama.lower()).strip("-")
    return slug or f"resep-{uuid.uuid4().hex[:8]}"


def _build_auto_summary(nama: str, bahan: list, alat_masak: Any) -> str:
    bahan_names = _ingredient_names(bahan)[:4]
    if isinstance(alat_masak, str):
        alat_list = [part.strip() for part in alat_masak.split(",") if part.strip()]
    elif isinstance(alat_masak, list):
        alat_list = [str(a).strip() for a in alat_masak if str(a).strip()]
    else:
        alat_list = []

    if bahan_names and alat_list:
        return f"Olahan {nama} berbahan {', '.join(bahan_names)} dengan {', '.join(alat_list[:3])}."
    if bahan_names:
        return f"Olahan {nama} berbahan {', '.join(bahan_names)} yang praktis dan lezat."
    return f"Resep {nama} lengkap dengan takaran bahan dan langkah memasak."


def _format_servings(raw_porsi: Any) -> str:
    if isinstance(raw_porsi, int) and raw_porsi > 0:
        return f"{raw_porsi} Orang"
    if isinstance(raw_porsi, str) and raw_porsi.strip():
        text = raw_porsi.strip()
        return f"{text} Orang" if text.isdigit() else text
    return "2 Orang"


def _prepare_saved_recipe(data: dict[str, Any]) -> dict[str, Any]:
    mentah = data.get("mentah")
    source = dict(mentah) if isinstance(mentah, dict) and mentah else {}
    # Gabungkan data utama agar field terbaru dari frontend menimpa mentah jika ada
    merged = {**source, **data}
    merged.pop("mentah", None)

    nama = str(
        merged.get("nama")
        or merged.get("name")
        or merged.get("title")
        or merged.get("judul")
        or "Resep Tanpa Nama"
    ).strip()
    recipe_id = str(merged.get("id") or "").strip() or _slugify_recipe_id(nama)

    bahan = merged.get("bahan") or merged.get("ingredients") or merged.get("bahan_dibutuhkan") or []
    if not isinstance(bahan, list):
        bahan = []

    bumbu_dasar = merged.get("bumbu_dasar")
    if bumbu_dasar is None:
        bumbu_dasar = merged.get("bumbuDasar")
    if isinstance(bumbu_dasar, str):
        bumbu_dasar = [p.strip() for p in re.split(r"[•\n]+", bumbu_dasar) if p.strip()]
    elif not isinstance(bumbu_dasar, list):
        bumbu_dasar = []

    langkah = merged.get("langkah") or merged.get("steps") or merged.get("langkah_memasak") or []
    if not isinstance(langkah, list):
        langkah = []

    alat_masak = merged.get("alat_masak") or merged.get("alat") or merged.get("alat_dipakai") or []
    if isinstance(alat_masak, str):
        alat_masak = [p.strip() for p in alat_masak.split(",") if p.strip()]
    elif not isinstance(alat_masak, list):
        alat_masak = []

    rangkuman = str(merged.get("rangkuman") or merged.get("summary") or "").strip()
    if not rangkuman or "lorem ipsum" in rangkuman.lower():
        rangkuman = _build_auto_summary(nama, bahan, alat_masak)

    waktu_masak = merged.get("waktu_masak")
    if waktu_masak is None:
        waktu_masak = merged.get("waktu") or merged.get("time") or 0

    kalori = merged.get("kalori")
    if kalori is None:
        kalori = merged.get("kcal") or 0
    if isinstance(kalori, str) and "kcal" in kalori.lower():
        kalori = re.sub(r"kcal", "kkal", kalori, flags=re.IGNORECASE)

    image_url = str(
        merged.get("image_url")
        or merged.get("gambar")
        or merged.get("image")
        or DEFAULT_RECIPE_IMAGE
    ).strip() or DEFAULT_RECIPE_IMAGE

    prepared = {
        **merged,
        "id": recipe_id,
        "nama": nama,
        "kalori": kalori,
        "rangkuman": rangkuman,
        "waktu_masak": waktu_masak,
        "porsi": _format_servings(merged.get("porsi") or merged.get("servings")),
        "alat_masak": alat_masak,
        "image_url": image_url,
        "bahan": bahan,
        "bumbu_dasar": bumbu_dasar,
        "langkah": langkah,
    }
    _apply_macro_estimates(prepared)
    return prepared


@router.post("/recommend")
def recommend_recipes(data: RecipeRequest):
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY belum diatur.")

    client = genai.Client(api_key=api_key)
    prompt = _build_prompt(data)
    config = _build_gemini_config()

    for idx, model_name in enumerate(GEMINI_MODELS):
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=config,
            )
            raw = response.text or ""
            recipes = _normalize_recipes(_parse_recipes(raw), data.bahan)
            return _attach_images(recipes)
        except (json.JSONDecodeError, ValueError) as exc:
            print(f"GEMINI JSON ERROR ({model_name}):", repr(exc))
            if idx < len(GEMINI_MODELS) - 1:
                print(f"Langsung fallback ke {GEMINI_MODELS[idx + 1]}...")
                time.sleep(0.5)
                continue
            raise HTTPException(
                status_code=502,
                detail="Respons Gemini bukan JSON array yang valid.",
            ) from exc
        except Exception as exc:
            print(f"\n[!!!] ERROR GEMINI ({model_name}):", repr(exc))
            if idx < len(GEMINI_MODELS) - 1:
                print(f"Langsung fallback ke {GEMINI_MODELS[idx + 1]}...")
                time.sleep(0.5)
                continue

            print("=> MENGIRIM FALLBACK DATA AGAR UI TIDAK CRASH...\n")
            fallback = _normalize_recipes([
                {
                    "nama": "Telur Dadar Tomat (Resep Darurat)",
                    "image_query": "resep telur dadar",
                    "kalori": 320,
                    "waktu_masak": 15,
                    "kecocokan": 100,
                    "porsi": data.porsi,
                    "alat_masak": ["Kompor", "Wajan"],
                    "bahan": [
                        {"nama": "Telur", "takaran": "3 butir", "status": "Ada"},
                        {"nama": "Tomat", "takaran": "2 buah", "status": "Ada"},
                        {"nama": "Bawang merah", "takaran": "3 siung", "status": "Ada"},
                    ],
                    "bumbu_dasar": ["Garam secukupnya", "Minyak 2 sdm"],
                    "langkah": [
                        {
                            "judul": "Kocok Telur",
                            "durasi": "2 menit",
                            "deskripsi": "Kocok telur bersama irisan tomat, bawang merah, dan garam hingga rata.",
                            "bahan_terkait": ["Telur", "Tomat"],
                        },
                        {
                            "judul": "Goreng Dadar",
                            "durasi": "5 menit",
                            "deskripsi": "Panaskan minyak di wajan lalu masak adonan telur hingga kedua sisi matang.",
                            "bahan_terkait": ["Telur"],
                        },
                    ],
                }
            ], data.bahan)
            return _attach_images(fallback)


def _format_saved_row(row: dict[str, Any]) -> dict[str, Any]:
    recipe_data = row.get("recipe_data")
    base = dict(recipe_data) if isinstance(recipe_data, dict) else {}
    if row.get("nama") and not base.get("nama"):
        base["nama"] = row["nama"]
    prepared = _prepare_saved_recipe(base)
    if row.get("id"):
        prepared["id"] = str(row["id"])
    return prepared


@router.post("/save")
def save_recipe(
    data: dict[str, Any] = Body(default={}),
    user=Depends(get_current_user),
):
    prepared = _prepare_saved_recipe(data)
    user_id = str(user.id)
    admin = get_supabase_admin()
    row = {
        "user_id": user_id,
        "nama": prepared["nama"],
        "recipe_data": prepared,
    }

    try:
        res = (
            admin.table("saved_recipes")
            .upsert(row, on_conflict="user_id,nama")
            .execute()
        )
    except Exception as exc:
        print("SAVE RECIPE SUPABASE ERROR:", repr(exc))
        raise HTTPException(
            status_code=500,
            detail="Gagal menyimpan resep ke Supabase.",
        ) from exc

    saved_row = (res.data or [None])[0]
    formatted = _format_saved_row(saved_row) if isinstance(saved_row, dict) else prepared
    return {
        "success": True,
        "message": "Resep berhasil disimpan!",
        "recipe": formatted,
    }


@router.get("/saved")
def get_saved_recipes(user=Depends(get_current_user)):
    user_id = str(user.id)
    admin = get_supabase_admin()
    try:
        res = (
            admin.table("saved_recipes")
            .select("id, nama, recipe_data, created_at")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )
    except Exception as exc:
        print("GET SAVED RECIPES SUPABASE ERROR:", repr(exc))
        raise HTTPException(
            status_code=500,
            detail="Gagal mengambil resep tersimpan dari Supabase.",
        ) from exc

    return [
        _format_saved_row(row)
        for row in (res.data or [])
        if isinstance(row, dict)
    ]


@router.delete("/saved/{recipe_id}")
def delete_saved_recipe(recipe_id: str, user=Depends(get_current_user)):
    user_id = str(user.id)
    try:
        uuid.UUID(recipe_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail="Resep tersimpan tidak ditemukan.") from exc

    admin = get_supabase_admin()
    try:
        res = (
            admin.table("saved_recipes")
            .delete()
            .eq("id", recipe_id)
            .eq("user_id", user_id)
            .execute()
        )
    except Exception as exc:
        print("DELETE SAVED RECIPE SUPABASE ERROR:", repr(exc))
        raise HTTPException(
            status_code=500,
            detail="Gagal menghapus resep tersimpan dari Supabase.",
        ) from exc

    if not res.data:
        raise HTTPException(status_code=404, detail="Resep tersimpan tidak ditemukan.")

    return {
        "success": True,
        "message": "Resep berhasil dihapus.",
        "id": recipe_id,
    }


def _recipe_matches_query(recipe: dict, needle: str) -> bool:
    if needle in str(recipe.get("nama", "")).lower():
        return True
    for bahan in recipe.get("bahan") or []:
        nama = bahan.get("nama") if isinstance(bahan, dict) else bahan
        if needle in str(nama).lower():
            return True
    return False


def clear_catalog_cache() -> None:
    with _CATALOG_CACHE_LOCK:
        _CATALOG_CACHE["data"] = None
        _CATALOG_CACHE["expires_at"] = 0.0


def _get_cached_catalog() -> list[dict[str, Any]]:
    now = time.monotonic()
    with _CATALOG_CACHE_LOCK:
        cached_data = _CATALOG_CACHE.get("data")
        expires_at = float(_CATALOG_CACHE.get("expires_at") or 0.0)
        if isinstance(cached_data, list) and now < expires_at:
            return list(cached_data)

    try:
        res = supabase.table("recipes").select("*").order("id").execute()
    except Exception as exc:
        print("LIST RECIPES SUPABASE ERROR:", repr(exc))
        with _CATALOG_CACHE_LOCK:
            stale = _CATALOG_CACHE.get("data")
            if isinstance(stale, list):
                return list(stale)
        raise HTTPException(
            status_code=500,
            detail="Gagal mengambil katalog resep dari Supabase.",
        ) from exc

    recipes = []
    for row in res.data or []:
        if not isinstance(row, dict):
            continue
        item = dict(row)
        if isinstance(item.get("kalori"), str) and "kcal" in item["kalori"].lower():
            item["kalori"] = re.sub(r"kcal", "kkal", item["kalori"], flags=re.IGNORECASE)
        recipes.append(item)
    with _CATALOG_CACHE_LOCK:
        _CATALOG_CACHE["data"] = recipes
        _CATALOG_CACHE["expires_at"] = time.monotonic() + CATALOG_CACHE_TTL_SECONDS
    return list(recipes)


@router.get("")
def list_recipes(kategori: str | None = None, q: str | None = None):
    recipes = _get_cached_catalog()
    if kategori and kategori.strip():
        wanted = CATEGORY_ALIASES.get(kategori.strip().lower(), kategori.strip().lower())
        recipes = [
            recipe
            for recipe in recipes
            if str(recipe.get("kategori", "")).strip().lower() == wanted
        ]
    if q and q.strip():
        needle = q.strip().lower()
        recipes = [recipe for recipe in recipes if _recipe_matches_query(recipe, needle)]
    return recipes
