const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');

function seed(url) {
  return spawnSync(process.execPath, ['prisma/seed-r4-demo.mts'], {
    env: { ...process.env, R4_DEMO_DATABASE_URL: url }, encoding: 'utf8', windowsHide: true,
  });
}

test('demo seed requires an explicitly named demo database', () => {
  const result = seed('');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Set R4_DEMO_DATABASE_URL/);
});

test('demo seed refuses a remote database before opening a connection', () => {
  const result = seed('postgresql://demo:secret@example.test/demo');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /must point directly to localhost/);
  assert.doesNotMatch(result.stderr, /secret/);
});
