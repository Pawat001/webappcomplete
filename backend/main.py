"""
Novel Similarity Analyzer - FastAPI Backend
Provides API endpoints for analyzing text similarity between novels and documents
"""

import os
import shutil
import tempfile
import zipfile
from pathlib import Path
from typing import List, Dict, Any, Optional
import json
import base64
import asyncio
from io import BytesIO

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
import aiofiles
import uvicorn

# Document conversion
from docx import Document
import PyPDF2

# Thai text processing
try:
    from pythainlp import word_tokenize
    from pythainlp.corpus import thai_stopwords
    THAI_SUPPORT = True
except ImportError:
    THAI_SUPPORT = False
    print("Warning: pythainlp not available. Thai text processing disabled.")

# Import our enhanced similarity pipeline
from enhanced_pipeline import run_enhanced_pipeline

app = FastAPI(
    title="Novel Similarity Analyzer API",
    description="API for analyzing text similarity between novels and documents",
    version="1.0.0"
)

# CORS middleware for frontend communication  
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://localhost:3000", 
        "https://*.e2b.dev",
        "https://3000-*.e2b.dev",
        "*"  # Allow all for development
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Create necessary directories
TEMP_DIR = Path("temp")
TEMP_DIR.mkdir(exist_ok=True)
(TEMP_DIR / "input").mkdir(exist_ok=True)
(TEMP_DIR / "db").mkdir(exist_ok=True)
(TEMP_DIR / "output").mkdir(exist_ok=True)

# Mount static files for serving results
app.mount("/files", StaticFiles(directory=str(TEMP_DIR)), name="files")

# ---------------------------
# File Conversion Utilities
# ---------------------------

def extract_text_from_docx(file_path: str) -> str:
    """Extract text from DOCX file"""
    try:
        doc = Document(file_path)
        text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
        return text
    except Exception as e:
        raise ValueError(f"Failed to extract text from DOCX: {str(e)}")

def extract_text_from_pdf(file_path: str) -> str:
    """Extract text from PDF file"""
    try:
        text = ""
        with open(file_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            for page_num in range(len(pdf_reader.pages)):
                page = pdf_reader.pages[page_num]
                text += page.extract_text()
        return text
    except Exception as e:
        raise ValueError(f"Failed to extract text from PDF: {str(e)}")

def convert_file_to_txt(input_path: str, output_path: str) -> None:
    """Convert various file formats to TXT"""
    file_extension = Path(input_path).suffix.lower()
    
    if file_extension == '.txt':
        # Copy as-is
        shutil.copy2(input_path, output_path)
    elif file_extension == '.docx':
        text = extract_text_from_docx(input_path)
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(text)
    elif file_extension == '.pdf':
        text = extract_text_from_pdf(input_path)
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(text)
    else:
        raise ValueError(f"Unsupported file format: {file_extension}")

# ---------------------------
# Thai Text Processing
# ---------------------------

def preprocess_thai_text(text: str) -> str:
    """Enhanced text preprocessing for Thai language"""
    if not THAI_SUPPORT:
        return text.lower().replace('\n', ' ').strip()
    
    try:
        # Tokenize Thai text
        tokens = word_tokenize(text, engine='newmm')
        
        # Remove Thai stopwords
        stop_words = set(thai_stopwords())
        tokens = [token for token in tokens if token not in stop_words and len(token.strip()) > 0]
        
        # Join tokens back
        processed_text = ' '.join(tokens)
        return processed_text.lower().strip()
    except Exception as e:
        print(f"Thai processing failed: {e}, falling back to simple processing")
        return text.lower().replace('\n', ' ').strip()

# ---------------------------
# API Endpoints
# ---------------------------

@app.get("/")
async def root():
    """API health check"""
    return {
        "message": "Novel Similarity Analyzer API",
        "status": "running",
        "thai_support": THAI_SUPPORT
    }

@app.post("/api/analyze")
async def analyze_similarity(
    input_files: List[UploadFile] = File(default=[], description="Input files to analyze (max 5 files)"),
    database_file: UploadFile = File(..., description="ZIP file containing database documents"),
    k_neighbors: int = Form(3, description="Number of top neighbors to find"),
    dup_threshold: float = Form(0.90, description="Threshold for duplicate classification"),
    similar_threshold: float = Form(0.60, description="Threshold for similar classification"),
    text_input: Optional[str] = Form(None, description="Optional direct text input"),
    novel_names: Optional[str] = Form(None, description="Optional comma-separated names for input files/text")
):
    """
    Analyze text similarity between input files and a database of documents
    
    Args:
        input_files: List of files to analyze (.txt, .docx, .pdf)
        database_file: ZIP file containing database documents organized by genre
        k_neighbors: Number of top similar documents to find
        dup_threshold: Similarity threshold for duplicate classification
        similar_threshold: Similarity threshold for similar classification  
        text_input: Optional direct text input (will be saved as additional file)
    
    Returns:
        JSON response with analysis results and file URLs
    """
    
    try:
        # Validate input files count
        if len(input_files) > 5:
            raise HTTPException(status_code=400, detail="Maximum 5 input files allowed")
        
        if len(input_files) == 0 and not text_input:
            raise HTTPException(status_code=400, detail="At least one input file or text input is required")
        
        # Create unique session directory
        import uuid
        session_id = str(uuid.uuid4())[:8]
        session_dir = TEMP_DIR / f"session_{session_id}"
        input_dir = session_dir / "input"
        db_dir = session_dir / "db" 
        output_dir = session_dir / "output"
        
        # Create directories
        for dir_path in [input_dir, db_dir, output_dir]:
            dir_path.mkdir(parents=True, exist_ok=True)
        
        # Process novel names
        custom_names = []
        if novel_names and novel_names.strip():
            custom_names = [name.strip() for name in novel_names.split(',') if name.strip()]
        
        # Process input files
        processed_files = []
        file_name_mapping = {}  # Maps original filename to custom name
        
        # Handle direct text input
        if text_input and text_input.strip():
            text_filename = "direct_text_input.txt"
            text_file_path = input_dir / text_filename
            async with aiofiles.open(text_file_path, 'w', encoding='utf-8') as f:
                await f.write(text_input)
            processed_files.append(text_filename)
            
            # Use first custom name for text input if available
            if custom_names:
                file_name_mapping[text_filename] = custom_names[0]
        
        # Handle uploaded files
        for i, file in enumerate(input_files):
            if not file.filename:
                continue
            
            print(f"🔍 Processing file {i+1}: {file.filename}")
            
            # Handle file from folder (preserve original name structure)
            original_filename = file.filename
            clean_filename = Path(original_filename).name  # Get just the filename without path
            
            # Save uploaded file with safe filename
            file_extension = Path(clean_filename).suffix.lower()
            safe_filename = f"file_{i:02d}_{clean_filename}"
            temp_file_path = input_dir / safe_filename
            
            try:
                async with aiofiles.open(temp_file_path, 'wb') as f:
                    content = await file.read()
                    await f.write(content)
                print(f"✅ Saved temp file: {temp_file_path}")
            except Exception as e:
                print(f"❌ Failed to save {original_filename}: {e}")
                continue
            
            # Convert to TXT with preserved name structure
            if original_filename != clean_filename:
                # This is from folder upload, preserve some path info
                txt_filename = f"{Path(original_filename).parent.name}_{Path(clean_filename).stem}.txt" if Path(original_filename).parent.name else f"{Path(clean_filename).stem}.txt"
            else:
                txt_filename = f"{Path(clean_filename).stem}.txt"
            
            # Ensure unique filename
            counter = 1
            original_txt_filename = txt_filename
            while txt_filename in processed_files:
                base_name = Path(original_txt_filename).stem
                txt_filename = f"{base_name}_{counter}.txt"
                counter += 1
            
            txt_file_path = input_dir / txt_filename
            
            try:
                print(f"🔄 Converting {safe_filename} to {txt_filename}")
                convert_file_to_txt(str(temp_file_path), str(txt_file_path))
                processed_files.append(txt_filename)
                print(f"✅ Converted to: {txt_file_path}")
                
                # Map to custom name if available
                name_index = i + (1 if text_input and text_input.strip() else 0)
                if name_index < len(custom_names):
                    file_name_mapping[txt_filename] = custom_names[name_index]
                else:
                    # Use original filename as display name for folder uploads
                    if original_filename != clean_filename:
                        file_name_mapping[txt_filename] = original_filename
                
                # Remove temporary file
                temp_file_path.unlink()
                print(f"🗑️ Cleaned up temp file: {safe_filename}")
                
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Failed to convert {file.filename}: {str(e)}")
        
        # Process database ZIP file
        if not database_file.filename or not database_file.filename.endswith('.zip'):
            raise HTTPException(status_code=400, detail="Database file must be a ZIP file")
        
        # Save and extract database ZIP
        db_zip_path = session_dir / "database.zip"
        async with aiofiles.open(db_zip_path, 'wb') as f:
            db_content = await database_file.read()
            await f.write(db_content)
        
        # Extract ZIP
        try:
            with zipfile.ZipFile(db_zip_path, 'r') as zip_ref:
                zip_ref.extractall(db_dir)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to extract database ZIP: {str(e)}")
        
        # Run enhanced similarity analysis pipeline
        try:
            results = await asyncio.to_thread(
                run_enhanced_pipeline,
                db_root=str(db_dir),
                input_root=str(input_dir),
                out_root=str(output_dir),
                k_neighbors=k_neighbors,
                dup_threshold=dup_threshold,
                similar_threshold=similar_threshold,
                max_files_per_genre=10
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Enhanced analysis pipeline failed: {str(e)}")
        
        # Prepare response with file URLs and content
        response_data = {
            "status": "success",
            "message": f"Analysis completed successfully. Processed {len(processed_files)} input files.",
            "session_id": session_id,
            "processed_files": processed_files,
            "file_name_mapping": file_name_mapping,
            "parameters": {
                "k_neighbors": k_neighbors,
                "dup_threshold": dup_threshold,
                "similar_threshold": similar_threshold
            },
            "results": {}
        }
        
        # Add file URLs and content to response
        for key, file_path in results.items():
            if isinstance(file_path, str) and os.path.exists(file_path):
                file_url = f"/files/session_{session_id}/output/{Path(file_path).name}"
                response_data["results"][key] = {
                    "url": file_url,
                    "filename": Path(file_path).name
                }
                
                # For text files, include content directly
                if file_path.endswith('.txt') or file_path.endswith('.json'):
                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            response_data["results"][key]["content"] = f.read()
                    except:
                        pass
                
                # For images, include base64 data (optional - for immediate display)
                elif file_path.endswith('.png'):
                    try:
                        with open(file_path, 'rb') as f:
                            img_data = f.read()
                            b64_data = base64.b64encode(img_data).decode()
                            response_data["results"][key]["base64"] = f"data:image/png;base64,{b64_data}"
                    except:
                        pass
            elif key == "analysis_info":
                # Skip analysis_info as it's metadata
                continue
        
        return JSONResponse(content=response_data)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get("/api/download/{session_id}")
async def download_results(session_id: str):
    """Download all analysis results as a ZIP file"""
    
    session_dir = TEMP_DIR / f"session_{session_id}"
    output_dir = session_dir / "output"
    
    if not output_dir.exists():
        raise HTTPException(status_code=404, detail="Session not found or results not available")
    
    # Create ZIP file with all results
    zip_path = session_dir / "results.zip"
    
    with zipfile.ZipFile(zip_path, 'w') as zip_file:
        for file_path in output_dir.glob("*"):
            if file_path.is_file():
                zip_file.write(file_path, file_path.name)
    
    if not zip_path.exists():
        raise HTTPException(status_code=404, detail="Failed to create results archive")
    
    return FileResponse(
        path=str(zip_path),
        filename=f"similarity_analysis_results_{session_id}.zip",
        media_type="application/zip"
    )

@app.delete("/api/cleanup/{session_id}")
async def cleanup_session(session_id: str):
    """Clean up temporary files for a session"""
    
    session_dir = TEMP_DIR / f"session_{session_id}"
    
    if session_dir.exists():
        shutil.rmtree(session_dir)
        return {"status": "success", "message": f"Session {session_id} cleaned up"}
    else:
        raise HTTPException(status_code=404, detail="Session not found")

@app.options("/api/{path:path}")
async def options_handler(path: str):
    """Handle CORS preflight requests"""
    return {"message": "OK"}

@app.get("/api/health")
async def health_check():
    """Extended health check with system information"""
    return {
        "status": "healthy",
        "thai_support": THAI_SUPPORT,
        "temp_dir_exists": TEMP_DIR.exists(),
        "available_endpoints": [
            "/api/analyze",
            "/api/download/{session_id}",
            "/api/cleanup/{session_id}",
            "/api/health"
        ]
    }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )