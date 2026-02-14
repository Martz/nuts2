import { Body, Controller, Post, Sse, Logger } from '@nestjs/common';
import { Observable, map, filter, catchError, of, concat, tap, finalize } from 'rxjs';
import { ClaudeService, ClaudeStreamEvent } from '../claude/claude.service.js';
import { ChatRequestDto } from './dto/chat.dto.js';

interface SseMessage {
  data: string;
  type?: string;
  id?: string;
}

@Controller('chat')
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(private readonly claude: ClaudeService) {}

  /**
   * POST /chat/stream
   *
   * Streams Claude's response as Server-Sent Events.
   * The client receives real-time text deltas, tool use events,
   * and a final "done" event with the session ID.
   */
  @Post('stream')
  @Sse()
  streamChat(@Body() body: ChatRequestDto): Observable<SseMessage> {
    this.logger.log(`Stream request: "${body.prompt.slice(0, 80)}..."`);

    const stream$ = this.claude.stream(body.prompt, {
      sessionId: body.sessionId,
      allowedTools: body.allowedTools,
      systemPrompt: body.systemPrompt,
    });

    let sseEventCount = 0;

    const events$ = stream$.pipe(
      tap((event: ClaudeStreamEvent) =>
        this.logger.debug(`Raw event from service: type=${event.type}`),
      ),
      filter((event: ClaudeStreamEvent) => {
        // Pass through text deltas and result messages
        if (event.type === 'stream_event') return true;
        if (event.result !== undefined) return true;
        this.logger.debug(`Filtered out event: type=${event.type}`);
        return false;
      }),
      map((event: ClaudeStreamEvent): SseMessage => {
        // Final result message
        if (event.result !== undefined) {
          return {
            type: 'done',
            data: JSON.stringify({
              result: event.result,
              sessionId: event.session_id,
            }),
          };
        }

        // Text delta — the actual streaming tokens
        const delta = event.event?.delta;
        if (delta?.type === 'text_delta' && delta.text) {
          return {
            type: 'text',
            data: delta.text,
          };
        }

        // Other stream events (tool_use, content_block_start, etc.)
        return {
          type: 'event',
          data: JSON.stringify(event.event),
        };
      }),
      tap((msg: SseMessage) => {
        sseEventCount++;
        this.logger.log(`SSE #${sseEventCount}: type=${msg.type}`);
      }),
      catchError((err: Error) => {
        this.logger.error(`Stream error: ${err.message}`);
        return of<SseMessage>({
          type: 'error',
          data: JSON.stringify({ error: err.message }),
        });
      }),
      finalize(() =>
        this.logger.log(
          `Stream finished (${sseEventCount} SSE events emitted)`,
        ),
      ),
    );

    // Append a close signal so the client knows the stream is finished
    const close$ = of<SseMessage>({ type: 'close', data: '' });

    return concat(events$, close$);
  }

  /**
   * POST /chat
   *
   * Sends a prompt and waits for the complete response.
   * Returns { result, sessionId }.
   */
  @Post()
  async chat(@Body() body: ChatRequestDto) {
    this.logger.log(`Sync request: "${body.prompt.slice(0, 80)}..."`);

    const response = await this.claude.ask(body.prompt, {
      sessionId: body.sessionId,
      allowedTools: body.allowedTools,
      systemPrompt: body.systemPrompt,
    });

    return {
      result: response.result,
      sessionId: response.sessionId,
    };
  }
}
