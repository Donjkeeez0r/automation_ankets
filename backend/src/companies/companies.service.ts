import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CompaniesService {
  constructor(private prismaService: PrismaService) {}

  async create(dto: {
    name: string;
    inn?: string;
    contactName: string;
    contactEmail: string;
  }) {
    return this.prismaService.company.create({ data: dto });
  }

  async findAll() {
    return this.prismaService.company.findMany();
  }

  async findOne(companyId: string) {
    const existingCompany = await this.prismaService.company.findUnique({
      where: { id: companyId },
    });

    if (!existingCompany) {
      throw new NotFoundException('Данной компании нет!');
    }

    return existingCompany;
  }

  // Список анкет компании вместе с их одноразовыми ссылками
  async findQuestionnaires(companyId: string) {
    await this.findOne(companyId);

    return this.prismaService.questionnaire.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      include: {
        links: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            token: true,
            isActive: true,
            expiresAt: true,
            createdAt: true,
          },
        },
      },
    });
  }

  async remove(id: string) {
    const company = await this.prismaService.company.findUnique({
      where: { id },
    });

    if (!company) {
      throw new NotFoundException('Компания не найдена!');
    }

    await this.prismaService.company.delete({ where: { id } });

    return { message: 'Компания удалена!' };
  }
}
