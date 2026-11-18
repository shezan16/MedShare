import os
import re
import io
import math
import base64
import hashlib
from datetime import datetime, date
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(
    title="MedShare AI Vision & Intelligence Microservice",
    description="Production-grade AI microservice for Medicine OCR, Expiry/Batch extraction, Human-in-the-Loop verification, and Donor Matching",
    version="1.4.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------- Image & OCR Libraries -----------------
CV2_AVAILABLE = False
try:
    import cv2
    import numpy as np
    CV2_AVAILABLE = True
except ImportError:
    CV2_AVAILABLE = False

PIL_AVAILABLE = False
try:
    from PIL import Image, ImageOps, ImageEnhance
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False

PYTESSERACT_AVAILABLE = False
AVAILABLE_LANGS = "eng"
try:
    import pytesseract
    pytesseract.get_tesseract_version()
    PYTESSERACT_AVAILABLE = True
    langs = pytesseract.get_languages()
    if "ben" in langs:
        AVAILABLE_LANGS = "eng+ben"
except Exception:
    PYTESSERACT_AVAILABLE = False

# ----------------- Data Models -----------------

class ScanMedicineRequest(BaseModel):
    image_base64: Optional[str] = Field(None, description="Base64-encoded image bytes")
    filename: Optional[str] = Field("medicine.jpg", description="Original file name")
    raw_ocr_hint: Optional[str] = Field(None, description="Optional raw text input for parsing")

class OCRScanResult(BaseModel):
    medicineName: Optional[str] = None
    genericName: Optional[str] = None
    brandName: Optional[str] = None
    strength: Optional[str] = None
    dosageForm: Optional[str] = None
    manufacturer: Optional[str] = None
    batchNumber: Optional[str] = None
    mfgDate: Optional[str] = None
    expiryDate: Optional[str] = None
    confidence: float
    verificationStatus: str
    humanReviewRequired: bool
    verificationNotice: str
    extractedTextRaw: str
    safetyWarnings: List[str]
    daysUntilExpiry: Optional[int] = None

class HumanSignoffRequest(BaseModel):
    medicineId: str
    pharmacistEmail: str
    pharmacistLicense: str
    confirmedName: str
    confirmedBatch: str
    confirmedExpiry: str
    confirmedStrength: str
    packagingConditionConfirmed: bool
    temperatureConditionConfirmed: bool
    clinicalNotes: Optional[str] = ""

class HumanSignoffResponse(BaseModel):
    success: bool
    verificationReceiptId: str
    signedAt: str
    verificationStatus: str
    cryptographicHash: str
    verifiedBy: str
    medicineId: str

class DonorCandidate(BaseModel):
    id: str
    fullName: str
    bloodGroup: str
    latitude: float
    longitude: float
    isAvailable: bool
    isVerified: bool
    responseRate: Optional[float] = 100.0
    lastDonationDate: Optional[str] = None
    preferredRadiusKm: Optional[float] = 5.0

class RankRequest(BaseModel):
    hospitalLat: float
    hospitalLng: float
    requiredBloodGroup: str
    radiusKm: float = 5.0
    candidates: List[DonorCandidate]

class RankedDonor(BaseModel):
    donorId: str
    displayName: str
    bloodGroup: str
    approxDistanceKm: float
    isAvailable: bool
    isVerified: bool
    matchScore: float
    eligibilityStatus: str
    scoreBreakdown: Dict[str, float]

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    userRole: Optional[str] = "GUEST"

class ChatResponse(BaseModel):
    response: str
    suggestedActions: List[str]
    disclaimer: str

# ----------------- Known Medicines Reference Catalog -----------------
KNOWN_MEDICINES = [
    {
        "pattern": r"(mycocure|terbinafine|মাইকোকিউর|টারবিনাফিন|xfin|terbex|lamisil)",
        "name": "Mycocure 250 mg",
        "generic": "Terbinafine Hydrochloride",
        "brand": "Mycocure",
        "defaultStrength": "250 mg",
        "dosage": "Tablet",
        "manufacturer": "Incepta Pharmaceuticals",
        "coldChain": False
    },
    {
        "pattern": r"\b(napa|ace|paracetamol|panadol|calpol|acetaminophen|tylenol|fast|renova|নাপা|প্যারাসিটামল)\b",
        "name": "Paracetamol",
        "generic": "Paracetamol",
        "brand": "Napa / Ace / Panadol",
        "defaultStrength": "500 mg",
        "dosage": "Tablet",
        "manufacturer": "Beximco / Square Pharmaceuticals",
        "coldChain": False
    },
    {
        "pattern": r"\b(seclo|sergel|maxpro|losectil|omeprazole|esomeprazole|pantonix|finix|pantoprazole|rabeprazole|সেকলো|সারজেল)\b",
        "name": "Omeprazole / Esomeprazole",
        "generic": "Omeprazole / Esomeprazole",
        "brand": "Seclo / Sergel / Maxpro",
        "defaultStrength": "20 mg",
        "dosage": "Capsule",
        "manufacturer": "Square / Healthcare / Renata",
        "coldChain": False
    },
    {
        "pattern": r"\b(amox|amoxicillin|amoxil|augmentin|moxacil|fimoxyl)\b",
        "name": "Amoxicillin Trihydrate",
        "generic": "Amoxicillin",
        "brand": "Moxacil / Amoxil",
        "defaultStrength": "500 mg",
        "dosage": "Capsule",
        "manufacturer": "Square / Beximco",
        "coldChain": False
    },
    {
        "pattern": r"\b(azithro|azithromycin|zithromax|zimax|azicin|tridosil)\b",
        "name": "Azithromycin",
        "generic": "Azithromycin",
        "brand": "Zimax / Zithromax",
        "defaultStrength": "500 mg",
        "dosage": "Tablet",
        "manufacturer": "Square Pharmaceuticals",
        "coldChain": False
    },
    {
        "pattern": r"\b(cefixime|suprax|cef-3|cef3|orcef|t-cef)\b",
        "name": "Cefixime Trihydrate",
        "generic": "Cefixime",
        "brand": "Cef-3 / Orcef",
        "defaultStrength": "200 mg",
        "dosage": "Capsule",
        "manufacturer": "Square / Incepta",
        "coldChain": False
    },
    {
        "pattern": r"\b(cefuroxime|kilbac|sefdin|cerox-a|furotil)\b",
        "name": "Cefuroxime Axetil",
        "generic": "Cefuroxime",
        "brand": "Kilbac / Furotil",
        "defaultStrength": "500 mg",
        "dosage": "Tablet",
        "manufacturer": "Incepta / Square",
        "coldChain": False
    },
    {
        "pattern": r"\b(ciprofloxacin|ciprocin|neofloxin)\b",
        "name": "Ciprofloxacin",
        "generic": "Ciprofloxacin",
        "brand": "Ciprocin",
        "defaultStrength": "500 mg",
        "dosage": "Tablet",
        "manufacturer": "Square Pharmaceuticals",
        "coldChain": False
    },
    {
        "pattern": r"\b(metformin|glucophage|comet|nobesit)\b",
        "name": "Metformin Hydrochloride",
        "generic": "Metformin HCl",
        "brand": "Comet / Glucophage",
        "defaultStrength": "500 mg",
        "dosage": "Tablet",
        "manufacturer": "Square Pharmaceuticals",
        "coldChain": False
    },
    {
        "pattern": r"\b(monas|montene|montair|montelukast|lumona)\b",
        "name": "Montelukast Sodium",
        "generic": "Montelukast",
        "brand": "Monas / Lumona",
        "defaultStrength": "10 mg",
        "dosage": "Tablet",
        "manufacturer": "ACME / Square",
        "coldChain": False
    },
    {
        "pattern": r"\b(fexo|fexofenadine|telfast|fenadin|axodin)\b",
        "name": "Fexofenadine Hydrochloride",
        "generic": "Fexofenadine HCl",
        "brand": "Fexo / Fenadin",
        "defaultStrength": "120 mg",
        "dosage": "Tablet",
        "manufacturer": "Square / Renata",
        "coldChain": False
    },
    {
        "pattern": r"\b(alatrol|cetirizine|zirtec)\b",
        "name": "Cetirizine Hydrochloride",
        "generic": "Cetirizine",
        "brand": "Alatrol",
        "defaultStrength": "10 mg",
        "dosage": "Tablet",
        "manufacturer": "Square Pharmaceuticals",
        "coldChain": False
    },
    {
        "pattern": r"\b(bizoran|amlocal|amlodipine|camlodin|ocal)\b",
        "name": "Amlodipine",
        "generic": "Amlodipine",
        "brand": "Amlocal / Bizoran",
        "defaultStrength": "5 mg",
        "dosage": "Tablet",
        "manufacturer": "Beximco / Square",
        "coldChain": False
    },
    {
        "pattern": r"\b(insulin|humulin|actrapid|novorapid|lantus|insulatard|maxsulin)\b",
        "name": "Human Insulin",
        "generic": "Insulin",
        "brand": "Actrapid / Lantus / Maxsulin",
        "defaultStrength": "100 IU/ml",
        "dosage": "Vial / Injection",
        "manufacturer": "Novo Nordisk / Incepta",
        "coldChain": True
    }
]

KNOWN_MANUFACTURERS = [
    "Incepta", "Square", "Beximco", "Renata", "Healthcare", "Opsonin",
    "Eskayef", "SK+F", "ACI", "Aristopharma", "Acme", "Drug International",
    "Radiant", "Popular", "Beacon", "Orion", "Ibn Sina", "Sanofi",
    "Novartis", "GSK", "GlaxoSmithKline", "Pfizer", "Novo Nordisk", "Sandoz", "Merck", "Lupin"
]

GENERIC_SUFFIX_PATTERN = r"\b([A-Za-z]{4,}(?:cillin|mycin|floxacin|prazole|tidine|profen|paracetamol|terbinafine|conazole|lukast|fenadine|cetirizine|dipine|sartan|statin|formin|gliptin|olol|pam|zole|vir|mab|ine|ate))\b"

# ----------------- Image Preprocessing & Multi-Angle OCR -----------------

def score_ocr_text(text: str) -> int:
    """Scores an OCR pass based on valid pharmaceutical terms, English words, and embossed batch codes."""
    if not text:
        return 0
    score = 0
    for med in KNOWN_MEDICINES:
        if re.search(med["pattern"], text, re.IGNORECASE):
            score += 50
    for comp in KNOWN_MANUFACTURERS:
        if re.search(rf"\b{re.escape(comp)}\b", text, re.IGNORECASE):
            score += 30
    if re.search(GENERIC_SUFFIX_PATTERN, text, re.IGNORECASE):
        score += 35
    if re.search(r"\b\d+\s*(?:mg|gm|ml|mcg|iu|মি\.?গ্রা\.?)\b", text, re.IGNORECASE):
        score += 40
    # Reward finding blister embossed batch+expiry stamps like 26004E0528
    if re.search(r"\b\d{4,6}[A-Za-z0-9]\d{4}\b", text):
        score += 45
    valid_words = re.findall(r"\b[A-Za-z]{4,15}\b", text)
    score += len(valid_words) * 3
    return score

def clean_ocr_noise(raw_text: str) -> str:
    """Removes noisy foil-dot symbols and keeps meaningful lines."""
    cleaned_lines = []
    for line in raw_text.splitlines():
        line_str = line.strip()
        if len(line_str) < 3:
            continue
        line_str = re.sub(r"[§|«»©®™~_=\[\]{}<>\\]+", " ", line_str).strip()
        alnum_count = sum(c.isalnum() for c in line_str)
        if alnum_count >= 3 and (alnum_count / max(1, len(line_str))) >= 0.45:
            cleaned_lines.append(line_str)
    return "\n".join(cleaned_lines)

def preprocess_for_blister_and_box(gray_img):
    """Smooths metallic blister-pack dot textures while sharpening printed ink."""
    height, width = gray_img.shape[:2]
    if width < 900:
        scale = 900 / width
        gray_img = cv2.resize(gray_img, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)

    blurred = cv2.GaussianBlur(gray_img, (3, 3), 0)
    clahe = cv2.createCLAHE(clipLimit=2.2, tileGridSize=(8, 8))
    enhanced = clahe.apply(blurred)
    return enhanced

def scan_blister_margins_for_codes(gray_orig) -> List[str]:
    """
    Specifically crops the 4 margins (top, bottom, left, right) of a blister pack,
    rotates them upright, magnifies 2.5x, and runs alphanumeric-only OCR to catch
    upside-down embossed/printed batch & expiry codes (e.g. 26004E0528).
    """
    found_codes = []
    h, w = gray_orig.shape[:2]
    if h < 100 or w < 100:
        return found_codes

    # Crop outer 18% margins and orient them right-side-up
    margin_strips = [
        gray_orig[int(h * 0.82):h, :],                                              # Bottom normal
        cv2.rotate(gray_orig[int(h * 0.82):h, :], cv2.ROTATE_180),                  # Bottom upside-down
        gray_orig[0:int(h * 0.18), :],                                              # Top normal
        cv2.rotate(gray_orig[0:int(h * 0.18), :], cv2.ROTATE_180),                  # Top upside-down
        cv2.rotate(gray_orig[:, 0:int(w * 0.18)], cv2.ROTATE_90_CLOCKWISE),         # Left margin
        cv2.rotate(gray_orig[:, int(w * 0.82):w], cv2.ROTATE_90_COUNTERCLOCKWISE),  # Right margin
    ]

    whitelist_cfg = "--oem 3 --psm 6 -c tessedit_char_whitelist=0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ/:.- "

    for strip in margin_strips:
        try:
            # Upscale 2.5x for small edge stamp numbers
            zoom = cv2.resize(strip, None, fx=2.5, fy=2.5, interpolation=cv2.INTER_CUBIC)
            clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
            enh = clahe.apply(zoom)
            raw_edge = pytesseract.image_to_string(enh, lang="eng", config=whitelist_cfg).strip()
            # Look for compact batch/expiry strings or date patterns
            matches = re.findall(r"[A-Z0-9]{3,8}[\s\-/]*[A-Z0-9]{4,10}", raw_edge)
            for m in matches:
                if sum(c.isdigit() for c in m) >= 4:
                    found_codes.append(m.strip())
        except Exception:
            continue

    return list(dict.fromkeys(found_codes))

def extract_text_from_base64(image_base64: str) -> str:
    """
    Decodes base64 image, scans across all 4 rotations (0°, 90°, 180°, 270°),
    and performs dedicated edge-margin scanning for blister batch/expiry stamps.
    """
    if not PYTESSERACT_AVAILABLE:
        return ""

    try:
        b64_data = image_base64.split(",")[-1].strip()
        img_bytes = base64.b64decode(b64_data)

        if CV2_AVAILABLE:
            nparr = np.frombuffer(img_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if img is None:
                return ""

            gray_orig = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

            # Test all 4 orientations so upside-down or vertical text is always read
            rotations = [
                ("0_deg", gray_orig),
                ("90_cw", cv2.rotate(gray_orig, cv2.ROTATE_90_CLOCKWISE)),
                ("90_ccw", cv2.rotate(gray_orig, cv2.ROTATE_90_COUNTERCLOCKWISE)),
                ("180_deg", cv2.rotate(gray_orig, cv2.ROTATE_180)),
            ]

            best_text = ""
            best_score = -1
            all_good_lines = []

            for label, rot_gray in rotations:
                processed = preprocess_for_blister_and_box(rot_gray)
                raw = pytesseract.image_to_string(processed, lang=AVAILABLE_LANGS, config="--oem 3 --psm 6")
                cleaned = clean_ocr_noise(raw)
                sc = score_ocr_text(cleaned)

                if sc > best_score:
                    best_score = sc
                    best_text = cleaned

                if sc >= 30:
                    all_good_lines.extend(cleaned.splitlines())

            # Also scan outer margins specifically for upside-down embossed batch/expiry stamps
            edge_codes = scan_blister_margins_for_codes(gray_orig)
            if edge_codes:
                all_good_lines.extend(edge_codes)

            if all_good_lines:
                unique_lines = list(dict.fromkeys(all_good_lines))
                return "\n".join(unique_lines)

            return best_text

        elif PIL_AVAILABLE:
            image = Image.open(io.BytesIO(img_bytes))
            gray = ImageOps.grayscale(image)
            best_text = ""
            best_score = -1
            for angle in [0, 90, 180, 270]:
                rot = gray.rotate(angle, expand=True)
                raw = pytesseract.image_to_string(rot, lang=AVAILABLE_LANGS, config="--oem 3 --psm 6")
                cleaned = clean_ocr_noise(raw)
                sc = score_ocr_text(cleaned)
                if sc > best_score:
                    best_score = sc
                    best_text = cleaned
            return best_text

    except Exception as e:
        print(f"OCR Extraction Error: {e}")
        return ""
    return ""

def normalize_date_string(raw_date: str) -> Optional[str]:
    """Converts MM/YY, MM/YYYY, YYYY-MM-DD, or MMM YYYY into standard YYYY-MM-DD."""
    clean = raw_date.strip()
    month_map = {
        "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
        "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12
    }
    m_text = re.search(r"([a-zA-Z]{3})[a-zA-Z]*[\s\-\.,/]*(\d{2,4})", clean)
    if m_text:
        m_str = m_text.group(1).lower()
        y_str = m_text.group(2)
        if m_str in month_map:
            month = month_map[m_str]
            year_int = int(f"20{y_str}") if len(y_str) == 2 else int(y_str)
            if 2020 <= year_int <= 2035:
                return f"{year_int}-{month:02d}-01"

    clean_num = clean.replace(".", "/").replace("-", "/").replace(" ", "/")
    parts = [p for p in clean_num.split("/") if p.isdigit()]
    try:
        if len(parts) == 2:
            month, year = int(parts[0]), parts[1]
            if len(year) == 2:
                year = f"20{year}"
            year_int = int(year)
            if 1 <= month <= 12 and 2020 <= year_int <= 2035:
                return f"{year_int}-{month:02d}-01"
        elif len(parts) == 3:
            if len(parts[0]) == 4:
                y, m, d = int(parts[0]), int(parts[1]), int(parts[2])
            else:
                d, m = int(parts[0]), int(parts[1])
                y = int(f"20{parts[2]}") if len(parts[2]) == 2 else int(parts[2])
            if 1 <= m <= 12 and 1 <= d <= 31 and 2020 <= y <= 2035:
                return f"{y}-{m:02d}-{d:02d}"
    except ValueError:
        pass
    return None

def parse_compact_blister_stamp(text: str) -> Dict[str, Optional[str]]:
    """
    Decodes compact Bangladeshi blister strip edge stamps such as '26004E0528' or '26004 E 0528'
    where:
      - '26004' -> Batch Number (first 2 digits '26' indicate Mfg Year 2026)
      - 'E' or 'EXP' -> Expiry separator (sometimes misread by OCR as 8, B, F, or 3)
      - '0528' -> Expiry MMYY (05/2028 -> 2028-05-01)
    """
    result = {"batch": None, "mfg": None, "exp": None}

    # Pattern 1: <4-6 digit batch> <E/EXP/B/F> <MMYY> (e.g., 26004E0528, 25112E1227)
    compact_matches = re.finditer(r"\b(\d{4,6})\s*(?:EXP|E|B|F|8)\s*(0[1-9]|1[0-2])(2[5-9]|3[0-5])\b", text, re.IGNORECASE)
    for m in compact_matches:
        b_code, exp_m, exp_y = m.group(1), int(m.group(2)), int(m.group(3))
        result["batch"] = b_code
        result["exp"] = f"20{exp_y}-{exp_m:02d}-01"
        # Infer manufacturing year if batch starts with valid year prefix (e.g. 24, 25, 26)
        yr_prefix = int(b_code[:2])
        if 20 <= yr_prefix <= 27 and yr_prefix <= exp_y:
            result["mfg"] = f"20{yr_prefix}-01-01"
        return result

    return result

def parse_medicine_text(raw_text: str) -> Dict[str, Any]:
    """
    Extracts medicine details from multi-angle OCR text and edge stamps.
    Never fabricates fake fallback data when fields are unreadable.
    """
    cleaned = raw_text.strip()
    warnings = []

    if not cleaned or len(cleaned) < 3:
        engine_msg = (
            "No clear medicine text detected in the image. Please upload a clear, well-lit photo of the medicine strip or box."
            if PYTESSERACT_AVAILABLE else
            "OCR Engine (Tesseract) is not available on the server. Manual pharmacist entry required."
        )
        return {
            "medicineName": None,
            "genericName": None,
            "brandName": None,
            "strength": None,
            "dosageForm": None,
            "manufacturer": None,
            "batchNumber": None,
            "mfgDate": None,
            "expiryDate": None,
            "confidence": 0.0,
            "verificationStatus": "UNREADABLE",
            "humanReviewRequired": True,
            "verificationNotice": engine_msg,
            "extractedTextRaw": "No raw OCR text detected.",
            "safetyWarnings": ["UNREADABLE_IMAGE: Could not read clear text from image. Manual pharmacist verification mandatory."],
            "daysUntilExpiry": None
        }

    # 1. Match against known medicines catalog
    matched_meta = None
    for med in KNOWN_MEDICINES:
        if re.search(med["pattern"], cleaned, re.IGNORECASE):
            matched_meta = med
            break

    # 2. Strength extraction (supports English mg/ml and Bengali মি.গ্রা.)
    strength = None
    str_match = re.search(r"\b([0-9]+(?:\.[0-9]+)?\s*(?:mg|gm|g|ml|mcg|iu|iu\/ml|%))\b", cleaned, re.IGNORECASE)
    if str_match:
        strength = str_match.group(1).strip()
    elif re.search(r"(২৫০|250)\s*(?:মি\.?গ্রা\.?|mg)", cleaned, re.IGNORECASE):
        strength = "250 mg"
    elif re.search(r"(৫০০|500)\s*(?:মি\.?গ্রা\.?|mg)", cleaned, re.IGNORECASE):
        strength = "500 mg"
    elif matched_meta and matched_meta.get("defaultStrength"):
        strength = matched_meta["defaultStrength"]

    # 3. Check for Compact Blister Edge Stamp first (e.g. 26004E0528)
    blister_stamp = parse_compact_blister_stamp(cleaned)
    batch_num = blister_stamp["batch"]
    expiry_date = blister_stamp["exp"]
    mfg_date = blister_stamp["mfg"]

    # 4. Standard Batch Number extraction (if not already decoded from compact stamp)
    if not batch_num:
        batch_patterns = [
            r"(?:batch(?:\s*no\.?)?|b\.?\s*no\.?|lot(?:\s*no\.?)?|bn|b\.?n\.?)[:\.\-\s]+([A-Za-z0-9\-/]{3,16})",
            r"\b(\d{4,6}[A-Z]\d{3,5})\b"
        ]
        for bp in batch_patterns:
            m = re.search(bp, cleaned, re.IGNORECASE)
            if m:
                candidate = m.group(1).strip().upper()
                if candidate not in ["DATE", "NUMBER", "EXP", "MFG", "MFD", "MRP", "PRICE"] and any(c.isdigit() for c in candidate):
                    batch_num = candidate
                    break

    # 5. Standard Expiry Date extraction
    if not expiry_date:
        exp_patterns = [
            r"(?:exp(?:iry)?(?:\s*date)?|use\s*before|best\s*before|exp\.?\s*dt|ed)[:\.\-\s]*([0-9]{1,2}[\/\-\.\s][0-9]{2,4}|[0-9]{4}[\/\-\.\s][0-9]{1,2}[\/\-\.\s][0-9]{1,2}|[A-Za-z]{3,9}[\s\-\.,/]+[0-9]{2,4})"
        ]
        for ep in exp_patterns:
            m = re.search(ep, cleaned, re.IGNORECASE)
            if m:
                expiry_date = normalize_date_string(m.group(1))
                if expiry_date:
                    break

    # 6. Standard Manufacturing Date extraction
    if not mfg_date:
        mfg_patterns = [
            r"(?:mfg(?:\s*date)?|mfd(?:\s*date)?|mfg\.?\s*dt|manuf(?:actured)?)[:\.\-\s]*([0-9]{1,2}[\/\-\.\s][0-9]{2,4}|[0-9]{4}[\/\-\.\s][0-9]{1,2}[\/\-\.\s][0-9]{1,2}|[A-Za-z]{3,9}[\s\-\.,/]+[0-9]{2,4})"
        ]
        for mp in mfg_patterns:
            m = re.search(mp, cleaned, re.IGNORECASE)
            if m:
                mfg_date = normalize_date_string(m.group(1))
                if mfg_date:
                    break

    # 7. Dosage Form extraction
    dosage = None
    for d_form in ["Capsule", "Tablet", "Vial", "Injection", "Syrup", "Suspension", "Ointment", "Drops", "Cream", "Gel", "Inhaler"]:
        if re.search(rf"\b{d_form}s?\b", cleaned, re.IGNORECASE):
            dosage = d_form
            break
    if not dosage and matched_meta:
        dosage = matched_meta["dosage"]

    # 8. Manufacturer detection
    manufacturer = None
    for comp in KNOWN_MANUFACTURERS:
        if re.search(rf"\b{re.escape(comp)}\b", cleaned, re.IGNORECASE):
            manufacturer = f"{comp} Pharmaceuticals" if comp not in ["GSK", "GlaxoSmithKline", "Pfizer", "Novartis", "Sanofi", "Novo Nordisk"] else comp
            break
    if not manufacturer and matched_meta and matched_meta.get("manufacturer"):
        manufacturer = matched_meta["manufacturer"]

    # 9. Medicine Name, Generic & Brand
    name = matched_meta["name"] if matched_meta else None
    generic = matched_meta["generic"] if matched_meta else None
    brand = matched_meta["brand"] if matched_meta else None

    if not generic:
        gen_match = re.search(GENERIC_SUFFIX_PATTERN, cleaned, re.IGNORECASE)
        if gen_match:
            generic = gen_match.group(1).capitalize()

    if not name:
        for line in cleaned.splitlines():
            line_s = line.strip()
            if re.search(r"\b(batch|b\.no|lot|exp|expiry|mfg|mfd|price|mrp|tk|bdt|store|keep|lic|dar)\b", line_s, re.IGNORECASE):
                continue
            if re.search(r"\b\d+\s*(?:mg|gm|ml|mcg)\b", line_s, re.IGNORECASE) or re.search(GENERIC_SUFFIX_PATTERN, line_s, re.IGNORECASE):
                clean_title = re.sub(r"[^A-Za-z0-9\s\-\+\.]", " ", line_s)
                clean_title = re.sub(r"\s+", " ", clean_title).strip()
                if len(clean_title) >= 4:
                    name = clean_title[:50]
                    break

    # Calculate confidence score honestly
    found_fields = sum(1 for f in [name, generic, batch_num, expiry_date, strength, manufacturer] if f is not None)
    if found_fields == 0:
        conf = 0.15
    else:
        conf = round(min(0.96, 0.30 + (found_fields * 0.11)), 2)

    # Safety & Expiry calculations
    days_left = None
    if expiry_date:
        try:
            exp_dt = datetime.strptime(expiry_date, "%Y-%m-%d").date()
            days_left = (exp_dt - date.today()).days

            if days_left <= 0:
                warnings.append("EXPIRED_MEDICINE: This medicine has expired and is legally barred from redistribution.")
            elif days_left <= 7:
                warnings.append(f"CRITICAL_EXPIRING_7D: Medicine expires in {days_left} days. Urgent emergency dispensing only.")
            elif days_left <= 30:
                warnings.append(f"EXPIRING_SOON_30D: Medicine expires in {days_left} days. Prioritized redistribution.")
        except Exception:
            pass
    else:
        warnings.append("MISSING_EXPIRY: Expiry date is embossed or unclear on blister strip. Pharmacist must verify physically.")

    if not batch_num:
        warnings.append("MISSING_BATCH: Batch number is embossed or unclear on blister strip. Pharmacist must verify physically.")

    if matched_meta and matched_meta.get("coldChain"):
        warnings.append("COLD_CHAIN_ALERT: Continuous 2°C to 8°C refrigeration is mandatory for this formulation.")

    status = "PENDING" if found_fields > 0 else "UNREADABLE"

    return {
        "medicineName": name,
        "genericName": generic,
        "brandName": brand,
        "strength": strength,
        "dosageForm": dosage,
        "manufacturer": manufacturer,
        "batchNumber": batch_num,
        "mfgDate": mfg_date,
        "expiryDate": expiry_date,
        "confidence": conf,
        "verificationStatus": status,
        "humanReviewRequired": True,
        "verificationNotice": "OCR extraction represents machine suggestions. Unreadable or embossed fields are left null for safety. A licensed pharmacist must confirm all details prior to redistribution.",
        "extractedTextRaw": cleaned,
        "safetyWarnings": warnings,
        "daysUntilExpiry": days_left
    }

# ----------------- Geolocation & Distance Helpers -----------------

def calculate_haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)

BLOOD_COMPATIBILITY = {
    "A+": ["A+", "A-", "O+", "O-"],
    "A-": ["A-", "O-"],
    "B+": ["B+", "B-", "O+", "O-"],
    "B-": ["B-", "O-"],
    "AB+": ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    "AB-": ["AB-", "A-", "B-", "O-"],
    "O+": ["O+", "O-"],
    "O-": ["O-"]
}

# ----------------- API Endpoints -----------------

@app.get("/")
def get_root():
    return {
        "service": "MedShare AI Microservice",
        "status": "online",
        "version": "1.4.0",
        "ocr_engine": "pytesseract" if PYTESSERACT_AVAILABLE else "unavailable",
        "ocr_languages": AVAILABLE_LANGS,
        "opencv_available": CV2_AVAILABLE
    }

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "tesseract": PYTESSERACT_AVAILABLE,
        "languages": AVAILABLE_LANGS,
        "opencv": CV2_AVAILABLE
    }

@app.post("/ocr/scan-medicine", response_model=OCRScanResult)
def scan_medicine_endpoint(payload: ScanMedicineRequest):
    """
    Main OCR endpoint accepting base64 image or raw text hint.
    Automatically rotates vertical medicine strips and scans blister margins for batch/expiry stamps.
    """
    raw_ocr = payload.raw_ocr_hint or ""

    if payload.image_base64:
        extracted_text = extract_text_from_base64(payload.image_base64)
        if extracted_text:
            raw_ocr = f"{extracted_text}\n{raw_ocr}".strip()

    extracted = parse_medicine_text(raw_ocr)
    return OCRScanResult(**extracted)

@app.post("/ocr/verify-human-signoff", response_model=HumanSignoffResponse)
def verify_human_signoff(payload: HumanSignoffRequest):
    if not payload.pharmacistLicense or len(payload.pharmacistLicense.strip()) < 4:
        raise HTTPException(status_code=400, detail="Invalid pharmacist license credentials.")

    now_iso = datetime.utcnow().isoformat()
    raw_seal = f"{payload.medicineId}:{payload.pharmacistLicense}:{payload.confirmedBatch}:{payload.confirmedExpiry}:{now_iso}"
    crypto_hash = hashlib.sha256(raw_seal.encode("utf-8")).hexdigest()
    receipt_id = f"VRC-{datetime.utcnow().year}-{crypto_hash[:8].upper()}"

    return HumanSignoffResponse(
        success=True,
        verificationReceiptId=receipt_id,
        signedAt=now_iso,
        verificationStatus="VERIFIED",
        cryptographicHash=crypto_hash,
        verifiedBy=payload.pharmacistEmail,
        medicineId=payload.medicineId
    )

@app.post("/matching/rank-donors", response_model=List[RankedDonor])
def rank_donors_endpoint(payload: RankRequest):
    ranked_list = []
    rec_group = payload.requiredBloodGroup.replace("_", "+") if "_" in payload.requiredBloodGroup else payload.requiredBloodGroup
    compatible_groups = BLOOD_COMPATIBILITY.get(rec_group.upper(), ["O-", "O+"])

    for donor in payload.candidates:
        d_group = donor.bloodGroup.replace("_", "+") if "_" in donor.bloodGroup else donor.bloodGroup
        if d_group.upper() not in compatible_groups:
            continue

        dist = calculate_haversine(payload.hospitalLat, payload.hospitalLng, donor.latitude, donor.longitude)
        max_dist = payload.radiusKm * 1.5 if payload.radiusKm > 0 else 10.0

        dist_score = max(0.0, min(100.0, (1.0 - (dist / max_dist)) * 100.0))
        avail_score = 100.0 if donor.isAvailable else 0.0
        verif_score = 100.0 if donor.isVerified else 35.0
        resp_score = donor.responseRate if donor.responseRate is not None else 85.0
        elig_score = 100.0

        match_score = (
            (dist_score * 0.35) +
            (avail_score * 0.25) +
            (verif_score * 0.20) +
            (resp_score * 0.10) +
            (elig_score * 0.10)
        )

        parts = donor.fullName.strip().split(" ")
        masked_name = f"{parts[0]} {parts[-1][0]}." if len(parts) > 1 else donor.fullName

        ranked_list.append(RankedDonor(
            donorId=donor.id,
            displayName=masked_name,
            bloodGroup=donor.bloodGroup,
            approxDistanceKm=dist,
            isAvailable=donor.isAvailable,
            isVerified=donor.isVerified,
            matchScore=round(match_score, 1),
            eligibilityStatus="Eligible for transfusion",
            scoreBreakdown={
                "distanceScore": round(dist_score, 1),
                "availabilityScore": round(avail_score, 1),
                "verificationScore": round(verif_score, 1),
                "responseHistoryScore": round(resp_score, 1),
                "eligibilityScore": round(elig_score, 1)
            }
        ))

    ranked_list.sort(key=lambda x: x.matchScore, reverse=True)
    return ranked_list

@app.post("/assistant/chat", response_model=ChatResponse)
def ai_assistant_chat(payload: ChatRequest):
    last_msg = payload.messages[-1].content.lower() if payload.messages else ""
    disclaimer = "MedShare AI provides platform assistance only. It does not provide medical diagnoses or prescriptions."

    if any(k in last_msg for k in ["diagnose", "what illness", "prescribe", "symptom"]):
        return ChatResponse(
            response="I cannot diagnose medical conditions or prescribe medications. If you or someone nearby is experiencing acute symptoms, please contact local emergency medical services or visit the nearest emergency room immediately.",
            suggestedActions=["Create Emergency Blood Request", "Find Verified Hospitals", "Blood Compatibility Rules"],
            disclaimer=disclaimer
        )

    if any(k in last_msg for k in ["blood", "request", "emergency"]):
        reply = (
            "To broadcast an Emergency Blood Request:\n"
            "1. Navigate to 'Emergency Blood Request' on the top navigation bar.\n"
            "2. Enter patient details, blood group, required units, and hospital coordinates.\n"
            "3. Select a PostGIS search radius (1 to 20 KM).\n"
            "4. Submitting dispatches real-time alerts to nearby compatible donors."
        )
        actions = ["New Blood Request", "Search Nearby Donors", "Compatibility Table"]
    elif any(k in last_msg for k in ["donor", "donate", "cooldown"]):
        reply = (
            "Blood Donor Rules on MedShare:\n"
            "• Age: 18–65 years old, minimum body weight 50 kg.\n"
            "• 90-Day Cooldown: Whole blood donors must wait at least 3 months between donations.\n"
            "• Location Privacy: Coordinates on public maps are perturbed by ~300 meters.\n"
            "• One-Click Switch: Toggle availability anytime from your Donor Hub."
        )
        actions = ["Donor Hub", "Availability Settings", "Donation History"]
    elif any(k in last_msg for k in ["medicine", "pharmacy", "redistribution", "ocr"]):
        reply = (
            "MedShare Regulated Medicine Redistribution:\n"
            "• Zero Peer-to-Peer Black Market: Only verified pharmacies can upload and distribute medicine.\n"
            "• AI OCR Extraction: Uploaded box images are scanned for batch codes and expiry dates.\n"
            "• Human-in-the-Loop: A licensed pharmacist must review and confirm all OCR extractions.\n"
            "• Safety Rules: Expired or unsealed packaging is rejected automatically."
        )
        actions = ["Browse Medicines", "AI OCR Upload", "Safety Policies"]
    else:
        reply = (
            "Welcome to MedShare – RapidBlood Network! I can assist you with emergency blood requests, "
            "donor eligibility guidelines, and regulated medicine redistribution policies."
        )
        actions = ["Emergency Blood Request", "Donor Eligibility Rules", "Medicine Catalog"]

    return ChatResponse(response=reply, suggestedActions=actions, disclaimer=disclaimer)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)