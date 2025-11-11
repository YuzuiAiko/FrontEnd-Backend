import os
import json
import csv
import email
import mailbox
from pathlib import Path
from typing import List, Dict, Any
from openai import OpenAI
from dotenv import load_dotenv
import re
from bs4 import BeautifulSoup
import joblib
from sklearn.svm import SVC
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
import numpy as np

# Load environment variables
load_dotenv()

class EmailClassifier:
    """LLM-based email classifier that supports multiple email export formats.
    
    This classifier can process emails from various sources:
    - Outlook exports (CSV format)
    - Gmail Takeout (MBOX format)
    - Proton Mail Export Tool (EML format with metadata JSON files)
    - Standard EML files
    - Generic JSON email format
    
    The classifier uses OpenAI's LLM to classify emails, then trains an SVM model
    on the LLM classifications for fast inference.
    """
    def __init__(self):
        """Initialize the LLM-based email classifier."""
        self.client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        self.categories = os.getenv('CLASSIFICATION_CATEGORIES', 'important,spam,newsletter,social,promotional,personal,business,automated').split(',')
        
    def load_emails_from_data_folder(self, data_folder: str = "email_data") -> List[Dict[str, Any]]:
        """Load emails from various formats in the email_data folder.
        
        Supported formats:
        - CSV files: Outlook email exports
        - EML files: Individual email files (standard format or Proton Mail Export Tool format)
        - MBOX files: Gmail Takeout exports
        - JSON files: Generic JSON email format
        
        For Proton Mail exports:
        - Place exported folders in the email_data directory
        - Structure: email_data/{email_address}/mail_{timestamp}/*.eml
        - The function automatically processes nested directories recursively
        - Automatically reads .metadata.json files for additional metadata when available
        
        All file types are processed recursively from subdirectories.
        """
        emails = []
        data_path = Path(data_folder)
        
        if not data_path.exists():
            print(f"Email data folder '{data_folder}' not found. Please add your email exports there.")
            return emails
            
        # Process CSV files (Outlook exports)
        for csv_file in data_path.glob("**/*.csv"):
            print(f"Processing CSV file: {csv_file}")
            emails.extend(self._process_csv_emails(csv_file))
            
        # Process EML files (individual email files, including Proton Mail Export Tool format)
        # This processes files recursively, so nested structures like Proton Mail exports are supported
        for eml_file in data_path.glob("**/*.eml"):
            print(f"Processing EML file: {eml_file}")
            emails.extend(self._process_eml_emails(eml_file))
            
        # Process MBOX files (Gmail Takeout)
        for mbox_file in data_path.glob("**/*.mbox"):
            print(f"Processing MBOX file: {mbox_file}")
            emails.extend(self._process_mbox_emails(mbox_file))
            
        # Process JSON files (but skip .metadata.json files as they're handled by _process_eml_emails)
        for json_file in data_path.glob("**/*.json"):
            if json_file.name.endswith('.metadata.json'):
                continue  # Skip Proton Mail metadata files as they're processed with EML files
            print(f"Processing JSON file: {json_file}")
            emails.extend(self._process_json_emails(json_file))
            
        return emails
    
    def _process_csv_emails(self, csv_file: Path) -> List[Dict[str, Any]]:
        """Process CSV email exports from Outlook."""
        emails = []
        try:
            with open(csv_file, 'r', encoding='utf-8-sig') as f:  # Use utf-8-sig to handle BOM
                reader = csv.DictReader(f)
                for row in reader:
                    # Outlook CSV columns based on actual file structure
                    subject = row.get('Subject', '').strip()
                    body = row.get('Body', '').strip()
                    
                    # Handle From field - use Address if available, otherwise Name
                    from_name = row.get('From: (Name)', '').strip()
                    from_address = row.get('From: (Address)', '').strip()
                    sender = from_address if from_address else from_name
                    
                    # Handle To field similarly
                    to_name = row.get('To: (Name)', '').strip()
                    to_address = row.get('To: (Address)', '').strip()
                    recipient = to_address if to_address else to_name
                    
                    # Additional metadata from Outlook CSV
                    categories = row.get('Categories', '').strip()
                    importance = row.get('Importance', '').strip()
                    sensitivity = row.get('Sensitivity', '').strip()
                    
                    # Only process emails with content
                    if body.strip():
                        emails.append({
                            'subject': subject,
                            'body': self._clean_email_content(body),
                            'sender': sender,
                            'recipient': recipient,
                            'categories': categories,
                            'importance': importance,
                            'sensitivity': sensitivity,
                            'source': str(csv_file)
                        })
                        
            print(f"Processed {len(emails)} emails from {csv_file}")
                        
        except Exception as e:
            print(f"Error processing CSV file {csv_file}: {e}")
        return emails
    
    def _process_eml_emails(self, eml_file: Path) -> List[Dict[str, Any]]:
        """Process individual EML email files.
        
        Supports:
        - Standard EML files
        - Proton Mail Export Tool format (EML files with corresponding .metadata.json files)
        
        For Proton Mail exports, the function automatically looks for a matching
        .metadata.json file to extract additional metadata like labels and flags.
        """
        emails = []
        try:
            # Open EML file in binary mode for better compatibility
            with open(eml_file, 'rb') as f:
                msg = email.message_from_bytes(f.read())
            
            subject = msg.get('Subject', '')
            sender = msg.get('From', '')
            date = msg.get('Date', '')
            
            # Extract body content
            body = self._extract_email_body(msg)
            
            if not body.strip():
                return emails  # Skip emails without body content
            
            # Try to load Proton Mail metadata if available
            # Proton Mail Export Tool creates .metadata.json files alongside .eml files
            metadata = {}
            metadata_file = eml_file.with_suffix('.metadata.json')
            if metadata_file.exists():
                try:
                    with open(metadata_file, 'r', encoding='utf-8') as mf:
                        metadata_data = json.load(mf)
                        
                        # Extract useful metadata from Proton Mail format
                        payload = metadata_data.get('Payload', {})
                        
                        # Use metadata subject/sender if EML doesn't have them
                        if not subject and payload.get('Subject'):
                            subject = payload['Subject']
                        if not sender:
                            sender_info = payload.get('Sender', {})
                            if sender_info:
                                name = sender_info.get('Name', '')
                                address = sender_info.get('Address', '')
                                sender = f"{name} <{address}>" if name else address
                        
                        # Extract additional metadata
                        metadata['label_ids'] = payload.get('LabelIDs', [])
                        metadata['external_id'] = payload.get('ExternalID', '')
                        metadata['unread'] = payload.get('Unread', 0)
                        metadata['is_replied'] = payload.get('IsReplied', 0)
                        metadata['is_forwarded'] = payload.get('IsForwarded', 0)
                        metadata['num_attachments'] = payload.get('NumAttachments', 0)
                        
                        # Extract recipient information
                        to_list = payload.get('ToList', [])
                        if to_list:
                            recipients = [item.get('Address', '') for item in to_list if item.get('Address')]
                            metadata['recipients'] = ', '.join(recipients)
                except Exception as e:
                    # If metadata parsing fails, continue without it
                    pass
            
            email_data = {
                'subject': subject,
                'body': self._clean_email_content(body),
                'sender': sender,
                'date': date,
                'source': str(eml_file)
            }
            
            # Add metadata if available
            if metadata:
                email_data['metadata'] = metadata
                if metadata.get('recipients'):
                    email_data['recipient'] = metadata['recipients']
            
            emails.append(email_data)
            
        except Exception as e:
            print(f"Error processing EML file {eml_file}: {e}")
        return emails
    
    def _process_mbox_emails(self, mbox_file: Path) -> List[Dict[str, Any]]:
        """Process MBOX files (Gmail Takeout format)."""
        emails = []
        try:
            mbox = mailbox.mbox(str(mbox_file))
            for msg in mbox:
                subject = msg.get('Subject', '')
                sender = msg.get('From', '')
                date = msg.get('Date', '')
                
                body = self._extract_email_body(msg)
                
                if body.strip():
                    emails.append({
                        'subject': subject,
                        'body': self._clean_email_content(body),
                        'sender': sender,
                        'date': date,
                        'source': str(mbox_file)
                    })
        except Exception as e:
            print(f"Error processing MBOX file {mbox_file}: {e}")
        return emails
    
    def _process_json_emails(self, json_file: Path) -> List[Dict[str, Any]]:
        """Process JSON email files."""
        emails = []
        try:
            with open(json_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                
                # Handle both single objects and arrays
                if isinstance(data, dict):
                    data = [data]
                    
                for item in data:
                    subject = item.get('subject', '')
                    body = item.get('body', '') or item.get('content', '')
                    sender = item.get('sender', '') or item.get('from', '')
                    date = item.get('date', '') or item.get('timestamp', '')
                    
                    if body.strip():
                        emails.append({
                            'subject': subject,
                            'body': self._clean_email_content(body),
                            'sender': sender,
                            'date': date,
                            'source': str(json_file)
                        })
        except Exception as e:
            print(f"Error processing JSON file {json_file}: {e}")
        return emails
    
    def _extract_email_body(self, msg) -> str:
        """Extract plain text body from email message."""
        body = ""
        
        if msg.is_multipart():
            for part in msg.walk():
                content_type = part.get_content_type()
                if content_type == "text/plain":
                    body = part.get_payload(decode=True).decode('utf-8', errors='ignore')
                    break
                elif content_type == "text/html" and not body:
                    html_body = part.get_payload(decode=True).decode('utf-8', errors='ignore')
                    body = BeautifulSoup(html_body, 'html.parser').get_text()
        else:
            content_type = msg.get_content_type()
            if content_type == "text/plain":
                body = msg.get_payload(decode=True).decode('utf-8', errors='ignore')
            elif content_type == "text/html":
                html_body = msg.get_payload(decode=True).decode('utf-8', errors='ignore')
                body = BeautifulSoup(html_body, 'html.parser').get_text()
        
        return body
    
    def _clean_email_content(self, content: str) -> str:
        """Clean and normalize email content."""
        # Remove HTML tags
        soup = BeautifulSoup(content, 'html.parser')
        text = soup.get_text(separator=' ')
        
        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', text)
        
        # Remove common email headers/footers
        text = re.sub(r'From:.*?\n', '', text, flags=re.IGNORECASE)
        text = re.sub(r'To:.*?\n', '', text, flags=re.IGNORECASE)
        text = re.sub(r'Subject:.*?\n', '', text, flags=re.IGNORECASE)
        text = re.sub(r'Sent:.*?\n', '', text, flags=re.IGNORECASE)
        
        return text.strip()
    
    def classify_email_with_llm(self, email_data: Dict[str, Any]) -> str:
        """Classify a single email using OpenAI LLM."""
        try:
            # Build enhanced prompt with Outlook metadata
            metadata_info = ""
            if email_data.get('categories'):
                metadata_info += f"\nCategories: {email_data['categories']}"
            if email_data.get('importance'):
                metadata_info += f"\nImportance: {email_data['importance']}"
            if email_data.get('sensitivity'):
                metadata_info += f"\nSensitivity: {email_data['sensitivity']}"
            
            prompt = f"""
            Analyze this email and classify it into ONE of these categories: {', '.join(self.categories)}
            
            Email Subject: {email_data['subject']}
            Email Sender: {email_data['sender']}
            Email Recipient: {email_data.get('recipient', 'N/A')}{metadata_info}
            Email Content: {email_data['body'][:2000]}...
            
            Consider the content, sender, recipient, metadata, and context to determine the most appropriate category.
            Respond with ONLY the category name, no explanation.
            """
            
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are an email classification expert. Classify emails into the most appropriate category."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=50,
                temperature=0.1
            )
            
            classification = response.choices[0].message.content.strip().lower()
            
            # Validate classification is in our categories
            if classification not in self.categories:
                # Find closest match
                for category in self.categories:
                    if category in classification or classification in category:
                        return category
                return "important"  # Default fallback
            
            return classification
            
        except Exception as e:
            print(f"Error classifying email: {e}")
            return "important"  # Default fallback
    
    def classify_emails(self, emails: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Classify a list of emails using LLM."""
        classified_emails = []
        
        print(f"Classifying {len(emails)} emails...")
        
        for i, email_data in enumerate(emails):
            print(f"Processing email {i+1}/{len(emails)}: {email_data['subject'][:50]}...")
            
            classification = self.classify_email_with_llm(email_data)
            
            classified_emails.append({
                **email_data,
                'classification': classification
            })
            
        return classified_emails
    
    def save_classified_emails(self, classified_emails: List[Dict[str, Any]], output_file: str = "classified_emails.json"):
        """Save classified emails to a JSON file."""
        try:
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(classified_emails, f, indent=2, ensure_ascii=False)
            print(f"Classified emails saved to {output_file}")
        except Exception as e:
            print(f"Error saving classified emails: {e}")
    
    def generate_classification_report(self, classified_emails: List[Dict[str, Any]]):
        """Generate a summary report of email classifications."""
        category_counts = {}
        
        for email_data in classified_emails:
            category = email_data['classification']
            category_counts[category] = category_counts.get(category, 0) + 1
        
        print("\n" + "="*50)
        print("EMAIL CLASSIFICATION REPORT")
        print("="*50)
        
        total_emails = len(classified_emails)
        for category, count in sorted(category_counts.items()):
            percentage = (count / total_emails) * 100
            print(f"{category.capitalize()}: {count} emails ({percentage:.1f}%)")
        
        print(f"\nTotal emails processed: {total_emails}")
    
    def train_svm_model_from_llm_data(self, classified_emails: List[Dict[str, Any]]) -> tuple:
        """Train an SVM model using LLM classifications as training data."""
        print("\nTraining SVM model from LLM classifications...")
        
        # Prepare training data
        email_texts = []
        labels = []
        
        for email_data in classified_emails:
            # Combine subject and body for better classification
            combined_text = f"{email_data['subject']} {email_data['body']}"
            email_texts.append(combined_text)
            labels.append(email_data['classification'])
        
        # Create label mapping for SVM compatibility
        unique_labels = list(set(labels))
        label_to_id = {label: idx for idx, label in enumerate(unique_labels)}
        id_to_label = {idx: label for label, idx in label_to_id.items()}
        
        # Convert labels to numeric
        numeric_labels = [label_to_id[label] for label in labels]
        
        # Vectorize text data
        vectorizer = TfidfVectorizer(
            max_features=10000,
            stop_words='english',
            ngram_range=(1, 2),
            min_df=2,
            max_df=0.95
        )
        
        X = vectorizer.fit_transform(email_texts)
        y = np.array(numeric_labels)
        
        # Split data for validation
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        
        # Train SVM model
        svm_model = SVC(
            kernel='linear',
            C=1.0,
            random_state=42,
            probability=True
        )
        
        svm_model.fit(X_train, y_train)
        
        # Evaluate model
        y_pred = svm_model.predict(X_test)
        accuracy = accuracy_score(y_test, y_pred)
        
        print(f"SVM Model Accuracy: {accuracy * 100:.2f}%")
        
        # Print classification report
        target_names = [id_to_label[i] for i in range(len(unique_labels))]
        print("\nClassification Report:")
        print(classification_report(y_test, y_pred, target_names=target_names))
        
        return svm_model, vectorizer, id_to_label
    
    def save_trained_model(self, svm_model, vectorizer, label_mapping, output_dir: str = "model"):
        """Save the trained SVM model and vectorizer as joblib files."""
        try:
            # Ensure output directory exists
            os.makedirs(output_dir, exist_ok=True)
            
            # Save model and vectorizer
            model_path = os.path.join(output_dir, "svm_model.joblib")
            vectorizer_path = os.path.join(output_dir, "vectorizer.joblib")
            labels_path = os.path.join(output_dir, "label_mapping.joblib")
            
            joblib.dump(svm_model, model_path)
            joblib.dump(vectorizer, vectorizer_path)
            joblib.dump(label_mapping, labels_path)
            
            print(f"\nModel saved successfully:")
            print(f"  - SVM Model: {model_path}")
            print(f"  - Vectorizer: {vectorizer_path}")
            print(f"  - Label Mapping: {labels_path}")
            
        except Exception as e:
            print(f"Error saving model: {e}")
    
    def create_model_compatibility_layer(self, classified_emails: List[Dict[str, Any]]):
        """Create a compatibility layer that matches the original svm_model.py structure."""
        print("\nCreating model compatibility layer...")
        
        # Train SVM model from LLM data
        svm_model, vectorizer, label_mapping = self.train_svm_model_from_llm_data(classified_emails)
        
        # Save the trained model
        self.save_trained_model(svm_model, vectorizer, label_mapping)
        
        # Create a mapping that matches the original expected labels
        # Original labels: ["Important", "Spam", "Drafts", "Inbox"]
        original_labels = ["Important", "Spam", "Drafts", "Inbox"]
        
        # Create mapping from our categories to original labels
        compatibility_mapping = {}
        for llm_category in self.categories:
            if llm_category == "important":
                compatibility_mapping[llm_category] = "Important"
            elif llm_category == "spam":
                compatibility_mapping[llm_category] = "Spam"
            elif llm_category in ["newsletter", "promotional", "automated"]:
                compatibility_mapping[llm_category] = "Spam"
            elif llm_category in ["personal", "social"]:
                compatibility_mapping[llm_category] = "Inbox"
            elif llm_category == "business":
                compatibility_mapping[llm_category] = "Important"
            else:
                compatibility_mapping[llm_category] = "Inbox"
        
        # Save compatibility mapping
        compatibility_path = os.path.join("model", "compatibility_mapping.joblib")
        joblib.dump(compatibility_mapping, compatibility_path)
        
        print(f"Compatibility mapping saved: {compatibility_path}")
        print("Model is now compatible with existing svm_model.py")
        
        return svm_model, vectorizer, label_mapping

def main():
    """Main function to run the email classification and model training.
    
    This function:
    1. Loads emails from the email_data folder (supports CSV, EML, MBOX, JSON formats)
    2. Classifies emails using OpenAI LLM
    3. Trains an SVM model on the LLM classifications
    4. Saves the trained model as joblib files for use with svm_model.py
    
    Supported email export formats:
    - Outlook: CSV files
    - Gmail Takeout: MBOX files
    - Proton Mail Export Tool: EML files with .metadata.json files (nested in folders)
    - Standard: EML files, JSON files
    """
    print("Starting LLM-based Email Classification and Model Training...")
    
    # Check if OpenAI API key is available
    if not os.getenv('OPENAI_API_KEY'):
        print("ERROR: OpenAI API key not found!")
        print("Please set your OPENAI_API_KEY in the .env file or environment variables.")
        return
    
    # Initialize classifier
    classifier = EmailClassifier()
    
    # Load emails from data folder
    emails = classifier.load_emails_from_data_folder()
    
    if not emails:
        print("No emails found in the email_data folder.")
        print("Please add your email exports (CSV, EML, MBOX, or JSON files) to the email_data folder.")
        print("For Proton Mail exports, place the exported folders in email_data directory.")
        return
    
    print(f"Found {len(emails)} emails to classify.")
    
    # Classify emails using LLM
    classified_emails = classifier.classify_emails(emails)
    
    # Save LLM classification results
    classifier.save_classified_emails(classified_emails)
    
    # Generate classification report
    classifier.generate_classification_report(classified_emails)
    
    # Train SVM model from LLM classifications
    classifier.create_model_compatibility_layer(classified_emails)
    
    print("\n" + "="*60)
    print("TRAINING COMPLETED SUCCESSFULLY!")
    print("="*60)
    print("✓ Emails classified using LLM")
    print("✓ SVM model trained from LLM data")
    print("✓ Model saved as joblib files")
    print("✓ Compatible with existing svm_model.py")
    print("\nYou can now use the trained model with svm_model.py for fast inference!")

if __name__ == "__main__":
    main()