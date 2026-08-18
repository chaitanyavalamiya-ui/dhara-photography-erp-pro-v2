import { useQuery } from '@tanstack/react-query';
import { MasterDataCategory, settingsService } from '@/services/settings-service';
import { EXPENSE_CATEGORY_OPTIONS } from '@/services/expenses-service';
import { PAYMENT_METHOD_OPTIONS } from '@/services/payments-service';

export interface MasterDataOption {
  value: string;
  label: string;
}

const FALLBACK_OPTIONS: Record<MasterDataCategory, MasterDataOption[]> = {
  expense_category: EXPENSE_CATEGORY_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label })),
  payment_mode: PAYMENT_METHOD_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label })),
  equipment_category: [],
};

export function useMasterDataOptions(category: MasterDataCategory) {
  const query = useQuery({
    queryKey: ['settings', 'master-data', category],
    queryFn: () => settingsService.getMasterData(category),
    staleTime: 5 * 60 * 1000,
  });

  const options: MasterDataOption[] =
    query.data && query.data.length > 0
      ? query.data.map((item) => ({ value: item.code, label: item.label }))
      : FALLBACK_OPTIONS[category];

  return { options, isLoading: query.isLoading, query };
}
