import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { FindContactsQueryDto } from './dto/find-contacts-query.dto';
import { CreateContactResponseDto } from './dto/create-contact-response.dto';
import { ContactDto } from './dto/contact.dto';
import { ContactDocument } from './schemas/contact.schema';
import { FindContactsResponseDto } from './dto/find-contacts-response.dto';
import { ApiQuery } from '@nestjs/swagger';

@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post()
  async create(
    @CurrentUser() user: { id: string },
    @Body() createContactDto: CreateContactDto,
  ): Promise<CreateContactResponseDto> {
    const result = await this.contactsService.create({
      ownerId: user.id,
      ...createContactDto,
    });

    return this.toContactDto(result);
  }

  @Get()
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'changedAfter', required: false, type: String })
  @ApiQuery({ name: 'isFavourite', required: false, type: Boolean })
  @ApiQuery({ name: 'isBlocked', required: false, type: Boolean })
  @ApiQuery({ name: 'isMuted', required: false, type: Boolean })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  async find(
    @CurrentUser() user: { id: string },
    @Query() query: FindContactsQueryDto,
  ): Promise<FindContactsResponseDto> {
    const result = await this.contactsService.find({
      ownerId: user.id,
      search: query.search,
      changedAfter: query.changedAfter
        ? new Date(query.changedAfter)
        : undefined,
      isFavourite:
        query.isFavourite !== undefined
          ? query.isFavourite === 'true'
          : undefined,
      isBlocked:
        query.isBlocked !== undefined ? query.isBlocked === 'true' : undefined,
      isMuted:
        query.isMuted !== undefined ? query.isMuted === 'true' : undefined,
      limit: query.limit ?? 50,
      cursor: query.cursor,
    });

    return {
      items: result.items.map((contact) => this.toContactDto(contact)),
      nextCursor: result.nextCursor,
    };
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ): Promise<ContactDto> {
    const result = await this.contactsService.findOne({
      ownerId: user.id,
      contactId: id,
    });

    return this.toContactDto(result);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() updateContactDto: UpdateContactDto,
  ): Promise<ContactDto> {
    const result = await this.contactsService.update({
      ownerId: user.id,
      contactId: id,
      ...updateContactDto,
    });

    return this.toContactDto(result);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ): Promise<void> {
    await this.contactsService.remove({
      ownerId: user.id,
      contactId: id,
    });
  }

  private toContactDto(contact: ContactDocument): ContactDto {
    return {
      id: String(contact._id),
      ownerId: contact.ownerId,
      contactUserId: contact.contactUserId,
      alias: contact.alias,
      note: contact.note,
      isFavourite: contact.isFavourite,
      isBlocked: contact.isBlocked,
      isMuted: contact.isMuted,
      createdAt: contact.createdAt.toISOString(),
      updatedAt: contact.updatedAt.toISOString(),
    };
  }
}
