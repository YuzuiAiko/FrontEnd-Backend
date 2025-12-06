import unittest
import sys
import os

# Add the classifier directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from email_classifier_svm import (
    strip_html,
    replace_regex,
    replace_ner,
    drop_special_chars,
    convert_newlines,
    to_lowercase,
    preprocess_text,
    predict_email_label,
    classify
)


class TestEmailClassifier(unittest.TestCase):
    
    def test_strip_html(self):
        """Test HTML stripping functionality"""
        html = "<html><body><p>Test email</p></body></html>"
        result = strip_html(html)
        self.assertIn("Test email", result)
        self.assertNotIn("<p>", result)
        self.assertNotIn("<html>", result)
    
    def test_replace_regex_email(self):
        """Test email replacement in regex"""
        text = "Contact me at test@example.com"
        result = replace_regex(text)
        self.assertIn("<EMAIL>", result)
        self.assertNotIn("test@example.com", result)
    
    def test_replace_regex_url(self):
        """Test URL replacement in regex"""
        text = "Visit https://example.com for more info"
        result = replace_regex(text)
        self.assertIn("<URL>", result)
        self.assertNotIn("https://example.com", result)
    
    def test_replace_regex_date(self):
        """Test date replacement in regex"""
        text = "Meeting on 2024-01-15"
        result = replace_regex(text)
        self.assertIn("<DATE>", result)
        self.assertNotIn("2024-01-15", result)
    
    def test_drop_special_chars(self):
        """Test special character removal"""
        text = "Hello, world! How are you?"
        result = drop_special_chars(text)
        self.assertNotIn(",", result)
        self.assertNotIn("!", result)
        self.assertNotIn("?", result)
        self.assertIn("Hello", result)
        self.assertIn("world", result)
    
    def test_convert_newlines(self):
        """Test newline conversion"""
        text = "Line 1\n\nLine 2\nLine 3"
        result = convert_newlines(text)
        self.assertNotIn("\n", result)
        self.assertIn("Line 1", result)
        self.assertIn("Line 2", result)
    
    def test_to_lowercase(self):
        """Test lowercase conversion"""
        text = "HELLO WORLD"
        result = to_lowercase(text)
        self.assertEqual(result, "hello world")
    
    def test_preprocess_text(self):
        """Test complete preprocessing pipeline"""
        text = "<html><body>Hello, test@example.com! Visit https://example.com</body></html>"
        result = preprocess_text(text)
        
        # Should be lowercase
        self.assertEqual(result, result.lower())
        
        # Should not contain HTML tags
        self.assertNotIn("<html>", result)
        self.assertNotIn("<body>", result)
        
        # Should contain placeholders
        # Note: exact output depends on NER and regex processing
    
    def test_classify_empty_list(self):
        """Test classification with empty email list"""
        result = classify([])
        self.assertEqual(result, [])
    
    def test_classify_single_email(self):
        """Test classification with single email"""
        emails = ["This is an important email about a meeting"]
        result = classify(emails)
        self.assertEqual(len(result), 1)
        self.assertIsInstance(result[0], str)
    
    def test_classify_multiple_emails(self):
        """Test classification with multiple emails"""
        emails = [
            "Important meeting tomorrow",
            "Check out our sale!",
            "Happy birthday!"
        ]
        result = classify(emails)
        self.assertEqual(len(result), len(emails))
        self.assertIsInstance(result[0], str)
    
    def test_predict_email_label(self):
        """Test email label prediction"""
        email = "This is a test email about an important meeting"
        result = predict_email_label(email)
        self.assertIsInstance(result, str)
        # Result should be one of the valid categories
        valid_categories = ["Important", "Promotional", "Social", "Personal", "Notification"]
        self.assertIn(result, valid_categories)


if __name__ == '__main__':
    unittest.main()

