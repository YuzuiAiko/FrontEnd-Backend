import joblib
from flask import Flask, request, jsonify
from flask_cors import CORS
from sklearn.feature_extraction.text import TfidfVectorizer
import os
from bs4 import BeautifulSoup
import re

class EmailClassifier:
    def __init__(self):
        print("Loading model and vectorizer...")
        try:
            model_path = 'C:/Users/CHRISTIAN/OneDrive/Desktop/Website_log/backend/classifier/model/svm_model.joblib'
            vectorizer_path = 'C:/Users/CHRISTIAN/OneDrive/Desktop/Website_log/backend/classifier/model/vectorizer.joblib'
            
            print(f"Current working directory: {os.getcwd()}")  # Debugging line
            if not os.path.exists(model_path):
                print(f"Model file not found: {model_path}")
            if not os.path.exists(vectorizer_path):
                print(f"Vectorizer file not found: {vectorizer_path}")
                
            self.model = joblib.load(model_path)
            self.vectorizer = joblib.load(vectorizer_path)
            print("Model and vectorizer loaded successfully.")
        except Exception as e:
            print(f"Error loading model or vectorizer: {e}")

    def classify(self, emails):
        print("Classifying emails...")
        try:
            # Extract plain text from emails
            email_texts = [self.extract_text(email) for email in emails]
            email_tfidf = self.vectorizer.transform(email_texts)
            predictions = self.model.predict(email_tfidf)
            
            # Map numeric predictions to labels
            labels = ["Important", "Spam", "Inbox"]
            labeled_predictions = [labels[p] for p in predictions]

            print(f"Labeled Predictions: {labeled_predictions}")
            return labeled_predictions
        except Exception as e:
            print(f"Error during classification: {e}")
            return []

    def extract_text(self, email_body):
        # Function to remove HTML tags, CSS, JavaScript, and extract plain text
        soup = BeautifulSoup(email_body, 'html.parser')
        for script in soup(["script", "style"]):
            script.decompose()  # Remove all JavaScript and CSS
        
        # Remove all remaining HTML tags
        text = soup.get_text(separator=' ').strip()
        # Remove any remaining non-text elements
        text = re.sub(r'\s+', ' ', text)  # Remove extra whitespaces
        text = re.sub(r'[^\w\s]', '', text)  # Remove special characters
        return text.strip()

app = Flask(__name__)
CORS(app)

@app.route("/classify", methods=["POST"])
def classify_emails():
    try:
        data = request.json
        print("Received data:", data)
        emails = data.get("emails", [])
        print("Emails to classify:", emails)
        classifier = EmailClassifier()
        predictions = classifier.classify(emails)
        print("Predictions:", predictions)
        return jsonify({"predictions": predictions})
    except Exception as e:
        print("Error in /classify route:", e)
        return str(e), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001)
