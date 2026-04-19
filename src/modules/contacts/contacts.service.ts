import { Injectable } from '@nestjs/common';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Contact } from './schemas/contact.schema';
import { Model } from 'mongoose';

@Injectable()
export class ContactsService {
  constructor(
    @InjectModel(Contact.name) private contactModel: Model<Contact>,
  ) {}

  create({
    ownerId,
    contactData,
  }: {
    ownerId: string;
    contactData: CreateContactDto;
  }) {
    const newContact = new this.contactModel({
      ownerId: ownerId,
      contactUserId: contactData.contactUserId,
      alias: contactData.alias,
      note: contactData.note,
    });
    return newContact.save();
  }

  findAll(ownerId: string) {
    return this.contactModel.find({ ownerId: ownerId });
  }

  findOne(id: string) {
    return this.contactModel.findById(id).exec();
  }

  async update(id: string, updateContactDto: UpdateContactDto) {
    const updatedContact = await this.contactModel
      .findByIdAndUpdate(id, updateContactDto, {
        new: true,
      })
      .exec();

    return updatedContact;
  }

  async remove(id: string) {
    await this.contactModel.findByIdAndDelete(id).exec();
  }
}
