import { Body, Controller, Post, Sse, Logger } from '@nestjs/common';
import { Observable, map, catchError, of, concat } from 'rxjs';
import { ClaudeService, type ClaudeStreamEvent } from '../claude/claude.service.js';
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

    const events$ = stream$.pipe(
      map((event: ClaudeStreamEvent): SseMessage => {
        switch (event.type) {
          case 'result':
            return {
              type: 'done',
              data: JSON.stringify({
                result: event.result,
                sessionId: event.sessionId,
              }),
            };

          case 'assistant_text':
            return {
              type: 'text',
              data: event.text ?? '',
            };

          case 'message':
            return {
              type: 'event',
              data: JSON.stringify(event.raw),
            };
        }
      }),
      catchError((err: Error) => {
        this.logger.error(`Stream error: ${err.message}`);
        return of<SseMessage>({
          type: 'error',
          data: JSON.stringify({ error: err.message }),
        });
      }),
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
