import contextlib
import importlib.util
import io
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('backup', Path(__file__).resolve().parents[1] / 'scripts/backup-supabase.py')
backup = importlib.util.module_from_spec(spec)
spec.loader.exec_module(backup)

class BackupTests(unittest.TestCase):
    def execute(self, fail=False):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            calls = []
            def run(args, **kwargs):
                calls.append((args, dict(kwargs['env'])))
                if fail:
                    return subprocess.CompletedProcess(args, 1)
                for arg in args:
                    if arg.startswith('--file='):
                        Path(arg.split('=', 1)[1]).write_bytes(b'Fictional archive')
                if '--roles-only' in args:
                    kwargs['stdout'].write(b'-- Fictional role definitions\n')
                if '--list' in args:
                    kwargs['stdout'].write(b'-- Fictional archive listing\n')
                return subprocess.CompletedProcess(args, 0)
            old_mask = os.umask(0o077)
            try:
                with patch.object(backup, 'ROOT', root), patch.object(backup, 'tools_environment', return_value=(Path('/fixture/bin'), {})), patch('sys.argv', ['backup']), patch('sys.stdin.isatty', return_value=True), patch.object(backup.getpass, 'getpass', return_value='fixture-password'), patch.object(backup.subprocess, 'run', side_effect=run), contextlib.redirect_stdout(io.StringIO()) as output:
                    if fail:
                        with self.assertRaisesRegex(RuntimeError, 'pg_dump failed'):
                            backup.main()
                    else:
                        backup.main()
                capture = next((root / 'private-backups').iterdir())
                manifest = json.loads((capture / 'manifest.json').read_text())
                for args, env in calls:
                    self.assertNotIn('fixture-password', ' '.join(args))
                    self.assertEqual(env['PGPASSWORD'], 'fixture-password')
                    self.assertEqual(env['PGSSLMODE'], 'verify-full')
                    self.assertEqual(env['PGSSLROOTCERT'], str(backup.CA_CERT))
                self.assertNotIn('fixture-password', output.getvalue())
                for path in capture.iterdir():
                    self.assertNotIn(b'fixture-password', path.read_bytes())
                    self.assertEqual(path.stat().st_mode & 0o777, 0o600)
                self.assertEqual(capture.stat().st_mode & 0o777, 0o700)
                self.assertFalse(manifest['restoreVerified'])
                return manifest, calls
            finally:
                os.umask(old_mask)

    def test_capture_keeps_password_out_of_files_and_arguments(self):
        manifest, calls = self.execute()
        self.assertEqual(manifest['status'], 'captured; restore verification pending')
        self.assertEqual(len(calls), 3)
        self.assertIn('--no-role-passwords', calls[1][0])
        self.assertEqual(set(manifest['files']), {'database.dump', 'roles.sql'})

    def test_failed_dump_is_incomplete_and_stops_before_roles_or_restore(self):
        manifest, calls = self.execute(fail=True)
        self.assertEqual(manifest['status'], 'incomplete')
        self.assertEqual(len(calls), 1)
        self.assertNotIn('files', manifest)

    def test_noninteractive_run_cannot_request_or_transmit_password(self):
        with patch.object(backup, 'tools_environment', return_value=(Path('/fixture/bin'), {})), patch('sys.argv', ['backup']), patch('sys.stdin.isatty', return_value=False), patch.object(backup.getpass, 'getpass') as prompt:
            with self.assertRaisesRegex(RuntimeError, 'interactive terminal'):
                backup.main()
            prompt.assert_not_called()

    def test_missing_certificate_stops_before_password_prompt(self):
        with tempfile.TemporaryDirectory() as folder, patch.object(backup, 'CA_CERT', Path(folder) / 'missing.crt'), patch('sys.argv', ['backup']), patch.object(backup.getpass, 'getpass') as prompt:
            with self.assertRaisesRegex(RuntimeError, 'certificate is missing'):
                backup.main()
            prompt.assert_not_called()

    def test_replaced_certificate_is_rejected_before_password_prompt(self):
        with tempfile.TemporaryDirectory() as folder:
            certificate = Path(folder) / 'wrong.crt'
            certificate.write_text('Untrusted replacement')
            with patch.object(backup, 'CA_CERT', certificate), patch('sys.argv', ['backup']), patch.object(backup.getpass, 'getpass') as prompt:
                with self.assertRaisesRegex(RuntimeError, 'checksum mismatch'):
                    backup.main()
                prompt.assert_not_called()

if __name__ == '__main__':
    unittest.main()
