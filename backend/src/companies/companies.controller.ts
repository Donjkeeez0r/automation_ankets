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
import { UpdateContractorStatusDto } from './dto/update-status.dto';

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

  @Patch(':id')
  @Roles(Role.EMPLOYEE)
  update(@Param('id') id: string, @Body() dto: UpdateCompanyDto) {
    return this.companiesService.update(id, dto);
  }

  @Post(':id/employees')
  @Roles(Role.EMPLOYEE)
  addEmployee(
    @Param('id') companyId: string,
    @Body() dto: CreateContactorEmployeeDto,
  ) {
    return this.companiesService.addEmployee(companyId, dto);
  }

  @Get(':id/employees')
  @Roles(Role.EMPLOYEE, Role.AUDITOR)
  getEmployees(@Param('id') companyId: string) {
    return this.companiesService.getEmployees(companyId);
  }

  @Delete('employees/:employeeId')
  @Roles(Role.EMPLOYEE)
  removeEmployee(@Param('employeeId') employeeId: string) {
    return this.companiesService.removeEmployee(employeeId);
  }

  @Patch(':id/status')
  @Roles(Role.EMPLOYEE, Role.AUDITOR)
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateContractorStatusDto,
  ) {
    return this.companiesService.updateStatus(id, dto.status);
  }
}
