import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { CurrentUser } from 'src/common/decorators/current_user.decorator';

@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) { }

  @Post()
  create(
    @CurrentUser() user: { id: string },
    @Body() createContactDto: CreateContactDto
  ) {
    return this.contactsService.create({
      ownerId: user.id,
      contactData: createContactDto,
    });
  }

  @Get()
  findAll(
    @CurrentUser() user: { id: string }
  ) {
    return this.contactsService.findAll(user.id);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: { id: string },
    @Param('id') id: string
  ) {
    return this.contactsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateContactDto: UpdateContactDto
  ) {
    return this.contactsService.update(id, updateContactDto);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string
  ) {
    return this.contactsService.remove(id);
  }
}
