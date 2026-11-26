import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Admin } from './entities/admin.entity';
import { Application } from './entities/application.entity';
import { AuthModule } from './auth/auth.module';
import { ApplicationsModule } from './applications/applications.module';
import { AppGateway } from './gateway/app.gateway';
import { SeedService } from './database/seed.service';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'bajaj_loan_db',
      entities: [Admin, Application],
      synchronize: true, // Auto create/update schema in dev
      logging: false,
    }),
    TypeOrmModule.forFeature([Admin, Application]),
    AuthModule,
    ApplicationsModule,
  ],
  providers: [AppGateway, SeedService],
})
export class AppModule {}
