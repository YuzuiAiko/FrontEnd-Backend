# Email data (local only)

Place your exported mailboxes here. This folder is ignored by git to protect privacy and keep the repo small.

## Accepted Sources:
- **CSV files** (Outlook exports - recommended for classification)
- **MBOX exports** (Gmail Takeout, Apple Mail)
- **EML files** (individual messages)
- **JSON files** (structured email data)

## How to Export Emails:

### Outlook Classic:
1. Select emails you want to export
2. File → Import and Export → Export to a file
3. Choose "Comma Separated Values (Windows)"
4. Save the CSV file to this folder

### Gmail Takeout:
1. Go to https://takeout.google.com/
2. Select "Mail" and choose your labels
3. Download the MBOX file
4. Extract and place .mbox files in this folder

## Recommended Layout (optional):
- csv/   (Outlook CSV exports)
- mbox/  (Gmail Takeout .mbox files)
- eml/   (individual .eml files)
- json/  (structured email data)

## Usage:
1. Copy `.env.example` to `.env` and add your OpenAI API key
2. Install dependencies: `pip install -r requirements.txt`
3. Run classification: `python train_model.py`

## Notes:
- Do not commit raw emails. This folder is ignored except this README.
- Consider removing PII or using redaction scripts before sharing data.
- CSV format from Outlook is recommended for best classification results.

