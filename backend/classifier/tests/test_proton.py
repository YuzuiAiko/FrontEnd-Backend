#!/usr/bin/env python3
"""Test script to verify Proton Mail EML processing"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from train_model import EmailClassifier

# Initialize classifier
classifier = EmailClassifier()

# Load emails
print("Loading emails...")
emails = classifier.load_emails_from_data_folder()

print(f"\nLoaded {len(emails)} emails total")

# Find Proton Mail emails
proton_emails = [e for e in emails if 'luisanton.pi@protonmail.com' in e.get('source', '')]
print(f"Proton Mail emails: {len(proton_emails)}")

# Check if metadata is being loaded
if proton_emails:
    sample = proton_emails[0]
    print(f"\nSample Proton email:")
    print(f"  Subject: {sample.get('subject', 'N/A')[:50]}...")
    print(f"  Has metadata: {'metadata' in sample}")
    if 'metadata' in sample:
        print(f"  Metadata keys: {list(sample['metadata'].keys())}")
        print(f"  Label IDs: {sample['metadata'].get('label_ids', [])}")
        print(f"  Unread: {sample['metadata'].get('unread', 0)}")

