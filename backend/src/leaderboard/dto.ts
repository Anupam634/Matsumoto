import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import {
  LEADERBOARD_CATEGORIES,
  LEADERBOARD_PERIODS,
  LeaderboardCategory,
  LeaderboardPeriod,
  MAX_LIMIT,
} from './leaderboard.engine';

/** Query string for GET /api/leaderboard. */
export class LeaderboardQueryDto {
  /** Ranking metric. Defaults to lifetime earnings. */
  @IsOptional()
  @IsIn(LEADERBOARD_CATEGORIES)
  category?: LeaderboardCategory;

  /** Window to measure over. Ignored for BALANCE (a snapshot metric). */
  @IsOptional()
  @IsIn(LEADERBOARD_PERIODS)
  period?: LeaderboardPeriod;

  /** How many ranked miners to return. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_LIMIT)
  limit?: number;
}
