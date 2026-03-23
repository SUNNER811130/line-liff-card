#!/usr/bin/env node

import { createReleaseLabel, detectProductionTarget, runClaspDeploy } from './lib/production-gas.mjs';

async function main() {
  const [, , execUrlArg, versionNumberArg, descriptionArg] = process.argv;

  if (!versionNumberArg) {
    throw new Error('Usage: node ./scripts/update-production-gas-deployment.mjs [execUrl] <versionNumber> [description]');
  }

  const target = await detectProductionTarget(execUrlArg);
  const versionNumber = Number(versionNumberArg);
  if (!Number.isInteger(versionNumber) || versionNumber <= 0) {
    throw new Error(`Invalid versionNumber: ${versionNumberArg}`);
  }

  const description = descriptionArg || createReleaseLabel('codex-production-deploy');
  const deployment = await runClaspDeploy(target.scriptId, versionNumber, description, target.deploymentId);

  process.stdout.write(
    `${JSON.stringify(
      {
        scriptId: target.scriptId,
        execUrl: target.execUrl,
        deploymentId: target.deploymentId,
        versionNumber,
        description,
        deployment,
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
