import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { CreateContactorEmployeeDto } from './dto/create-contactor-employee.dto';
import { ContactorStatus } from '../generated/prisma';

@Injectable()
export class CompaniesService {
  constructor(private prismaService: PrismaService) {}

  async create(dto: {
    name: string;
    inn?: string;
    contactName: string;
    contactEmails: string[];
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

  async update(id: string, dto: UpdateCompanyDto) {
    const company = await this.prismaService.company.findUnique({
      where: { id },
    });

    if (!company) {
      throw new NotFoundException('Компания не найдена!');
    }

    return this.prismaService.company.update({
      where: { id },
      data: dto,
    });
  }

  async addEmployee(companyId: string, dto: CreateContactorEmployeeDto) {
    const company = await this.prismaService.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new NotFoundException('Компания не найдена!');
    }

    return this.prismaService.contactorEmployee.create({
      data: {
        ...dto,
        companyId,
      },
    });
  }

  async getEmployees(companyId: string) {
    return this.prismaService.contactorEmployee.findMany({
      where: { companyId },
      orderBy: { name: 'asc' },
    });
  }

  async removeEmployee(employeeId: string) {
    const employee = await this.prismaService.contactorEmployee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new NotFoundException('Сотрудник не найден!');
    }

    await this.prismaService.contactorEmployee.delete({
      where: { id: employeeId },
    });

    return { message: 'Сотрудник удален!' };
  }

  async updateStatus(id: string, status: ContactorStatus) {
    const company = await this.prismaService.company.findUnique({
      where: { id },
    });

    if (!company) {
      throw new NotFoundException('Компания не найдена!');
    }

    return this.prismaService.company.update({
      where: { id },
      data: { status },
    });
  }
}
