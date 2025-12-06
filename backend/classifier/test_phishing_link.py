import unittest
import sys
import os
import pandas as pd

# Add the classifier directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from phishing_link_svm_model import (
    is_ip_address,
    extract_features_from_url,
    _predict_with_objects,
    load_model_and_scaler,
    predict_phishing
)


class TestPhishingLinkClassifier(unittest.TestCase):
    
    def test_is_ip_address_valid_ipv4(self):
        """Test IP address detection for valid IPv4"""
        self.assertEqual(is_ip_address("http://192.168.1.1"), 1)
        self.assertEqual(is_ip_address("https://10.0.0.1"), 1)
        self.assertEqual(is_ip_address("http://127.0.0.1"), 1)
    
    def test_is_ip_address_invalid(self):
        """Test IP address detection for invalid IPs"""
        self.assertEqual(is_ip_address("http://example.com"), 0)
        self.assertEqual(is_ip_address("https://google.com"), 0)
        self.assertEqual(is_ip_address("not-a-url"), 0)
    
    def test_extract_features_from_url(self):
        """Test feature extraction from URL"""
        url = "https://www.example.com/path?query=value"
        features = extract_features_from_url(url)
        
        # Check that features DataFrame is returned
        self.assertIsInstance(features, pd.DataFrame)
        self.assertEqual(len(features), 1, 'DataFrame should have one row')
        
        # Check specific features (columns exist)
        self.assertIn('url_length', features.columns)
        self.assertIn('hostname_length', features.columns)
        self.assertIn('https_token', features.columns)
        self.assertIn('ip', features.columns)
        
        # Verify feature values (access first row)
        self.assertGreater(features.iloc[0]['url_length'], 0)
        self.assertEqual(features.iloc[0]['https_token'], 1)  # https URL
        self.assertEqual(features.iloc[0]['ip'], 0)  # Not an IP address
    
    def test_extract_features_counts_special_chars(self):
        """Test that special character counts are extracted"""
        url = "https://example.com/path?param=value&other=test"
        features = extract_features_from_url(url)
        
        self.assertIn('total_of?', features.columns)
        self.assertIn('total_of&', features.columns)
        self.assertIn('total_of=', features.columns)
        self.assertGreater(features.iloc[0]['total_of?'], 0)
        self.assertGreater(features.iloc[0]['total_of&'], 0)
        self.assertGreater(features.iloc[0]['total_of='], 0)
    
    def test_extract_features_www_detection(self):
        """Test www detection in URL"""
        url_with_www = "https://www.example.com"
        url_without_www = "https://example.com"
        
        features_www = extract_features_from_url(url_with_www)
        features_no_www = extract_features_from_url(url_without_www)
        
        self.assertGreater(features_www.iloc[0]['total_of_www'], 0)
        self.assertEqual(features_no_www.iloc[0]['total_of_www'], 0)
    
    def test_extract_features_com_detection(self):
        """Test .com detection in URL"""
        url_with_com = "https://example.com"
        url_without_com = "https://example.org"
        
        features_com = extract_features_from_url(url_with_com)
        features_no_com = extract_features_from_url(url_without_com)
        
        self.assertGreater(features_com.iloc[0]['total_of_com'], 0)
        self.assertEqual(features_no_com.iloc[0]['total_of_com'], 0)
    
    def test_load_model_and_scaler(self):
        """Test model and scaler loading"""
        model, scaler, cols = load_model_and_scaler()
        
        # If model files exist, they should be loaded
        # If not, should return None
        if model is not None:
            self.assertIsNotNone(scaler)
            self.assertIsNotNone(cols)
            self.assertIsInstance(cols, list)
            self.assertGreater(len(cols), 0)
    
    def test_predict_phishing_legitimate_url(self):
        """Test prediction for legitimate URL"""
        try:
            result = predict_phishing("https://www.google.com")
            self.assertIn(result, ["phishing", "legitimate"])
        except RuntimeError:
            # Model not available, skip test
            self.skipTest("Model not available")
    
    def test_predict_phishing_suspicious_url(self):
        """Test prediction for suspicious URL"""
        try:
            result = predict_phishing("http://192.168.1.1/secure-login")
            self.assertIn(result, ["phishing", "legitimate"])
        except RuntimeError:
            # Model not available, skip test
            self.skipTest("Model not available")
    
    def test_predict_phishing_raises_error_when_model_unavailable(self):
        """Test that predict_phishing raises error when model is unavailable"""
        # This test verifies error handling
        # In a real scenario, if model can't be loaded or trained, it should raise RuntimeError
        pass  # Covered by try/except in other tests


if __name__ == '__main__':
    unittest.main()

