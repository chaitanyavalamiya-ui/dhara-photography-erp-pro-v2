import { PartialType } from '@nestjs/swagger';
import { CreateStaffPaymentDto } from './create-staff-payment.dto';

export class UpdateStaffPaymentDto extends PartialType(CreateStaffPaymentDto) {}
