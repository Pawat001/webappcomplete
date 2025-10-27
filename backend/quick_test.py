import pandas
import numpy 
from sklearn.feature_extraction.text import TfidfVectorizer
print("Basic imports OK")

try:
    from enhanced_pipeline import extract_novel_info
    result = extract_novel_info("test/Romance/Love/ch1.txt", "test")
    print("Extract function OK:", result)
except Exception as e:
    print("Extract error:", e)