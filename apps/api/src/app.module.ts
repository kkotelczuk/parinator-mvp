import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ImportsModule } from './imports/imports.module';
import { JoinCodesModule } from './join-codes/join-codes.module';
import { RoundsModule } from './rounds/rounds.module';
import { TableAssetsModule } from './table-assets/table-assets.module';
import { TeamsModule } from './teams/teams.module';
import { TournamentsModule } from './tournaments/tournaments.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    UsersModule,
    TeamsModule,
    TournamentsModule,
    ImportsModule,
    JoinCodesModule,
    RoundsModule,
    TableAssetsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
