import { Controller, Get } from '@nestjs/common';
import { MaturityService } from './maturity.service';
import {
  DIRECTIONS,
  MATURITY_LEVELS,
  OBJECT_CATEGORIES,
  REQUIREMENT_TYPES,
} from './maturity.constants';

@Controller('maturity')
export class MaturityController {
  constructor(private readonly maturityService: MaturityService) {}

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
