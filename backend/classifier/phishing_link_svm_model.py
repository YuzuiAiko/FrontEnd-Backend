import os
import matplotlib.pyplot as plt
import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split
import joblib

cols_used = [
    'url_length',
    'hostname_length',
    'ip', # binary so dont scale
    'https_token', # binary so dont scale
    'total_of.',
    'total_of-',
    'total_of@',
    'total_of?',
    'total_of&',
    'total_of=',
    'total_of_',
    'total_of~',
    'total_of%',
    'total_of/',
    'total_of*',
    'total_of:',
    'total_of,',
    'total_of;',
    'total_of$',
    'total_of_www',
    'total_of_com',
    'total_of_http_in_path',
    'status' # target, binary
]

def _get_paths():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    dataset_path = os.path.join(base_dir, 'training_data', 'dataset_link_phishing.csv')
    model_dir = os.path.join(base_dir, 'model')
    model_path = os.path.join(model_dir, 'phishing_svm_model.joblib')
    scaler_path = os.path.join(model_dir, 'phishing_scaler.joblib')
    cols_path = os.path.join(model_dir, 'phishing_cols.joblib')
    return dataset_path, model_dir, model_path, scaler_path, cols_path


def train_model_and_scaler(save=True):
    """Train the phishing link SVM model and return (model, scaler, X_train_columns).

    If `save` is True the artifacts will be saved under `classifier/model/`.
    """
    dataset_path, model_dir, model_path, scaler_path, cols_path = _get_paths()
    df = pd.read_csv(dataset_path, low_memory=False)
    df = df[cols_used]
    df['status'] = df['status'].apply(lambda x: 1 if x == 'phishing' else 0)

    # split data
    X = df.drop('status', axis=1)
    y = df['status']
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # identify numerical columns to scale (excluding binary)
    numerical_cols = [col for col in X_train.columns if col not in ['ip', 'https_token']]

    # scale numerical data
    scaler = StandardScaler()
    X_train[numerical_cols] = scaler.fit_transform(X_train[numerical_cols])
    X_test[numerical_cols] = scaler.transform(X_test[numerical_cols])

    # train model
    model = SVC(kernel='linear', class_weight='balanced')
    model.fit(X_train, y_train)

    # test model
    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    print(f"Accuracy: {accuracy}")
    print(classification_report(y_test, y_pred))

    if save:
        if not os.path.exists(model_dir):
            os.makedirs(model_dir)
        joblib.dump(model, model_path)
        joblib.dump(scaler, scaler_path)
        joblib.dump(list(X_train.columns), cols_path)
        print(f"Saved model to {model_path}")

    return model, scaler, list(X_train.columns)

# EXTRACTING FEATURES FROM PROVIDED LINK

from urllib.parse import urlparse
import ipaddress
import re

def is_ip_address(url):
    try:
        hostname = urlparse(url).hostname
        if hostname:
            ipaddress.ip_address(hostname)
            return 1
        return 0
    except ValueError:
        return 0

# Function to extract features from target link to evaluate
def extract_features_from_url(url):
    features = {}

    # url_length
    features['url_length'] = len(url)

    parsed_url = urlparse(url)

    # hostname_length
    features['hostname_length'] = len(parsed_url.hostname) if parsed_url.hostname else 0

    # ip (binary)
    features['ip'] = 1 if is_ip_address(url) else 0 # Reuse the function defined earlier

    # https_token (binary)
    features['https_token'] = 1 if parsed_url.scheme == 'https' else 0

    # total_of.
    features['total_of.'] = url.count('.')

    # total_of-
    features['total_of-'] = url.count('-')

    # total_of@
    features['total_of@'] = url.count('@')

    # total_of?
    features['total_of?'] = url.count('?')

    # total_of&
    features['total_of&'] = url.count('&')

    # total_of=
    features['total_of='] = url.count('=')

    # total_of_
    features['total_of_'] = url.count('_')

    # total_of~
    features['total_of~'] = url.count('~')

    # total_of%
    features['total_of%'] = url.count('%')

    # total_of/
    features['total_of/'] = url.count('/')

    # total_of*
    features['total_of*'] = url.count('*')

    # total_of:
    features['total_of:'] = url.count(':')

    # total_of,
    features['total_of,'] = url.count(',')

    # total_of;
    features['total_of;'] = url.count(';')

    # total_of$
    features['total_of$'] = url.count('$')

    # total_of_www
    features['total_of_www'] = url.count('www')

    # total_of_com
    features['total_of_com'] = url.count('com')

    # total_of_http_in_path
    features['total_of_http_in_path'] = url.count('http')


    # Convert to DataFrame
    features_df = pd.DataFrame([features])

    # `features_df` will be aligned to the training columns later by the caller
    return features_df

def _predict_with_objects(url, model, scaler, X_train_cols):
    # Extract features
    features_df = extract_features_from_url(url)

    # Ensure columns are in the same order as the training data
    features_df = features_df[X_train_cols]

    # Identify numerical columns to scale (excluding binary)
    numerical_cols = [col for col in features_df.columns if col not in ['ip', 'https_token']]

    # Scale numerical data using the fitted scaler
    features_df[numerical_cols] = scaler.transform(features_df[numerical_cols])

    # Make prediction
    prediction = model.predict(features_df)

    return "phishing" if prediction[0] == 1 else "legitimate"


# Module-level lazy-loaded objects
_MODEL = None
_SCALER = None
_X_TRAIN_COLS = None


def load_model_and_scaler():
    """Try loading saved artifacts from disk. Returns (model, scaler, cols) or (None, None, None)."""
    _, model_dir, model_path, scaler_path, cols_path = _get_paths()
    try:
        if os.path.exists(model_path) and os.path.exists(scaler_path) and os.path.exists(cols_path):
            model = joblib.load(model_path)
            scaler = joblib.load(scaler_path)
            cols = joblib.load(cols_path)
            return model, scaler, cols
    except Exception:
        pass
    return None, None, None


def init_model(force_train=False):
    """Initialize module-level model/scaler/cols. If `force_train` is True it retrains and saves artifacts."""
    global _MODEL, _SCALER, _X_TRAIN_COLS
    if _MODEL is not None and not force_train:
        return
    if not force_train:
        model, scaler, cols = load_model_and_scaler()
        if model is not None:
            _MODEL, _SCALER, _X_TRAIN_COLS = model, scaler, cols
            return
    # If we get here, train a new model (and save it)
    _MODEL, _SCALER, _X_TRAIN_COLS = train_model_and_scaler(save=True)


def predict_phishing(url):
    """Convenience function that predicts using a module-level model loaded from disk (or trained on demand).

    Returns 'phishing' or 'legitimate'. Raises RuntimeError if model cannot be initialized.
    """
    init_model()
    if _MODEL is None:
        raise RuntimeError('Model is not available (failed to load or train).')
    return _predict_with_objects(url, _MODEL, _SCALER, _X_TRAIN_COLS)


if __name__ == '__main__':
    # When run as a script, train (or load) and provide a tiny interactive test
    init_model(force_train=False)
    print('Model ready. Example predictions:')
    examples = [
        'http://example.com/login',
        'https://192.168.0.1/secure'
    ]
    for ex in examples:
        print(ex, '->', predict_phishing(ex))