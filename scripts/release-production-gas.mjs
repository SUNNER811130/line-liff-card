#!/usr/bin/env node

import {
  createReleaseLabel,
  createVersion,
  detectProductionTarget,
  runClaspDeploy,
  runClaspPush,
} from './lib/production-gas.mjs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const runNodeScript = (scriptName, args = []) =>
  new Promise((resolve, reject) => {
    const child = spawn('node', [path.join(__dirname, scriptName), ...args], {
      cwd: path.resolve(__dirname, '..'),
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || stdout.trim() || `${scriptName} failed with exit code ${code}.`));
        return;
      }
      resolve(JSON.parse(stdout));
    });
  });

async function main() {
  const [, , execUrlArg] = process.argv;
  const target = await detectProductionTarget(execUrlArg);
  const push = await runClaspPush(target.scriptId);
  const versionDescription = createReleaseLabel('codex-production-version');
  const version = await createVersion(target.accessToken, target.scriptId, versionDescription);
  const deploymentDescription = createReleaseLabel('codex-production-deploy');
  const deployment = await runClaspDeploy(target.scriptId, version.versionNumber, deploymentDescription, target.deploymentId);
  const verify = await runNodeScript('verify-production-gas.mjs', [target.execUrl]);

  process.stdout.write(
    `${JSON.stringify(
      {
        execUrl: target.execUrl,
        scriptId: target.scriptId,
        deploymentId: target.deploymentId,
        previousVersion: target.currentDeployment?.deploymentConfig?.versionNumber ?? null,
        push,
        versionNumber: version.versionNumber,
        versionDescription,
        deploymentDescription,
        deployment,
        verify,
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
