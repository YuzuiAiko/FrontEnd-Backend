import joblib  # For loading the pre-trained model and vectorizer
from flask import Flask, request, jsonify  # For building the Flask API
from flask_cors import CORS  # For handling Cross-Origin Resource Sharing
from sklearn.feature_extraction.text import TfidfVectorizer  # For vectorizing email content
import os  # For working with file paths
from bs4 import BeautifulSoup  # For parsing and cleaning HTML content
import re  # For regular expressions to clean text

class EmailClassifier:
    def __init__(self):
        """Initialize the email classifier by loading the pre-trained model and vectorizer."""
        print("Loading model and vectorizer...")
        try:
            # Paths to the pre-trained model and vectorizer
            # Dynamically determine the directory of the current script
            base_dir = os.path.dirname(os.path.abspath(__file__))

            # Construct paths relative to the script's location
            model_path = os.path.join(base_dir, "model", "svm_model.joblib")
            vectorizer_path = os.path.join(base_dir, "model", "vectorizer.joblib")

            # Debugging information to verify the current working directory
            print(f"Current working directory: {os.getcwd()}")
            if not os.path.exists(model_path):
                print(f"Model file not found: {model_path}")  # Log if model file is missing
            if not os.path.exists(vectorizer_path):
                print(f"Vectorizer file not found: {vectorizer_path}")  # Log if vectorizer file is missing

            # Load the model and vectorizer
            self.model = joblib.load(model_path)
            self.vectorizer = joblib.load(vectorizer_path)
            print("Model and vectorizer loaded successfully.")
        except Exception as e:
            print(f"Error loading model or vectorizer: {e}")  # Log any errors encountered during loading

    def classify(self, emails):
        """
        Classify a list of emails into predefined categories.

        Args:
            emails (list): List of email bodies as strings.

        Returns:
            list: Predicted labels for each email.
        """
        print("Classifying emails...")
        try:
            # Extract plain text from email bodies
            email_texts = [self.extract_text(email) for email in emails]
            email_tfidf = self.vectorizer.transform(email_texts)  # Vectorize the cleaned email text
            predictions = self.model.predict(email_tfidf)  # Predict email categories

            # Map numeric predictions to corresponding labels
            labels = ["Important", "Spam", "Drafts", "Inbox"]
            labeled_predictions = [labels[p] for p in predictions]

            print(f"Labeled Predictions: {labeled_predictions}")  # Log the predictions
            return labeled_predictions
        except Exception as e:
            print(f"Error during classification: {e}")  # Log any errors during classification
            return []

    def extract_text(self, email_body):
        """
        Clean and extract plain text from email content, removing HTML, CSS, and JavaScript.

        Args:
            email_body (str): The HTML content of the email.

        Returns:
            str: Cleaned plain text version of the email.
        """
        soup = BeautifulSoup(email_body, 'html.parser')  # Parse HTML content
        for script in soup(["script", "style"]):
            script.decompose()  # Remove JavaScript and CSS tags

        # Extract plain text and remove extra whitespaces or special characters
        text = soup.get_text(separator=' ').strip()
        text = re.sub(r'\s+', ' ', text)  # Normalize spaces
        text = re.sub(r'[^\w\s]', '', text)  # Remove special characters
        return text.strip()

# Initialize the Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS to allow requests from other origins

@app.route("/", methods=["GET"])
def home():
    """
    Root endpoint for the classifier API.
    Provides basic information about the API.
    """
    return jsonify({"message": "Email Classifier API is running", "status": "ok"}), 200

@app.route('/favicon.ico')
def favicon():
    return '', 204

@app.route("/classify", methods=["POST"])
def classify_emails():
    """
    Endpoint to classify emails. Accepts a JSON payload containing email bodies.

    Request JSON Format:
        {
            "emails": ["email1 body", "email2 body", ...]
        }

    Response JSON Format:
        {
            "predictions": ["label1", "label2", ...]
        }
    """
    try:
        data = request.json  # Parse the incoming JSON data
        print("Received data:", data)  # Log received data
        emails = data.get("emails", [])  # Extract emails from the payload
        print("Emails to classify:", emails)

        classifier = EmailClassifier()  # Instantiate the classifier
        predictions = classifier.classify(emails)  # Classify the emails
        print("Predictions:", predictions)  # Log the predictions

        return jsonify({"predictions": predictions})  # Return predictions as JSON
    except Exception as e:
        print("Error in /classify route:", e)  # Log any errors in the endpoint
        return str(e), 500  # Respond with error and 500 status code

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001)  # Run the Flask app on port 5001
