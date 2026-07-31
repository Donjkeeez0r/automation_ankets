import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../generated/prisma';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('companies')
export class CompaniesController {
  constructor(private companiesService: CompaniesService) {}

  @Post()
  @Roles(Role.EMPLOYEE)
  create(@Body() dto: CreateCompanyDto) {
    return this.companiesService.create(dto);
  }

  @Get()
  @Roles(Role.EMPLOYEE, Role.AUDITOR)
  findAll() {
    return this.companiesService.findAll();
  }

  @Get(':id')
  @Roles(Role.EMPLOYEE, Role.AUDITOR)
  findOne(@Param('id') id: string) {
    return this.companiesService.findOne(id);
  }

  @Get(':id/questionnaires')
  @Roles(Role.EMPLOYEE, Role.AUDITOR)
  findQuestionnaires(@Param('id') id: string) {
    return this.companiesService.findQuestionnaires(id);
  }

  @Delete(':id')
  @Roles(Role.AUDITOR)
  remove(@Param('id') id: string) {
    return this.companiesService.remove(id);
  }
}
