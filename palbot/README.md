# Palbot

A NestJS API that exposes Claude Code's headless mode as a web service. Palbot provides both synchronous and streaming (Server-Sent Events) HTTP endpoints, allowing external applications to interact with Claude Code CLI through standard HTTP requests.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) installed and authenticated

## Setup

```bash
npm install
```

## Running the Server

```bash
# development (watch mode)
npm run start:dev

# production
npm run build
npm run start:prod
```

The server starts on `http://localhost:3000` by default. Set the `PORT` environment variable to use a different port.

## API

### `POST /chat` — Synchronous Response

Sends a prompt and waits for the complete response.

**Request body:**

| Field          | Type       | Required | Description                                      |
|----------------|------------|----------|--------------------------------------------------|
| `prompt`       | `string`   | Yes      | The message to send to Claude                    |
| `sessionId`    | `string`   | No       | Session ID to resume a previous conversation     |
| `allowedTools` | `string[]` | No       | Tools Claude is allowed to use (e.g. `["Read"]`) |
| `systemPrompt` | `string`   | No       | Additional instructions appended to system prompt |

**Example:**

```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"prompt": "What is 2+2?"}'
```

**Response:**

```json
{
  "result": "2 + 2 = 4",
  "sessionId": "abc123"
}
```

### `POST /chat/stream` — Streaming Response (SSE)

Streams Claude's response in real-time as Server-Sent Events.

**Request body:** Same as `/chat`.

**Example:**

```bash
curl -X POST http://localhost:3000/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Explain quantum computing"}'
```

**Event types:**

| Event   | Description                                              |
|---------|----------------------------------------------------------|
| `text`  | A text delta (individual token)                          |
| `event` | Tool use, content block, or other Claude stream event    |
| `done`  | Final result with `result` and `sessionId` in JSON data  |
| `error` | An error occurred                                        |
| `close` | Stream has ended                                         |

### Resuming a Conversation

Pass the `sessionId` from a previous response to continue the conversation:

```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Continue where we left off", "sessionId": "abc123"}'
```

### Restricting Tools

Limit which tools Claude can use during a request:

```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"prompt": "List the files", "allowedTools": ["Bash", "Read"]}'
```

## Architecture

```
src/
├── main.ts                   # Bootstrap, CORS, port config
├── app.module.ts             # Root NestJS module
├── chat/
│   ├── chat.module.ts        # Chat feature module
│   ├── chat.controller.ts    # /chat and /chat/stream endpoints
│   └── dto/
│       └── chat.dto.ts       # Request DTO
└── claude/
    ├── claude.module.ts      # Claude service module
    └── claude.service.ts     # Spawns Claude CLI as a child process
```

`ClaudeService` spawns the `claude` CLI in headless mode (`-p` flag) and parses its NDJSON output. For streaming requests it uses `--output-format stream-json`; for synchronous requests it uses `--output-format json`.

## Tests

```bash
# unit tests
npm run test

# e2e tests
npm run test:e2e

# test coverage
npm run test:cov
```

## License

UNLICENSED
