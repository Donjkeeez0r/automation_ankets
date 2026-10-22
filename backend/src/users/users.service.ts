import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomBytes } from 'crypto';
import { CreateUserDto } from './dto/create-user.dto';
import bcrypt from 'bcrypt';
import { UpdateUserDto } from './dto/update-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Role } from '../generated/prisma';

const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  organization: true,
  role: true,
  createdAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private prismaService: PrismaService) {}

  private generatePassword(): string {
    return randomBytes(6).toString('base64').slice(0, 10);
  }

  private async countAdmins() {
    return this.prismaService.user.count({ where: { role: Role.ADMIN } });
  }

  private async countQuestionnaires(userId: string) {
    return this.prismaService.questionnaire.count({
      where: { employeeId: userId },
    });
  }

  private async getUserOrThrow(id: string) {
    const user = await this.prismaService.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('Пользователь не найден!');
    }

    return user;
  }

  async createByAdmin(dto: CreateUserDto) {
    const existing = await this.findByEmail(dto.email);

    if (existing) {
      throw new BadRequestException('Данный email уже занят!');
    }

    const generatedPassword = this.generatePassword();
    const hashedPassword = await bcrypt.hash(generatedPassword, 10);

    const user = await this.prismaService.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        organization: dto.organization,
        role: dto.role,
        password: hashedPassword,
      },
      select: USER_SELECT,
    });

    return { ...user, generatedPassword };
  }

  async findAll() {
    const users = await this.prismaService.user.findMany({
      select: {
        ...USER_SELECT,
        _count: { select: { employeeQuestionnaires: true } },
      },
    });

    return users.map(({ _count, ...user }) => ({
      ...user,
      questionnaireCount: _count.employeeQuestionnaires,
    }));
  }

  async remove(id: string, currentUserId: string) {
    if (id === currentUserId) {
      throw new BadRequestException(
        'Нельзя удалить собственную учётную запись!',
      );
    }

    const user = await this.getUserOrThrow(id);

    if (user.role === Role.ADMIN && (await this.countAdmins()) <= 1) {
      throw new BadRequestException(
        'Нельзя удалить последнего администратора!',
      );
    }

    // Анкеты не удаляются вместе с пользователем (onDelete: Restrict) —
    // сначала их нужно передать другому ответственному.
    const questionnaireCount = await this.countQuestionnaires(id);
    if (questionnaireCount > 0) {
      throw new BadRequestException(
        `За пользователем закреплено анкет: ${questionnaireCount}. Передайте их другому ответственному за скоринг перед удалением.`,
      );
    }

    return this.prismaService.user.delete({
      where: { id },
      select: USER_SELECT,
    });
  }

  // Передать все анкеты пользователя другому ответственному за скоринг
  // (например, перед удалением учётной записи сотрудника).
  async transferQuestionnaires(fromUserId: string, toUserId: string) {
    if (fromUserId === toUserId) {
      throw new BadRequestException('Выберите другого ответственного!');
    }

    const from = await this.getUserOrThrow(fromUserId);
    const to = await this.prismaService.user.findUnique({
      where: { id: toUserId },
    });

    if (!to || to.role !== Role.EMPLOYEE) {
      throw new BadRequestException(
        'Анкеты можно передать только ответственному за скоринг!',
      );
    }

    // Передача и записи в историю — одной транзакцией. В updateMany повторяем
    // условие employeeId: анкета, которую за это время передали кому-то ещё,
    // не будет перехвачена.
    const transferred = await this.prismaService.$transaction(async (tx) => {
      const questionnaires = await tx.questionnaire.findMany({
        where: { employeeId: fromUserId },
        select: { id: true },
      });
      const ids = questionnaires.map((q) => q.id);

      await tx.questionnaire.updateMany({
        where: { id: { in: ids }, employeeId: fromUserId },
        data: { employeeId: toUserId },
      });

      await tx.activityLog.createMany({
        data: ids.map((questionnaireId) => ({
          questionnaireId,
          type: 'OWNER_CHANGED',
          description: `Ответственный за анкету изменён: ${from.name} → ${to.name}`,
        })),
      });

      return ids.length;
    });

    return { transferred };
  }

  async resetPassword(id: string) {
    await this.getUserOrThrow(id);

    const generatedPassword = this.generatePassword();
    const hashedPassword = await bcrypt.hash(generatedPassword, 10);

    await this.prismaService.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    return { generatedPassword };
  }

  async update(id: string, dto: UpdateUserDto, currentUserId: string) {
    const user = await this.getUserOrThrow(id);

    if (dto.email && dto.email !== user.email) {
      const existing = await this.findByEmail(dto.email);
      if (existing) {
        throw new BadRequestException('Данный email уже занят!');
      }
    }

    if (dto.role && dto.role !== user.role) {
      if (id === currentUserId) {
        throw new BadRequestException('Нельзя изменить собственную роль!');
      }

      if (user.role === Role.ADMIN && (await this.countAdmins()) <= 1) {
        throw new BadRequestException(
          'Нельзя изменить роль последнего администратора!',
        );
      }

      // Администратор не работает с анкетами, поэтому закреплённые анкеты
      // сначала нужно передать другому ответственному.
      const questionnaireCount = await this.countQuestionnaires(id);
      if (questionnaireCount > 0) {
        throw new BadRequestException(
          `За пользователем закреплено анкет: ${questionnaireCount}. Передайте их другому ответственному за скоринг перед сменой роли.`,
        );
      }
    }

    return this.prismaService.user.update({
      where: { id },
      data: dto,
      select: USER_SELECT,
    });
  }

  async findByEmail(email: string) {
    const existingUser = await this.prismaService.user.findUnique({
      where: { email },
    });

    return existingUser;
  }

  async getMe(userId: string) {
    return this.prismaService.user.findUnique({
      where: { id: userId },
      select: USER_SELECT,
    });
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден!');
    }

    const isValid = await bcrypt.compare(dto.currentPassword, user.password);

    if (!isValid) {
      throw new BadRequestException('Неверный текущий пароль!');
    }

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

    await this.prismaService.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { message: 'Пароль изменен!' };
  }
}
