import { Module } from '@nestjs/common';
import { AlbumsController } from './albums.controller';
import { AlbumsService } from './albums.service';
import { AlbumExpenseService } from './album-expense.service';

@Module({
  controllers: [AlbumsController],
  providers: [AlbumsService, AlbumExpenseService],
  exports: [AlbumsService],
})
export class AlbumsModule {}
