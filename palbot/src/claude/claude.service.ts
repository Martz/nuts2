import { Injectable, Logger } from '@nestjs/common';
import { spawn, ChildProcessWithoutNullStreams } from 'node:child_process';
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
   * Stream a prompt to Claude Code headless mode.
   * Returns an Observable that emits parsed NDJSON events in real-time.
   */
  stream(
    prompt: string,
    options?: { sessionId?: string; allowedTools?: string[]; systemPrompt?: string },
  ): Observable<ClaudeStreamEvent> {
    const subject = new Subject<ClaudeStreamEvent>();

    const args = [
      '-p',
      prompt,
      '--output-format',
      'stream-json',
      '--verbose',
      '--include-partial-messages',
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

    this.logger.log(`Spawning: claude ${args.join(' ')}`);

    let child: ChildProcessWithoutNullStreams;
    try {
      child = spawn('claude', args, {
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch (err) {
      subject.error(new Error(`Failed to spawn claude CLI: ${err}`));
      return subject.asObservable();
    }

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
      this.logger.warn(`claude stderr: ${chunk.toString()}`);
    });

    child.on('close', (code) => {
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

    this.logger.log(`Spawning (sync): claude ${args.join(' ')}`);

    return new Promise((resolve, reject) => {
      const child = spawn('claude', args, {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (chunk: Buffer) => {
        stdout += chunk.toString();
      });

      child.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
      });

      child.on('close', (code) => {
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

      child.on('error', reject);
    });
  }
}
