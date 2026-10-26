"""Ensure the immutable reference is Git content, independent of Windows EOLs."""
import json
import os
import subprocess
import unittest
from unittest.mock import patch
from package_anna import ROOT, REFERENCE, LOCK, manifest, sources


class ReferencePackageTest(unittest.TestCase):
    def test_host_crlf_configuration_cannot_change_reference_bytes(self):
        with patch.dict(os.environ, {'GIT_CONFIG_COUNT': '1',
                                    'GIT_CONFIG_KEY_0': 'core.autocrlf',
                                    'GIT_CONFIG_VALUE_0': 'true'}):
            files = sources()
        self.assertEqual(manifest(files), json.loads(LOCK.read_text(encoding='utf-8')))
        names = sorted(files)
        result = subprocess.check_output(['git', 'cat-file', '--batch'], cwd=ROOT,
            input=''.join(f'{REFERENCE}:{name}\n' for name in names).encode())
        at = 0
        for name in names:
            end = result.index(b'\n', at)
            _, kind, size = result[at:end].split()
            self.assertEqual(kind, b'blob')
            at = end + 1
            self.assertEqual(files[name], result[at:at+int(size)], name)
            at += int(size) + 1
        self.assertEqual(at, len(result))


if __name__ == '__main__':
    unittest.main()
