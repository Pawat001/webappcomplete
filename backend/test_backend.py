#!/usr/bin/env python3
"""
Quick Backend Test - Check if all imports and basic functions work
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

def test_imports():
    """Test all critical imports"""
    try:
        print("🧪 Testing imports...")
        
        # Test basic Python libraries
        import pandas as pd
        import numpy as np
        from sklearn.feature_extraction.text import TfidfVectorizer
        print("✅ Core data science libraries imported")
        
        # Test Thai support
        import pythainlp
        print("✅ Thai language support available")
        
        # Test FastAPI components
        from fastapi import FastAPI
        print("✅ FastAPI imported")
        
        # Test our pipeline
        from enhanced_pipeline import extract_novel_info, extract_input_info
        print("✅ Enhanced pipeline functions imported")
        
        return True
    except Exception as e:
        print(f"❌ Import error: {e}")
        return False

def test_extract_functions():
    """Test extract functions with sample data"""
    try:
        print("\n🧪 Testing extraction functions...")
        from enhanced_pipeline import extract_novel_info, extract_input_info
        
        # Test novel info extraction
        test_path = "db/Romance/Love Story/Chapter1.txt"
        info = extract_novel_info(test_path, "db")
        print(f"✅ Novel info: {info}")
        
        # Test input info extraction  
        test_file = "Love_Story_Chapter1.txt"
        input_info = extract_input_info(test_file)
        print(f"✅ Input info: {input_info}")
        
        return True
    except Exception as e:
        print(f"❌ Function test error: {e}")
        return False

def test_pipeline_basics():
    """Test basic pipeline functionality"""
    try:
        print("\n🧪 Testing pipeline basics...")
        from enhanced_pipeline import enhanced_preprocess, detect_language
        
        # Test text processing
        test_text = "This is a test text for analysis."
        processed = enhanced_preprocess(test_text, 'auto')
        print(f"✅ Text preprocessing: '{test_text}' → '{processed[:50]}...'")
        
        # Test language detection
        lang = detect_language(test_text)
        print(f"✅ Language detection: '{lang}'")
        
        return True
    except Exception as e:
        print(f"❌ Pipeline test error: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Backend Diagnostic Test")
    print("=" * 50)
    
    success = True
    success &= test_imports()
    success &= test_extract_functions() 
    success &= test_pipeline_basics()
    
    print("\n" + "=" * 50)
    if success:
        print("✅ All tests passed! Backend should work correctly.")
        sys.exit(0)
    else:
        print("❌ Some tests failed. Check errors above.")
        sys.exit(1)