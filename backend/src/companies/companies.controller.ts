import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../generated/prisma';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { CreateContactorEmployeeDto } from './dto/create-contactor-employee.dto';

// Справочник компаний общий: просматривать, заводить и редактировать компании
// и их контактных лиц могут обе роли, удалять компанию — только ADMIN.
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('companies')
export class CompaniesController {
  constructor(private companiesService: CompaniesService) {}

  @Post()
  @Roles(Role.ADMIN, Role.EMPLOYEE)
  create(@Body() dto: CreateCompanyDto) {
    return this.companiesService.create(dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.EMPLOYEE)
  findAll() {
    return this.companiesService.findAll();
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.EMPLOYEE)
  findOne(@Param('id') id: string) {
    return this.companiesService.findOne(id);
  }

  @Get(':id/questionnaires')
  @Roles(Role.ADMIN, Role.EMPLOYEE)
  findQuestionnaires(@Param('id') id: string) {
    return this.companiesService.findQuestionnaires(id);
  }

  // Удаляет компанию вместе со всеми анкетами всех ответственных — только ADMIN
  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.companiesService.remove(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.EMPLOYEE)
  update(@Param('id') id: string, @Body() dto: UpdateCompanyDto) {
    return this.companiesService.update(id, dto);
  }

  @Post(':id/employees')
  @Roles(Role.ADMIN, Role.EMPLOYEE)
  addEmployee(
    @Param('id') companyId: string,
    @Body() dto: CreateContactorEmployeeDto,
  ) {
    return this.companiesService.addEmployee(companyId, dto);
  }

  @Get(':id/employees')
  @Roles(Role.ADMIN, Role.EMPLOYEE)
  getEmployees(@Param('id') companyId: string) {
    return this.companiesService.getEmployees(companyId);
  }

  @Delete('employees/:employeeId')
  @Roles(Role.ADMIN, Role.EMPLOYEE)
  removeEmployee(@Param('employeeId') employeeId: string) {
    return this.companiesService.removeEmployee(employeeId);
  }
}
