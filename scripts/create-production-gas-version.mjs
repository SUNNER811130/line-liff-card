#!/usr/bin/env node

import { createReleaseLabel, createVersion, detectProductionTarget } from './lib/production-gas.mjs';

async function main() {
  const [, , execUrlArg, descriptionArg] = process.argv;
  const target = await detectProductionTarget(execUrlArg);
  const description = descriptionArg || createReleaseLabel('codex-production-version');
  const version = await createVersion(target.accessToken, target.scriptId, description);

  process.stdout.write(
    `${JSON.stringify(
      {
        scriptId: target.scriptId,
        execUrl: target.execUrl,
        versionNumber: version.versionNumber,
        description,
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
