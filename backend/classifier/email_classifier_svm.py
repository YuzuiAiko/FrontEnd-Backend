# Imports
import json
import re
import spacy
from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.pipeline import Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.svm import SVC
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report
from sklearn.metrics import confusion_matrix
from bs4 import BeautifulSoup

# Load spaCy model
nlp = spacy.load("en_core_web_sm")

# Patterns
URL_PATTERN = r"https?://\S+"
EMAIL_PATTERN = r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}"
DATE_PATTERN = r"\b\d{4}-\d{2}-\d{2}\b"
PHONE_PATTERN = r"\b\d{10}\b"
NUM_PATTERN = r"\b\d+\b"

# Function to strip html with bs4
def strip_html(text):
  soup = BeautifulSoup(text, "html.parser")
  return soup.get_text(" ", strip=True)

def preprocess(text):
  # 1. Lowercase
  text = text.lower()

  # 2. Replace patterns
  text = re.sub(URL_PATTERN, " URL ", text)
  text = re.sub(EMAIL_PATTERN, " EMAIL ", text)
  text = re.sub(DATE_PATTERN, " DATE ", text)
  text = re.sub(PHONE_PATTERN, " PHONE ", text)
  text = re.sub(NUM_PATTERN, " NUM ", text)

  # 3. Run spaCy pipeline (tokenization, POS, NER)
  doc = nlp(text)

  tokens = []
  for token in doc:
    # NER replacement
    if token.ent_type_:
        tokens.append(token.ent_type_)
        continue

    # Remove punctuation & stopwords
    if token.is_punct or token.is_space or token.is_stop:
        continue

    # Lemmatize
    lemma = token.lemma_.strip()

    # Final filtering
    if len(lemma) < 2:
        continue
    if not lemma.isalpha():
        continue

    tokens.append(lemma)

  return " ".join(tokens)

vectorizer = TfidfVectorizer(
    preprocessor=preprocess,
    tokenizer=lambda x: x.split(),   # use cleaned tokens
    # ngram_range=(1, 2),
    # max_features=50000
)

# Load json
import json

texts = []
labels = []

# Open json
with open(r"training_data\training_emails.json", "r", encoding="utf-8") as f:
    emails = json.load(f)

for email in emails:
    subject = email.get('subject', '')
    body = email.get('body', '')
    # Concatenate subject and body with a separator for better context
    combined_text = f"{subject}\n\n{body}"

    texts.append(combined_text)
    labels.append(email.get('label', ''))

X_train, X_test, y_train, y_test = train_test_split(texts, labels, test_size=0.2, random_state=42, stratify=labels)

from sklearn.svm import SVC

model = Pipeline([
    ('tfidf', vectorizer),
    ('svm', SVC(kernel='rbf'))
])

model.fit(X_train, y_train)

print("SVM model trained successfully.")

def predict_email_label(email_string):
    # Strip HTML from the email string
    stripped_string = strip_html(email_string)

    # Preprocess the input string using the preprocessor
    # processed_string = preprocess(stripped_string)

    # Vectorize the processed string using the fitted TF-IDF vectorizer
    # The vectorizer expects an iterable (list) of strings
    # vectorized_string = vectorizer.transform([processed_string])

    # Predict the label using the trained SVM model
    # prediction = svm_model.predict(vectorized_string)

    prediction = model.predict([stripped_string])

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

if __name__ == "__main__":
    # Evaluate model
    y_pred = model.predict(X_test)

    print("Classification Report:")
    print(classification_report(y_test, y_pred))

    print("Confusion Matrix:")
    print(confusion_matrix(y_test, y_pred))