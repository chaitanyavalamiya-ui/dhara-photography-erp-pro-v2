import { describe, expect, it } from 'vitest';
import { getAlbumOverviewMetrics } from './reports-service';

describe('getAlbumOverviewMetrics', () => {
  it('maps overview album fields to display labels without recomputing profit', () => {
    expect(
      getAlbumOverviewMetrics({
        albumSales: 25000,
        albumVendorExpenses: 8000,
        albumProfit: 99999,
      }),
    ).toEqual([
      { key: 'albumSales', label: 'Album Sales', value: 25000 },
      { key: 'albumVendorCost', label: 'Album Vendor Cost', value: 8000 },
      { key: 'albumProfit', label: 'Album Profit', value: 99999 },
    ]);
  });

  it('passes through a negative album profit', () => {
    const metrics = getAlbumOverviewMetrics({
      albumSales: 1000,
      albumVendorExpenses: 4000,
      albumProfit: -3000,
    });
    expect(metrics.find((row) => row.key === 'albumProfit')?.value).toBe(-3000);
  });
});
