import { PartialType } from '@nestjs/swagger';
import { CreateManualLeadDto } from './manual-lead.dto';

export class UpdateLeadDto extends PartialType(CreateManualLeadDto) {}
