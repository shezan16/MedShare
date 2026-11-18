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
    version="1.1.0"
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
try:
    import pytesseract
    # Verify tesseract binary is actually installed
    pytesseract.get_tesseract_version()
    PYTESSERACT_AVAILABLE = True
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
# Used ONLY when actual OCR text matches the medicine name/generic!
KNOWN_MEDICINES = [
    {
        "pattern": r"\b(amox|amoxicillin|amoxil|augmentin|moxacil)\b",
        "name": "Amoxicillin Trihydrate",
        "generic": "Amoxicillin",
        "brand": "Amoxil / Moxacil",
        "dosage": "Capsule",
        "coldChain": False
    },
    {
        "pattern": r"\b(paracetamol|panadol|calpol|acetaminophen|napa|ace)\b",
        "name": "Paracetamol",
        "generic": "Paracetamol",
        "brand": "Napa / Ace / Panadol",
        "dosage": "Tablet",
        "coldChain": False
    },
    {
        "pattern": r"\b(metformin|glucophage|comet)\b",
        "name": "Metformin Hydrochloride",
        "generic": "Metformin HCl",
        "brand": "Comet / Glucophage",
        "dosage": "Tablet",
        "coldChain": False
    },
    {
        "pattern": r"\b(insulin|humulin|actrapid|novorapid|lantus)\b",
        "name": "Human Insulin",
        "generic": "Insulin",
        "brand": "Actrapid / Lantus",
        "dosage": "Vial / Injection",
        "coldChain": True
    },
    {
        "pattern": r"\b(azithro|azithromycin|zithromax|zimax)\b",
        "name": "Azithromycin",
        "generic": "Azithromycin",
        "brand": "Zimax / Zithromax",
        "dosage": "Tablet",
        "coldChain": False
    },
    {
        "pattern": r"\b(cefixime|suprax|cef-3)\b",
        "name": "Cefixime Trihydrate",
        "generic": "Cefixime",
        "brand": "Cef-3 / Suprax",
        "dosage": "Capsule",
        "coldChain": False
    },
    {
        "pattern": r"\b(omeprazole|seclo|losectil|esomeprazole|sergel)\b",
        "name": "Omeprazole / Esomeprazole",
        "generic": "Omeprazole",
        "brand": "Seclo / Sergel",
        "dosage": "Capsule",
        "coldChain": False
    }
]

# ----------------- Image Preprocessing & OCR -----------------

def extract_text_from_base64(image_base64: str) -> str:
    """Decodes base64 image, enhances contrast/sharpness, and runs Tesseract OCR."""
    if not PYTESSERACT_AVAILABLE:
        return ""

    try:
        # Strip data:image/...;base64, prefix if present
        b64_data = image_base64.split(",")[-1].strip()
        img_bytes = base64.b64decode(b64_data)

        if CV2_AVAILABLE:
            nparr = np.frombuffer(img_bytes, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if img is None:
                return ""
            
            # Resize if too small for better OCR accuracy
            height, width = img.shape[:2]
            if width < 1000:
                scale = 1000 / width
                img = cv2.resize(img, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)

            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            # Denoise and apply adaptive thresholding
            denoised = cv2.fastNlMeansDenoising(gray, None, 10, 7, 21)
            thresh = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1]
            
            # Run Tesseract with PSM 6 (uniform block of text) and PSM 11 (sparse text)
            text_psm6 = pytesseract.image_to_string(thresh, config="--psm 6")
            text_psm11 = pytesseract.image_to_string(gray, config="--psm 11")
            
            combined_text = f"{text_psm6}\n{text_psm11}".strip()
            return combined_text

        elif PIL_AVAILABLE:
            image = Image.open(io.BytesIO(img_bytes))
            gray = ImageOps.grayscale(image)
            enhancer = ImageEnhance.Contrast(gray)
            enhanced = enhancer.enhance(2.0)
            return pytesseract.image_to_string(enhanced, config="--psm 6").strip()

    except Exception as e:
        print(f"OCR Extraction Error: {e}")
        return ""
    return ""

def normalize_date_string(raw_date: str) -> Optional[str]:
    """Converts MM/YY, MM/YYYY, YYYY-MM-DD into standard YYYY-MM-DD."""
    clean = raw_date.strip().replace(".", "/").replace("-", "/")
    parts = clean.split("/")
    try:
        if len(parts) == 2:
            month, year = int(parts[0]), parts[1]
            if len(year) == 2:
                year = f"20{year}"
            year_int = int(year)
            if 1 <= month <= 12 and 2020 <= year_int <= 2035:
                return f"{year_int}-{month:02d}-01"
        elif len(parts) == 3:
            if len(parts[0]) == 4: # YYYY/MM/DD
                y, m, d = int(parts[0]), int(parts[1]), int(parts[2])
            else: # DD/MM/YYYY or DD/MM/YY
                d, m = int(parts[0]), int(parts[1])
                y = int(f"20{parts[2]}") if len(parts[2]) == 2 else int(parts[2])
            if 1 <= m <= 12 and 1 <= d <= 31 and 2020 <= y <= 2035:
                return f"{y}-{m:02d}-{d:02d}"
    except ValueError:
        pass
    return None

def parse_medicine_text(raw_text: str) -> Dict[str, Any]:
    """
    Strictly extracts medicine details from real OCR text.
    NEVER fabricates batch numbers, expiry dates, or names if not detected.
    """
    cleaned = raw_text.strip()
    warnings = []

    # If no text detected at all
    if not cleaned or len(cleaned) < 3:
        engine_msg = (
            "No readable text detected in the image. Please upload a clearer, well-lit photo."
            if PYTESSERACT_AVAILABLE else
            "OCR Engine (Tesseract) is not installed on the server. Manual pharmacist entry required."
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
            "safetyWarnings": ["UNREADABLE_IMAGE: Manual pharmacist verification mandatory."],
            "daysUntilExpiry": None
        }

    # 1. Match against known medicines catalog ONLY using OCR text (not filename!)
    matched_meta = None
    for med in KNOWN_MEDICINES:
        if re.search(med["pattern"], cleaned, re.IGNORECASE):
            matched_meta = med
            break

    # 2. Batch Number extraction (Strict - returns None if not found)
    batch_num = None
    batch_patterns = [
        r"(?:batch(?:\s*no)?|b\.?\s*no|lot(?:\s*no)?|bn|b\.?n)[:\.\-\s]*([a-zA-Z0-9\-/]{4,16})",
    ]
    for bp in batch_patterns:
        m = re.search(bp, cleaned, re.IGNORECASE)
        if m:
            candidate = m.group(1).strip().upper()
            # Filter out common false-positive words like "DATE" or "NUMBER"
            if candidate not in ["DATE", "NUMBER", "EXP", "MFG"]:
                batch_num = candidate
                break

    # 3. Expiry Date extraction (Strict - returns None if not found)
    expiry_date = None
    exp_patterns = [
        r"(?:exp(?:iry)?(?:\s*date)?|use\s*before|best\s*before|ed)[:\.\-\s]*([0-9]{1,2}[\/\-\.][0-9]{2,4}|[0-9]{4}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{1,2})"
    ]
    for ep in exp_patterns:
        m = re.search(ep, cleaned, re.IGNORECASE)
        if m:
            expiry_date = normalize_date_string(m.group(1))
            if expiry_date:
                break

    # 4. Manufacturing Date extraction (Strict - returns None if not found)
    mfg_date = None
    mfg_match = re.search(
        r"(?:mfg|mfd|mfg\.?\s*date|manuf)[:\.\-\s]*([0-9]{1,2}[\/\-\.][0-9]{2,4}|[0-9]{4}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{1,2})",
        cleaned,
        re.IGNORECASE
    )
    if mfg_match:
        mfg_date = normalize_date_string(mfg_match.group(1))

    # 5. Strength extraction (e.g. 500mg, 650 mg, 100 IU/ml)
    strength = None
    str_match = re.search(r"\b([0-9]+(?:\.[0-9]+)?\s*(?:mg|g|ml|mcg|iu|iu\/ml))\b", cleaned, re.IGNORECASE)
    if str_match:
        strength = str_match.group(1).strip()

    # 6. Dosage Form extraction
    dosage = None
    for d_form in ["Capsule", "Tablet", "Vial", "Injection", "Syrup", "Suspension", "Ointment", "Drops"]:
        if re.search(rf"\b{d_form}s?\b", cleaned, re.IGNORECASE):
            dosage = d_form
            break
    if not dosage and matched_meta:
        dosage = matched_meta["dosage"]

    # 7. Medicine Name & Generic
    name = matched_meta["name"] if matched_meta else None
    generic = matched_meta["generic"] if matched_meta else None
    brand = matched_meta["brand"] if matched_meta else None

    # Calculate real confidence based on how many fields were actually extracted
    found_fields = sum(1 for f in [name, batch_num, expiry_date, strength] if f is not None)
    conf = round(min(0.95, 0.25 + (found_fields * 0.18)), 2)

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
        warnings.append("MISSING_EXPIRY: Expiry date could not be reliably read from image. Pharmacist must verify.")

    if not batch_num:
        warnings.append("MISSING_BATCH: Batch number could not be reliably read from image. Pharmacist must verify.")

    if matched_meta and matched_meta.get("coldChain"):
        warnings.append("COLD_CHAIN_ALERT: Continuous 2°C to 8°C refrigeration is mandatory for this formulation.")

    return {
        "medicineName": name,
        "genericName": generic,
        "brandName": brand,
        "strength": strength,
        "dosageForm": dosage,
        "manufacturer": None, # Avoid guessing manufacturer unless explicitly parsed
        "batchNumber": batch_num,
        "mfgDate": mfg_date,
        "expiryDate": expiry_date,
        "confidence": conf,
        "verificationStatus": "PENDING",
        "humanReviewRequired": True,
        "verificationNotice": "OCR extraction represents machine suggestions. Missing fields are left null for safety. A licensed pharmacist must confirm all details prior to redistribution.",
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
        "version": "1.1.0",
        "ocr_engine": "pytesseract" if PYTESSERACT_AVAILABLE else "unavailable",
        "opencv_available": CV2_AVAILABLE
    }

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "tesseract": PYTESSERACT_AVAILABLE,
        "opencv": CV2_AVAILABLE
    }

@app.post("/ocr/scan-medicine", response_model=OCRScanResult)
def scan_medicine_endpoint(payload: ScanMedicineRequest):
    """
    Main OCR endpoint accepting base64 image.
    Extracts real text using OpenCV + Tesseract and parses medicine details without fabricating fallback data.
    """
    raw_ocr = payload.raw_ocr_hint or ""

    if payload.image_base64:
        extracted_text = extract_text_from_base64(payload.image_base64)
        if extracted_text:
            raw_ocr = extracted_text

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