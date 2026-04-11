import os
import json
import base64
import requests
from typing import Dict, Any, Tuple
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

# We need the Gemini API key for extraction
API_KEY = os.getenv("GEMINI_API_KEY")
if API_KEY:
    genai.configure(api_key=API_KEY)

class DocumentValidator:
    """
    Hybrid Document Validation Agent.
    1. Uses Gemini 1.5 Pro/Flash to extract structured data (OCR + Intelligence)
    2. Uses Free Public APIs (VIES / OpenCorporates) to legally verify the extracted entity.
    """
    
    def __init__(self):
        self.model = genai.GenerativeModel('gemini-1.5-flash')
        
    def _extract_document_info(self, file_bytes: bytes, mime_type: str) -> Dict[str, Any]:
        """
        Step 1: Extract data using Gemini Multimodal
        """
        if not API_KEY:
            print("⚠️ GEMINI_API_KEY not set. Cannot run extraction.")
            return {"status": "error", "message": "Missing API Key"}
            
        print(f"   [Validator] Extracting data from uploaded document ({mime_type})...")
        
        # Prepare the file for Gemini
        file_data = {
            "mime_type": mime_type,
            "data": base64.b64encode(file_bytes).decode('utf-8')
        }
        
        prompt = """
        You are a strict Trade Compliance Officer. Analyze the attached business document (e.g. Export License, Business Registration, Tax Certificate).
        Extract the following information and return ONLY a valid JSON object. Do not include markdown formatting or comments.
        
        {
            "company_name": "Exact legal name of the entity",
            "registration_number": "The primary ID/VAT/Registration number",
            "country_code": "The 2-letter ISO country code (e.g., DE, IN, GB, US)",
            "document_type": "Best guess of what this document is (e.g., VAT Certificate, Export License)"
        }
        
        If any field cannot be found, set its value to null.
        """
        
        try:
            response = self.model.generate_content([prompt, file_data])
            # Clean up the response if it has markdown formatting
            response_text = response.text.strip()
            if response_text.startswith("```json"):
                response_text = response_text[7:-3].strip()
            elif response_text.startswith("```"):
                response_text = response_text[3:-3].strip()
                
            data = json.loads(response_text)
            return data
            
        except Exception as e:
            print(f"   [Validator] Gemini extraction failed: {str(e)}")
            return {"status": "error", "message": str(e)}

    def _verify_with_vies(self, vat_number: str) -> bool:
        """
        Step 2a: Legal Verification using the EU VIES API
        VIES format: Country Code (2 letters) + VAT Number
        """
        if len(vat_number) < 3: return False
        
        country_code = vat_number[:2].upper()
        # Some EU countries
        eu_countries = ["AT", "BE", "BG", "CY", "CZ", "DE", "DK", "EE", "EL", "ES", "FI", "FR", "HR", "HU", "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PL", "PT", "RO", "SE", "SI", "SK"]
        
        if country_code not in eu_countries:
            return False # Not an EU VAT
            
        vat_only = vat_number[2:].strip()
        print(f"   [Validator] Querying EU VIES API for {country_code} {vat_only}...")
        
        # Free REST wrapper for VIES
        url = "https://ec.europa.eu/taxation_customs/vies/rest-api/ms/{}/vat/{}"
        
        try:
            res = requests.get(url.format(country_code, vat_only), timeout=10)
            if res.status_code == 200:
                data = res.json()
                is_valid = data.get("isValid", False)
                if is_valid:
                    print(f"      -> [VALID] VIES Match: {data.get('name', 'Unknown Name')}")
                else:
                    print("      -> [INVALID] VIES: Invalid VAT Number")
                return is_valid
        except Exception as e:
            print(f"   [Validator] VIES API Error: {str(e)}")
            
        return False
        
    def _verify_with_opencorporates(self, company_name: str, country_code: str) -> bool:
        """
        Step 2b: Legal Verification using OpenCorporates (Free Tier)
        Fallback if not an EU VAT.
        """
        if not company_name: return False
        
        print(f"   [Validator] Querying OpenCorporates for [{company_name}] in [{country_code}]...")
        
        # Reconcile API tries to match a name to a canonical company
        # Documentation: https://api.opencorporates.com/documentation/Open-Refine-Reconciliation-API
        url = "https://opencorporates.com/reconcile"
        
        # Structure the payload as a form parameter for the reconcile API
        # Example format: {"queries": {"q0": {"query": "Microsoft Corporation"}}}
        queries = {
            "q0": {
                "query": company_name
            }
        }
        
        # Add jurisdictional filter to the query if we have it
        if country_code and len(country_code) == 2:
            queries["q0"]["jurisdiction_code"] = country_code.lower()
             
        data = {
            "queries": json.dumps(queries)
        }
        
        try:
            res = requests.post(url, data=data, timeout=10)
            if res.status_code == 200:
                response_data = res.json()
                
                # Reconcile API returns {"q0": {"result": [...]}}
                q0_data = response_data.get("q0", {})
                results = q0_data.get("result", [])
                
                if results and len(results) > 0:
                    top_match = results[0]
                    # Check if the match is decent (e.g. score > 60)
                    if top_match.get("score", 0) > 60:
                         print(f"      -> [VALID] OpenCorporates Match: {top_match.get('name')} ({top_match.get('id')})")
                         return True
                
                print("      -> [INVALID] OpenCorporates: No confident match found.")
                return False
        except Exception as e:
             print(f"   [Validator] OpenCorporates API Error: {str(e)}")
             
        return False

    def verify_document(self, file_bytes: bytes, mime_type: str = "image/jpeg") -> Dict[str, Any]:
        """
        Main orchestration method.
        """
        # 1. Extract Info
        extracted_data = self._extract_document_info(file_bytes, mime_type)
        
        if "status" in extracted_data and extracted_data["status"] == "error":
             return {
                 "status": "pending_manual_review",
                 "reason": f"Extraction failed: {extracted_data.get('message')}",
                 "extracted_data": {}
             }
             
        company_name = extracted_data.get("company_name")
        reg_number = extracted_data.get("registration_number")
        country_code = extracted_data.get("country_code")
        
        print(f"   [Validator] Extracted: {company_name} | {reg_number} | {country_code}")
        
        # 2. Proceed to Legal Verification
        is_legally_verified = False
        api_used = None
        
        # Try VIES if it looks like an EU VAT
        if reg_number and (country_code in ["AT", "BE", "BG", "CY", "CZ", "DE", "DK", "EE", "EL", "ES", "FI", "FR", "HR", "HU", "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PL", "PT", "RO", "SE", "SI", "SK"] or reg_number[:2].isalpha()):
            vat_to_check = reg_number
            # prepend country code if missing
            if country_code and not reg_number[:2].isalpha():
                vat_to_check = f"{country_code}{reg_number}"
                
            is_legally_verified = self._verify_with_vies(vat_to_check)
            if is_legally_verified: api_used = "EU_VIES"
            
        # Try OpenCorporates if VIES failed or wasn't applicable
        if not is_legally_verified and company_name:
             is_legally_verified = self._verify_with_opencorporates(company_name, country_code)
             if is_legally_verified: api_used = "OpenCorporates"
             
        if is_legally_verified:
            return {
                "status": "verified_basic",
                "verified_by": api_used,
                "extracted_data": extracted_data
            }
        else:
            return {
                "status": "pending_manual_review",
                "reason": "Could not legally verify entity in public registries.",
                "extracted_data": extracted_data
            }

document_validator = DocumentValidator()
