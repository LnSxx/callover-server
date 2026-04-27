import bcrypt from 'bcrypt';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { Model } from 'mongoose';
import { BCRYPT_SALT_ROUNDS } from './user.constants';

type UpdateProfileParams = {
  email?: string;
  username?: string;
};

type ChangePasswordParams = {
  currentPassword: string;
  newPassword: string;
};

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async create(username: string, password: string): Promise<UserDocument> {
    try {
      const usernameNormalized = this.normalizeUsername(username);
      const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

      return await this.userModel.create({
        username: usernameNormalized,
        passwordHash,
      });
    } catch (error) {
      this.handleMongoError(error);
    }
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async findByUsername(username: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ username: this.normalizeUsername(username) })
      .exec();
  }

  async findByUsernameWithPassword(
    username: string,
  ): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ username: this.normalizeUsername(username) })
      .select('+passwordHash')
      .exec();
  }

  async updateProfile(
    id: string,
    params: UpdateProfileParams,
  ): Promise<UserDocument | null> {
    const updateData = this.buildProfileUpdateData(params);
    console.log('call updateProfile', updateData);

    if (Object.keys(updateData).length === 0) {
      return this.findById(id);
    }

    try {
      return await this.userModel
        .findByIdAndUpdate(
          id,
          {
            $set: updateData,
          },
          {
            returnDocument: 'after',
            runValidators: true,
          },
        )
        .exec();
    } catch (error) {
      this.handleMongoError(error);
    }
  }

  async changePassword(
    id: string,
    params: ChangePasswordParams,
  ): Promise<{ isChanged: boolean }> {
    const user = await this.userModel
      .findById(id)
      .select('+passwordHash')
      .exec();

    if (!user) {
      return { isChanged: false };
    }

    const isPasswordValid = await bcrypt.compare(
      params.currentPassword,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new BadRequestException('Invalid current password');
    }

    const isSamePassword = await bcrypt.compare(
      params.newPassword,
      user.passwordHash,
    );

    if (isSamePassword) {
      throw new ConflictException('New password must be different');
    }

    const newPasswordHash = await bcrypt.hash(
      params.newPassword,
      BCRYPT_SALT_ROUNDS,
    );

    try {
      await this.userModel
        .findByIdAndUpdate(
          id,
          {
            $set: {
              passwordHash: newPasswordHash,
            },
          },
          {
            returnDocument: 'after',
            runValidators: true,
          },
        )
        .exec();

      return {
        isChanged: true,
      };
    } catch {
      throw new InternalServerErrorException('Failed to change password');
    }
  }

  async remove(id: string): Promise<{ isDeleted: boolean }> {
    const result = await this.userModel.findByIdAndDelete(id).exec();

    return {
      isDeleted: !!result,
    };
  }

  private handleMongoError(error: unknown): never {
    if (this.isDuplicateKeyError(error)) {
      throw new ConflictException('Username or email is already taken');
    }

    throw new InternalServerErrorException('User operation failed');
  }

  private isDuplicateKeyError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 11000
    );
  }

  private normalizeUsername(username: string): string {
    return username.trim().toLowerCase();
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private buildProfileUpdateData(params: UpdateProfileParams): Partial<User> {
    const updateData: Partial<User> = {};

    if (params.username !== undefined) {
      updateData.username = this.normalizeUsername(params.username);
    }

    if (params.email !== undefined) {
      updateData.email = this.normalizeEmail(params.email);
      updateData.isEmailVerified = false;
    }

    return updateData;
  }
}
