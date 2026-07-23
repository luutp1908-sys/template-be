import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { RolesGuard } from './guards/roles.guard';
import { JwtStrategy } from './jwt.strategy';
import { LocalStrategy } from './local.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.accessSecret', 'change_me_access'),
        signOptions: {
          expiresIn: configService.get<string>('jwt.accessExpiresIn', '15m'),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: (() => {
    const impl = process.env.MOCK_MODE === 'true' || process.env.MOCK_MODE === '1'
      ? require('./auth.repository.mock')
      : require('./auth.repository.prisma');
    return [
      AuthService,
      { provide: 'AUTH_REPOSITORY', useClass: impl.AuthRepository },
      JwtStrategy,
      LocalStrategy,
      JwtAuthGuard,
      LocalAuthGuard,
      RolesGuard,
      PermissionsGuard,
    ];
  })(),
  exports: [AuthService, JwtAuthGuard, RolesGuard, PermissionsGuard],
})
export class AuthModule {}
