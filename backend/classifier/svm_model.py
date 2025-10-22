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
            
            # Try to load label mapping and compatibility mapping
            labels_path = os.path.join(base_dir, "model", "label_mapping.joblib")
            compatibility_path = os.path.join(base_dir, "model", "compatibility_mapping.joblib")
            
            if os.path.exists(labels_path):
                self.label_mapping = joblib.load(labels_path)
                print("Label mapping loaded successfully.")
            else:
                self.label_mapping = None
                
            if os.path.exists(compatibility_path):
                self.compatibility_mapping = joblib.load(compatibility_path)
                print("Compatibility mapping loaded successfully.")
            else:
                self.compatibility_mapping = None
            
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
            if self.label_mapping:
                # Use the trained label mapping (reverse lookup)
                id_to_label = {v: k for k, v in self.label_mapping.items()}
                llm_predictions = [id_to_label.get(p, "important") for p in predictions]
                
                # Apply compatibility mapping if available
                if self.compatibility_mapping:
                    labeled_predictions = [
                        self.compatibility_mapping.get(pred, "Important") 
                        for pred in llm_predictions
                    ]
                else:
                    labeled_predictions = [pred.title() for pred in llm_predictions]
            else:
                # Fallback to original labels for backward compatibility
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

@app.route("/model-metadata", methods=["GET"])
def model_metadata():
    """Expose model label metadata and compatibility mapping for frontend auto-adjustment."""
    try:
        classifier = EmailClassifier()

        label_mapping = classifier.label_mapping or {}
        id_to_label = {v: k for k, v in label_mapping.items()} if label_mapping else {}

        # Determine ordered labels from model if possible
        if hasattr(classifier.model, "classes_"):
            try:
                ordered_labels = [id_to_label.get(int(cls), str(cls)) for cls in classifier.model.classes_]
            except Exception:
                ordered_labels = list(id_to_label.values()) if id_to_label else []
        else:
            ordered_labels = list(id_to_label.values()) if id_to_label else []

        # Fallback to legacy labels if nothing available
        if not ordered_labels:
            ordered_labels = ["Important", "Spam", "Drafts", "Inbox"]

        compatibility_mapping = classifier.compatibility_mapping or {}

        # Derive UI labels from compatibility mapping or title-cased originals
        ui_labels_set = set()
        for lbl in ordered_labels:
            ui_labels_set.add(compatibility_mapping.get(lbl, lbl.title()))
        ui_labels = sorted(ui_labels_set)

        return jsonify({
            "labels": ordered_labels,
            "label_mapping": label_mapping,
            "compatibility_mapping": compatibility_mapping,
            "ui_labels": ui_labels
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

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
