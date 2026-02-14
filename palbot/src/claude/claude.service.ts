import { Injectable, Logger } from '@nestjs/common';
import { spawn } from 'node:child_process';
import { Observable, Subject } from 'rxjs';

/** A single streaming event from `claude -p --output-format stream-json` */
export interface ClaudeStreamEvent {
  type: string;
  /** Present on stream_event messages */
  event?: {
    type?: string;
    delta?: {
      type?: string;
      text?: string;
    };
    content_block?: {
      type?: string;
      text?: string;
    };
    [key: string]: unknown;
  };
  /** Present on the final result message */
  result?: string;
  session_id?: string;
  [key: string]: unknown;
}

export interface ClaudeSyncResult {
  result: string;
  sessionId: string;
  raw: ClaudeStreamEvent;
}

@Injectable()
export class ClaudeService {
  private readonly logger = new Logger(ClaudeService.name);

  /**
   * Resolve the full path to the claude binary so spawn always finds it,
   * even when Node's PATH differs from the user's interactive shell.
   */
  private claudeBin = '';
  private resolveClaudeBin(): string {
    if (this.claudeBin) return this.claudeBin;

    const { execSync } = require('node:child_process');
    try {
      this.claudeBin = execSync('which claude', { encoding: 'utf-8' }).trim();
      this.logger.log(`Resolved claude binary: ${this.claudeBin}`);
    } catch {
      this.claudeBin = 'claude'; // fallback
      this.logger.warn('Could not resolve claude path, falling back to "claude"');
    }
    return this.claudeBin;
  }

  /**
   * Stream a prompt to Claude Code headless mode.
   * Returns an Observable that emits parsed NDJSON events in real-time.
   */
  stream(
    prompt: string,
    options?: { sessionId?: string; allowedTools?: string[]; systemPrompt?: string },
  ): Observable<ClaudeStreamEvent> {
    const subject = new Subject<ClaudeStreamEvent>();
    const bin = this.resolveClaudeBin();

    const args = [
      '-p',
      prompt,
      '--output-format',
      'stream-json',
      '--verbose',
    ];

    if (options?.sessionId) {
      args.push('--resume', options.sessionId);
    }

    if (options?.allowedTools?.length) {
      args.push('--allowedTools', options.allowedTools.join(','));
    }

    if (options?.systemPrompt) {
      args.push('--append-system-prompt', options.systemPrompt);
    }

    this.logger.log(`Spawning: ${bin} ${args.map((a) => JSON.stringify(a)).join(' ')}`);

    const child = spawn(bin, args, {
      // 'ignore' stdin — claude -p does not need it and a dangling pipe can cause hangs
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let buffer = '';

    child.stdout.on('data', (chunk: Buffer) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      // Keep the last (possibly incomplete) line in the buffer
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const parsed: ClaudeStreamEvent = JSON.parse(trimmed);
          subject.next(parsed);
        } catch {
          this.logger.warn(`Non-JSON line from claude: ${trimmed}`);
        }
      }
    });

    child.stderr.on('data', (chunk: Buffer) => {
      this.logger.warn(`claude stderr: ${chunk.toString().trim()}`);
    });

    child.on('close', (code, signal) => {
      this.logger.log(`claude process exited (code=${code}, signal=${signal})`);
      // Flush remaining buffer
      if (buffer.trim()) {
        try {
          const parsed: ClaudeStreamEvent = JSON.parse(buffer.trim());
          subject.next(parsed);
        } catch {
          this.logger.warn(`Non-JSON trailing data: ${buffer.trim()}`);
        }
      }
      if (code !== 0) {
        subject.error(new Error(`claude exited with code ${code}`));
      } else {
        subject.complete();
      }
    });

    child.on('error', (err) => {
      this.logger.error(`claude spawn error: ${err.message}`);
      subject.error(err);
    });

    return subject.asObservable();
  }

  /**
   * Send a prompt and wait for the complete response.
   */
  async ask(
    prompt: string,
    options?: { sessionId?: string; allowedTools?: string[]; systemPrompt?: string },
  ): Promise<ClaudeSyncResult> {
    const bin = this.resolveClaudeBin();
    const args = ['-p', prompt, '--output-format', 'json'];

    if (options?.sessionId) {
      args.push('--resume', options.sessionId);
    }

    if (options?.allowedTools?.length) {
      args.push('--allowedTools', options.allowedTools.join(','));
    }

    if (options?.systemPrompt) {
      args.push('--append-system-prompt', options.systemPrompt);
    }

    this.logger.log(`Spawning (sync): ${bin} ${args.map((a) => JSON.stringify(a)).join(' ')}`);

    return new Promise((resolve, reject) => {
      const child = spawn(bin, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (chunk: Buffer) => {
        stdout += chunk.toString();
      });

      child.stderr.on('data', (chunk: Buffer) => {
        const msg = chunk.toString();
        stderr += msg;
        this.logger.warn(`claude stderr: ${msg.trim()}`);
      });

      child.on('close', (code, signal) => {
        this.logger.log(`claude (sync) exited (code=${code}, signal=${signal})`);
        if (code !== 0) {
          reject(new Error(`claude exited with code ${code}: ${stderr}`));
          return;
        }
        try {
          const parsed: ClaudeStreamEvent = JSON.parse(stdout.trim());
          resolve({
            result: parsed.result ?? '',
            sessionId: parsed.session_id ?? '',
            raw: parsed,
          });
        } catch {
          reject(new Error(`Failed to parse claude output: ${stdout}`));
        }
      });

      child.on('error', (err) => {
        this.logger.error(`claude (sync) spawn error: ${err.message}`);
        reject(err);
      });
    });
  }
}
