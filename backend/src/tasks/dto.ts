import { ArrayMaxSize, IsArray, IsInt, IsOptional, Min } from 'class-validator';

export class ClaimTaskDto {
  /**
   * Chosen option index per question, in question order. Required for QUIZ
   * tasks and ignored by every other type.
   *
   * The bounds here are only a sanity check on the shape — whether an index
   * actually exists on its question, and whether it is the right one, is
   * decided in TasksService against the stored questions.
   */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsInt({ each: true })
  @Min(0, { each: true })
  answers?: number[];
}
