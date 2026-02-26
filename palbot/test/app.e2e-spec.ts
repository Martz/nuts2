import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { ClaudeService } from './../src/claude/claude.service';

// The SDK ships as ESM (.mjs) which Jest (CommonJS mode) cannot parse.
// Mock it before any module under test imports it.
jest.mock('@anthropic-ai/claude-agent-sdk', () => ({ query: jest.fn() }));

describe('ChatController (e2e)', () => {
  let app: INestApplication<App>;

  const mockClaudeService = {
    ask: jest.fn().mockResolvedValue({ result: 'Hello!', sessionId: 'sess-1' }),
    stream: jest.fn(),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ClaudeService)
      .useValue(mockClaudeService)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  it('POST /chat returns result and sessionId', () => {
    return request(app.getHttpServer())
      .post('/chat')
      .send({ prompt: 'Hello' })
      .expect(201)
      .expect({ result: 'Hello!', sessionId: 'sess-1' });
  });
});
