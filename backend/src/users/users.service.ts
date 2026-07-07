import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../generated/prisma';

@Injectable()
export class UsersService {
  constructor(private prismaService: PrismaService) {}

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

  async getAllContractors() {
    return this.prismaService.user.findMany({
      where: { role: Role.CONTRACTOR },
      select: {
        id: true,
        name: true,
        organization: true,
        email: true,
      },
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
