const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const standaloneDir = path.join(root, '.next', 'standalone');

const copyIfExists = (from, to) => {
  if (!fs.existsSync(from)) {
    return;
  }

  fs.rmSync(to, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.cpSync(from, to, { recursive: true });
};

copyIfExists(path.join(root, '.next', 'static'), path.join(standaloneDir, '.next', 'static'));
copyIfExists(path.join(root, 'public'), path.join(standaloneDir, 'public'));

console.log('Standalone assets copied.');
