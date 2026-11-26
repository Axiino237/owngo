import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Application,
  ApplicationStatus,
  EligibilityStatus,
} from '../entities/application.entity';
import { AppGateway } from '../gateway/app.gateway';

@Injectable()
export class ApplicationsService {
  private readonly logger = new Logger(ApplicationsService.name);
  // Lock timeout in minutes (locks older than this expire automatically)
  private readonly LOCK_TIMEOUT_MINUTES = 15;

  constructor(
    @InjectRepository(Application)
    private readonly applicationRepo: Repository<Application>,
    private readonly gateway: AppGateway,
  ) {}

  private async syncToCrm(app: Application) {
    try {
      const crmUrl = process.env.CRM_API_URL || 'http://host.docker.internal:5050/api/loan-applications/sync';
      this.logger.log(`Syncing application ${app.applicationId} to CRM at ${crmUrl}...`);
      await fetch(crmUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: app.applicationId,
          applicantFullName: app.applicantFullName,
          mobileNumber: app.mobileNumber,
          panNumber: app.panNumber,
          status: app.status,
          eligibility: app.eligibility,
          formData: app.formData,
          lockedByAdminName: app.lockedByAdminName,
          lockedByAdminId: app.lockedByAdminId,
          completedByAdminName: app.completedByAdminName,
          completedAt: app.completedAt,
        }),
      });
      this.logger.log(`Application ${app.applicationId} successfully synced to CRM.`);
    } catch (err: any) {
      this.logger.error(`Failed to sync application ${app.applicationId} to CRM: ${err.message}`);
    }
  }

  async create(formData: any): Promise<Application> {
    const personal = formData.personal || {};
    const kyc = formData.kyc || {};

    const pan = (kyc.pan_number || '').trim().toUpperCase();
    if (pan) {
      const existing = await this.applicationRepo
        .createQueryBuilder('app')
        .where('UPPER(app.panNumber) = :pan', { pan })
        .getOne();

      if (existing) {
        if (existing.status === ApplicationStatus.NEW) {
          throw new ConflictException(
            `An application (ID: ${existing.applicationId}) is already submitted and pending review for PAN ${pan}. Duplicate applications are not allowed.`,
          );
        } else if (existing.status === ApplicationStatus.WORK_IN_PROGRESS) {
          throw new ConflictException(
            `An application (ID: ${existing.applicationId}) for PAN ${pan} is currently under active review by an underwriter. Duplicate applications are not allowed.`,
          );
        } else {
          throw new ConflictException(
            `An application (ID: ${existing.applicationId}) for PAN ${pan} has already been completed with Decision: ${existing.eligibility}. Duplicate applications are not allowed.`,
          );
        }
      }
    }

    const count = await this.applicationRepo.count();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const applicationId = `BAL-2026-${10000 + count + 1}`;

    const application = this.applicationRepo.create({
      applicationId,
      status: ApplicationStatus.NEW,
      eligibility: EligibilityStatus.PENDING,
      applicantFullName: personal.applicant_full_name || 'Valued Applicant',
      mobileNumber: personal.mobile_number || '',
      panNumber: pan || kyc.pan_number || '',
      formData,
    });

    const saved = await this.applicationRepo.save(application);
    this.gateway.broadcastStatusChange({
      action: 'created',
      application: saved,
    });
    this.syncToCrm(saved);

    return saved;
  }

  async findAll(status?: ApplicationStatus) {
    const query = this.applicationRepo.createQueryBuilder('app');

    if (status) {
      query.where('app.status = :status', { status });
    }

    query.orderBy('app.createdAt', 'DESC');
    const applications = await query.getMany();

    // Check for expired locks and clean up presentation
    const now = new Date().getTime();
    return applications.map((app) => {
      if (app.lockedAt) {
        const lockedTime = new Date(app.lockedAt).getTime();
        const diffMinutes = (now - lockedTime) / (1000 * 60);
        if (diffMinutes > this.LOCK_TIMEOUT_MINUTES) {
          app.lockedByAdminId = null;
          app.lockedByAdminName = null;
          app.lockedAt = null;
        }
      }
      return app;
    });
  }

  async findOne(id: string): Promise<Application> {
    let app = await this.applicationRepo.findOne({ where: { id } });
    if (!app) {
      app = await this.applicationRepo.findOne({ where: { applicationId: id } });
    }
    if (!app) {
      throw new NotFoundException(`Application with ID ${id} not found`);
    }
    return app;
  }

  async startReview(
    id: string,
    admin: { id: string; name: string },
  ): Promise<{ application: Application; lockAcquired: boolean; lockedByOther: boolean }> {
    const app = await this.findOne(id);

    const now = new Date();
    const isLockedByOther =
      app.lockedByAdminId &&
      app.lockedByAdminId !== admin.id &&
      app.lockedAt &&
      (now.getTime() - new Date(app.lockedAt).getTime()) / (1000 * 60) < this.LOCK_TIMEOUT_MINUTES;

    if (isLockedByOther) {
      return {
        application: app,
        lockAcquired: false,
        lockedByOther: true,
      };
    }

    // Acquire lock and transition to WORK_IN_PROGRESS if it was NEW
    app.lockedByAdminId = admin.id;
    app.lockedByAdminName = admin.name;
    app.lockedAt = now;

    if (app.status === ApplicationStatus.NEW) {
      app.status = ApplicationStatus.WORK_IN_PROGRESS;
    }

    const updated = await this.applicationRepo.save(app);

    // Broadcast lock & status change to all connected admin screens
    this.gateway.broadcastLockChange({
      applicationId: updated.id,
      lockedByAdminId: admin.id,
      lockedByAdminName: admin.name,
      lockedAt: now.toISOString(),
      status: updated.status,
    });

    this.syncToCrm(updated);

    return {
      application: updated,
      lockAcquired: true,
      lockedByOther: false,
    };
  }

  async releaseLock(id: string, adminId: string): Promise<Application> {
    const app = await this.findOne(id);

    // Release if locked by this admin or lock expired
    if (!app.lockedByAdminId || app.lockedByAdminId === adminId) {
      app.lockedByAdminId = null;
      app.lockedByAdminName = null;
      app.lockedAt = null;

      // When closed without saving, it must revert to NEW
      if (app.status !== ApplicationStatus.COMPLETED) {
        app.status = ApplicationStatus.NEW;
      }

      const updated = await this.applicationRepo.save(app);

      this.gateway.broadcastUnlock({
        applicationId: updated.id,
        adminId,
        status: updated.status,
      });

      this.gateway.broadcastStatusChange({
        action: 'reverted_to_new',
        application: updated,
      });

      this.syncToCrm(updated);

      return updated;
    }

    return app;
  }

  async saveEligibility(
    id: string,
    eligibility: EligibilityStatus,
    admin: { id: string; name: string },
  ): Promise<Application> {
    const app = await this.findOne(id);

    if (eligibility !== EligibilityStatus.YES && eligibility !== EligibilityStatus.NO) {
      throw new BadRequestException('Eligibility must be either YES or NO');
    }

    // Verify lock ownership
    const now = new Date();
    const isLockedByOther =
      app.lockedByAdminId &&
      admin.id !== 'CRM_ADMIN' &&
      app.lockedByAdminId !== admin.id &&
      app.lockedAt &&
      (now.getTime() - new Date(app.lockedAt).getTime()) / (1000 * 60) < this.LOCK_TIMEOUT_MINUTES;

    if (isLockedByOther) {
      throw new ConflictException(
        `Cannot save: Application is currently being edited by ${app.lockedByAdminName}`,
      );
    }

    app.eligibility = eligibility;
    app.status = ApplicationStatus.COMPLETED;
    app.completedByAdminId = admin.id;
    app.completedByAdminName = admin.name;
    app.completedAt = now;

    // Release lock upon completion
    app.lockedByAdminId = null;
    app.lockedByAdminName = null;
    app.lockedAt = null;

    const saved = await this.applicationRepo.save(app);

    this.gateway.broadcastStatusChange({
      action: 'completed',
      application: saved,
    });
    this.syncToCrm(saved);

    return saved;
  }

  async getCounts() {
    const [newCount, progressCount, completedCount] = await Promise.all([
      this.applicationRepo.count({ where: { status: ApplicationStatus.NEW } }),
      this.applicationRepo.count({
        where: { status: ApplicationStatus.WORK_IN_PROGRESS },
      }),
      this.applicationRepo.count({
        where: { status: ApplicationStatus.COMPLETED },
      }),
    ]);

    return {
      new: newCount,
      workInProgress: progressCount,
      completed: completedCount,
      total: newCount + progressCount + completedCount,
    };
  }

  async updateStatus(
    id: string,
    status: ApplicationStatus,
    admin: { id: string; name: string },
  ): Promise<Application> {
    const app = await this.findOne(id);
    app.status = status;
    if (status === ApplicationStatus.COMPLETED) {
      app.completedAt = new Date();
      app.completedByAdminId = admin.id;
      app.completedByAdminName = admin.name;
    } else if (status === ApplicationStatus.NEW) {
      app.lockedByAdminId = null;
      app.lockedByAdminName = null;
      app.lockedAt = null;
    }
    const saved = await this.applicationRepo.save(app);
    this.gateway.broadcastStatusChange({
      action: 'status_updated',
      application: saved,
    });
    this.syncToCrm(saved);
    return saved;
  }
}
