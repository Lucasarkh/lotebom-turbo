import { PartialType } from '@nestjs/swagger';
import { CreateRealtorLinkDto } from './create-realtor-link.dto';

export class UpdateRealtorLinkDto extends PartialType(CreateRealtorLinkDto) {}
