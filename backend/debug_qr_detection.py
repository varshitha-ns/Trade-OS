#!/usr/bin/env python3
"""
Debug QR detection to understand why it's not working
"""

import requests
import json
import base64
from PIL import Image
import io

def debug_qr_detection():
    """Debug the QR detection process"""
    print("🔍 Debugging QR Detection Process...")
    
    # Create a simple test image with a real QR code
    try:
        import qrcode
        
        # Create a real QR code with test data
        qr_data = '''<?xml version="1.0" encoding="UTF-8"?>
<PrintLetterBarcodeData uid="123456789012" name="VARSHITHA N S" dob="15/01/1995" 
gender="F" yob="1995" co="D/O" house="123" street="Test Street" 
lm="Near Landmark" loc="Bangalore" vtc="Bangalore" po="Test Post" 
subdist="Bangalore South" dist="Bangalore" state="Karnataka" pc="560034"/>'''
        
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(qr_data)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Convert to bytes
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='PNG')
        img_bytes.seek(0)
        
        print("✅ Created test QR code with XML data")
        
        # Test 1: Upload the QR code directly
        print("\n📤 Testing 1: Direct QR code upload...")
        files = {'file': ('test_qr.png', img_bytes, 'image/png')}
        
        response = requests.post(
            'http://localhost:8000/api/aadhaar/verify-aadhaar',
            files=files,
            timeout=30
        )
        
        print(f"Status: {response.status_code}")
        result = response.json()
        print(f"Response: {json.dumps(result, indent=2)}")
        
        if response.status_code == 200 and result.get('success'):
            print("✅ QR detection working with test image!")
        else:
            print("❌ QR detection failed even with test QR code")
            
    except Exception as e:
        print(f"❌ Test creation failed: {e}")
    
    # Test 2: Check what happens with a blank image
    print("\n📤 Testing 2: Blank image (no QR)...")
    blank_img = Image.new('RGB', (400, 300), color='white')
    blank_bytes = io.BytesIO()
    blank_img.save(blank_bytes, format='PNG')
    blank_bytes.seek(0)
    
    files = {'file': ('blank.png', blank_bytes, 'image/png')}
    
    response = requests.post(
        'http://localhost:8000/api/aadhaar/verify-aadhaar',
        files=files,
        timeout=30
    )
    
    print(f"Status: {response.status_code}")
    result = response.json()
    print(f"Response: {json.dumps(result, indent=2)}")

if __name__ == "__main__":
    debug_qr_detection()
