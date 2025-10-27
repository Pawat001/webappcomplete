#!/bin/bash
# Novel Similarity Analyzer Backend Startup Script

echo "🚀 Starting Novel Similarity Analyzer Backend..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📚 Installing dependencies..."
pip install -r requirements.txt

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p temp/{input,db,output}

# Download pythainlp data if not exists
echo "🇹🇭 Setting up Thai language support..."
python -c "
try:
    import pythainlp
    pythainlp.corpus.download('thai2fit_wv')
    print('✅ Thai language data ready')
except Exception as e:
    print(f'⚠️  Thai setup warning: {e}')
"

# Start the server
echo "🌟 Starting FastAPI server on port 8000..."
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

echo "✅ Backend started successfully!"
echo "📡 API available at: http://localhost:8000"
echo "📖 Documentation: http://localhost:8000/docs"