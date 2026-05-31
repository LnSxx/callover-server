import { Module } from '@nestjs/common';
import { CallLogsService } from './call-logs.service';
import { CallLogsController } from './call-logs.controller';
import { CallLog, CallLogSchema } from './schemas/call-log.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { CallsModule } from '../calls/calls.module';
import { CallLoggerService } from './call-logger.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: CallLog.name, schema: CallLogSchema }]),
    CallsModule,
  ],
  controllers: [CallLogsController],
  providers: [CallLogsService, CallLoggerService],
  exports: [CallLogsService, CallLoggerService],
})
export class CallLogsModule {}
