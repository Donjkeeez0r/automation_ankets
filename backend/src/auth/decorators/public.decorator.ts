import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

// Помечает роут как публичный — JwtAuthGuard пропускает его без токена.
// Используется для доступа подрядчика по одноразовой ссылке (без авторизации).
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
