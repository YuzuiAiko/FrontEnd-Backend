# Email data (local only)

Place your exported mailboxes here. This folder is ignored by git to protect privacy and keep the repo small.

Accepted sources:
- MBOX exports (Gmail Takeout, Apple Mail)
- EML files (individual messages)
- JSON/NDJSON you generate

Recommended layout (optional):
- mbox/  (one or more .mbox files)
- eml/   (raw .eml files)
- json/  (normalized records, e.g. emails.jsonl)

Notes:
- Do not commit raw emails. This folder is ignored except this README and .gitignore.
- Consider removing PII or using redaction scripts before sharing data.

