import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PushToken, PushTokenSchema } from './schemas/push-token.schema';
import { PushTokensService } from './push-tokens.service';
import { PushTokensController } from './push-tokens.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PushToken.name, schema: PushTokenSchema },
    ]),
  ],
  providers: [PushTokensService],
  controllers: [PushTokensController],
  exports: [PushTokensService],
})
export class PushTokensModule {}
