import fs from 'fs';
import path from 'path';

const versionFilePath = path.join(process.cwd(), 'src', 'config', 'version.ts');
const pkgFilePath = path.join(process.cwd(), 'package.json');

try {
  let major = 2;
  let minor = 5;
  let patch = 10;
  let pkgObj = null;

  const isRelease = process.argv.includes('--bump') || process.argv.includes('--release') || process.env.RELEASE_PUBLISH === 'true';

  if (fs.existsSync(pkgFilePath)) {
    pkgObj = JSON.parse(fs.readFileSync(pkgFilePath, 'utf-8'));
    if (pkgObj.version && pkgObj.version !== '0.0.0') {
      const parts = pkgObj.version.split('.').map(n => parseInt(n, 10));
      if (parts.length >= 3 && !parts.some(isNaN)) {
        major = parts[0];
        minor = parts[1];
        patch = parts[2] + 1; // A cada compilação o número da versão deve ser incrementado
      }
    }
  }

  const newSemver = `${major}.${minor}.${patch}`;

  if (pkgObj) {
    pkgObj.version = newSemver;
    fs.writeFileSync(pkgFilePath, JSON.stringify(pkgObj, null, 2) + '\n', 'utf-8');
    if (isRelease) {
      console.log(`[RELEASE] Nova versão publicada e registrada em package.json: v${newSemver}`);
    } else {
      console.log(`[BUILD] Versão sincronizada com package.json: v${newSemver}`);
    }
  }

  const formattedVersion = `v${newSemver}`;
  const fullVersion = `Acervus Core ${formattedVersion} (Multi-Tenant)`;

  const content = `// Auto-generated version config
export const SYSTEM_VERSION = '${formattedVersion}';
export const SYSTEM_VERSION_FULL = '${fullVersion}';
export const BUILD_TIMESTAMP = '${new Date().toISOString()}';
`;

  fs.writeFileSync(versionFilePath, content, 'utf-8');
  console.log(`[VERSION] Arquivo de configuração sincronizado: ${versionFilePath} (${formattedVersion})`);
} catch (err) {
  console.error('[BUILD] Erro ao processar versão do sistema:', err);
}
