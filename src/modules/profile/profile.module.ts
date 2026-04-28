import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { ProfileController } from './profile.controller';

@Module({
  imports: [UsersModule],
  controllers: [ProfileController],
})
export class ProfileModule {}
