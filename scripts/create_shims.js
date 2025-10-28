const fs = require('fs');
const path = require('path');

function ensureShim(name, content) {
  const shimFolder = path.join(__dirname, '..', 'node_modules', name);
  const shimIndex = path.join(shimFolder, 'index.js');

  try {
    if (!fs.existsSync(shimFolder)) fs.mkdirSync(shimFolder, { recursive: true });
    fs.writeFileSync(shimIndex, content, { encoding: 'utf8' });
    // cosmetic: ensure file is present
    // console.log('shim written:', shimIndex);
  } catch (err) {
    // Don't fail the whole install if filesystem is readonly
    // console.warn('Could not write shim', shimIndex, err && err.message);
  }
}

// node: builtin aliases that newer libraries may use. Older Electron/Node
// versions (or pnpm installs that skip postinstall) may not provide them.
// We create simple shims that forward to the real builtin modules.
ensureShim('node:path', "module.exports = require('path');\n");
ensureShim('node:fs', "module.exports = require('fs');\n");
