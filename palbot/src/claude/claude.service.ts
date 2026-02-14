import { Injectable, Logger } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { query, type SDKMessage } from '@anthropic-ai/claude-agent-sdk';

/**
 * Re-export SDK message type so consumers can reference it if needed.
 * When migrating to v2 later, only this service needs to change.
 */
export type { SDKMessage };

/** Simplified streaming event emitted to callers (controller / SSE). */
export interface ClaudeStreamEvent {
  type: 'assistant_text' | 'result' | 'message';
  /** Text content for assistant_text events */
  text?: string;
  /** Full result string for result events */
  result?: string;
  /** Session ID (present on result events) */
  sessionId?: string;
  /** The raw SDK message for consumers that need full detail */
  raw?: SDKMessage;
}

export interface ClaudeSyncResult {
  result: string;
  sessionId: string;
}

export interface ClaudeQueryOptions {
  sessionId?: string;
  allowedTools?: string[];
  systemPrompt?: string;
  model?: string;
  maxTurns?: number;
  permissionMode?: 'default' | 'acceptEdits' | 'bypassPermissions' | 'plan';
}

@Injectable()
export class ClaudeService {
  private readonly logger = new Logger(ClaudeService.name);

  /**
   * Stream a prompt via the Claude Agent SDK.
   * Returns an Observable that emits simplified ClaudeStreamEvent objects.
   */
  stream(prompt: string, options?: ClaudeQueryOptions): Observable<ClaudeStreamEvent> {
    const subject = new Subject<ClaudeStreamEvent>();

    const sdkOptions = this.buildSdkOptions(options);

    this.logger.log(`SDK query (stream): "${prompt.slice(0, 80)}..."`);

    // Run the async generator in the background and feed the RxJS Subject
    (async () => {
      try {
        const conversation = query({
          prompt,
          options: sdkOptions,
        });

        for await (const message of conversation) {
          const event = this.mapMessageToEvent(message);
          if (event) {
            subject.next(event);
          }
        }

        subject.complete();
      } catch (err) {
        this.logger.error(`SDK stream error: ${err}`);
        subject.error(err instanceof Error ? err : new Error(String(err)));
      }
    })();

    return subject.asObservable();
  }

  /**
   * Send a prompt and wait for the complete response.
   */
  async ask(prompt: string, options?: ClaudeQueryOptions): Promise<ClaudeSyncResult> {
    const sdkOptions = this.buildSdkOptions(options);

    this.logger.log(`SDK query (sync): "${prompt.slice(0, 80)}..."`);

    const conversation = query({
      prompt,
      options: sdkOptions,
    });

    let resultText = '';
    let sessionId = '';

    for await (const message of conversation) {
      if (message.type === 'result' && message.subtype === 'success') {
        resultText = message.result;
        sessionId = message.session_id;
      } else if (message.type === 'result') {
        // Error subtypes
        sessionId = message.session_id;
        const errors = 'errors' in message ? (message.errors as string[]).join('; ') : 'Unknown error';
        throw new Error(`Claude query failed (${message.subtype}): ${errors}`);
      }
    }

    return { result: resultText, sessionId };
  }

  /**
   * Build SDK options from our service-level options.
   * Centralised here so a v2 migration only touches this method.
   */
  private buildSdkOptions(options?: ClaudeQueryOptions) {
    const sdkOptions: Record<string, unknown> = {};

    if (options?.sessionId) {
      sdkOptions.resume = options.sessionId;
    }

    if (options?.allowedTools?.length) {
      sdkOptions.allowedTools = options.allowedTools;
    }

    if (options?.systemPrompt) {
      sdkOptions.systemPrompt = options.systemPrompt;
    }

    if (options?.model) {
      sdkOptions.model = options.model;
    }

    if (options?.maxTurns !== undefined) {
      sdkOptions.maxTurns = options.maxTurns;
    }

    if (options?.permissionMode) {
      sdkOptions.permissionMode = options.permissionMode;
    }

    // Include partial messages so we get streaming text deltas
    sdkOptions.includePartialMessages = true;

    return sdkOptions;
  }

  /**
   * Map an SDK message to our simplified event format.
   * Returns null for message types we don't surface to callers.
   */
  private mapMessageToEvent(message: SDKMessage): ClaudeStreamEvent | null {
    switch (message.type) {
      case 'assistant': {
        // Extract text from content blocks
        const content = message.message.content as Array<{ type: string; text?: string }>;
        const textParts = content
          .filter((block) => block.type === 'text' && block.text)
          .map((block) => block.text as string);

        if (textParts.length > 0) {
          return {
            type: 'assistant_text',
            text: textParts.join(''),
            raw: message,
          };
        }

        // Non-text content (tool_use, etc.) — pass through as generic message
        return {
          type: 'message',
          raw: message,
        };
      }

      case 'result': {
        return {
          type: 'result',
          result: message.subtype === 'success' ? message.result : undefined,
          sessionId: message.session_id,
          raw: message,
        };
      }

      case 'stream_event': {
        // Partial streaming deltas
        const event = message.event;
        if (
          event &&
          'type' in event &&
          event.type === 'content_block_delta' &&
          'delta' in event
        ) {
          const delta = event.delta as { type?: string; text?: string };
          if (delta?.type === 'text_delta' && delta.text) {
            return {
              type: 'assistant_text',
              text: delta.text,
              raw: message,
            };
          }
        }
        return null;
      }

      default:
        // system, user, compact_boundary — not surfaced to callers
        return null;
    }
  }
}
