import { Controller } from '@nestjs/common';
import { NotificationsService } from './notifications/notifications.service';

@Controller()
export class AppController {
  constructor(private notificationsService: NotificationsService) {}
}
