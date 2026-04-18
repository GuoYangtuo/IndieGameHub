import { spawn } from 'child_process';
import path from 'path';

export interface CrawlResult {
  success: boolean;
  markdown?: string;
  error?: string;
}

export async function crawlUrl(url: string, pythonPath?: string): Promise<CrawlResult> {
  return new Promise((resolve) => {
    const pythonExec = pythonPath || 'python';
    const scriptPath = path.join(__dirname, '../scripts/storeCrawler.py');

    const proc = spawn(pythonExec, [scriptPath, url], {
      timeout: 30000,
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        console.error('Python crawler error:', stderr);
        resolve({ success: false, error: stderr || `Process exited with code ${code}` });
        return;
      }

      try {
        const lines = stdout.trim().split('\n').filter(line => line.trim());
        const lastLine = lines[lines.length - 1];
        const result = JSON.parse(lastLine);
        resolve(result);
      } catch (parseError) {
        console.error('Failed to parse crawler output:', stdout);
        resolve({ success: false, error: 'Failed to parse crawler output' });
      }
    });

    proc.on('error', (err) => {
      console.error('Failed to spawn Python process:', err);
      resolve({ success: false, error: `Failed to spawn Python process: ${err.message}` });
    });
  });
}
