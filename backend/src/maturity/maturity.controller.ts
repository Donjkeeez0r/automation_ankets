import { Controller, Get } from '@nestjs/common';
import {
  DIRECTIONS,
  MATURITY_LEVELS,
  OBJECT_CATEGORIES,
  REQUIREMENT_TYPES,
} from './maturity.constants';

// Без guard'ов: справочник нужен подрядчику на /fill/:token без авторизации
@Controller('maturity')
export class MaturityController {
  constructor() {}

  @Get('reference')
  getReference() {
    return {
      directions: DIRECTIONS,
      requirementTypes: REQUIREMENT_TYPES,
      levels: MATURITY_LEVELS,
      objectCategories: OBJECT_CATEGORIES,
    };
  }
}
