import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { Admin } from '../entities/admin.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Admin)
    private readonly adminRepo: Repository<Admin>,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, pass: string) {
    const admin = await this.adminRepo
      .createQueryBuilder('admin')
      .addSelect('admin.password')
      .where('admin.email = :email', { email: email.toLowerCase().trim() })
      .getOne();

    if (!admin) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(pass, admin.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload = { sub: admin.id, email: admin.email, name: admin.name, role: admin.role };
    return {
      accessToken: this.jwtService.sign(payload),
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        avatar: admin.avatar,
      },
    };
  }

  async getAllAdmins() {
    return this.adminRepo.find({
      select: ['id', 'name', 'email', 'role', 'avatar'],
      order: { email: 'ASC' },
    });
  }
}
