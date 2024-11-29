import os
import firebase_admin
from firebase_admin import credentials, storage
import joblib

# Initialize Firebase Admin SDK
cred = credentials.Certificate("serviceAccountKey.json")
firebase_admin.initialize_app(cred, {
    'storageBucket': 'sifrimail-classifier.appspot.com'
})

# Path to the model you want to upload
model_path = "classifier/model/svm_model.joblib"
vectorizer_path = "classifier/model/vectorizer.joblib"

bucket = storage.bucket()
blob_model = bucket.blob("models/svm_model.joblib")
blob_model.upload_from_filename(model_path)

blob_vectorizer = bucket.blob("models/vectorizer.joblib")
blob_vectorizer.upload_from_filename(vectorizer_path)

print("Model and vectorizer uploaded successfully.")
