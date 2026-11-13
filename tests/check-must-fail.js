#!/usr/bin/env node
'use strict';

// Runs the scenarios of tests/must-fail/ and checks that every one of them
// FAILS, at its last step, with the message its description announces
// ("Fails with: ..."), and that the message carries a hint.
//
// A step that cannot fail proves nothing. Each scenario here asserts something
// that is not true on the test site; the steps before the last one must pass.
// The scenarios only read: they leave the site as they found it.
//
// Usage: node tests/check-must-fail.js   (the site of cucumber.js must be up)

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const report = path.join(root, 'tests', 'reports', 'must-fail.json');
const features = fs.readdirSync(path.join(root, 'tests', 'must-fail')).filter((file) => file.endsWith('.feature')).map((file) => `tests/must-fail/${file}`);

fs.rmSync(report, { force: true });
spawnSync('npx', ['cucumber-js', '--config', 'cucumber.js'], {
  cwd: root,
  stdio: ['ignore', 'ignore', 'inherit'],
  env: { ...process.env, FEATURES: features.join(','), REPORT_NAME: 'must-fail', WEBSHIP_REPORT_DISABLE: '1', WEBSHIP_SCREENSHOT_ON_FAILED: 'false' },
});

if (!fs.existsSync(report)) {
  console.error('The must-fail run wrote no report: cucumber-js did not start.');
  process.exit(1);
}

const strip = (text) => String(text || '').replace(/\u001b\[[0-9;]*m/g, '');
const problems = [];
let count = 0;
for (const feature of JSON.parse(fs.readFileSync(report, 'utf8'))) {
  for (const scenario of feature.elements || []) {
    count += 1;
    const where = `${feature.uri}:${scenario.line} "${scenario.name}"`;
    const wanted = (strip(scenario.description).match(/Fails with:\s*(.+)/) || [])[1];
    const steps = (scenario.steps || []).filter((step) => !step.hidden);
    const last = steps[steps.length - 1];
    const earlier = steps.slice(0, -1).filter((step) => step.result.status !== 'passed');
    if (!wanted) { problems.push(`${where}: no "Fails with:" line in its description.`); continue; }
    if (earlier.length) { problems.push(`${where}: an earlier step did not pass (${earlier[0].keyword}${earlier[0].name}: ${earlier[0].result.status}) ${strip(earlier[0].result.error_message).split('\n')[0]}`); continue; }
    if (!last || last.result.status !== 'failed') { problems.push(`${where}: its last step ${last ? last.result.status : 'is missing'}; it must fail.`); continue; }
    const message = strip(last.result.error_message);
    if (!message.includes(wanted.trim())) { problems.push(`${where}: failed, but not with "${wanted.trim()}":\n      ${message.split('\n').slice(0, 3).join('\n      ')}`); continue; }
    if (!/Hint:/.test(message)) { problems.push(`${where}: the failure carries no hint:\n      ${message.split('\n')[0]}`); continue; }
    console.log(`  fails as it must: ${scenario.name}\n      ${message.split('\n')[0].trim()}`);
  }
}

if (!count) problems.push('No must-fail scenario ran.');
if (problems.length) {
  console.error(`\n${problems.length} problem(s) in ${count} must-fail scenario(s):\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log(`\n${count} must-fail scenarios, each failed at its last step with the announced message and a hint.`);
