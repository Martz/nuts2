import { Injectable, Logger } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { query, type Options, type SDKMessage, type SDKResultError } from '@anthropic-ai/claude-agent-sdk';

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
  permissionMode?: Options['permissionMode'];
}

@Injectable()
export class ClaudeService {
  private readonly logger = new Logger(ClaudeService.name);

  /**
   * Stream a prompt via the Claude Agent SDK.
   * Returns an Observable that emits simplified ClaudeStreamEvent objects.
   *
   * Uses includePartialMessages so stream_event deltas arrive in real-time.
   * The final assembled `assistant` message is suppressed to avoid duplicate text.
   */
  stream(prompt: string, options?: ClaudeQueryOptions): Observable<ClaudeStreamEvent> {
    const subject = new Subject<ClaudeStreamEvent>();

    // includePartialMessages only makes sense for streaming — kept here, not in buildSdkOptions.
    const sdkOptions: Options = {
      ...this.buildSdkOptions(options),
      includePartialMessages: true,
    };

    this.logger.log(`SDK query (stream): "${prompt.slice(0, 80)}..."`);

    // Run the async generator in the background and feed the RxJS Subject.
    (async () => {
      try {
        const conversation = query({ prompt, options: sdkOptions });

        for await (const message of conversation) {
          const event = this.mapStreamMessage(message);
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
    const sdkOptions: Options = this.buildSdkOptions(options);
    // No includePartialMessages for sync calls — we only need the final result.

    this.logger.log(`SDK query (sync): "${prompt.slice(0, 80)}..."`);

    const conversation = query({ prompt, options: sdkOptions });

    let resultText: string | undefined;
    let sessionId = '';

    for await (const message of conversation) {
      if (message.type === 'result') {
        sessionId = message.session_id;

        if (message.subtype === 'success') {
          resultText = message.result;
        } else {
          const errorMessage = (message as SDKResultError).errors.join('; ');
          throw new Error(`Claude query failed (${message.subtype}): ${errorMessage}`);
        }
      }
    }

    if (resultText === undefined) {
      throw new Error('Claude query completed without returning a result');
    }

    return { result: resultText, sessionId };
  }

  /**
   * Build typed SDK options from our service-level options.
   * Centralised here so a v2 migration only touches this method.
   * Does NOT include includePartialMessages — callers add that if needed.
   */
  private buildSdkOptions(options?: ClaudeQueryOptions): Partial<Options> {
    const sdkOptions: Partial<Options> = {};

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

    return sdkOptions;
  }

  /**
   * Map an SDK message to a simplified stream event.
   * Returns null for message types we don't surface to callers.
   *
   * When includePartialMessages is true (stream mode):
   *   - stream_event text deltas → assistant_text (real-time tokens)
   *   - assistant text content   → null (already covered by the deltas above)
   *   - assistant non-text blocks (tool_use etc.) → message (for clients that need it)
   *   - result                   → result (final summary + sessionId)
   */
  private mapStreamMessage(message: SDKMessage): ClaudeStreamEvent | null {
    switch (message.type) {
      case 'stream_event': {
        // Partial streaming delta — extract text_delta content blocks.
        const event = message.event;
        if (
          event &&
          'type' in event &&
          event.type === 'content_block_delta' &&
          'delta' in event
        ) {
          const delta = event.delta as { type?: string; text?: string };
          if (delta?.type === 'text_delta' && delta.text) {
            return { type: 'assistant_text', text: delta.text, raw: message };
          }
        }
        return null;
      }

      case 'assistant': {
        // The assembled assistant message arrives after all stream_event deltas.
        // Text content is already streamed token-by-token above, so skip it here
        // to avoid sending the full response again as a single chunk.
        // Only surface non-text blocks (tool_use, thinking, etc.) that don't appear in deltas.
        const content = message.message.content as Array<{ type: string }>;
        const hasNonTextBlocks = content.some((block) => block.type !== 'text');
        if (hasNonTextBlocks) {
          return { type: 'message', raw: message };
        }
        return null;
      }

      case 'result': {
        return {
          type: 'result',
          result: message.subtype === 'success' ? message.result : undefined,
          sessionId: message.session_id,
          raw: message,
        };
      }

      default:
        // system, user, tool_progress, tool_use_summary, etc. — not surfaced to callers.
        return null;
    }
  }
}
