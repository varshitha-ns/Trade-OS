#!/usr/bin/env python3
"""
🔍 Backend Health Check Script

This script verifies that all backend components are working properly
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def check_imports():
    """Check if all required modules can be imported"""
    print("🔍 Checking Backend Imports...")
    
    try:
        # Core FastAPI
        from fastapi import FastAPI
        print("✅ FastAPI imported successfully")
        
        # Main app
        from app.main import app
        print("✅ Main app imported successfully")
        
        # API modules
        from app.api import matchmaker, trade_parser, registration
        print("✅ All API modules imported successfully")
        
        # Database
        from app.database import connect_to_mongo
        print("✅ Database module imported successfully")
        
        # Routes
        from app.routes import auth, users, marketplace, onboard
        print("✅ All route modules imported successfully")
        
        return True
        
    except ImportError as e:
        print(f"❌ Import Error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected Error: {e}")
        return False

def check_app_structure():
    """Check if app structure is correct"""
    print("\n🏗️ Checking App Structure...")
    
    try:
        from app.main import app
        
        # Check if app is FastAPI instance
        if hasattr(app, 'title'):
            print(f"✅ FastAPI app title: {app.title}")
        
        # Check routes
        if hasattr(app, 'routes'):
            route_count = len(app.routes)
            print(f"✅ Total routes registered: {route_count}")
            
            # List some key routes
            routes = [route.path for route in app.routes if hasattr(route, 'path')]
            key_routes = [r for r in routes if any(keyword in r for keyword in ['/api/matchmaker', '/api/trade-parser', '/api/registration'])]
            print(f"✅ Key API routes found: {len(key_routes)}")
        
        return True
        
    except Exception as e:
        print(f"❌ Structure Error: {e}")
        return False

def check_dependencies():
    """Check if required dependencies are available"""
    print("\n📦 Checking Dependencies...")
    
    required_packages = [
        'fastapi', 'uvicorn', 'pydantic', 'pymongo',
        'scikit-learn', 'numpy', 'pandas', 'sentence-transformers'
    ]
    
    missing_packages = []
    
    for package in required_packages:
        try:
            if package == 'pymongo':
                import pymongo
            elif package == 'sentence-transformers':
                import sentence_transformers
            else:
                __import__(package)
            print(f"✅ {package} available")
        except ImportError:
            print(f"❌ {package} missing")
            missing_packages.append(package)
    
    return len(missing_packages) == 0

def check_file_structure():
    """Check if required files exist"""
    print("\n📁 Checking File Structure...")
    
    required_files = [
        'app/main.py',
        'app/api/matchmaker.py',
        'app/api/trade_parser.py', 
        'app/api/registration.py',
        'app/database.py',
        'app/auth.py',
        'app/routes/auth.py',
        'app/routes/users.py',
        'app/routes/marketplace.py',
        'app/routes/onboard.py'
    ]
    
    missing_files = []
    
    for file_path in required_files:
        if os.path.exists(file_path):
            print(f"✅ {file_path}")
        else:
            print(f"❌ {file_path} missing")
            missing_files.append(file_path)
    
    return len(missing_files) == 0

def main():
    """Run all backend checks"""
    print("🚀 TradeOS Backend Health Check")
    print("=" * 50)
    
    checks = [
        ("Imports", check_imports),
        ("App Structure", check_app_structure), 
        ("Dependencies", check_dependencies),
        ("File Structure", check_file_structure)
    ]
    
    results = []
    
    for check_name, check_func in checks:
        try:
            result = check_func()
            results.append((check_name, result))
        except Exception as e:
            print(f"❌ {check_name} check failed: {e}")
            results.append((check_name, False))
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 HEALTH CHECK SUMMARY")
    print("=" * 50)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for check_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{check_name:20s} {status}")
    
    print(f"\nOverall: {passed}/{total} checks passed")
    
    if passed == total:
        print("\n🎉 Backend is HEALTHY and ready to run!")
        print("\n🚀 RUN COMMANDS:")
        print("1. cd d:\\Tradeos-platform\\backend")
        print("2. python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000")
    else:
        print("\n⚠️ Backend has issues. Please fix errors above before running.")

if __name__ == "__main__":
    main()
