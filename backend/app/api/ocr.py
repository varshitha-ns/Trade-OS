from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import Any, Dict, Optional
from datetime import datetime
import re
import xml.etree.ElementTree as ET

router = APIRouter(tags=["OCR"])


def _normalize_spaces(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip()


def _extract_aadhaar_fields(text: str) -> Dict[str, Optional[str]]:
    t = text
    aadhaar = None
    m = re.search(r"\b[2-9]\d{3}\s?\d{4}\s?\d{4}\b", t)
    if m:
        aadhaar = re.sub(r"\s", "", m.group(0))

    dob = None
    m = re.search(r"\b(\d{2}[/-]\d{2}[/-]\d{4})\b", t)
    if m:
        dob = m.group(1).replace("-", "/")

    name = None
    lines = [l.strip() for l in t.splitlines() if l.strip()]
    for i, line in enumerate(lines[:15]):
        if re.search(r"\bDOB\b|\bYOB\b|\bBirth\b", line, flags=re.IGNORECASE):
            if i > 0:
                candidate = _normalize_spaces(lines[i - 1])
                if 3 <= len(candidate) <= 60:
                    name = candidate
            break

    address = None
    for i, line in enumerate(lines):
        if re.search(r"\bAddress\b", line, flags=re.IGNORECASE):
            chunk = " ".join(lines[i : i + 5])
            chunk = re.sub(r"(?i)\baddress\b\s*[:\-]?\s*", "", chunk)
            chunk = _normalize_spaces(chunk)
            if 8 <= len(chunk) <= 250:
                address = chunk
            break

    return {
        "name": name,
        "aadhaar_number": aadhaar,
        "address": address,
        "date_of_birth": dob,
    }


def _extract_pan_fields(text: str) -> Dict[str, Optional[str]]:
    t = text
    pan = None
    m = re.search(r"\b[A-Z]{5}\d{4}[A-Z]\b", t)
    if m:
        pan = m.group(0)

    dob = None
    m = re.search(r"\b(\d{2}[/-]\d{2}[/-]\d{4})\b", t)
    if m:
        dob = m.group(1).replace("-", "/")

    name = None
    lines = [l.strip() for l in t.splitlines() if l.strip()]
    for i, line in enumerate(lines[:20]):
        if re.search(r"\bINCOME\s+TAX\b|\bDEPARTMENT\b", line, flags=re.IGNORECASE):
            if i + 1 < len(lines):
                candidate = _normalize_spaces(lines[i + 1])
                if 3 <= len(candidate) <= 60:
                    name = candidate
            break

    return {
        "name": name,
        "pan_number": pan,
        "date_of_birth": dob,
    }


def _extract_passport_fields(text: str) -> Dict[str, Optional[str]]:
    t = text
    passport = None
    m = re.search(r"\b[A-Z]\d{7}\b", t)
    if m:
        passport = m.group(0)

    expiry = None
    m = re.search(r"\b(\d{2}[/-]\d{2}[/-]\d{4})\b", t)
    if m:
        expiry = m.group(1).replace("-", "/")

    name = None
    lines = [l.strip() for l in t.splitlines() if l.strip()]
    for i, line in enumerate(lines[:30]):
        if re.search(r"\bSurname\b|\bGiven\s+Names\b|\bName\b", line, flags=re.IGNORECASE):
            candidate = _normalize_spaces(line)
            candidate = re.sub(r"(?i)\bname\b\s*[:\-]?\s*", "", candidate)
            if 3 <= len(candidate) <= 60:
                name = candidate
            break

    return {
        "full_name": name,
        "passport_number": passport,
        "date_of_expiry": expiry,
    }


def _extract_text_with_fallback(file_bytes: bytes, content_type: str) -> str:
    text_parts = []

    if content_type == "application/pdf":
        try:
            import fitz  # type: ignore

            doc = fitz.open(stream=file_bytes, filetype="pdf")
            for page in doc:
                text_parts.append(page.get_text("text"))
            extracted = "\n".join(text_parts)
            if extracted.strip():
                return extracted
        except Exception:
            pass

    try:
        from PIL import Image  # type: ignore
        import pytesseract  # type: ignore

        if content_type == "application/pdf":
            try:
                from pdf2image import convert_from_bytes  # type: ignore

                images = convert_from_bytes(file_bytes, dpi=250)
                for img in images[:3]:
                    text_parts.append(pytesseract.image_to_string(img))
            except Exception:
                raise
        else:
            from io import BytesIO

            img = Image.open(BytesIO(file_bytes))
            text_parts.append(pytesseract.image_to_string(img))

        return "\n".join(text_parts)
    except Exception as e:
        raise HTTPException(
            status_code=501,
            detail=(
                "OCR backend not available. Install OCR dependencies (pytesseract + Tesseract OCR, "
                "and for PDFs: pdf2image + poppler) or provide a text-based PDF. "
                f"Original error: {str(e)}"
            ),
        )


def _mask_aadhaar(uid: str) -> str:
    if not uid or len(uid) < 4:
        return ""
    last4 = uid[-4:]
    return f"XXXX-XXXX-{last4}"


def _parse_aadhaar_qr_xml(payload: str) -> Optional[Dict[str, Any]]:
    """Parse Aadhaar QR XML payload when QR contains <PrintLetterBarcodeData .../>."""
    if "PrintLetterBarcodeData" not in payload:
        return None

    try:
        # Some QR payloads are a single self-closing tag; ensure it's well-formed.
        xml_str = payload.strip()
        if not xml_str.startswith("<"):
            return None

        root = ET.fromstring(xml_str)
        if root.tag != "PrintLetterBarcodeData":
            return None

        attrs = root.attrib
        uid = attrs.get("uid") or ""
        name = attrs.get("name") or ""
        dob = attrs.get("dob") or ""
        yob = attrs.get("yob") or ""

        # Build a single-line address from known fields
        address_fields = [
            attrs.get("co"),
            attrs.get("house"),
            attrs.get("street"),
            attrs.get("lm"),
            attrs.get("loc"),
            attrs.get("vtc"),
            attrs.get("po"),
            attrs.get("subdist"),
            attrs.get("dist"),
            attrs.get("state"),
            attrs.get("pc"),
        ]
        address = _normalize_spaces(" ".join([a for a in address_fields if a]))

        extracted: Dict[str, Any] = {}
        if uid:
            extracted["aadhaar_number"] = uid
        if name:
            extracted["name"] = name
        if dob:
            extracted["date_of_birth"] = dob.replace("-", "/")
        elif yob:
            extracted["year_of_birth"] = yob
        if address:
            extracted["address"] = address

        return {
            "extractedData": extracted,
            "qrVerification": {
                "found": True,
                "format": "aadhaar_xml",
                "signatureVerified": False,
                "maskedAadhaar": _mask_aadhaar(uid) if uid else "",
            },
        }
    except Exception:
        return None


def _decode_qr_from_pil_image(img) -> Optional[str]:
    """Decode QR code from a PIL image. Best-effort; may return None."""
    # Try OpenCV first (works well for QR)
    try:
        import cv2  # type: ignore
        import numpy as np  # type: ignore

        arr = np.array(img.convert("RGB"))
        detector = cv2.QRCodeDetector()
        data, _, _ = detector.detectAndDecode(arr)
        data = (data or "").strip()
        if data:
            return data
    except Exception:
        pass

    # Fallback: pyzbar
    try:
        from pyzbar.pyzbar import decode  # type: ignore

        decoded = decode(img)
        for item in decoded:
            try:
                data = item.data.decode("utf-8", errors="ignore").strip()
            except Exception:
                data = ""
            if data:
                return data
    except Exception:
        pass

    return None


def _try_extract_aadhaar_qr(file_bytes: bytes, content_type: str) -> Optional[Dict[str, Any]]:
    """Try to extract Aadhaar fields from QR code (XML-based QR). Returns parsed dict or None."""
    try:
        from PIL import Image  # type: ignore
        from io import BytesIO

        images = []
        if content_type == "application/pdf":
            try:
                from pdf2image import convert_from_bytes  # type: ignore

                images = convert_from_bytes(file_bytes, dpi=300, first_page=1, last_page=1)
            except Exception:
                return None
        else:
            images = [Image.open(BytesIO(file_bytes))]

        for img in images:
            qr_payload = _decode_qr_from_pil_image(img)
            if not qr_payload:
                continue

            parsed = _parse_aadhaar_qr_xml(qr_payload)
            if parsed:
                return parsed

            # If QR exists but is not XML format, surface that it's unsupported
            return {
                "extractedData": {},
                "qrVerification": {
                    "found": True,
                    "format": "unknown_or_secure_qr",
                    "signatureVerified": False,
                    "maskedAadhaar": "",
                    "message": "QR detected but not in XML format; secure QR decoding is not implemented."
                },
            }

        return None
    except Exception:
        return None


@router.post("/process")
async def process(file: UploadFile = File(...), documentType: str = Form(...), language: str = Form("eng")) -> Dict[str, Any]:
    start = datetime.now()
    file_bytes = await file.read()

    if not file_bytes:
        raise HTTPException(status_code=400, detail="Empty file")

    content_type = file.content_type or ""
    if not content_type:
        name = (file.filename or "").lower()
        if name.endswith(".pdf"):
            content_type = "application/pdf"
        elif name.endswith(".png"):
            content_type = "image/png"
        elif name.endswith(".jpg") or name.endswith(".jpeg"):
            content_type = "image/jpeg"

    dt = documentType.upper()

    # Aadhaar QR verification (best-effort) before OCR
    qr_verification: Optional[Dict[str, Any]] = None
    if dt == "AADHAAR_CARD":
        qr_result = _try_extract_aadhaar_qr(file_bytes, content_type)
        if qr_result:
            extracted_data = qr_result.get("extractedData") or {}
            qr_verification = qr_result.get("qrVerification")
        else:
            extracted_data = {}
    else:
        extracted_data = {}

    # If QR didn't yield fields, do OCR/text extraction
    if not extracted_data:
        extracted_text = _extract_text_with_fallback(file_bytes, content_type)
        extracted_text = extracted_text or ""

        if dt == "AADHAAR_CARD":
            extracted_data = _extract_aadhaar_fields(extracted_text)
        elif dt == "PAN_CARD":
            extracted_data = _extract_pan_fields(extracted_text)
        elif dt == "PASSPORT":
            extracted_data = _extract_passport_fields(extracted_text)
        else:
            extracted_data = {}

    extracted_data = {k: v for k, v in extracted_data.items() if v}

    confidence = 60
    if extracted_data:
        confidence = 85
        if dt == "AADHAAR_CARD" and "aadhaar_number" in extracted_data and "name" in extracted_data:
            confidence = 92

    confidence_scores = {k: min(99, confidence + 5) for k in extracted_data.keys()}

    processing_time = (datetime.now() - start).total_seconds() * 1000

    return {
        "success": True,
        "confidence": confidence,
        "extractedData": extracted_data,
        "confidenceScores": confidence_scores,
        "processingTime": round(processing_time, 2),
        "quality": "good" if confidence >= 85 else "unknown",
        "language": language,
        "qrVerification": qr_verification,
    }
