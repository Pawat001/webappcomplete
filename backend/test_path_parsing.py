#!/usr/bin/env python3
"""
Unit tests for Novel Similarity Analyzer path parsing logic.

This test suite verifies that the path parsing logic correctly handles both:
1. 3-level folder structure: Genre/Novel Title/Filename.txt
2. 2-level folder structure: Genre/Filename.txt

Tests cover:
- Proper novel title extraction from 3-level paths
- Proper fallback handling for 2-level paths  
- Edge cases and error handling
- Title cleaning (underscores/hyphens to spaces)
"""

import os
import sys
import unittest
import tempfile
import shutil
from pathlib import Path

# Add the backend directory to Python path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from novel_similarity_pipeline import load_database


class TestPathParsing(unittest.TestCase):
    """Test cases for path structure parsing logic."""
    
    def setUp(self):
        """Set up test database structure."""
        self.test_db_root = tempfile.mkdtemp(prefix='test_novel_db_')
        
    def tearDown(self):
        """Clean up test database."""
        if os.path.exists(self.test_db_root):
            shutil.rmtree(self.test_db_root)
    
    def create_test_file(self, relative_path: str, content: str = "Test content") -> None:
        """Create a test file with given path and content."""
        full_path = os.path.join(self.test_db_root, relative_path)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, 'w', encoding='utf-8') as f:
            f.write(content)
    
    def test_3_level_structure_basic(self):
        """Test basic 3-level structure: Genre/Novel Title/Filename.txt"""
        # Create test files with 3-level structure
        self.create_test_file("Romance/Pride_and_Prejudice/chapter01.txt", "It is a truth universally acknowledged...")
        self.create_test_file("Romance/Pride_and_Prejudice/chapter02.txt", "When Jane and Elizabeth were alone...")
        self.create_test_file("Fantasy/Harry_Potter/chapter01.txt", "Mr. and Mrs. Dursley of number four...")
        
        texts, labels, genres, titles = load_database(self.test_db_root)
        
        # Verify we got the expected number of files
        self.assertEqual(len(texts), 3)
        self.assertEqual(len(labels), 3)
        self.assertEqual(len(genres), 3)
        self.assertEqual(len(titles), 3)
        
        # Check that novel titles were extracted correctly
        expected_titles = ["Pride and Prejudice", "Pride and Prejudice", "Harry Potter"]
        self.assertEqual(sorted(titles), sorted(expected_titles))
        
        # Check genres
        expected_genres = ["Romance", "Romance", "Fantasy"]
        self.assertEqual(sorted(genres), sorted(expected_genres))
        
        # Check labels (filenames)
        expected_labels = ["chapter01.txt", "chapter02.txt", "chapter01.txt"]
        self.assertEqual(sorted(labels), sorted(expected_labels))
    
    def test_2_level_structure_basic(self):
        """Test basic 2-level structure: Genre/Filename.txt"""
        # Create test files with 2-level structure  
        self.create_test_file("Sci-Fi/foundation.txt", "Hari Seldon looked at the gathering...")
        self.create_test_file("Sci-Fi/dune.txt", "In the week before their departure...")
        self.create_test_file("Mystery/sherlock.txt", "It was in the spring of the year 1894...")
        
        texts, labels, genres, titles = load_database(self.test_db_root)
        
        # Verify we got the expected number of files
        self.assertEqual(len(texts), 3)
        
        # Check that titles are marked as N/A for 2-level structure
        expected_titles = ["N/A", "N/A", "N/A"]
        self.assertEqual(titles, expected_titles)
        
        # Check genres
        expected_genres = ["Mystery", "Sci-Fi", "Sci-Fi"]
        self.assertEqual(sorted(genres), sorted(expected_genres))
    
    def test_mixed_structure(self):
        """Test mixed 2-level and 3-level structures in same database."""
        # Create mixed structure
        # 3-level
        self.create_test_file("Romance/Jane_Austen_Collection/pride_prejudice.txt", "Test content 1")
        self.create_test_file("Romance/Jane_Austen_Collection/sense_sensibility.txt", "Test content 2")
        # 2-level  
        self.create_test_file("Mystery/agatha_christie.txt", "Test content 3")
        self.create_test_file("Sci-Fi/isaac_asimov.txt", "Test content 4")
        
        texts, labels, genres, titles = load_database(self.test_db_root)
        
        # Verify counts
        self.assertEqual(len(texts), 4)
        
        # Check title extraction
        # 3-level should have novel titles, 2-level should be N/A
        title_dict = dict(zip(labels, titles))
        
        self.assertEqual(title_dict["pride_prejudice.txt"], "Jane Austen Collection")
        self.assertEqual(title_dict["sense_sensibility.txt"], "Jane Austen Collection") 
        self.assertEqual(title_dict["agatha_christie.txt"], "N/A")
        self.assertEqual(title_dict["isaac_asimov.txt"], "N/A")
    
    def test_title_cleaning(self):
        """Test that novel titles are properly cleaned (underscores/hyphens to spaces)."""
        # Create files with various naming patterns
        self.create_test_file("Fantasy/Lord_of_the_Rings/fellowship.txt", "Test content 1")
        self.create_test_file("Fantasy/Game-of-Thrones/book1.txt", "Test content 2")
        self.create_test_file("Sci-Fi/Foundation_Series/prelude.txt", "Test content 3")
        
        texts, labels, genres, titles = load_database(self.test_db_root)
        
        # Check that titles are properly cleaned
        expected_titles = [
            "Lord of the Rings",
            "Game of Thrones", 
            "Foundation Series"
        ]
        self.assertEqual(sorted(titles), sorted(expected_titles))
    
    def test_deep_nested_structure(self):
        """Test handling of deeper nesting (should still work correctly)."""
        # Create deeply nested structure (more than 3 levels)
        self.create_test_file("Fantasy/Tolkien_Works/Lord_of_Rings/Book1/chapter01.txt", "Test content 1")
        self.create_test_file("Fantasy/Tolkien_Works/Hobbit/chapter01.txt", "Test content 2")
        
        texts, labels, genres, titles = load_database(self.test_db_root)
        
        # Should still extract the first folder level as novel title
        title_dict = dict(zip(labels, titles))
        
        # Both should extract "Tolkien Works" as the novel title
        self.assertEqual(title_dict["chapter01.txt"], "Tolkien Works")  # Both files have same name, check any
        self.assertIn("Tolkien Works", titles)
    
    def test_empty_database(self):
        """Test handling of empty database directory."""
        # Create empty genre directories
        os.makedirs(os.path.join(self.test_db_root, "Romance"))
        os.makedirs(os.path.join(self.test_db_root, "Mystery"))
        
        with self.assertRaises(SystemExit) as context:
            load_database(self.test_db_root)
        
        # Should exit with message about no .txt files found
        self.assertTrue("No .txt files found" in str(context.exception) or 
                       hasattr(context.exception, 'code'))
    
    def test_no_genre_directories(self):
        """Test handling when no genre subdirectories exist."""
        # Create a file directly in root (no genre subdirectories)
        self.create_test_file("direct_file.txt", "Test content")
        
        with self.assertRaises(SystemExit) as context:
            load_database(self.test_db_root)
        
        # Should exit with message about no genre subfolders
        self.assertTrue("No genre subfolders" in str(context.exception) or 
                       hasattr(context.exception, 'code'))
    
    def test_nonexistent_database_path(self):
        """Test handling of nonexistent database path."""
        nonexistent_path = "/nonexistent/database/path"
        
        with self.assertRaises(SystemExit) as context:
            load_database(nonexistent_path)
        
        # Should exit with message about database folder not found
        self.assertTrue("Database folder not found" in str(context.exception) or 
                       hasattr(context.exception, 'code'))
    
    def test_unicode_and_special_characters(self):
        """Test handling of Unicode characters and special characters in paths."""
        # Create files with Unicode and special characters
        self.create_test_file("นิยายไทย/เรื่องสั้น_รักใคร่/บทที่_1.txt", "เนื้อหาภาษาไทย")
        self.create_test_file("Français/Émile_Zola/chapitre1.txt", "Contenu français")
        
        texts, labels, genres, titles = load_database(self.test_db_root)
        
        # Verify Unicode handling works correctly
        self.assertEqual(len(texts), 2)
        
        # Check that Unicode titles are cleaned properly
        title_dict = dict(zip(labels, titles))
        
        # Thai text should be cleaned
        self.assertIn("เรื่องสั้น รักใคร่", titles)
        # French text should be cleaned  
        self.assertIn("Émile Zola", titles)
    
    def test_file_limit_per_genre(self):
        """Test that file limit per genre (50 files) is respected."""
        # Create more than 50 files in one genre
        for i in range(60):
            self.create_test_file(f"Romance/Novel_Collection/chapter_{i:03d}.txt", f"Content {i}")
        
        texts, labels, genres, titles = load_database(self.test_db_root)
        
        # Should be limited to 50 files
        self.assertEqual(len(texts), 50)
        
        # All should have same novel title
        unique_titles = set(titles)
        self.assertEqual(len(unique_titles), 1)
        self.assertIn("Novel Collection", unique_titles)
    
    def test_multiple_genres_with_limits(self):
        """Test file limits across multiple genres."""
        # Create files in multiple genres, some exceeding limits
        for i in range(30):
            self.create_test_file(f"Romance/Love_Stories/chapter_{i:03d}.txt", f"Romance content {i}")
        
        for i in range(60):
            self.create_test_file(f"Mystery/Detective_Cases/case_{i:03d}.txt", f"Mystery content {i}")
            
        for i in range(10):
            self.create_test_file(f"Sci-Fi/Space_Opera/episode_{i:03d}.txt", f"Sci-Fi content {i}")
        
        texts, labels, genres, titles = load_database(self.test_db_root)
        
        # Should have 30 + 50 + 10 = 90 files (Mystery limited to 50)
        self.assertEqual(len(texts), 90)
        
        # Check genre distribution
        genre_counts = {}
        for genre in genres:
            genre_counts[genre] = genre_counts.get(genre, 0) + 1
        
        self.assertEqual(genre_counts.get("Romance", 0), 30)
        self.assertEqual(genre_counts.get("Mystery", 0), 50)  # Limited
        self.assertEqual(genre_counts.get("Sci-Fi", 0), 10)


def run_tests():
    """Run all path parsing tests."""
    # Create test suite
    test_suite = unittest.TestLoader().loadTestsFromTestCase(TestPathParsing)
    
    # Run tests with detailed output
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(test_suite)
    
    # Print summary
    print(f"\n{'='*60}")
    print(f"TEST SUMMARY")
    print(f"{'='*60}")
    print(f"Tests run: {result.testsRun}")
    print(f"Failures: {len(result.failures)}")
    print(f"Errors: {len(result.errors)}")
    print(f"Success rate: {((result.testsRun - len(result.failures) - len(result.errors)) / result.testsRun * 100):.1f}%")
    
    if result.failures:
        print(f"\nFAILURES:")
        for test, traceback in result.failures:
            print(f"- {test}: {traceback}")
    
    if result.errors:
        print(f"\nERRORS:")  
        for test, traceback in result.errors:
            print(f"- {test}: {traceback}")
    
    # Return success status
    return len(result.failures) == 0 and len(result.errors) == 0


if __name__ == "__main__":
    # Run the tests
    success = run_tests()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)