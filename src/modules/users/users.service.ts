import bcrypt from 'bcrypt';
import { Injectable } from '@nestjs/common';
import { UpdateUserDto } from './dto/update_user.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './schemas/user.schema';
import { Model } from 'mongoose';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async create({ username, password }: { username: string; password: string }) {
    const passwordHash = await bcrypt.hash(password, 10);
    const createdUser = new this.userModel({
      username: username,
      passwordHash: passwordHash,
    });
    return createdUser.save();
  }

  async findById(id: string | undefined) {
    const result = await this.userModel.findById(id).exec();
    return result;
  }

  async findBy(username: string | undefined, email?: string) {
    if (!username && !email) {
      return null;
    }
    if (username) {
      return await this.userModel.findOne({ username }).exec();
    }
    if (email) {
      return await this.userModel.findOne({ email }).exec();
    }
    return null;
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
