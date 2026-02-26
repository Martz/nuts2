import { ClaudeService } from './claude.service';
import { firstValueFrom, toArray } from 'rxjs';

// Minimal stand-ins for SDK message types used by the service.
function makeResultSuccess(text: string, sessionId = 'sess-1') {
  return {
    type: 'result' as const,
    subtype: 'success' as const,
    result: text,
    session_id: sessionId,
    uuid: '00000000-0000-0000-0000-000000000001',
  };
}

function makeResultError(errors: string[], sessionId = 'sess-1') {
  return {
    type: 'result' as const,
    subtype: 'error_during_execution' as const,
    errors,
    session_id: sessionId,
    uuid: '00000000-0000-0000-0000-000000000002',
  };
}

function makeStreamDelta(text: string) {
  return {
    type: 'stream_event' as const,
    event: {
      type: 'content_block_delta' as const,
      delta: { type: 'text_delta', text },
      index: 0,
    },
    parent_tool_use_id: null,
    uuid: '00000000-0000-0000-0000-000000000003',
    session_id: 'sess-1',
  };
}

function makeAssistantTextOnly(text: string) {
  return {
    type: 'assistant' as const,
    message: { content: [{ type: 'text', text }] },
    parent_tool_use_id: null,
    uuid: '00000000-0000-0000-0000-000000000004',
    session_id: 'sess-1',
  };
}

function makeAssistantWithToolUse() {
  return {
    type: 'assistant' as const,
    message: {
      content: [
        { type: 'text', text: 'calling tool' },
        { type: 'tool_use', id: 'tu-1', name: 'Bash', input: {} },
      ],
    },
    parent_tool_use_id: null,
    uuid: '00000000-0000-0000-0000-000000000005',
    session_id: 'sess-1',
  };
}

// Helper: create an async generator from an array of messages.
async function* asyncGen<T>(items: T[]): AsyncGenerator<T, void> {
  for (const item of items) {
    yield item;
  }
}

// Mock the SDK query function.
jest.mock('@anthropic-ai/claude-agent-sdk', () => ({
  query: jest.fn(),
}));

import { query as mockQuery } from '@anthropic-ai/claude-agent-sdk';

describe('ClaudeService', () => {
  let service: ClaudeService;

  beforeEach(() => {
    service = new ClaudeService();
    jest.clearAllMocks();
  });

  describe('ask()', () => {
    it('returns the result text and session ID on success', async () => {
      (mockQuery as jest.Mock).mockReturnValue(
        asyncGen([makeResultSuccess('Hello world', 'sess-42')]),
      );

      const result = await service.ask('Hi');

      expect(result).toEqual({ result: 'Hello world', sessionId: 'sess-42' });
    });

    it('throws on SDK error result', async () => {
      (mockQuery as jest.Mock).mockReturnValue(
        asyncGen([makeResultError(['rate limited', 'quota exceeded'])]),
      );

      await expect(service.ask('Hi')).rejects.toThrow(
        'Claude query failed (error_during_execution): rate limited; quota exceeded',
      );
    });

    it('throws when SDK returns no result message', async () => {
      (mockQuery as jest.Mock).mockReturnValue(asyncGen([]));

      await expect(service.ask('Hi')).rejects.toThrow(
        'Claude query completed without returning a result',
      );
    });
  });

  describe('stream()', () => {
    it('emits text deltas from stream_event and suppresses duplicate assistant text', async () => {
      (mockQuery as jest.Mock).mockReturnValue(
        asyncGen([
          makeStreamDelta('Hel'),
          makeStreamDelta('lo'),
          makeAssistantTextOnly('Hello'),
          makeResultSuccess('Hello', 'sess-1'),
        ]),
      );

      const events = await firstValueFrom(service.stream('Hi').pipe(toArray()));

      // Two text deltas + one result. The assistant text-only message is suppressed.
      expect(events).toHaveLength(3);
      expect(events[0]).toMatchObject({ type: 'assistant_text', text: 'Hel' });
      expect(events[1]).toMatchObject({ type: 'assistant_text', text: 'lo' });
      expect(events[2]).toMatchObject({
        type: 'result',
        result: 'Hello',
        sessionId: 'sess-1',
      });
    });

    it('surfaces assistant messages containing non-text blocks as "message" events', async () => {
      (mockQuery as jest.Mock).mockReturnValue(
        asyncGen([
          makeAssistantWithToolUse(),
          makeResultSuccess('done', 'sess-1'),
        ]),
      );

      const events = await firstValueFrom(service.stream('run tool').pipe(toArray()));

      expect(events).toHaveLength(2);
      expect(events[0]).toMatchObject({ type: 'message' });
      expect(events[1]).toMatchObject({ type: 'result' });
    });
  });
});
