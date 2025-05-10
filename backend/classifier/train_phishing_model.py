import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.model_selection import train_test_split
from sklearn.svm import SVC
from sklearn.metrics import classification_report
import joblib
import os
import argparse  # For parsing command-line arguments
from kaggle.api.kaggle_api_extended import KaggleApi  # For downloading Kaggle datasets

# Load the dataset
def load_dataset(file_path):
    print("Loading dataset...")
    data = pd.read_csv(file_path)
    print("Dataset loaded successfully.")
    return data

# Train the phishing classifier
def train_phishing_classifier(data):
    print("Preprocessing data...")
    X = data['EmailText']  # Assuming the email content is in the 'EmailText' column
    y = data['Label']      # Assuming the labels are in the 'Label' column

    # Convert text data to TF-IDF features
    vectorizer = TfidfVectorizer(stop_words='english', max_features=5000)
    X_tfidf = vectorizer.fit_transform(X)

    # Split the data into training and testing sets
    X_train, X_test, y_train, y_test = train_test_split(X_tfidf, y, test_size=0.2, random_state=42)

    print("Training the SVM model...")
    model = SVC(kernel='linear', probability=True)
    model.fit(X_train, y_train)

    print("Evaluating the model...")
    y_pred = model.predict(X_test)
    print(classification_report(y_test, y_pred))

    return model, vectorizer

# Save the model and vectorizer
def save_model_and_vectorizer(model, vectorizer, output_dir):
    print("Saving model and vectorizer...")
    os.makedirs(output_dir, exist_ok=True)
    model_path = os.path.join(output_dir, 'phishing_model.joblib')
    vectorizer_path = os.path.join(output_dir, 'phishing_vectorizer.joblib')

    joblib.dump(model, model_path)
    joblib.dump(vectorizer, vectorizer_path)
    print(f"Model saved to {model_path}")
    print(f"Vectorizer saved to {vectorizer_path}")

# Update the main function to accept command-line arguments
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train a phishing email classifier.")
    parser.add_argument("--dataset_path", type=str, help="Path to the phishing email dataset CSV file.")
    parser.add_argument("--source", type=str, choices=["local", "kaggle"], default="local", help="Source of the dataset: 'local' or 'kaggle'.")
    parser.add_argument("--kaggle_dataset", type=str, help="Kaggle dataset identifier (e.g., 'naserabdullahalam/phishing-email-dataset').", required=False)

    args = parser.parse_args()

    if args.source == "kaggle":
        if not args.kaggle_dataset:
            raise ValueError("When using Kaggle as the source, you must provide the --kaggle_dataset argument.")

        print("Downloading dataset from Kaggle...")
        api = KaggleApi()
        api.authenticate()

        # Download the dataset
        dataset_dir = "kaggle_dataset"
        api.dataset_download_files(args.kaggle_dataset, path=dataset_dir, unzip=True)

        # Assume the dataset CSV is the first file in the directory
        dataset_files = [f for f in os.listdir(dataset_dir) if f.endswith(".csv")]
        if not dataset_files:
            raise FileNotFoundError("No CSV file found in the downloaded Kaggle dataset.")

        dataset_path = os.path.join(dataset_dir, dataset_files[0])
        print(f"Dataset downloaded and extracted to: {dataset_path}")
    else:
        dataset_path = args.dataset_path

    if not dataset_path or not os.path.exists(dataset_path):
        raise FileNotFoundError(f"Dataset file not found at: {dataset_path}")

    # Load the dataset
    data = load_dataset(dataset_path)

    # Train the phishing classifier
    model, vectorizer = train_phishing_classifier(data)

    # Save the trained model and vectorizer
    output_directory = "model"  # Directory to save the model and vectorizer
    save_model_and_vectorizer(model, vectorizer, output_directory)
