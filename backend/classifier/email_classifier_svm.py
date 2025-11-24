# Imports
import re
import spacy
from bs4 import BeautifulSoup
from sklearn.base import BaseEstimator, TransformerMixin

# Load spaCy model
nlp = spacy.load("en_core_web_sm")

REGEX_PATTERNS = [
    (re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}"), "<EMAIL>"),
    (re.compile(r"https?://\S+"), "<URL>"),
    (re.compile(r"\bord(er)?\s?#?\d+\b", re.I), "<ORDER_ID>"),
    (re.compile(r"\b\d{4}-\d{2}-\d{2}\b"), "<DATE>"),
    (re.compile(r"\b\d{10}\b"), "<PHONE>"),
]

# Function to strip HTML tags
def strip_html(text):
    return BeautifulSoup(text, "html.parser").get_text(" ", strip=True)

def replace_regex(text):
    for pattern, repl in REGEX_PATTERNS:
        text = pattern.sub(repl, text)
    return text

def replace_ner(text):
    doc = nlp(text)
    out = text
    for ent in doc.ents:
        placeholder = f"<{ent.label_}>"
        out = out.replace(ent.text, placeholder)
    return out

def drop_special_chars(text):
    return re.sub(r'[^a-zA-Z0-9\s]', '', text)

def convert_newlines(text):
    return re.sub(r'\n+', ' ', text)

def to_lowercase(text):
    return text.lower()

def preprocess_text(text):
    text = convert_newlines(text)
    text = drop_special_chars(text)
    text = replace_regex(text)
    text = replace_ner(text)
    text = to_lowercase(text)
    return text

# Load json
import json

with open("training_data/training_emails.json", "r", encoding='utf-8') as f:
    emails_data = json.load(f)

# Preprocess emails
processed_emails_data = []

for email in emails_data:
    subject = email.get('subject', '')
    body = email.get('body', '')
    # Concatenate subject and body with a separator for better context
    combined_text = f"{subject}\n\n{body}"

    processed_text = preprocess_text(combined_text)

    # Store the original label and the processed text
    processed_emails_data.append({
        'label': email.get('label'),
        'text': processed_text
    })

texts = []
labels = []

for email_entry in processed_emails_data:
    texts.append(email_entry['text'])
    labels.append(email_entry['label'])

from sklearn.feature_extraction.text import TfidfVectorizer

vectorizer = TfidfVectorizer()
X = vectorizer.fit_transform(texts)

from sklearn.model_selection import train_test_split

X_train, X_test, y_train, y_test = train_test_split(X, labels, test_size=0.2, random_state=42, stratify=labels)

from sklearn.svm import SVC

# Instantiate an SVM classifier with a linear kernel
svm_model = SVC(kernel='linear', class_weight='balanced', random_state=42)

# Train the SVM model on the training data
svm_model.fit(X_train, y_train)

print("SVM model trained successfully.")

def predict_email_label(email_string):
    # Strip HTML from the email string
    stripped_string = strip_html(email_string)

    # Preprocess the input string using the preprocessor
    processed_string = preprocess_text(stripped_string)

    # Vectorize the processed string using the fitted TF-IDF vectorizer
    # The vectorizer expects an iterable (list) of strings
    vectorized_string = vectorizer.transform([processed_string])

    # Predict the label using the trained SVM model
    prediction = svm_model.predict(vectorized_string)

    return prediction[0]

def classify(emails):
    """
    Classify a list of emails into predefined categories.

    Args:
        emails (list): List of email bodies as strings.

    Returns:
        list: Predicted labels for each email.
    """

    # run predict email label for each email in emails
    predictions = [predict_email_label(email) for email in emails]

    return predictions