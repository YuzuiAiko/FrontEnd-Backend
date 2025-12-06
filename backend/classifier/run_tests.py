#!/usr/bin/env python3
"""
Test runner for classifier tests.
Run with: python run_tests.py
"""

import unittest
import sys
import os

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def run_tests():
    """Discover and run all tests"""
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    # Add test modules
    test_modules = [
        'test_email_classifier',
        'test_phishing_link',
        'test_flask_app'
    ]
    
    for module_name in test_modules:
        try:
            module = __import__(module_name)
            tests = loader.loadTestsFromModule(module)
            suite.addTests(tests)
            print(f"Loaded tests from {module_name}")
        except ImportError as e:
            print(f"Warning: Could not import {module_name}: {e}")
    
    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # Return exit code based on test results
    return 0 if result.wasSuccessful() else 1

if __name__ == '__main__':
    exit_code = run_tests()
    sys.exit(exit_code)

