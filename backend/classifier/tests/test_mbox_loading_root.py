#!/usr/bin/env python3
"""
Test script to verify that train_model.py can read .mbox files
"""

import sys
import os
from pathlib import Path

# Add the current directory to Python path
sys.path.append('.')

from train_model import EmailClassifier

def test_mbox_loading():
    """Test if the EmailClassifier can load emails from .mbox files"""
    print("Testing .mbox file loading...")
    
    # Initialize classifier
    classifier = EmailClassifier()
    
    # Load emails from data folder
    print("Loading emails from email_data folder...")
    emails = classifier.load_emails_from_data_folder()
    
    if not emails:
        print("❌ No emails found in the email_data folder.")
        return False
    
    print(f"✅ Successfully loaded {len(emails)} emails")
    
    # Show sample of loaded emails
    print("\nSample of loaded emails:")
    for i, email in enumerate(emails[:3]):  # Show first 3 emails
        print(f"\nEmail {i+1}:")
        print(f"  Subject: {email.get('subject', 'N/A')[:50]}...")
        print(f"  Sender: {email.get('sender', 'N/A')[:30]}...")
        print(f"  Body length: {len(email.get('body', ''))} characters")
        print(f"  Source: {email.get('source', 'N/A')}")
    
    return True

if __name__ == "__main__":
    success = test_mbox_loading()
    if success:
        print("\n✅ .mbox file loading test PASSED")
    else:
        print("\n❌ .mbox file loading test FAILED")
        sys.exit(1)
