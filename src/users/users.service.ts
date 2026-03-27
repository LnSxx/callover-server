import bcrypt from 'bcrypt';
import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './schemas/user.schema';
import { Model } from 'mongoose';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) { }

  async create(createUserDto: CreateUserDto) {
    const passwordHash = await bcrypt.hash(createUserDto.password, 10);
    const createdUser = new this.userModel({
      username: createUserDto.username,
      email: createUserDto.email,
      passwordHash: passwordHash,
    });
    return createdUser.save();
  }

  async findByUsernameAndEmail({ username, email }: { username: string | undefined; email: string | undefined }) {
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

  update(id: number, updateUserDto: UpdateUserDto) {

  }

  remove(id: number) {
    this.userModel.findByIdAndDelete(id).exec();
  }
}
