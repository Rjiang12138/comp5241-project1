const test = require('node:test');
const assert = require('node:assert/strict');
const { createLoader } = require('./load-ts.cjs');

function analyticsFixture({ learners = 5, completing = learners, events: extraEvents = [] } = {}) {
  const enrolments = Array.from({ length: learners }, (_, index) => ({
    id: `e${index}`, userId: `u${index}`,
    user: { name: `Learner ${index}`, background: 'non_cs' },
  }));
  const activities = [
    { id: 'reading', title: 'Read', format: 'reading', module: { position: 1 } },
    { id: 'quiz', title: 'Quiz', format: 'quiz', module: { position: 2 } },
  ];
  const now = new Date();
  const events = Array.from({ length: completing }, (_, index) => ({
    enrollmentId: `e${index}`, activityId: 'reading', type: 'activity_completed', createdAt: now,
  })).concat(extraEvents);
  const prisma = {
    enrollment: { findMany: async () => enrolments },
    activity: { findMany: async () => activities },
    event: { findMany: async () => events },
  };
  return createLoader({ './db': { prisma } })('lib/store.ts').courseAnalytics('course', 7);
}

test('zero and small samples do not produce a causal or ranked insight', async () => {
  for (const [learners, completing] of [[0, 0], [1, 1], [5, 4]]) {
    const result = await analyticsFixture({ learners, completing });
    assert.equal(result.learnersWithCompletions, completing);
    assert.equal(result.insight, null);
  }
});

test('five learners produce descriptive counts without claiming a cause', async () => {
  const result = await analyticsFixture({ learners: 6, completing: 5 });
  assert.equal(result.learnersWithCompletions, 5);
  assert.match(result.insight.headline, /Quiz completion is 83 points below Reading/);
  assert.match(result.insight.body, /0 of 6 learner-activity pairs/);
  assert.match(result.insight.body, /5 of 6/);
  assert.match(result.insight.body, /does not establish a cause/);
  assert.equal(result.byFormat.find((x) => x.format === 'reading').possible, 6);
  assert.equal(result.byFormat.find((x) => x.format === 'reading').completed, 5);
});

test('the weekly chart uses historical events even when attempts are filtered to seven days', async () => {
  const old = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
  const result = await analyticsFixture({ learners: 1, completing: 0, events: [
    { enrollmentId: 'e0', activityId: 'quiz', type: 'activity_attempted', createdAt: old },
  ] });
  assert.equal(result.medianAttempts, 0);
  assert.equal(result.weekly.at(-2).value, 100);
  assert.equal(result.weekly.at(-1).value, 0);
});

test('duplicate and obsolete completions do not inflate the participating learner count', async () => {
  const now = new Date();
  const result = await analyticsFixture({ learners: 2, completing: 1, events: [
    { enrollmentId: 'e0', activityId: 'reading', type: 'activity_completed', createdAt: now },
    { enrollmentId: 'e1', activityId: 'removed', type: 'activity_completed', createdAt: now },
  ] });
  assert.equal(result.learnersWithCompletions, 1);
  assert.equal(result.byFormat.find((x) => x.format === 'reading').completed, 1);
});
