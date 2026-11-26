import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Admin } from '../entities/admin.entity';
import { Application } from '../entities/application.entity';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(Admin)
    private readonly adminRepo: Repository<Admin>,
    @InjectRepository(Application)
    private readonly applicationRepo: Repository<Application>,
  ) {}

  async onApplicationBootstrap() {
    await this.seedAdmins();
    // Do not wipe customer applications on restart
  }

  private async clearMockApplications() {
    // Clean up all mock/demo application records from DB
    await this.applicationRepo.clear();
    this.logger.log('Cleared all demo/mock applications from database.');
  }

  private async seedAdmins() {
    const count = await this.adminRepo.count();
    if (count > 0) return;

    this.logger.log('Seeding 4 predefined Bajaj Admin accounts...');
    const defaultPassword = await bcrypt.hash('admin123', 10);

    const admins = [
      {
        name: 'Rajesh Sharma',
        email: 'admin1@bajaj.com',
        password: defaultPassword,
        role: 'Senior Underwriter',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      },
      {
        name: 'Priya Patel',
        email: 'admin2@bajaj.com',
        password: defaultPassword,
        role: 'Credit Risk Manager',
        avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150',
      },
      {
        name: 'Amit Kumar',
        email: 'admin3@bajaj.com',
        password: defaultPassword,
        role: 'Loan Assessment Officer',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      },
      {
        name: 'Neha Singh',
        email: 'admin4@bajaj.com',
        password: defaultPassword,
        role: 'Compliance & Verification Lead',
        avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
      },
    ];

    for (const a of admins) {
      const admin = this.adminRepo.create(a);
      await this.adminRepo.save(admin);
    }
    this.logger.log('Seeded 4 admins successfully.');
  }
}
