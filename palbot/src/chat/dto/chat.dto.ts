export class ChatRequestDto {
  /** The message/prompt to send to Claude */
  prompt!: string;

  /** Optional session ID to continue a previous conversation */
  sessionId?: string;

  /** Optional list of tools Claude is allowed to use (e.g. ["Read", "Bash"]) */
  allowedTools?: string[];

  /** Optional system prompt to append */
  systemPrompt?: string;
}
