import unittest
from types import SimpleNamespace

from firebase_functions import https_fn

from main import require_admin


class ExtractionAccessTests(unittest.TestCase):
    def test_anonymous_is_denied(self):
        with self.assertRaises(https_fn.HttpsError) as result:
            require_admin(None)
        self.assertEqual(result.exception.code, https_fn.FunctionsErrorCode.UNAUTHENTICATED)

    def test_viewer_is_denied(self):
        auth = SimpleNamespace(token={"email": "viewer@example.test", "email_verified": True})
        with self.assertRaises(https_fn.HttpsError) as result:
            require_admin(auth)
        self.assertEqual(result.exception.code, https_fn.FunctionsErrorCode.PERMISSION_DENIED)

    def test_unverified_admin_is_denied(self):
        auth = SimpleNamespace(token={"email": "saumyajn1994@gmail.com", "email_verified": False})
        with self.assertRaises(https_fn.HttpsError) as result:
            require_admin(auth)
        self.assertEqual(result.exception.code, https_fn.FunctionsErrorCode.PERMISSION_DENIED)

    def test_verified_admin_is_allowed(self):
        auth = SimpleNamespace(token={"email": "saumyajn1994@gmail.com", "email_verified": True})
        self.assertIsNone(require_admin(auth))


if __name__ == "__main__":
    unittest.main()
