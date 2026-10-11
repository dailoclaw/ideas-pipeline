#!/usr/bin/env python3
"""Read-only backup of the specifically approved Supabase project; no credentials stored."""
import argparse
import getpass
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
from datetime import datetime
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent.parent
PROJECT = 'uooouxgdurhwzzszlngc'
HOST = 'aws-1-ap-southeast-2.pooler.supabase.com'
CA_CERT = Path(__file__).resolve().parent / 'certificates' / 'supabase-prod-ca-2021.crt'
CA_SHA256 = '700723581420dd1ac98fd7e9ac529f0ef210eadcaf87fc868a3ad7d114c2f3b7'

def certificate_path():
    if not CA_CERT.is_file():
        raise RuntimeError('Official Supabase CA certificate is missing; no connection attempted.')
    if hashlib.sha256(CA_CERT.read_bytes()).hexdigest() != CA_SHA256:
        raise RuntimeError('Supabase CA certificate checksum mismatch; no connection attempted.')
    return CA_CERT

def tools_environment():
    tool_root = ROOT / '.local-tools' / 'homebrew'
    clients = sorted(tool_root.glob('libpq@17/*/bin/pg_dump'))
    if not clients:
        raise RuntimeError('Prepared PostgreSQL 17 client tools are missing.')
    binaries = clients[-1].parent
    env = dict(os.environ)
    # Portable official bottles; preserve verified TLS for the remote connection.
    libraries = [str(p) for p in tool_root.glob('*/*/lib')]
    libraries += ['/opt/homebrew/opt/icu4c@78/lib']
    env['DYLD_LIBRARY_PATH'] = ':'.join(libraries)
    for name in ['pg_dump', 'pg_dumpall', 'pg_restore', 'psql']:
        result = subprocess.run([str(binaries / name), '--version'], env=env,
                                capture_output=True, text=True, check=True)
        if ' 17.' not in result.stdout:
            raise RuntimeError('Unexpected PostgreSQL client major version.')
    return binaries, env

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Verify tools only; no connection or password.')
    args = parser.parse_args()
    certificate = certificate_path()
    binaries, env = tools_environment()
    if args.check:
        print('PostgreSQL 17 tools and pinned Supabase CA verified; no database connection made.')
        return
    if not sys.stdin.isatty():
        raise RuntimeError('Run in a local interactive terminal; never pass a password as an argument.')
    print('Read-only backup: Ideas Pipeline (' + PROJECT + ').')
    print('The password is hidden and used only by local database client processes.')
    password = getpass.getpass('Existing Supabase DATABASE password: ')
    if not password:
        raise RuntimeError('No password entered; nothing connected.')
    env.update(PGHOST=HOST, PGPORT='5432', PGDATABASE='postgres',
               PGUSER='postgres.' + PROJECT, PGSSLMODE='verify-full',
               PGSSLROOTCERT=str(certificate), PGCONNECT_TIMEOUT='20', PGPASSWORD=password)
    os.umask(0o077)
    base = ROOT / 'private-backups'
    base.mkdir(mode=0o700, exist_ok=True)
    os.chmod(base, 0o700)
    folder = base / (PROJECT + '-' + datetime.now(ZoneInfo('Australia/Adelaide')).strftime('%Y%m%d-%H%M%S-%f'))
    folder.mkdir(mode=0o700)
    archive = folder / 'database.dump'
    roles = folder / 'roles.sql'
    manifest = {'project': PROJECT, 'host': HOST, 'status': 'incomplete',
                'scope': 'Full database logical archive plus global role definitions without role passwords.',
                'restoreVerified': False, 'storageObjectsIncluded': False,
                'platformSettingsIncluded': False}
    def command(name, flags, output=None):
        with (folder / (name + '.log')).open('wb') as log:
            if output:
                with output.open('wb') as target:
                    result = subprocess.run([str(binaries / name), *flags], env=env, stdout=target, stderr=log)
            else:
                result = subprocess.run([str(binaries / name), *flags], env=env, stdout=log, stderr=subprocess.STDOUT)
        if result.returncode:
            raise RuntimeError(name + ' failed; private diagnostic log is in ' + str(folder))
    try:
        # pg_dump obtains a consistent snapshot internally. No live restore or migration.
        command('pg_dump', ['--no-password', '--format=custom', '--file=' + str(archive)])
        command('pg_dumpall', ['--no-password', '--roles-only', '--no-role-passwords'], roles)
        command('pg_restore', ['--list', str(archive)], folder / 'archive-contents.txt')
        if not archive.stat().st_size or not roles.stat().st_size:
            raise RuntimeError('Empty backup output; capture is incomplete.')
        manifest['status'] = 'captured; restore verification pending'
        manifest['files'] = {}
        for path in [archive, roles]:
            with path.open('rb') as stream:
                digest = hashlib.file_digest(stream, 'sha256').hexdigest()
            manifest['files'][path.name] = {'bytes': path.stat().st_size, 'sha256': digest}
    finally:
        env.pop('PGPASSWORD', None)
        password = None
        (folder / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print('Backup captured at: ' + str(folder))
    print('Archive contents readable. Restore into isolated staging is still required.')
    print('No database migrations or permission changes were performed.')

if __name__ == '__main__':
    try:
        main()
    except (Exception, KeyboardInterrupt) as error:
        print('Backup stopped: ' + str(error), file=sys.stderr)
        sys.exit(1)
