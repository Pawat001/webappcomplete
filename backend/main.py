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
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
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
    input_files: List[UploadFile] = File(..., description="Input files to analyze (max 5 files)"),
    database_file: UploadFile = File(..., description="ZIP file containing database documents"),
    k_neighbors: int = Form(3, description="Number of top neighbors to find"),
    dup_threshold: float = Form(0.90, description="Threshold for duplicate classification"),
    similar_threshold: float = Form(0.60, description="Threshold for similar classification"),
    text_input: Optional[str] = Form(None, description="Optional direct text input")
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
        
        # Process input files
        processed_files = []
        
        # Handle direct text input
        if text_input and text_input.strip():
            text_file_path = input_dir / "direct_text_input.txt"
            async with aiofiles.open(text_file_path, 'w', encoding='utf-8') as f:
                await f.write(text_input)
            processed_files.append("direct_text_input.txt")
        
        # Handle uploaded files
        for i, file in enumerate(input_files):
            if not file.filename:
                continue
                
            # Save uploaded file
            file_extension = Path(file.filename).suffix.lower()
            temp_file_path = input_dir / f"temp_{i}_{file.filename}"
            
            async with aiofiles.open(temp_file_path, 'wb') as f:
                content = await file.read()
                await f.write(content)
            
            # Convert to TXT
            txt_filename = f"{Path(file.filename).stem}.txt"
            txt_file_path = input_dir / txt_filename
            
            try:
                convert_file_to_txt(str(temp_file_path), str(txt_file_path))
                processed_files.append(txt_filename)
                
                # Remove temporary file
                temp_file_path.unlink()
                
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
            "parameters": {
                "k_neighbors": k_neighbors,
                "dup_threshold": dup_threshold,
                "similar_threshold": similar_threshold
            },
            "results": {}
        }
        
        # Add file URLs and content to response
        for key, file_path in results.items():
            if os.path.exists(file_path):
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