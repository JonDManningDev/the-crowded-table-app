"""Package-1 catalog comparison in a unique disposable LOCAL database.

Requires the existing local Supabase Postgres container. Never connects to hosted
Postgres or alters the existing local application database. Auth is an empty
minimal schema stub, not a substitute for Supabase behavioral tests.
"""
import hashlib
import json
from pathlib import Path
import re
import subprocess
import uuid

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
CONTAINER = 'supabase_db_the-crowded-table-app'
DATABASE = 'codex_access_baseline_' + uuid.uuid4().hex


def docker(*args, sql=None):
    result = subprocess.run(['docker', 'exec', '-i', CONTAINER, *args],
                            input=sql.encode('utf-8') if sql is not None else None, capture_output=True)
    if result.returncode:
        raise RuntimeError(result.stderr.decode('utf-8'))
    return result.stdout.decode('utf-8')


def query(sql):
    return docker('psql', '-X', '-U', 'postgres', '-d', DATABASE,
                  '-v', 'ON_ERROR_STOP=1', '-Atq', sql=sql)


def tokens(sql):
    # Preserve quoted literals/dollar bodies; ignore SQL comments/whitespace and
    # statement separators for source-vs-ledger comparison, not SQL evaluation.
    pattern = re.compile(r"--[^\n]*|/\*[\s\S]*?\*/|(?P<tag>\$[a-zA-Z_0-9]*\$)[\s\S]*?(?P=tag)|'(?:''|[^'])*'|\"(?:\"\"|[^\"])*\"|[^\s;]+", re.M)
    return [m.group() for m in pattern.finditer(sql.replace('\r\n', '\n'))
            if not m.group().startswith(('--', '/*'))]


hosted = json.loads((HERE / 'hosted-catalog.json').read_text(encoding='utf-8'))
migrations = sorted((ROOT / 'supabase/migrations').glob('*.sql'))
ledger = {m['version']: m for m in hosted['migrations']}
source_results = []
for path in migrations:
    version = path.name.split('_', 1)[0]
    source = path.read_text(encoding='utf-8')
    recorded = ';\n'.join(ledger[version]['statements']) + ';'
    source_results.append({'file': str(path.relative_to(ROOT)).replace('\\', '/'),
                           'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
                           'ledger_statement_tokens_match': tokens(source) == tokens(recorded)})

bootstrap = """
create schema auth;
create table auth.users(id uuid primary key, email text, email_confirmed_at timestamptz,
                       is_anonymous boolean, banned_until timestamptz);
create function auth.uid() returns uuid language sql stable as
$$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
grant usage on schema auth to anon,authenticated,service_role;
grant usage on schema public to postgres,anon,authenticated,service_role;
alter default privileges for role postgres in schema public
  grant all on tables to postgres,anon,authenticated,service_role;
alter default privileges for role postgres in schema public
  grant all on sequences to postgres,anon,authenticated,service_role;
alter default privileges for role postgres in schema public
  grant all on functions to postgres,anon,authenticated,service_role;
create schema supabase_migrations;
create table supabase_migrations.schema_migrations(version text, name text, statements text[]);
"""
created = False
try:
    docker('createdb', '-U', 'postgres', '--template=template0', DATABASE)
    created = True
    query(bootstrap)
    for path in migrations:
        query(path.read_text(encoding='utf-8'))
    replay = json.loads(query((HERE / 'catalog.sql').read_text(encoding='utf-8')))
    (HERE / 'replayed-catalog.json').write_text(json.dumps(replay, indent=2)+'\n', encoding='utf-8')
    # Global platform roles/config/extensions are not application migration
    # outputs; compare application schema/permissions and postgres public defaults.
    categories = ['relations','columns','policies','functions','triggers','constraints',
                  'indexes','schemas','effective_relation_permissions',
                  'effective_column_permissions','effective_function_permissions','view_dependencies']
    comparisons = {}
    for key in categories:
        normalize = lambda rows: sorted(json.dumps(row, sort_keys=True) for row in (rows or []))
        a, b = normalize(hosted[key]), normalize(replay[key])
        comparisons[key] = {'matches': a == b, 'hosted_count': len(a), 'replayed_count': len(b),
                            'hosted_only': [json.loads(v) for v in a if v not in b],
                            'replayed_only': [json.loads(v) for v in b if v not in a]}
    public_defaults = lambda d: [r for r in d['default_privileges']
                                 if r['owner']=='postgres' and r['schema']=='public']
    comparisons['postgres_public_default_privileges'] = {
        'matches': public_defaults(hosted)==public_defaults(replay),
        'hosted_count': len(public_defaults(hosted)),
        'replayed_count': len(public_defaults(replay)),
        'note': 'Bootstrap reproduces observed hosted defaults; repository migrations do not set these defaults.'}
    result = {'method': 'Replay all repository migrations in a unique disposable local database with empty Auth stub and explicit hosted postgres/public default grants; compare catalogs.',
              'source_migrations': source_results,
              'ledger_versions_match': sorted(ledger) == [p.name.split('_',1)[0] for p in migrations],
              'comparison': comparisons}
    (HERE / 'comparison.json').write_text(json.dumps(result, indent=2)+'\n', encoding='utf-8')
    print('Migration ledger source checks:',[(r['file'],r['ledger_statement_tokens_match']) for r in source_results])
    for key, value in comparisons.items():
        print(key, 'MATCH' if value['matches'] else 'DIFF', value['hosted_count'],value['replayed_count'])
finally:
    if created:
        # Unique name generated by this script; never drop any preexisting DB.
        docker('dropdb','-U','postgres',DATABASE)
        print('Disposable local database removed:',DATABASE)
