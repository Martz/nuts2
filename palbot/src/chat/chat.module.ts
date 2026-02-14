import { Module } from '@nestjs/common';
import { ClaudeModule } from '../claude/claude.module.js';
import { ChatController } from './chat.controller.js';

@Module({
  imports: [ClaudeModule],
  controllers: [ChatController],
})
export class ChatModule {}
