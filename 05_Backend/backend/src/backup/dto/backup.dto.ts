import { Equals, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { RESTORE_CONFIRM_PHRASE } from '../app-paths';

export class UpdateBackupLocationDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  backupDir!: string;
}

export class RestoreBackupDto {
  @IsString()
  @IsNotEmpty()
  backupFile!: string;

  @IsString()
  @IsNotEmpty()
  @Equals(RESTORE_CONFIRM_PHRASE, {
    message: 'Restore confirmation phrase did not match.',
  })
  confirmPhrase!: string;
}

export class PreviewRestoreDto {
  @IsString()
  @IsNotEmpty()
  backupFile!: string;
}

export class DownloadBackupQueryDto {
  @IsString()
  @IsNotEmpty()
  backupFile!: string;
}

export const REQUIRED_RESTORE_PHRASE = RESTORE_CONFIRM_PHRASE;
