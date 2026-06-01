"""ZERO — Digital Menu API.
FastAPI + MongoDB. Public menu endpoints, admin CRUD + JWT auth, analytics.
"""
from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import deepl
import os
import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal

import bcrypt
import jwt
import io
import json
import re
from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends, Query, UploadFile, File
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, ConfigDict, EmailStr, field_validator
from PIL import Image

from seed_data import TIPURI_MANCARE, TIPURI_BAUTURI

# ---------- Config ----------
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24
LOGIN_MAX_ATTEMPTS = 5
LOGIN_LOCKOUT_MINUTES = 15

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# Uploads dir
UPLOADS_DIR = ROOT_DIR / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)
MAX_UPLOAD_BYTES = 8 * 1024 * 1024  # 8MB raw input
MAX_IMG_WIDTH = 1600
WEBP_QUALITY = 80

# DeepL API client (optional - for future translation features)
DEEPL_API_KEY = os.environ.get("DEEPL_API_KEY", "")
deepl_client = deepl.Translator(DEEPL_API_KEY) if DEEPL_API_KEY else None
LANG_MAP = {
    "en": "EN-GB",
    "ru": "RU"
}
    
app = FastAPI(title="ZERO Menu API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("zero")


# ---------- Models ----------
Categorie = Literal["terasa", "restaurant", "discoteca"]
Subcategorie = Literal["mancare", "bauturi"]


class Produs(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nume_ro: str
    descriere_ro: str
    nume_en: Optional[str] = None
    descriere_en: Optional[str] = None
    nume_ru: Optional[str] = None
    descriere_ru: Optional[str] = None
    pret: float
    imagine: Optional[str] = None
    categorie: Categorie
    subcategorie: Subcategorie
    tip: str
    vizualizari: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ProdusCreate(BaseModel):
    nume_ro: str = Field(min_length=1, max_length=200)
    descriere_ro: str = Field(min_length=1, max_length=2000)
    nume_en: Optional[str] = Field(default=None, max_length=200)
    descriere_en: Optional[str] = Field(default=None, max_length=2000)
    nume_ru: Optional[str] = Field(default=None, max_length=200)
    descriere_ru: Optional[str] = Field(default=None, max_length=2000)
    pret: float = Field(ge=0, le=100000)
    imagine: Optional[str] = Field(default=None, max_length=2048)
    categorie: Categorie
    subcategorie: Subcategorie
    tip: str = Field(min_length=1, max_length=100)

    @field_validator("nume_ro", "descriere_ro", "tip")
    @classmethod
    def _strip_strings(cls, v: str) -> str:
        return v.strip() if isinstance(v, str) else v


class ProdusUpdate(BaseModel):
    nume_ro: Optional[str] = Field(default=None, min_length=1, max_length=200)
    descriere_ro: Optional[str] = Field(default=None, min_length=1, max_length=2000)
    nume_en: Optional[str] = Field(default=None, max_length=200)
    descriere_en: Optional[str] = Field(default=None, max_length=2000)
    nume_ru: Optional[str] = Field(default=None, max_length=200)
    descriere_ru: Optional[str] = Field(default=None, max_length=2000)
    pret: Optional[float] = Field(default=None, ge=0, le=100000)
    imagine: Optional[str] = Field(default=None, max_length=2048)
    categorie: Optional[Categorie] = None
    subcategorie: Optional[Subcategorie] = None
    tip: Optional[str] = Field(default=None, min_length=1, max_length=100)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthUser(BaseModel):
    email: str
    role: str
    name: str


class TipCreate(BaseModel):
    nume: str = Field(min_length=1, max_length=100)
    categorie: Categorie
    subcategorie: Subcategorie

    @field_validator("nume")
    @classmethod
    def _strip_nume(cls, v: str) -> str:
        return v.strip()


class TipUpdate(BaseModel):
    nume: Optional[str] = Field(default=None, min_length=1, max_length=100)
    ordine: Optional[int] = Field(default=None, ge=0, le=10000)


class TranslateRequest(BaseModel):
    nume_ro: str
    descriere_ro: str = ""
    targets: List[str] = ["en", "ru"]


class SettingsUpdate(BaseModel):
    active_locations: Optional[List[Categorie]] = None
    subcategory_order: Optional[dict] = None  # e.g., {"terasa": {"mancare": 1, "bauturi": 2}, ...}
    tipuri_order: Optional[dict] = None  # e.g., {"terasa": {"mancare": ["Pizza", "Paste"], "bauturi": [...]}, ...}


# ---------- Auth helpers ----------
def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()


def verify_password(p: str, h: str) -> bool:
    try:
        return bcrypt.checkpw(p.encode(), h.encode())
    except Exception:
        return False


def create_access_token(email: str, role: str) -> str:
    payload = {
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_admin(request: Request) -> dict:
    auth_header = request.headers.get("Authorization", "")
    token = None
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
    if not token:
        token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    if payload.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    user = await db.users.find_one({"email": payload["email"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# ---------- Helpers ----------
def _strip(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc


def _client_ip(request: Request) -> str:
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


# ---------- Public endpoints ----------
@api.get("/")
async def root():
    return {"app": "ZERO Menu", "status": "ok"}


@api.get("/tipuri")
async def get_tipuri(subcategorie: Subcategorie, categorie: Optional[Categorie] = None):
    """Return tipuri for the filter pills, ordered by `ordine` then `nume`.
    Filters by categorie if provided (terasa/restaurant/discoteca), else returns all tipuri across locations.
    """
    q: dict = {"subcategorie": subcategorie}
    if categorie:
        q["categorie"] = categorie
    cursor = db.tipuri.find(q, {"_id": 0}).sort([("ordine", 1), ("nume", 1)])
    docs = await cursor.to_list(length=500)
    # De-dupe names (in case caller didn't pass categorie)
    seen = set()
    out = []
    for d in docs:
        n = d.get("nume")
        if n and n not in seen:
            seen.add(n)
            out.append(n)
    return {"tipuri": out}


@api.get("/home")
async def home():
    """Return trending products (top 6 by vizualizari from active locations)."""
    settings = await db.settings.find_one({"_id": "global"})
    active_locations = settings.get("active_locations", ["terasa", "restaurant", "discoteca"]) if settings else ["terasa", "restaurant", "discoteca"]
    
    cursor = db.produse.find({"categorie": {"$in": active_locations}}, {"_id": 0}).sort("vizualizari", -1).limit(6)
    trending = await cursor.to_list(length=6)
    return {"trending": trending}


@api.get("/produse")
async def list_produse(
    categorie: Optional[Categorie] = None,
    subcategorie: Optional[Subcategorie] = None,
    tip: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
):
    q: dict = {}
    if categorie:
        q["categorie"] = categorie
    if subcategorie:
        q["subcategorie"] = subcategorie
    if tip:
        q["tip"] = tip
    total = await db.produse.count_documents(q)
    skip = (page - 1) * limit
    items = await db.produse.find(q, {"_id": 0}).skip(skip).limit(limit).to_list(length=limit)
    # Also return the unique tipuri present for this combination (for filter pills)
    tipuri_present: List[str] = []
    if categorie and subcategorie:
        tipuri_present = await db.produse.distinct("tip", {"categorie": categorie, "subcategorie": subcategorie})
    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "tipuri": tipuri_present,
    }


@api.get("/produse/{produs_id}")
async def get_produs(produs_id: str, request: Request):
    produs = await db.produse.find_one({"id": produs_id}, {"_id": 0})
    if not produs:
        raise HTTPException(status_code=404, detail="Produs not found")
    # Increment view count
    await db.produse.update_one({"id": produs_id}, {"$inc": {"vizualizari": 1}})
    produs["vizualizari"] = produs.get("vizualizari", 0) + 1
    # Track visit
    await db.vizitas.insert_one({
        "id": str(uuid.uuid4()),
        "produs_id": produs_id,
        "ip": _client_ip(request),
        "data": datetime.now(timezone.utc).isoformat(),
    })
    return produs


# ---------- Auth endpoints (with brute-force protection) ----------
async def _check_lockout(identifier: str) -> None:
    """Raise 429 if identifier is currently locked out."""
    doc = await db.login_attempts.find_one({"identifier": identifier})
    if not doc:
        return
    locked_until = doc.get("locked_until")
    if locked_until and datetime.now(timezone.utc) < datetime.fromisoformat(locked_until):
        raise HTTPException(
            status_code=429,
            detail=f"Prea multe incercari esuate. Reincearca peste {LOGIN_LOCKOUT_MINUTES} minute.",
        )


async def _register_failed_login(identifier: str) -> None:
    now = datetime.now(timezone.utc)
    doc = await db.login_attempts.find_one({"identifier": identifier})
    attempts = (doc.get("attempts", 0) if doc else 0) + 1
    update = {"attempts": attempts, "last_attempt": now.isoformat()}
    if attempts >= LOGIN_MAX_ATTEMPTS:
        update["locked_until"] = (now + timedelta(minutes=LOGIN_LOCKOUT_MINUTES)).isoformat()
    await db.login_attempts.update_one({"identifier": identifier}, {"$set": update}, upsert=True)


async def _clear_failed_logins(identifier: str) -> None:
    await db.login_attempts.delete_one({"identifier": identifier})


@api.post("/auth/login")
async def login(body: LoginRequest, request: Request):
    email = body.email.lower().strip()
    identifier = f"{_client_ip(request)}:{email}"
    await _check_lockout(identifier)
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        await _register_failed_login(identifier)
        raise HTTPException(status_code=401, detail="Email sau parola incorecte")
    await _clear_failed_logins(identifier)
    token = create_access_token(email, user["role"])
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {"email": user["email"], "role": user["role"], "name": user.get("name", "Admin")},
    }


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_admin)):
    return user


# ---------- Admin endpoints ----------
@api.post("/admin/produse")
async def admin_create_produs(body: ProdusCreate, _=Depends(get_current_admin)):
    produs = Produs(**body.model_dump())
    doc = produs.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.produse.insert_one(doc.copy())
    return _strip(doc)


@api.put("/admin/produse/{produs_id}")
async def admin_update_produs(produs_id: str, body: ProdusUpdate, _=Depends(get_current_admin)):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    res = await db.produse.update_one({"id": produs_id}, {"$set": updates})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Produs not found")
    updated = await db.produse.find_one({"id": produs_id}, {"_id": 0})
    return updated


@api.delete("/admin/produse/{produs_id}")
async def admin_delete_produs(produs_id: str, _=Depends(get_current_admin)):
    res = await db.produse.delete_one({"id": produs_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Produs not found")
    return {"deleted": True, "id": produs_id}


@api.post("/admin/produse/copy")
async def admin_copy_produse(body: dict, _=Depends(get_current_admin)):
    """Copy all products and their categories from one category to another."""
    from_categorie = body.get("from_categorie")
    to_categorie = body.get("to_categorie")
    
    if not from_categorie or not to_categorie:
        raise HTTPException(status_code=400, detail="from_categorie and to_categorie required")
    
    # First, copy all tipuri (categories) from source to target
    source_tipuri = await db.tipuri.find({"categorie": from_categorie}, {"_id": 0}).to_list(length=5000)
    copied_tipuri = 0
    
    for tip in source_tipuri:
        # Check if this tip already exists in target
        existing = await db.tipuri.find_one({
            "categorie": to_categorie,
            "subcategorie": tip["subcategorie"],
            "nume": tip["nume"],
        })
        
        if not existing:
            new_tip = tip.copy()
            new_tip["id"] = str(uuid.uuid4())
            new_tip["categorie"] = to_categorie
            new_tip["created_at"] = datetime.now(timezone.utc).isoformat()
            
            try:
                await db.tipuri.insert_one(new_tip)
                copied_tipuri += 1
            except Exception as e:
                logger.error(f"Failed to copy tipuri: {e}")
                pass
    
    # Then, copy all products from source category
    source_products = await db.produse.find({"categorie": from_categorie}, {"_id": 0}).to_list(length=5000)
    
    if not source_products:
        raise HTTPException(status_code=404, detail=f"No products found in {from_categorie}")
    
    # Copy each product with a new ID
    copied_products = []
    now = datetime.now(timezone.utc).isoformat()
    
    for prod in source_products:
        new_prod = prod.copy()
        new_prod["id"] = str(uuid.uuid4())
        new_prod["categorie"] = to_categorie
        new_prod["created_at"] = now
        new_prod["vizualizari"] = 0  # Reset view count
        
        try:
            await db.produse.insert_one(new_prod)
            copied_products.append(new_prod["id"])
        except Exception as e:
            logger.error(f"Failed to copy product: {e}")
            pass
    
    return {"copied_tipuri": copied_tipuri, "copied_products": len(copied_products), "product_ids": copied_products}


@api.delete("/admin/produse/by-categorie/{categorie}")
async def admin_delete_by_categorie(categorie: Categorie, _=Depends(get_current_admin)):
    """Delete all products from a specific category."""
    res = await db.produse.delete_many({"categorie": categorie})
    return {"deleted": res.deleted_count, "categorie": categorie}


@api.post("/admin/upload")
async def admin_upload_image(file: UploadFile = File(...), _=Depends(get_current_admin)):
    """Accept image upload, resize + compress to WebP, return relative URL.
    Reduces bandwidth — typical 3MB photo ~ 150KB WebP.
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Fisierul trebuie sa fie imagine")
    raw = await file.read()
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Imagine prea mare (max 8MB)")
    try:
        img = Image.open(io.BytesIO(raw))
        img.load()
        # Convert to RGB (WebP doesn't need alpha here, flatten against white)
        if img.mode in ("RGBA", "LA", "P"):
            bg = Image.new("RGB", img.size, (255, 255, 255))
            if img.mode == "P":
                img = img.convert("RGBA")
            bg.paste(img, mask=img.split()[-1] if img.mode in ("RGBA", "LA") else None)
            img = bg
        elif img.mode != "RGB":
            img = img.convert("RGB")
        # Downscale
        if img.width > MAX_IMG_WIDTH:
            ratio = MAX_IMG_WIDTH / img.width
            new_size = (MAX_IMG_WIDTH, int(img.height * ratio))
            img = img.resize(new_size, Image.LANCZOS)
        filename = f"{uuid.uuid4().hex}.webp"
        out_path = UPLOADS_DIR / filename
        img.save(out_path, format="WEBP", quality=WEBP_QUALITY, method=6)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Upload processing failed")
        raise HTTPException(status_code=400, detail=f"Procesare imagine esuata: {e}")
    url = f"/api/uploads/{filename}"
    return {"url": url, "filename": filename, "size": out_path.stat().st_size}


@api.get("/uploads/{filename}")
async def serve_upload(filename: str):
    # Basic traversal guard
    if "/" in filename or ".." in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    path = UPLOADS_DIR / filename
    if not path.exists() or not path.is_file():
        raise HTTPException(status_code=404, detail="Not found")
    # Long cache — filenames are unique per upload
    return FileResponse(
        path,
        media_type="image/webp",
        headers={"Cache-Control": "public, max-age=31536000, immutable"},
    )


# ---------- Admin: Tipuri (categorii produse) ----------
@api.get("/admin/tipuri")
async def admin_list_tipuri(
    _=Depends(get_current_admin),
    subcategorie: Optional[Subcategorie] = None,
    categorie: Optional[Categorie] = None,
):
    q: dict = {}
    if subcategorie:
        q["subcategorie"] = subcategorie
    if categorie:
        q["categorie"] = categorie
    docs = await db.tipuri.find(q, {"_id": 0}).sort([("categorie", 1), ("subcategorie", 1), ("ordine", 1), ("nume", 1)]).to_list(length=2000)
    # Annotate each tip with how many products use it (matched on categorie+subcategorie+nume)
    out = []
    for d in docs:
        n = await db.produse.count_documents({
            "categorie": d.get("categorie"),
            "subcategorie": d["subcategorie"],
            "tip": d["nume"],
        })
        out.append({**d, "produse_count": n})
    return {"items": out}


@api.post("/admin/tipuri")
async def admin_create_tip(body: TipCreate, _=Depends(get_current_admin)):
    nume = body.nume.strip()
    if not nume:
        raise HTTPException(status_code=400, detail="Numele nu poate fi gol")
    existing = await db.tipuri.find_one({
        "categorie": body.categorie,
        "subcategorie": body.subcategorie,
        "nume": nume,
    })
    if existing:
        raise HTTPException(status_code=409, detail="Acest tip exista deja pentru aceasta locatie")
    last = await db.tipuri.find(
        {"categorie": body.categorie, "subcategorie": body.subcategorie},
        {"ordine": 1},
    ).sort("ordine", -1).limit(1).to_list(length=1)
    next_ordine = (last[0].get("ordine", 0) + 1) if last else 1
    doc = {
        "id": str(uuid.uuid4()),
        "nume": nume,
        "categorie": body.categorie,
        "subcategorie": body.subcategorie,
        "ordine": next_ordine,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.tipuri.insert_one(doc.copy())
    return _strip(doc)


@api.delete("/admin/tipuri/{tip_id}")
async def admin_delete_tip(tip_id: str, force: bool = False, _=Depends(get_current_admin)):
    tip = await db.tipuri.find_one({"id": tip_id})
    if not tip:
        raise HTTPException(status_code=404, detail="Tip not found")
    count = await db.produse.count_documents({
        "categorie": tip.get("categorie"),
        "subcategorie": tip["subcategorie"],
        "tip": tip["nume"],
    })
    if count > 0 and not force:
        raise HTTPException(
            status_code=409,
            detail=f"Acest tip are {count} produse. Sterge-le sau muta-le, ori foloseste force=true pentru cascade.",
        )
    deleted_products = 0
    if count > 0 and force:
        res = await db.produse.delete_many({
            "categorie": tip.get("categorie"),
            "subcategorie": tip["subcategorie"],
            "tip": tip["nume"],
        })
        deleted_products = res.deleted_count
    await db.tipuri.delete_one({"id": tip_id})
    return {"deleted": True, "id": tip_id, "deleted_products": deleted_products}


# ---------- Admin: Translate ----------


def fix_restaurant_terms(text: str, lang: str) -> str:
    if not text:
        return text

    if lang == "ru":
        text = re.sub(r"(?i)cantitate\s*:\s*", "количество: ", text)

    if lang == "en":
        text = re.sub(r"(?i)cantitate\s*:\s*", "quantity: ", text)

    return text


# ---------- TRANSLATE ----------
@api.post("/admin/translate")
async def admin_translate(body: TranslateRequest, _=Depends(lambda: None)):

    if not deepl_client:
        raise HTTPException(status_code=500, detail="DEEPL_API_KEY not configured")

    LANG_MAP = {
        "en": "EN-GB",
        "ru": "RU"
    }

    result = {}

    for lang in body.targets:
        if lang not in LANG_MAP:
            continue

        try:
            translated_name = deepl_client.translate_text(
                body.nume_ro,
                target_lang=LANG_MAP[lang]
            ).text

            translated_desc = deepl_client.translate_text(
                body.descriere_ro or "",
                target_lang=LANG_MAP[lang]
            ).text

            # fix DOAR după traducere
            translated_name = fix_restaurant_terms(translated_name, lang)
            translated_desc = fix_restaurant_terms(translated_desc, lang)

            result[f"nume_{lang}"] = translated_name
            result[f"descriere_{lang}"] = translated_desc

        except Exception as e:
            logger.exception("DeepL failed")
            raise HTTPException(status_code=502, detail=str(e))

    return result

# ---------- Admin: Produse List ----------
@api.get("/admin/produse")
async def admin_list_produse(
    _=Depends(get_current_admin),
    categorie: Optional[Categorie] = None,
    subcategorie: Optional[Subcategorie] = None,
):
    q: dict = {}
    if categorie:
        q["categorie"] = categorie
    if subcategorie:
        q["subcategorie"] = subcategorie
    items = await db.produse.find(q, {"_id": 0}).sort("created_at", -1).to_list(length=1000)
    return {"items": items}


@api.get("/admin/analytics")
async def admin_analytics(_=Depends(get_current_admin)):
    total_produse = await db.produse.count_documents({})
    total_vizite = await db.vizitas.count_documents({})
    # Unique IPs in last 24h
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    unique_ips_24h = len(await db.vizitas.distinct("ip", {"data": {"$gte": cutoff}}))
    # Top 10 produse by views
    top = await db.produse.find({}, {"_id": 0, "id": 1, "nume_ro": 1, "nume_en": 1, "nume_ru": 1, "vizualizari": 1, "categorie": 1, "imagine": 1}) \
        .sort("vizualizari", -1).limit(10).to_list(length=10)
    # Views per location
    pipeline = [
        {"$group": {"_id": "$categorie", "total_views": {"$sum": "$vizualizari"}, "count": {"$sum": 1}}}
    ]
    per_loc = await db.produse.aggregate(pipeline).to_list(length=10)
    return {
        "total_produse": total_produse,
        "total_vizite": total_vizite,
        "unique_ips_24h": unique_ips_24h,
        "top_produse": top,
        "per_locatie": [{"categorie": p["_id"], "views": p["total_views"], "count": p["count"]} for p in per_loc],
    }


# ---------- Settings (Public) ----------
@api.get("/settings")
async def get_settings_public():
    """Get global settings (public endpoint - no auth required). Returns active locations and category ordering."""
    settings = await db.settings.find_one({"_id": "global"})
    if not settings:
        # Return defaults
        return {
            "active_locations": ["terasa", "restaurant", "discoteca"],
            "subcategory_order": {},
            "tipuri_order": {}
        }
    settings.pop("_id", None)
    return settings


# ---------- Admin: Settings ----------
@api.get("/admin/settings")
async def admin_get_settings(_=Depends(get_current_admin)):
    """Get global settings (active locations, category order)."""
    settings = await db.settings.find_one({"_id": "global"})
    if not settings:
        # Return defaults
        return {
            "active_locations": ["terasa", "restaurant", "discoteca"],
            "category_order": {"mancare": 1, "bauturi": 2},
        }
    settings.pop("_id", None)
    return settings


@api.put("/admin/settings")
async def admin_update_settings(body: SettingsUpdate, _=Depends(get_current_admin)):
    """Update global settings (active locations, category order)."""
    update_data = {}
    if body.active_locations is not None:
        update_data["active_locations"] = body.active_locations
    if body.subcategory_order is not None:
        update_data["subcategory_order"] = body.subcategory_order
    if body.tipuri_order is not None:
        update_data["tipuri_order"] = body.tipuri_order
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No settings to update")
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.settings.update_one(
        {"_id": "global"},
        {"$set": update_data},
        upsert=True
    )
    
    settings = await db.settings.find_one({"_id": "global"})
    settings.pop("_id", None)
    return settings


# ---------- Startup: seed admin + products ----------
@app.on_event("startup")
async def on_startup():
    # Indexes
    await db.produse.create_index("id", unique=True)
    await db.produse.create_index([("categorie", 1), ("subcategorie", 1), ("tip", 1)])
    await db.users.create_index("email", unique=True)
    await db.login_attempts.create_index("identifier", unique=True)
    await db.vizitas.create_index("data")

    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@zero.ro").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Admin",
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info(f"Seeded admin user: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})
        logger.info(f"Updated admin password: {admin_email}")

    # Seed/migrate tipuri collection
    # Drop old indexes that referenced (subcategorie, nume) only — recreate with categorie included
    try:
        existing_indexes = await db.tipuri.index_information()
        for idx_name, idx_info in list(existing_indexes.items()):
            if idx_name == "_id_":
                continue
            keys = [k for k, _ in idx_info.get("key", [])]
            if keys == ["subcategorie", "nume"]:
                await db.tipuri.drop_index(idx_name)
    except Exception:
        pass
    await db.tipuri.create_index([("categorie", 1), ("subcategorie", 1), ("nume", 1)], unique=True)
    await db.tipuri.create_index("id", unique=True)

    # Migrate any tipuri without categorie field — duplicate them for terasa, restaurant & discoteca
    legacy_cursor = db.tipuri.find({"categorie": {"$exists": False}}, {"_id": 0})
    legacy = await legacy_cursor.to_list(length=2000)
    if legacy:
        new_docs = []
        now_iso = datetime.now(timezone.utc).isoformat()
        for doc in legacy:
            for cat in ("terasa", "restaurant", "discoteca"):
                new_docs.append({
                    "id": str(uuid.uuid4()),
                    "nume": doc["nume"],
                    "categorie": cat,
                    "subcategorie": doc["subcategorie"],
                    "ordine": doc.get("ordine", 1),
                    "created_at": now_iso,
                })
        # Remove all legacy rows then insert new
        await db.tipuri.delete_many({"categorie": {"$exists": False}})
        # Insert (ignore duplicates if any)
        for d in new_docs:
            try:
                await db.tipuri.insert_one(d)
            except Exception:
                pass
        logger.info(f"Migrated {len(legacy)} legacy tipuri -> {len(new_docs)} location-scoped tipuri")

    tipuri_count = await db.tipuri.count_documents({})
    if tipuri_count == 0:
        seed_docs = []
        now_iso = datetime.now(timezone.utc).isoformat()
        for cat in ("terasa", "restaurant", "discoteca"):
            for i, nume in enumerate(TIPURI_MANCARE, start=1):
                seed_docs.append({
                    "id": str(uuid.uuid4()),
                    "nume": nume,
                    "categorie": cat,
                    "subcategorie": "mancare",
                    "ordine": i,
                    "created_at": now_iso,
                })
            for i, nume in enumerate(TIPURI_BAUTURI, start=1):
                seed_docs.append({
                    "id": str(uuid.uuid4()),
                    "nume": nume,
                    "categorie": cat,
                    "subcategorie": "bauturi",
                    "ordine": i,
                    "created_at": now_iso,
                })
        if seed_docs:
            await db.tipuri.insert_many(seed_docs)
            logger.info(f"Seeded {len(seed_docs)} tipuri (per location)")

    # Seed/initialize settings
    settings = await db.settings.find_one({"_id": "global"})
    if not settings:
        # Build initial tipuri order from database
        tipuri_order = {}
        for cat in ("terasa", "restaurant", "discoteca"):
            tipuri_order[cat] = {}
            for subcat in ("mancare", "bauturi"):
                tipuri_docs = await db.tipuri.find(
                    {"categorie": cat, "subcategorie": subcat},
                    {"nume": 1}
                ).sort("ordine", 1).to_list(length=500)
                tipuri_order[cat][subcat] = [doc["nume"] for doc in tipuri_docs]

        await db.settings.insert_one({
            "_id": "global",
            "active_locations": ["terasa", "restaurant", "discoteca"],
            "subcategory_order": {
                "terasa": {"mancare": 1, "bauturi": 2},
                "restaurant": {"mancare": 1, "bauturi": 2},
                "discoteca": {"mancare": 1, "bauturi": 2},
            },
            "tipuri_order": tipuri_order,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info("Initialized global settings with tipuri order")
    else:
        # Migrate old category_order to subcategory_order
        if "category_order" in settings and "subcategory_order" not in settings:
            await db.settings.update_one(
                {"_id": "global"},
                {
                    "$set": {
                        "subcategory_order": {
                            "terasa": settings.get("category_order", {"mancare": 1, "bauturi": 2}),
                            "restaurant": settings.get("category_order", {"mancare": 1, "bauturi": 2}),
                            "discoteca": settings.get("category_order", {"mancare": 1, "bauturi": 2}),
                        }
                    },
                    "$unset": {"category_order": ""},
                }
            )
            logger.info("Migrated category_order to subcategory_order per location")
        
        # Initialize tipuri_order if missing
        if "tipuri_order" not in settings:
            tipuri_order = {}
            for cat in ("terasa", "restaurant", "discoteca"):
                tipuri_order[cat] = {}
                for subcat in ("mancare", "bauturi"):
                    tipuri_docs = await db.tipuri.find(
                        {"categorie": cat, "subcategorie": subcat},
                        {"nume": 1}
                    ).sort("ordine", 1).to_list(length=500)
                    tipuri_order[cat][subcat] = [doc["nume"] for doc in tipuri_docs]
            
            await db.settings.update_one(
                {"_id": "global"},
                {"$set": {"tipuri_order": tipuri_order}}
            )
            logger.info("Initialized tipuri_order in existing settings")


app.include_router(api)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        return response


app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],  # Allow all origins in production
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
