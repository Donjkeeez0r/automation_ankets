import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../generated/prisma';
import { randomBytes } from 'crypto';
import { CreateUserDto } from './dto/create-user.dto';
import bcrypt from 'bcrypt';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prismaService: PrismaService) {}

  private generatePassword(): string {
    return randomBytes(6).toString('base64').slice(0, 10);
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
      select: {
        id: true,
        email: true,
        name: true,
        organization: true,
        role: true,
        createdAt: true,
      },
    });

    return { ...user, generatedPassword };
  }

  async findAll() {
    return this.prismaService.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        organization: true,
        role: true,
        createdAt: true,
      },
    });
  }

  async remove(id: string) {
    return this.prismaService.user.delete({ where: { id } });
  }

  async resetPassword(id: string) {
    const generatedPassword = this.generatePassword();
    const hashedPassword = await bcrypt.hash(generatedPassword, 10);

    await this.prismaService.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    return { generatedPassword };
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.prismaService.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('Пользователь не найден!');
    }

    return this.prismaService.user.update({
      where: { id },
      data: dto,
      select: {
        id: true,
        email: true,
        name: true,
        organization: true,
        role: true,
        createdAt: true,
      },
    });
  }

  async findByEmail(email: string) {
    const existingUser = await this.prismaService.user.findUnique({
      where: { email },
    });

    return existingUser;
  }

  async createUser(data: {
    email: string;
    password: string;
    name: string;
    organization: string;
    role: Role;
  }) {
    return this.prismaService.user.create({
      data,
    });
  }

  async getMe(userId: string) {
    return this.prismaService.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        organization: true,
        role: true,
        createdAt: true,
      },
    });
  }
}
