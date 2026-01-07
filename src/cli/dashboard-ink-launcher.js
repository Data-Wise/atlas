/**
 * Ink Dashboard Launcher
 *
 * Wrapper to launch the Ink dashboard using tsx for JSX support.
 * This avoids the need for JSX transformation in the main CLI.
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Run the Ink dashboard
 *
 * @param {Object} atlas - Atlas container instance (not used in POC)
 * @returns {Promise<void>}
 */
export async function runDashboard(atlas) {
  const dashboardPath = join(__dirname, 'dashboard-ink', 'index.tsx');

  return new Promise((resolve, reject) => {
    const child = spawn('npx', ['tsx', dashboardPath], {
      stdio: 'inherit',
      env: process.env
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Dashboard exited with code ${code}`));
      }
    });

    child.on('error', (err) => {
      reject(err);
    });
  });
}
