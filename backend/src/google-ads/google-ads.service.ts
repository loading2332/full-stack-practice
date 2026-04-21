import { Injectable } from '@nestjs/common';

type FetchAccountDataInput = {
  customerId?: string;
  dateRange: string;
};

@Injectable()
export class GoogleAdsService {
  async fetchAccountData(input: FetchAccountDataInput) {
    return {
      customerId: input.customerId || '888-100-1001',
      dateRange: input.dateRange,
      spend: 15234.5,
      clicks: 3821,
      impressions: 50872,
      conversions: 287,
      ctr: 7.51,
      cpc: 3.99,
      cvr: 7.51,
    };
  }
}
