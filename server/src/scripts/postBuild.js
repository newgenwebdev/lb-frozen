const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const MEDUSA_SERVER_PATH = path.join(process.cwd(), '.medusa', 'server');

// Check if .medusa/server exists - if not, build process failed
if (!fs.existsSync(MEDUSA_SERVER_PATH)) {
  throw new Error('.medusa/server directory not found. This indicates the Medusa build process failed. Please check for build errors.');
}

// Copy lockfile if present (pnpm or npm) to ensure deterministic installs in runtime stage
const pnpmLockPath = path.join(process.cwd(), 'pnpm-lock.yaml');
const npmLockPath = path.join(process.cwd(), 'package-lock.json');
if (fs.existsSync(pnpmLockPath)) {
  fs.copyFileSync(
    pnpmLockPath,
    path.join(MEDUSA_SERVER_PATH, 'pnpm-lock.yaml')
  );
} else if (fs.existsSync(npmLockPath)) {
  fs.copyFileSync(
    npmLockPath,
    path.join(MEDUSA_SERVER_PATH, 'package-lock.json')
  );
}

// Copy .env if it exists
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  fs.copyFileSync(
    envPath,
    path.join(MEDUSA_SERVER_PATH, '.env')
  );
}

// Copy openapi-specs directory for Swagger documentation
const openapiSpecsSource = path.join(process.cwd(), 'openapi-specs');
const openapiSpecsTarget = path.join(MEDUSA_SERVER_PATH, 'openapi-specs');
if (fs.existsSync(openapiSpecsSource)) {
  console.log('Copying OpenAPI specs to .medusa/server...');
  fs.mkdirSync(openapiSpecsTarget, { recursive: true });
  fs.readdirSync(openapiSpecsSource).forEach(file => {
    fs.copyFileSync(
      path.join(openapiSpecsSource, file),
      path.join(openapiSpecsTarget, file)
    );
  });
  console.log('OpenAPI specs copied successfully');
}

// Copy patches directory for pnpm patched dependencies
const patchesSource = path.join(process.cwd(), 'patches');
const patchesTarget = path.join(MEDUSA_SERVER_PATH, 'patches');
if (fs.existsSync(patchesSource)) {
  console.log('Copying patches to .medusa/server...');
  fs.mkdirSync(patchesTarget, { recursive: true });
  fs.readdirSync(patchesSource).forEach(file => {
    fs.copyFileSync(
      path.join(patchesSource, file),
      path.join(patchesTarget, file)
    );
  });
  console.log('Patches copied successfully');
}

// Install dependencies using pnpm if available, fallback to npm
console.log('Installing dependencies in .medusa/server...');
try {
  execSync('pnpm install --prod --frozen-lockfile', {
    cwd: MEDUSA_SERVER_PATH,
    stdio: 'inherit'
  });
} catch (e) {
  console.warn('pnpm install failed or pnpm not available, falling back to npm install');
  execSync('npm ci --only=production', {
    cwd: MEDUSA_SERVER_PATH,
    stdio: 'inherit'
  });
}
