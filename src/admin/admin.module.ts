import { Module } from '@nestjs/common';
import { Connection } from 'mongoose';
import { USER_MODEL, UserSchema } from 'src/auth/model/user.model';
import {
  DatabaseModule,
  DATABASE_CONNECTION,
} from 'src/database/mongodb.module';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { redisModule } from 'src/module.config';

@Module({
  imports: [redisModule, DatabaseModule],
  providers: [
    AdminService,
    {
      provide: USER_MODEL,
      useFactory: (connect: Connection) => connect.model('users', UserSchema),
      inject: [DATABASE_CONNECTION],
    },
  ],
  controllers: [AdminController],
})
export class AdminModule {}
