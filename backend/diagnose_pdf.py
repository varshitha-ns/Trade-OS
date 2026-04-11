#!/usr/bin/env python3
"""
Diagnose PDF QR detection issues
"""

import requests
import json
import base64
from PIL import Image
import io
import os

def diagnose_pdf_qr():
    """Diagnose why QR code is not being detected in PDF"""
    print("🔍 PDF QR Code Diagnosis Tool")
    print("=" * 50)
    
    # This will help us understand what's happening with your PDF
    print("\n📋 Please provide the following information:")
    print("1. Upload your PDF to the web interface again")
    print("2. Check the browser's Network tab (F12)")
    print("3. Look for the POST request to /api/aadhaar/verify-aadhaar")
    print("4. Check what the backend logs show")
    
    # Let's also check the current backend status
    try:
        response = requests.get('http://localhost:8000/api/aadhaar/verify-aadhaar/status')
        if response.status_code == 200:
            status = response.json()
            print(f"\n✅ Backend Status: {status['status']}")
            print(f"📝 Method: {status['verificationMethod']}")
            print(f"📁 Supported formats: {', '.join(status['supportedFormats'])}")
    except Exception as e:
        print(f"❌ Backend not accessible: {e}")
    
    print("\n🔧 Enhanced QR Detection Features:")
    print("✅ Higher resolution PDF processing (400 DPI)")
    print("✅ 4x zoom for better QR clarity")
    print("✅ Multiple image enhancements:")
    print("   - Contrast enhancement (2x and 3x)")
    print("   - Image sharpening")
    print("   - Edge enhancement")
    print("✅ Multiple QR decoding libraries:")
    print("   - OpenCV")
    print("   - pyzbar")
    print("   - qrcode library")
    print("✅ Generic data extraction for unknown formats")
    
    print("\n📝 Possible reasons for QR not being detected:")
    print("1. QR code is too small in the PDF")
    print("2. QR code is damaged or low quality")
    print("3. QR code is in a non-standard format")
    print("4. PDF has very low resolution")
    print("5. QR code is obscured by other elements")
    
    print("\n💡 Suggestions:")
    print("1. Try scanning the QR code with your phone first")
    print("2. Take a high-quality photo of the QR code and upload as JPG/PNG")
    print("3. Check if the QR code is clearly visible in the PDF")
    print("4. Try a different PDF of the same Aadhaar card if available")
    
    print("\n🚀 Try uploading your PDF again now!")
    print("The system has been significantly enhanced and should detect QR codes better.")

if __name__ == "__main__":
    diagnose_pdf_qr()
