import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum KycDocumentTypeDto {
  PASSPORT = 'PASSPORT',
  NATIONAL_ID = 'NATIONAL_ID',
  DRIVERS_LICENSE = 'DRIVERS_LICENSE',
}

/**
 * ~2.7M base64 chars ≈ 2MB of binary. The web client downscales before
 * upload, so this is a backstop against someone posting a raw camera file
 * straight into the database, not the expected size.
 */
const MAX_BASE64_CHARS = 2_800_000;

export class KycImageDto {
  @IsString()
  @MaxLength(40)
  mimeType!: string;

  @IsString()
  @MaxLength(MAX_BASE64_CHARS, {
    message: 'Image is too large — please upload a smaller photo.',
  })
  data!: string;
}

export class SubmitKycDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName!: string;

  @IsEnum(KycDocumentTypeDto)
  documentType!: KycDocumentTypeDto;

  @IsString()
  @MinLength(3)
  @MaxLength(60)
  documentNumber!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(2)
  countryCode!: string;

  @ValidateNested()
  @Type(() => KycImageDto)
  front!: KycImageDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => KycImageDto)
  back?: KycImageDto;

  @ValidateNested()
  @Type(() => KycImageDto)
  selfie!: KycImageDto;
}

export class KycDecisionDto {
  @IsBoolean()
  approve!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}
