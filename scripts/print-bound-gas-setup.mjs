#!/usr/bin/env node

const mode = process.argv.includes('--deploy') ? 'deploy' : 'setup';

const lines = [
  'Bound GAS files:',
  '  gas/bound-card-backend/Code.gs',
  '  gas/bound-card-backend/appsscript.json',
  '',
  'Required Script Properties:',
  '  ADMIN_WRITE_SECRET=...',
  '  ADMIN_SESSION_SECRET=...',
  '  ADMIN_SESSION_TTL_SECONDS=3600',
  '  DRIVE_UPLOAD_FOLDER_ID=...',
  '',
  'Required spreadsheet tab:',
  '  cards_runtime',
  '  columns: slug | config_json | updated_at | updated_by',
  '',
  'Frontend env:',
  '  VITE_CARD_API_BASE_URL=https://script.google.com/macros/s/DEPLOYMENT_ID/exec',
];

if (mode === 'deploy') {
  lines.push('', 'After manual Web App deployment, run:', '  npm run gas:check -- https://script.google.com/macros/s/DEPLOYMENT_ID/exec');
}

console.log(lines.join('\n'));
