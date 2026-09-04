import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { ClaimTaskDto } from './dto';
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

  /**
   * POST /api/tasks/:id/claim — credit the reward.
   *
   * QUIZ tasks must carry `answers`; they are marked server-side and the
   * reward is scaled by the score. Every other type ignores the body.
   */
  @Post(':id/claim')
  claim(
    @CurrentUser('id') userId: string,
    @Param('id') taskId: string,
    @Body() dto: ClaimTaskDto,
  ) {
    return this.tasks.claim(userId, taskId, dto.answers);
  }
}
