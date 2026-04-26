import bcrypt from 'bcrypt';
import { Injectable } from '@nestjs/common';
import { UpdateUserDto } from './dto/update_user.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './schemas/user.schema';
import { Model } from 'mongoose';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async create(username: string, password: string) {
    try {
      const passwordHash = await bcrypt.hash(password, 10);
      const createdUser = new this.userModel({
        username: username,
        passwordHash: passwordHash,
      });
      return createdUser.save();
    } catch {
      return null;
    }
  }

  async findById(id: string | undefined) {
    const result = await this.userModel.findById(id).exec();
    return result;
  }

  async findByUsername(username: string) {
    return await this.userModel.findOne({ username }).exec();
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const updateData: Partial<User> = {};

    if (updateUserDto.username) {
      updateData.username = updateUserDto.username;
    }

    if (updateUserDto.email) {
      updateData.email = updateUserDto.email;
    }

    if (updateUserDto.password) {
      const passwordHash = await bcrypt.hash(updateUserDto.password, 10);
      updateData.passwordHash = passwordHash;
    }

    const updatedUser = await this.userModel
      .findByIdAndUpdate(id, updateData, {
        new: true,
      })
      .exec();

    return updatedUser;
  }

  remove(id: string) {
    return this.userModel.findByIdAndDelete(id).exec();
  }
}
