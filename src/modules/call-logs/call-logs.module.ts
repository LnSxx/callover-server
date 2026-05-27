import { Module } from '@nestjs/common';
import { CallLogsService } from './call-logs.service';
import { CallLogsController } from './call-logs.controller';
import { CallLog, CallLogSchema } from './schemas/call-log.schema';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: CallLog.name, schema: CallLogSchema }]),
  ],
  controllers: [CallLogsController],
  providers: [CallLogsService],
})
export class CallLogsModule {}
