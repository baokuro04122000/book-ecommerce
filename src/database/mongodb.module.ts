import * as mongoose from 'mongoose';
import { Module } from '@nestjs/common';

export const DATABASE_CONNECTION = 'DATABASE_CONNECTION';

export const databaseProviders = {
  provide: DATABASE_CONNECTION,
  useFactory: async (): Promise<typeof mongoose> => {
    try {
      const connected = await mongoose.connect(process.env.MONGO_URI, {
        autoIndex: true,
      });

      // all executed methods log output to console
      connected.set('debug', true);

      // disable colors in debug mode
      connected.set('debug', { color: false });

      // get mongodb-shell friendly output (ISODate)
      connected.set('debug', { shell: true });
      return connected;
    } catch (error) {
      console.error(`Error: connect:::`, error);
    }
  },
};

@Module({
  providers: [databaseProviders],
  exports: [databaseProviders],
})
export class DatabaseModule {}
