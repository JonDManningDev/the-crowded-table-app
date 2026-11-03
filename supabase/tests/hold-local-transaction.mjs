import { spawn } from 'node:child_process';

// Hold a real open transaction until the caller releases it; no timing sleeps.
export async function holdLocalTransaction(container, database, statement) {
  const process = spawn('docker', ['exec', '-i', container, 'psql', '-X', '-qAt', '-U', 'postgres', '-d', database, '-v', 'ON_ERROR_STOP=1']);
  let output = '', error = '';
  const finished = new Promise((resolve, reject) => {
    process.on('error', reject);
    process.on('close', code => code === 0 ? resolve() : reject(new Error(error || `psql exited ${code}`)));
  });
  // Attach rejection handling immediately while waiting for readiness.
  finished.catch(() => {});
  const ready = new Promise((resolve, reject) => {
    const timer = setTimeout(() => { process.stdin.end('rollback;'); reject(new Error('lock acquisition timed out')); }, 10000);
    process.stdout.on('data', chunk => {
      output += chunk;
      if (output.includes('fixture_lock_ready')) { clearTimeout(timer); resolve(); }
    });
    process.stderr.on('data', chunk => { error += chunk; });
    finished.catch(err => { clearTimeout(timer); reject(err); });
  });
  process.stdin.write(`begin; ${statement}; select 'fixture_lock_ready';\n`);
  await ready;
  return async (commit = false) => { process.stdin.end(commit ? 'commit;\n' : 'rollback;\n'); await finished; };
}
