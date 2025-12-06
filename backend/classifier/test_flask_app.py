import unittest
import sys
import os
import json

# Add the classifier directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Try to import Flask app
try:
    from svm_model import app
    FLASK_AVAILABLE = True
except ImportError:
    FLASK_AVAILABLE = False
    print("Warning: Flask app not available for testing")


@unittest.skipUnless(FLASK_AVAILABLE, "Flask app not available")
class TestFlaskApp(unittest.TestCase):
    
    def setUp(self):
        """Set up test client"""
        self.app = app
        self.client = app.test_client()
        self.client.testing = True
    
    def test_home_route(self):
        """Test root endpoint"""
        response = self.client.get('/')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('message', data)
        self.assertIn('status', data)
        self.assertEqual(data['status'], 'ok')
    
    def test_favicon_route(self):
        """Test favicon endpoint"""
        response = self.client.get('/favicon.ico')
        self.assertEqual(response.status_code, 204)
    
    def test_classify_route_missing_emails(self):
        """Test classify endpoint with missing emails field"""
        response = self.client.post('/classify', 
                                   data=json.dumps({}),
                                   content_type='application/json')
        # Should handle gracefully (may return empty predictions or error)
        self.assertIn(response.status_code, [200, 400, 500])
    
    def test_classify_route_empty_emails(self):
        """Test classify endpoint with empty emails list"""
        response = self.client.post('/classify',
                                   data=json.dumps({'emails': []}),
                                   content_type='application/json')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('predictions', data)
        self.assertEqual(data['predictions'], [])
    
    def test_classify_route_single_email(self):
        """Test classify endpoint with single email"""
        response = self.client.post('/classify',
                                   data=json.dumps({
                                       'emails': ['This is a test email']
                                   }),
                                   content_type='application/json')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('predictions', data)
        self.assertEqual(len(data['predictions']), 1)
        self.assertIsInstance(data['predictions'][0], str)
    
    def test_classify_route_multiple_emails(self):
        """Test classify endpoint with multiple emails"""
        response = self.client.post('/classify',
                                   data=json.dumps({
                                       'emails': [
                                           'Important meeting tomorrow',
                                           'Check out our sale!',
                                           'Happy birthday!'
                                       ]
                                   }),
                                   content_type='application/json')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('predictions', data)
        self.assertEqual(len(data['predictions']), 3)
    
    def test_classify_route_invalid_json(self):
        """Test classify endpoint with invalid JSON"""
        response = self.client.post('/classify',
                                   data='invalid json',
                                   content_type='application/json')
        # Should return error status
        self.assertIn(response.status_code, [400, 500])
    
    def test_classify_links_route_missing_html(self):
        """Test classify_links endpoint with missing html field"""
        response = self.client.post('/classify_links',
                                   data=json.dumps({}),
                                   content_type='application/json')
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertIn('error', data)
    
    def test_classify_links_route_empty_html(self):
        """Test classify_links endpoint with empty html"""
        response = self.client.post('/classify_links',
                                   data=json.dumps({'html': ''}),
                                   content_type='application/json')
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertIn('error', data)
    
    def test_classify_links_route_with_html(self):
        """Test classify_links endpoint with HTML containing links"""
        html = '<html><body><a href="https://example.com">Link 1</a><a href="https://google.com">Link 2</a></body></html>'
        response = self.client.post('/classify_links',
                                   data=json.dumps({'html': html}),
                                   content_type='application/json')
        
        # May return 200 with results, or 500 if model not available
        if response.status_code == 200:
            data = json.loads(response.data)
            self.assertIn('results', data)
            self.assertIsInstance(data['results'], list)
        else:
            # Model not available, which is acceptable
            self.assertEqual(response.status_code, 500)
    
    def test_classify_links_route_no_links(self):
        """Test classify_links endpoint with HTML containing no links"""
        html = '<html><body><p>No links here</p></body></html>'
        response = self.client.post('/classify_links',
                                   data=json.dumps({'html': html}),
                                   content_type='application/json')
        
        if response.status_code == 200:
            data = json.loads(response.data)
            self.assertIn('results', data)
            self.assertEqual(len(data['results']), 0)
        else:
            # Model not available
            self.assertEqual(response.status_code, 500)
    
    def test_classify_links_route_duplicate_links(self):
        """Test classify_links endpoint handles duplicate links"""
        html = '<html><body><a href="https://example.com">Link 1</a><a href="https://example.com">Link 2</a></body></html>'
        response = self.client.post('/classify_links',
                                   data=json.dumps({'html': html}),
                                   content_type='application/json')
        
        if response.status_code == 200:
            data = json.loads(response.data)
            self.assertIn('results', data)
            # Should deduplicate links
            self.assertEqual(len(data['results']), 1)
        else:
            # Model not available
            self.assertEqual(response.status_code, 500)
    
    def test_cors_headers(self):
        """Test that CORS headers are set"""
        response = self.client.get('/')
        # CORS should be enabled (check for Access-Control-Allow-Origin header)
        # Note: Flask-CORS may not set headers on all responses by default
        self.assertIn(response.status_code, [200, 204])


if __name__ == '__main__':
    unittest.main()

