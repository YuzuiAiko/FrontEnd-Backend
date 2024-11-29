import joblib
from sklearn.feature_extraction.text import TfidfVectorizer

class EmailClassifier:
    def __init__(self):
        # Load pre-trained SVM model and vectorizer
        self.model = joblib.load('classifier/model/svm_model.joblib')
        self.vectorizer = joblib.load('classifier/model/vectorizer.joblib')

    def classify(self, emails):
        # Transform emails using the vectorizer
        email_tfidf = self.vectorizer.transform(emails)
        # Predict categories
        predictions = self.model.predict(email_tfidf)
        return predictions.tolist()

# Example usage (remove this part in production)
if __name__ == "__main__":
    classifier = EmailClassifier()
    test_emails = ["Sample email content for classification"]
    print(classifier.classify(test_emails))
