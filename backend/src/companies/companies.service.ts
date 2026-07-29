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
}
