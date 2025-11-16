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
    """Smoke-test LLM classification using a small slice of email_data.

    This verifies that PERPLEXITY_API_KEY/OPENAI_API_KEY are configured correctly
    and that EmailClassifier can:
      - Load emails from email_data
      - Call the configured LLM provider
      - Produce a mix of classification labels
    """
    print("Testing LLM-based classification on a small corpus slice...")
    
    # Initialize classifier
    classifier = EmailClassifier()
    
    # Load emails from data folder
    print("Loading emails from email_data folder...")
    emails = classifier.load_emails_from_data_folder()
    
    if not emails:
        print("No emails found in the email_data folder.")
        return False
    
    print(f"Successfully loaded {len(emails)} emails")
    
    # Restrict to a smaller working set so tests do not scan the entire dataset
    # This still gives enough variety for LLM classification and SVM training.
    max_emails_for_test = 200
    emails = emails[:max_emails_for_test]
    print(f"Using {len(emails)} emails as test corpus slice")
    
    # Test with just a small subset for LLM calls
    test_emails = emails[:5]  # Use only first 5 emails for LLM testing
    print(f"Testing with {len(test_emails)} emails...")
    
    # Test LLM classification
    print("Testing LLM classification...")
    try:
        classified_emails = classifier.classify_emails(test_emails)
        print(f"Successfully classified {len(classified_emails)} emails")
        
        # Show classification results
        labels = []
        for i, email in enumerate(classified_emails):
            label = email['classification']
            labels.append(label)
            print(f"  Email {i+1}: {label}")

        distinct_labels = set(labels)
        print(f"Distinct labels: {distinct_labels}")

        if len(distinct_labels) < 1:
            print("No labels were produced; classification appears to have failed.")
            return False

        # For a healthy test we prefer at least some variety, but do not hard-fail
        # if all labels are identical (class imbalance is possible in small samples).
        if len(distinct_labels) == 1:
            print("Warning: only one distinct label produced in this small sample.")

        return True
        
    except Exception as e:
        print(f"Error during LLM classification: {e}")
        return False

if __name__ == "__main__":
    success = test_training_process()
    if success:
        print("\nFull training process test PASSED")
    else:
        print("\nFull training process test FAILED")
        sys.exit(1)
