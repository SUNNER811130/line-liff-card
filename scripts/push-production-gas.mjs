#!/usr/bin/env node

import { detectProductionTarget, runClaspPush } from './lib/production-gas.mjs';

async function main() {
  const [, , execUrlArg] = process.argv;
  const target = await detectProductionTarget(execUrlArg);
  const result = await runClaspPush(target.scriptId);

  process.stdout.write(
    `${JSON.stringify(
      {
        scriptId: target.scriptId,
        execUrl: target.execUrl,
        deploymentId: target.deploymentId,
        push: result,
      },
      null,
      2,
    )}\n`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
