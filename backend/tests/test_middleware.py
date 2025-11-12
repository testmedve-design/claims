import os
import sys
import unittest
from unittest.mock import patch

from flask import Flask, jsonify

sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from backend.middleware import require_claims_access, require_processor_access  # noqa: E402


class MiddlewareAuthFailureTestCase(unittest.TestCase):
    def setUp(self):
        self.app = Flask(__name__)
        self.app.testing = True

        @self.app.route('/claims-protected')
        @require_claims_access
        def claims_protected():
            return jsonify(success=True)

        @self.app.route('/processor-protected')
        @require_processor_access
        def processor_protected():
            return jsonify(success=True)

        self.client = self.app.test_client()

    def test_claims_access_missing_token(self):
        response = self.client.get('/claims-protected')
        self.assertEqual(response.status_code, 401)
        payload = response.get_json()
        self.assertEqual(payload['error'], 'Invalid token')
        self.assertEqual(payload['details'], 'No token provided')

    @patch('backend.middleware.auth.verify_id_token', side_effect=Exception('boom'))
    def test_claims_access_rejects_invalid_token(self, mock_verify):
        response = self.client.get(
            '/claims-protected',
            headers={'Authorization': 'Bearer fake-token'}
        )
        self.assertEqual(response.status_code, 401)
        payload = response.get_json()
        self.assertEqual(payload['error'], 'Invalid token')
        self.assertIn('Failed to verify Firebase token', payload['details'])
        mock_verify.assert_called_once_with('fake-token')

    @patch('backend.middleware.auth.verify_id_token', side_effect=Exception('boom'))
    def test_processor_access_rejects_invalid_token(self, mock_verify):
        response = self.client.get(
            '/processor-protected',
            headers={'Authorization': 'Bearer fake-token'}
        )
        self.assertEqual(response.status_code, 401)
        payload = response.get_json()
        self.assertEqual(payload['error'], 'Invalid token')
        self.assertIn('Failed to verify Firebase token', payload['details'])
        mock_verify.assert_called_once_with('fake-token')


if __name__ == '__main__':
    unittest.main()

