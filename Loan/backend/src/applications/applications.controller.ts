import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Headers,
} from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import {
  ApplicationStatus,
  EligibilityStatus,
} from '../entities/application.entity';

@Controller('api/applications')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Post()
  async create(@Body() formData: any) {
    return this.applicationsService.create(formData);
  }

  @Get()
  async findAll(@Query('status') status?: ApplicationStatus) {
    return this.applicationsService.findAll(status);
  }

  @Get('counts')
  async getCounts() {
    return this.applicationsService.getCounts();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.applicationsService.findOne(id);
  }

  @Post(':id/start-review')
  async startReview(
    @Param('id') id: string,
    @Body() body: { adminId: string; adminName: string },
  ) {
    return this.applicationsService.startReview(id, {
      id: body.adminId,
      name: body.adminName,
    });
  }

  @Post(':id/release-lock')
  async releaseLock(
    @Param('id') id: string,
    @Body() body: { adminId: string },
  ) {
    return this.applicationsService.releaseLock(id, body.adminId);
  }

  @Patch(':id/eligibility')
  async saveEligibility(
    @Param('id') id: string,
    @Body()
    body: {
      eligibility: EligibilityStatus;
      adminId?: string;
      adminName?: string;
    },
  ) {
    return this.applicationsService.saveEligibility(
      id,
      body.eligibility,
      { id: body.adminId || 'CRM_ADMIN', name: body.adminName || 'Admin' },
    );
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body()
    body: {
      status: ApplicationStatus;
      adminId?: string;
      adminName?: string;
    },
  ) {
    return this.applicationsService.updateStatus(id, body.status, {
      id: body.adminId || 'CRM_ADMIN',
      name: body.adminName || 'Admin',
    });
  }
}
