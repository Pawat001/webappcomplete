#!/usr/bin/env python3
"""
Test script for folder upload functionality
Tests if files from a folder upload are properly processed by the backend
"""

import requests
import os
from pathlib import Path
import json

# Configuration
BACKEND_URL = "http://localhost:8000"
TEST_FOLDER = "/home/user/webapp/test_folder"

def create_test_database_zip():
    """Create a minimal database zip for testing"""
    import zipfile
    
    zip_path = "/home/user/webapp/test_database.zip"
    
    with zipfile.ZipFile(zip_path, 'w') as zf:
        # Create a simple test document in the database
        zf.writestr("fantasy/sample.txt", "This is a fantasy story with magic and dragons.")
        zf.writestr("romance/sample.txt", "This is a romance story about love and relationships.")
        zf.writestr("technical/sample.txt", "This is technical documentation about systems.")
    
    return zip_path

def test_folder_upload():
    """Test uploading files from a folder structure"""
    
    # Create test database
    database_zip = create_test_database_zip()
    
    # Collect all supported files from test folder
    files_to_upload = []
    folder_structure = {}
    
    for root, dirs, files in os.walk(TEST_FOLDER):
        for file in files:
            if file.endswith(('.txt', '.docx', '.pdf')):
                file_path = os.path.join(root, file)
                relative_path = os.path.relpath(file_path, TEST_FOLDER)
                
                files_to_upload.append((file_path, relative_path))
                folder_structure[relative_path] = file_path
    
    print(f"📁 Found {len(files_to_upload)} files in folder structure:")
    for file_path, relative_path in files_to_upload:
        print(f"  - {relative_path} → {file_path}")
    
    # Prepare files for upload
    files = []
    for file_path, relative_path in files_to_upload:
        files.append(('input_files', (relative_path, open(file_path, 'rb'), 'text/plain')))
    
    # Add database file
    files.append(('database_file', ('database.zip', open(database_zip, 'rb'), 'application/zip')))
    
    # Prepare form data
    data = {
        'k_neighbors': 3,
        'dup_threshold': 0.90,
        'similar_threshold': 0.60,
        'novel_names': ', '.join([Path(relative_path).stem for _, relative_path in files_to_upload])
    }
    
    print(f"\n🚀 Starting upload test to {BACKEND_URL}/api/analyze...")
    
    try:
        # Make the request
        response = requests.post(
            f"{BACKEND_URL}/api/analyze",
            files=files,
            data=data,
            timeout=60
        )
        
        print(f"📊 Response Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ Upload successful!")
            print(f"📋 Session ID: {result.get('session_id', 'N/A')}")
            
            # Print full response for debugging
            print(f"🔍 Full response keys: {list(result.keys())}")
            print(f"📄 Full response: {json.dumps(result, indent=2, ensure_ascii=False)}")
            
            processed_files = result.get('results', {}).get('processed_files', [])
            print(f"📁 Processed Files: {len(processed_files)}")
            
            # Check if files were processed with correct names
            for processed_file in processed_files:
                print(f"  - {processed_file.get('original_name', 'N/A')} → {processed_file.get('processed_name', 'N/A')}")
            
            similarity_results = result.get('results', {}).get('similarity_results', [])
            print(f"📈 Analysis Results: {len(similarity_results)} comparisons")
            return True
            
        else:
            print(f"❌ Upload failed: {response.status_code}")
            print(f"📄 Response: {response.text[:500]}...")
            return False
            
    except Exception as e:
        print(f"💥 Request failed: {str(e)}")
        return False
    
    finally:
        # Close all file handles
        for file_tuple in files:
            if len(file_tuple) > 1 and hasattr(file_tuple[1][1], 'close'):
                file_tuple[1][1].close()
        
        # Clean up test database
        if os.path.exists(database_zip):
            os.remove(database_zip)

if __name__ == "__main__":
    print("🔍 Testing Folder Upload Functionality")
    print("=" * 50)
    
    success = test_folder_upload()
    
    print("\n" + "=" * 50)
    if success:
        print("🎉 Folder upload test PASSED!")
    else:
        print("😞 Folder upload test FAILED!")