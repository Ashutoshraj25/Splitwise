const fs = require('fs');
const net = require('net');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const isWindows = process.platform === 'win32';
const npmCommand = isWindows ? 'npm.cmd' : 'npm';
const repoRoot = path.resolve(__dirname, '..');
const lockFile = path.join(repoRoot, '.dev-runner.pid');
const children = [];
let shuttingDown = false;

function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return false;
  }
}

function cleanupLockFile() {
  if (fs.existsSync(lockFile)) {
    const currentPid = fs.readFileSync(lockFile, 'utf8').trim();

    if (currentPid === String(process.pid)) {
      fs.unlinkSync(lockFile);
    }
  }
}

function ensureSingleRunner() {
  if (!fs.existsSync(lockFile)) {
    fs.writeFileSync(lockFile, String(process.pid));
    return;
  }

  const existingPid = Number.parseInt(fs.readFileSync(lockFile, 'utf8').trim(), 10);

  if (Number.isInteger(existingPid) && existingPid > 0 && isProcessAlive(existingPid)) {
    process.stderr.write(
      `Splitwise dev is already running with PID ${existingPid}. Stop that process before starting another one.\n`
    );
    process.exit(1);
  }

  fs.writeFileSync(lockFile, String(process.pid));
}

function checkPortAvailable(port) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.once('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        resolve(false);
        return;
      }

      reject(error);
    });

    server.once('listening', () => {
      server.close(() => resolve(true));
    });

    server.listen(port, '0.0.0.0');
  });
}

async function ensureRequiredPortsAvailable() {
  const requiredPorts = [
    { port: 5000, service: 'backend' },
    { port: 5173, service: 'frontend' },
  ];

  for (const entry of requiredPorts) {
    const available = await checkPortAvailable(entry.port);

    if (!available) {
      process.stderr.write(
        `Port ${entry.port} is already in use, so the ${entry.service} dev server cannot start. Stop the existing process using that port and try again.\n`
      );
      cleanupLockFile();
      process.exit(1);
    }
  }
}

function startService(name, cwd, args) {
  const serviceRoot = path.join(repoRoot, cwd);
  const child = spawn(npmCommand, args, {
    cwd: serviceRoot,
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: isWindows,
  });

  const prefix = `[${name}]`;

  child.stdout.on('data', (chunk) => {
    process.stdout.write(`${prefix} ${chunk}`);
  });

  child.stderr.on('data', (chunk) => {
    process.stderr.write(`${prefix} ${chunk}`);
  });

  child.on('exit', (code, signal) => {
    const reason = signal ? `signal ${signal}` : `code ${code}`;
    process.stdout.write(`${prefix} exited with ${reason}\n`);

    if (!shuttingDown) {
      shutdown(code || 1);
    }
  });

  child.on('error', (error) => {
    process.stderr.write(`${prefix} failed to start: ${error.message}\n`);

    if (!shuttingDown) {
      shutdown(1);
    }
  });

  children.push(child);
}

function stopChild(child) {
  if (!child || child.killed || child.exitCode !== null) {
    return;
  }

  if (isWindows) {
    spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
      stdio: 'ignore',
      windowsHide: true,
    });
    return;
  }

  child.kill('SIGINT');
}

function shutdown(exitCode) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  for (const child of children) {
    stopChild(child);
  }

  setTimeout(() => {
    cleanupLockFile();
    process.exit(exitCode);
  }, 500);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
process.on('exit', cleanupLockFile);

async function main() {
  ensureSingleRunner();
  await ensureRequiredPortsAvailable();

  startService('backend', 'backend', ['run', 'dev']);
  startService('frontend', 'frontend', ['run', 'dev', '--', '--host', '0.0.0.0']);
}

main().catch((error) => {
  cleanupLockFile();
  process.stderr.write(`Failed to start Splitwise dev runner: ${error.message}\n`);
  process.exit(1);
});
