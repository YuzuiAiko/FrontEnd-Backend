#!/usr/bin/env python3
"""
Test script to verify that train_model.py can run the full training process
"""

import sys
import os
from pathlib import Path

# Add the current directory to Python path
sys.path.append('.')

from train_model import EmailClassifier

def test_training_process():
    """Test if the EmailClassifier can run the full training process"""
    print("Testing full training process...")
    
    # Initialize classifier
    classifier = EmailClassifier()
    
    # Load emails from data folder
    print("Loading emails from email_data folder...")
    emails = classifier.load_emails_from_data_folder()
    
    if not emails:
        print("❌ No emails found in the email_data folder.")
        return False
    
    print(f"✅ Successfully loaded {len(emails)} emails")
    
    # Test with just a small subset for faster testing
    test_emails = emails[:5]  # Use only first 5 emails for testing
    print(f"Testing with {len(test_emails)} emails...")
    
    # Test LLM classification
    print("Testing LLM classification...")
    try:
        classified_emails = classifier.classify_emails(test_emails)
        print(f"✅ Successfully classified {len(classified_emails)} emails")
        
        # Show classification results
        for i, email in enumerate(classified_emails):
            print(f"  Email {i+1}: {email['classification']}")
        
        # Test SVM model training
        print("Testing SVM model training...")
        svm_model, vectorizer, label_mapping = classifier.train_svm_model_from_llm_data(classified_emails)
        print("✅ SVM model training successful")
        
        # Test model saving
        print("Testing model saving...")
        classifier.save_trained_model(svm_model, vectorizer, label_mapping, "test_model")
        print("✅ Model saving successful")
        
        # Check if files were created
        model_files = ["test_model/svm_model.joblib", "test_model/vectorizer.joblib", "test_model/label_mapping.joblib"]
        for file_path in model_files:
            if os.path.exists(file_path):
                print(f"✅ {file_path} created successfully")
            else:
                print(f"❌ {file_path} not found")
                return False
        
        return True
        
    except Exception as e:
        print(f"❌ Error during training: {e}")
        return False

if __name__ == "__main__":
    success = test_training_process()
    if success:
        print("\n✅ Full training process test PASSED")
    else:
        print("\n❌ Full training process test FAILED")
        sys.exit(1)

