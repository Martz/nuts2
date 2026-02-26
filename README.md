# nuts2

A monorepo containing tools for interacting with Claude Code via HTTP.

## Projects

### [palbot](./palbot)

A NestJS API that exposes Claude Code as a web service. Palbot wraps the [Claude Agent SDK](https://docs.anthropic.com/en/docs/claude-code) and provides both synchronous and streaming (Server-Sent Events) HTTP endpoints, allowing external applications to interact with Claude Code through standard HTTP requests.

**Endpoints:**
- `POST /chat` — Send a prompt and receive the complete response
- `POST /chat/stream` — Stream Claude's response in real-time via SSE

**Key features:**
- Session resumption — continue multi-turn conversations by passing a `sessionId`
- Tool restrictions — limit which tools Claude can access per request
- Custom system prompts — append additional instructions at runtime
- CORS enabled for cross-origin frontend integration

See the [palbot README](./palbot/README.md) for full setup instructions and API documentation.

## Requirements

- Node.js v18+
- Claude Code CLI installed and authenticated

## License

UNLICENSED
