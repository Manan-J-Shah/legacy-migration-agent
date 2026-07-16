const { runJest, summarize } = require('./runJest');

const result = runJest({ ci: true });
const summary = summarize(result.json);

if (summary) {
  console.log(
    `Characterization baseline: ${summary.numPassed}/${summary.numTests} tests, ` +
      `${summary.snapshotsMatched}/${summary.snapshotsTotal} snapshots matched`
  );
}

if (result.status !== 0) {
  if (result.stderr) console.error(result.stderr);
  process.exitCode = result.status || 1;
}
