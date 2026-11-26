import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum ApplicationStatus {
  NEW = 'NEW',
  WORK_IN_PROGRESS = 'WORK_IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

export enum EligibilityStatus {
  PENDING = 'PENDING',
  YES = 'YES',
  NO = 'NO',
}

@Entity('applications')
export class Application {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ unique: true })
  applicationId: string;

  @Column({
    type: 'enum',
    enum: ApplicationStatus,
    default: ApplicationStatus.NEW,
  })
  status: ApplicationStatus;

  @Column({
    type: 'enum',
    enum: EligibilityStatus,
    default: EligibilityStatus.PENDING,
  })
  eligibility: EligibilityStatus;

  @Column()
  applicantFullName: string;

  @Column()
  mobileNumber: string;

  @Column({ nullable: true })
  panNumber: string;

  @Column({ type: 'jsonb' })
  formData: Record<string, any>;

  // Locking fields for concurrency
  @Column({ nullable: true })
  lockedByAdminId: string;

  @Column({ nullable: true })
  lockedByAdminName: string;

  @Column({ type: 'timestamp with time zone', nullable: true })
  lockedAt: Date;

  // Completion metadata
  @Column({ nullable: true })
  completedByAdminId: string;

  @Column({ nullable: true })
  completedByAdminName: string;

  @Column({ type: 'timestamp with time zone', nullable: true })
  completedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
