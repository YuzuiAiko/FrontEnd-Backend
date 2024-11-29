import os
import joblib
from sklearn.svm import SVC
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.model_selection import train_test_split
from sklearn.datasets import fetch_20newsgroups

# Load your dataset here
data = fetch_20newsgroups(subset='train', categories=['sci.space', 'comp.graphics'])
emails = data.data
labels = data.target

# Vectorize the emails
vectorizer = TfidfVectorizer()
X = vectorizer.fit_transform(emails)

# Train the SVM model
X_train, X_test, y_train, y_test = train_test_split(X, labels, test_size=0.2, random_state=42)
svm_classifier = SVC(kernel='linear')
svm_classifier.fit(X_train, y_train)

# Evaluate the model (optional)
accuracy = svm_classifier.score(X_test, y_test)
print(f"Model Accuracy: {accuracy * 100:.2f}%")

# Ensure the 'model' directory exists
model_dir = "classifier/model"
if not os.path.exists(model_dir):
    os.makedirs(model_dir)

# Save the trained model and vectorizer
joblib.dump(svm_classifier, os.path.join(model_dir, "svm_model.joblib"))
joblib.dump(vectorizer, os.path.join(model_dir, "vectorizer.joblib"))

print("Model and vectorizer saved successfully.")