import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateTicketDto {
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  subject!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(4000)
  body!: string;
}

export class ReplyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  body!: string;
}

export class AdminReplyDto extends ReplyDto {
  /**
   * Operators usually answer and close in one action, so the status change
   * rides along with the reply instead of needing a second request.
   */
  @IsOptional()
  @IsIn(['ANSWERED', 'CLOSED'])
  status?: 'ANSWERED' | 'CLOSED';
}
