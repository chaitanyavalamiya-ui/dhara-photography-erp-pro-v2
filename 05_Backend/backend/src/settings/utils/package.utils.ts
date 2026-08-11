import { Prisma } from '@prisma/client';
import { PackageItemDto } from '../dto/package.dto';

export const PACKAGE_MASTER_CATEGORY = 'package';

export interface PackageMetadata {
  description?: string;
  defaultPrice: number;
  offerPrice?: number | null;
  items: Array<{
    serviceRateId: string;
    serviceName?: string;
    unit?: string;
    quantity?: number;
    days?: number;
  }>;
}

export function parsePackageMetadata(value: Prisma.JsonValue | null): PackageMetadata | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.items)) {
    return null;
  }

  return {
    description: typeof record.description === 'string' ? record.description : undefined,
    defaultPrice: Number(record.defaultPrice ?? 0),
    offerPrice:
      record.offerPrice === null || record.offerPrice === undefined
        ? null
        : Number(record.offerPrice),
    items: record.items
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
      .map((item) => ({
        serviceRateId: String(item.serviceRateId ?? ''),
        serviceName: typeof item.serviceName === 'string' ? item.serviceName : undefined,
        unit: typeof item.unit === 'string' ? item.unit : undefined,
        quantity: item.quantity === undefined ? undefined : Number(item.quantity),
        days: item.days === undefined ? undefined : Number(item.days),
      }))
      .filter((item) => item.serviceRateId),
  };
}

export function buildPackageMetadata(
  description: string | undefined,
  defaultPrice: number,
  offerPrice: number | undefined,
  items: PackageItemDto[],
  serviceRates: Array<{ id: string; name: string; unit: string }>,
): PackageMetadata {
  return {
    description: description?.trim() || undefined,
    defaultPrice,
    offerPrice: offerPrice ?? null,
    items: items.map((item) => {
      const rate = serviceRates.find((entry) => entry.id === item.serviceRateId);
      return {
        serviceRateId: item.serviceRateId,
        serviceName: rate?.name,
        unit: rate?.unit,
        quantity: item.quantity ?? 1,
        days: item.days ?? 1,
      };
    }),
  };
}
