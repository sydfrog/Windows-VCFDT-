const fs = require('fs');
const { TOKEN_FILE, DOWNLOAD_TOKEN_FILE } = require('./config');

// Broadcom's CLI accepts two kinds of depot credential, and exactly one is
// used at a time:
//   activation - an activation code ("auth key"), registered against the
//                software depot ID:  --depot-download-activation-code-file
//   token      - a download token:  --depot-download-token-file
// Each lives in its own file; saving one deletes the other, so whichever
// file exists *is* the active choice and there's no separate mode to drift.
const KINDS = {
  activation: {
    file: TOKEN_FILE,
    flag: '--depot-download-activation-code-file',
    label: 'Activation code',
  },
  token: {
    file: DOWNLOAD_TOKEN_FILE,
    flag: '--depot-download-token-file',
    label: 'Download token',
  },
};

function activeKind() {
  if (fs.existsSync(KINDS.activation.file)) return 'activation';
  if (fs.existsSync(KINDS.token.file)) return 'token';
  return null;
}

function hasCredential() {
  return activeKind() !== null;
}

// The single CLI argument that authenticates against the depot, e.g.
// ['--depot-download-token-file=C:\\...\\download-token.txt']. Every
// binaries/artifacts/releases call spreads this in.
function credentialArgs() {
  const kind = activeKind();
  if (!kind) return [];
  return [`${KINDS[kind].flag}=${KINDS[kind].file}`];
}

function getStatus() {
  const kind = activeKind();
  if (!kind) {
    return { saved: false, kind: null };
  }
  const { file, label } = KINDS[kind];
  const stat = fs.statSync(file);
  const content = fs.readFileSync(file, 'utf8').trim();
  const preview = content.length <= 8 ? '*'.repeat(content.length) : `${content.slice(0, 4)}...${content.slice(-4)}`;
  return { saved: true, kind, label, savedAt: stat.mtime.toISOString(), preview };
}

function save(token, kind = 'activation') {
  if (!KINDS[kind]) {
    throw new Error('Credential type must be "activation" (activation code) or "token" (download token)');
  }
  const trimmed = (token || '').trim();
  if (!trimmed) {
    throw new Error(`${KINDS[kind].label} cannot be empty`);
  }
  fs.writeFileSync(KINDS[kind].file, `${trimmed}\n`, { mode: 0o600 });
  for (const [other, { file }] of Object.entries(KINDS)) {
    if (other !== kind) fs.rmSync(file, { force: true });
  }
}

function clear() {
  for (const { file } of Object.values(KINDS)) fs.rmSync(file, { force: true });
}

module.exports = { getStatus, save, clear, credentialArgs, hasCredential, activeKind };
