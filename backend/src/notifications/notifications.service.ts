import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { NOTIFICATIONS_ENABLED } from './notifications.constants';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.getOrThrow<string>('SMTP_HOST'),
      port: Number(this.configService.getOrThrow<string>('SMTP_PORT')),
      secure: true,
      auth: {
        user: this.configService.getOrThrow<string>('SMTP_USER'),
        pass: this.configService.getOrThrow<string>('SMTP_PASSWORD'),
      },
    });
  }

  // Обычные уведомления. Возвращает true, если письмо реально ушло;
  // при выключенном NOTIFICATIONS_ENABLED ничего не отправляет и возвращает false.
  async sendMail(to: string, subject: string, html: string): Promise<boolean> {
    if (!NOTIFICATIONS_ENABLED) {
      this.logger.debug(`Уведомление «${subject}» для ${to} пропущено: рассылка отключена`);
      return false;
    }
    await this.deliver(to, subject, html);
    return true;
  }

  // Письмо, которое уходит всегда, независимо от флага:
  // ссылка на анкету сотруднику, создавшему анкету.
  async sendEssentialMail(to: string, subject: string, html: string) {
    await this.deliver(to, subject, html);
  }

  private async deliver(to: string, subject: string, html: string) {
    await this.transporter.sendMail({
      from: this.configService.getOrThrow<string>('SMTP_FROM'),
      to,
      // Тема — заголовок письма: переносы строк в нём недопустимы.
      subject: subject.replace(/[\r\n]+/g, ' '),
      html,
    });
  }
}
