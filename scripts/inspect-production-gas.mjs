#!/usr/bin/env node

import { detectProductionTarget } from './lib/production-gas.mjs';

async function main() {
  const [, , execUrlArg] = process.argv;
  const target = await detectProductionTarget(execUrlArg);

  process.stdout.write(
    `${JSON.stringify(
      {
        execUrl: target.execUrl,
        scriptId: target.scriptId,
        deploymentId: target.deploymentId,
        currentVersion: target.currentDeployment?.deploymentConfig?.versionNumber ?? null,
        title: target.project.title || '',
        parentId: target.project.parentId || null,
        contentFlags: target.contentFlags,
        deployments: target.deployments.map((deployment) => ({
          deploymentId: deployment.deploymentId,
          versionNumber: deployment.deploymentConfig?.versionNumber ?? null,
          description: deployment.deploymentConfig?.description ?? '',
          webAppUrl:
            deployment.entryPoints?.find((entryPoint) => entryPoint.entryPointType === 'WEB_APP')?.webApp?.url ?? '',
          updateTime: deployment.updateTime ?? '',
        })),
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
