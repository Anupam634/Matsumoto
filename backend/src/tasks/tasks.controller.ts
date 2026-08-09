import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  /** GET /api/tasks — active tasks with this user's cooldown state. */
  @Get()
  list(@CurrentUser('id') userId: string) {
    return this.tasks.list(userId);
  }

  /** POST /api/tasks/:id/claim — credit the reward. */
  @Post(':id/claim')
  claim(@CurrentUser('id') userId: string, @Param('id') taskId: string) {
    return this.tasks.claim(userId, taskId);
  }
}
