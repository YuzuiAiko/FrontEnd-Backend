Email Classifier
================

The repository includes a simple email classification service implemented with an SVM model in `backend/classifier`.

Key files:

- `backend/classifier/svm_model.py` — entry point used to run the Python SVM model as a service.
- `backend/classifier/train_model.py` — training script for the classifier.
- `backend/classifier/email_classifier_svm.py` — classification helper functions.
- `backend/classifier/model/` — prebuilt model artifacts (vectorizer, scaler, joblib files).

To run the Python classifier service locally:

```
cd backend/classifier
python svm_model.py
```

See `backend/classifier/README.md` for dataset notes.
