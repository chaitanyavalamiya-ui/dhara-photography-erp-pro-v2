import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { clientsService } from '@/services/clients-service';
import { mergeBookingClientOptions } from '@/utils/booking-form';

interface ClientSearchSelectProps {
  id?: string;
  value: string;
  onChange: (clientId: string) => void;
  required?: boolean;
  disabled?: boolean;
  emptyLabel?: string;
  className?: string;
}

const PAGE_SIZE = 20;

export function ClientSearchSelect({
  id,
  value,
  onChange,
  required,
  disabled,
  emptyLabel = 'Select client...',
  className = 'input-field',
}: ClientSearchSelectProps) {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const handle = window.setTimeout(() => setSearch(searchInput.trim()), 250);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  const listQuery = useQuery({
    queryKey: ['clients', 'picker', search],
    queryFn: () =>
      clientsService.list({
        page: 1,
        limit: PAGE_SIZE,
        search: search || undefined,
        status: 'active',
        sortBy: 'fullName',
        sortOrder: 'asc',
      }),
  });

  const selectedQuery = useQuery({
    queryKey: ['clients', value],
    queryFn: () => clientsService.getById(value),
    enabled: Boolean(value),
  });

  const options = useMemo(() => {
    const listed = listQuery.data?.items ?? [];
    return mergeBookingClientOptions(listed, selectedQuery.data ?? null);
  }, [listQuery.data?.items, selectedQuery.data]);

  return (
    <div className="space-y-2">
      <input
        type="search"
        className={className}
        placeholder="Search clients..."
        value={searchInput}
        onChange={(event) => setSearchInput(event.target.value)}
        disabled={disabled}
        aria-label="Search clients"
      />
      <select
        id={id}
        className={className}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        disabled={disabled}
      >
        <option value="">{emptyLabel}</option>
        {options.map((client) => (
          <option key={client.id} value={client.id}>
            {client.fullName} ({client.mobile})
          </option>
        ))}
      </select>
    </div>
  );
}
