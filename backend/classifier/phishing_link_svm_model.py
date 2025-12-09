import os
import pandas as pd
import joblib
import ipaddress
from urllib.parse import urlparse

from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split

# Optional: enable debug prints (set to True to see extraction / matching info)
DEBUG = False

# Try to use tldextract for correct eTLD+1 extraction; fallback if not available
try:
    import tldextract
    _TLDEXTRACT_AVAILABLE = True
except Exception:
    _TLDEXTRACT_AVAILABLE = False

# -------------------------------------------------------------
# CONFIG – Top-1M domain list location (machine-agnostic, relative)
# -------------------------------------------------------------

# Use a path relative to this module so the code works across machines
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TOP1M_CSV_PATH = os.path.join(BASE_DIR, 'training_data', 'top-1m.csv')
# We load domains lazily and store them in memory
TOP_DOMAINS = None


# =============================================================
#  UTIL: registered/registrable domain extraction (eTLD+1)
# =============================================================
def _normalize_hostname(hostname: str) -> str:
    if not hostname:
        return ""
    h = hostname.lower().strip().rstrip('.')
    return h


def get_registered_domain_from_hostname(hostname: str) -> str:
    """
    Return registrable domain (eTLD+1) for a hostname.
    Uses tldextract when available for correctness (handles co.uk etc).
    Fallback: naive last-two-labels approach.
    """
    hostname = _normalize_hostname(hostname)
    if not hostname:
        return ""

    if _TLDEXTRACT_AVAILABLE:
        ext = tldextract.extract(hostname)
        if ext.domain and ext.suffix:
            return f"{ext.domain}.{ext.suffix}"
        # fallback to hostname if extraction fails
        return hostname

    # naive fallback
    parts = hostname.split('.')
    if len(parts) >= 2:
        return parts[-2] + '.' + parts[-1]
    return hostname


def extract_registered_domain_from_url(url: str) -> str:
    """Get the registrable domain (eTLD+1) from a URL string."""
    try:
        parsed = urlparse(url)
        hostname = parsed.hostname if parsed.hostname else ""
        return get_registered_domain_from_hostname(hostname)
    except Exception:
        return ""


# =============================================================
#  LOAD TOP-1M DOMAINS (normalized to registrable domain)
# =============================================================
def load_top_domains():
    """Load the Top-1M domain list into a Python set (lazy loaded).
    Normalizes each entry to its registrable domain for reliable matching.
    """
    global TOP_DOMAINS
    if TOP_DOMAINS is not None:
        return TOP_DOMAINS

    TOP_DOMAINS = set()
    try:
        # Read CSV without assuming a header. Many top-1m files are two-column: rank,domain
        df = pd.read_csv(TOP1M_CSV_PATH, header=None, dtype=str)
        # pick the column that looks like domains: prefer column 1 if exists else column 0
        col_idx = 1 if df.shape[1] > 1 else 0
        raw_domains = df[col_idx].astype(str).str.strip().str.lower().str.rstrip('.')
        # normalize each domain to its registrable (eTLD+1)
        normalized = set(get_registered_domain_from_hostname(d) for d in raw_domains if d)
        TOP_DOMAINS = normalized
        if DEBUG:
            print(f"[DEBUG] Loaded {len(TOP_DOMAINS)} normalized top domains from {TOP1M_CSV_PATH}")
    except FileNotFoundError:
        print(f"[ERROR] Top-1M file not found at {TOP1M_CSV_PATH}. Top-domain checks will be disabled.")
        TOP_DOMAINS = set()
    except Exception as e:
        print(f"[ERROR] Failed to load top domains: {e}")
        TOP_DOMAINS = set()

    return TOP_DOMAINS


# =============================================================
#  MODEL TRAINING CONFIG
# =============================================================
cols_used = [
    'url_length',
    'hostname_length',
    'ip',  # binary
    'https_token',  # binary
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
    'status'
]


def _get_paths():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    dataset_path = os.path.join(base_dir, 'training_data', 'dataset_link_phishing.csv')
    model_dir = os.path.join(base_dir, 'model')
    model_path = os.path.join(model_dir, 'phishing_svm_model.joblib')
    scaler_path = os.path.join(model_dir, 'phishing_scaler.joblib')
    cols_path = os.path.join(model_dir, 'phishing_cols.joblib')
    return dataset_path, model_dir, model_path, scaler_path, cols_path


# =============================================================
#  TRAINING
# =============================================================
def train_model_and_scaler(save=True):
    dataset_path, model_dir, model_path, scaler_path, cols_path = _get_paths()
    df = pd.read_csv(dataset_path, low_memory=False)

    df = df[cols_used]
    df['status'] = df['status'].apply(lambda x: 1 if x == 'phishing' else 0)

    X = df.drop('status', axis=1)
    y = df['status']

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    numerical_cols = [col for col in X_train.columns if col not in ['ip', 'https_token']]

    scaler = StandardScaler()
    # Fit scaler on numerical cols (operate in-place)
    X_train[numerical_cols] = scaler.fit_transform(X_train[numerical_cols])
    X_test[numerical_cols] = scaler.transform(X_test[numerical_cols])

    model = SVC(kernel='rbf', class_weight='balanced')
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    print("Accuracy:", accuracy_score(y_test, y_pred))
    print(classification_report(y_test, y_pred))

    if save:
        if not os.path.exists(model_dir):
            os.makedirs(model_dir)

        joblib.dump(model, model_path)
        joblib.dump(scaler, scaler_path)
        joblib.dump(list(X_train.columns), cols_path)
        print(f"Saved model to {model_path}")

    return model, scaler, list(X_train.columns)


# =============================================================
#  FEATURE EXTRACTION FOR PREDICTION
# =============================================================
def is_ip_address(url):
    try:
        hostname = urlparse(url).hostname
        if hostname:
            ipaddress.ip_address(hostname)
            return 1
        return 0
    except Exception:
        return 0


def extract_features_from_url(url):
    """
    Build feature dict for a URL. Keys must match the training columns.
    """
    features = {}
    parsed = urlparse(url)

    features['url_length'] = len(url)
    features['hostname_length'] = len(parsed.hostname) if parsed.hostname else 0
    features['ip'] = is_ip_address(url)
    features['https_token'] = 1 if parsed.scheme == 'https' else 0

    # count characters and map to the training column names like 'total_of.'
    for char in ['.', '-', '@', '?', '&', '=', '_', '~', '%', '/', '*', ':', ',', ';', '$']:
        features[f'total_of{char}'] = url.count(char)

    features['total_of_www'] = url.count('www')
    features['total_of_com'] = url.count('com')
    features['total_of_http_in_path'] = url.count('http')

    return pd.DataFrame([features])


# =============================================================
#  PREDICTION
# =============================================================
_MODEL = None
_SCALER = None
_X_TRAIN_COLS = None


def load_model_and_scaler():
    _, _, model_path, scaler_path, cols_path = _get_paths()
    try:
        if os.path.exists(model_path) and os.path.exists(scaler_path) and os.path.exists(cols_path):
            return (
                joblib.load(model_path),
                joblib.load(scaler_path),
                joblib.load(cols_path)
            )
    except Exception:
        pass
    return None, None, None


def init_model(force_train=False):
    global _MODEL, _SCALER, _X_TRAIN_COLS

    # if model already loaded and not forcing re-train, skip
    if _MODEL is not None and not force_train:
        return

    if not force_train:
        mdl, scl, cols = load_model_and_scaler()
        if mdl is not None:
            _MODEL, _SCALER, _X_TRAIN_COLS = mdl, scl, cols
            if DEBUG:
                print("[DEBUG] Loaded model/scaler/cols from disk.")
            return

    # Train a new one (and save)
    _MODEL, _SCALER, _X_TRAIN_COLS = train_model_and_scaler(save=True)


def _predict_with_objects(url, model, scaler, X_train_cols):
    # Extract features and align to training columns
    df = extract_features_from_url(url)

    # Ensure all required columns exist in df; add missing numeric columns with 0
    for col in X_train_cols:
        if col not in df.columns:
            df[col] = 0

    df = df[X_train_cols]

    numerical_cols = [c for c in df.columns if c not in ['ip', 'https_token']]
    df[numerical_cols] = scaler.transform(df[numerical_cols])

    pred = model.predict(df)[0]
    return "phishing" if pred == 1 else "legitimate"


# =============================================================
#  FINAL PHISHING CHECK (WITH TOP-1M DOMAIN OVERRIDE)
# =============================================================
def predict_phishing(url):
    """
    Final output must keep the SAME old labels:
       'legitimate'
       'phishing'

    Behavior:
    1) If the registrable domain (eTLD+1) is in the Top-1M list:
           → return 'legitimate'
    2) Otherwise fall back to SVM:
           → return 'phishing' or 'legitimate'
    """
    init_model()
    if _MODEL is None:
        raise RuntimeError("Model is not available")

    # Load top domains (normalized)
    domains = load_top_domains()
    registered_domain = extract_registered_domain_from_url(url)

    # TOP-1M OVERRIDE
    if registered_domain and registered_domain in domains:
        return "legitimate"   # ← OLD LABEL preserved

    # Otherwise use ML model
    return _predict_with_objects(url, _MODEL, _SCALER, _X_TRAIN_COLS)



# =============================================================
#  Script Mode
# =============================================================
if __name__ == '__main__':
    # set DEBUG True here if you want to see domain normalization debug lines
    DEBUG = True

    init_model()
    print("Model ready.")

    tests = [
        "https://accounts.google.com/ServiceLogin?service=mail",
        "https://myaccount.google.com/notifications",
        "https://paypal.com/login",
        "http://paypal.com.login-secure-verify.ru/auth",
        "https://192.168.0.1/secure",
        # an intentionally suspicious google-like domain:
        "https://accounts-google.com/login",
        # google subdomain style (should be top-domain verified)
        "https://accounts.google.co.uk/signin"  # tests tldextract behavior for co.uk
    ]

    for t in tests:
        try:
            print(t, "->", predict_phishing(t))
        except Exception as e:
            print(f"Error predicting {t}: {e}")
