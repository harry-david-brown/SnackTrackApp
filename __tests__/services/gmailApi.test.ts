import { gmailApi } from '../../services/gmailApi';
import api from '../../services/api';

jest.mock('../../services/api');

describe('gmailApi.importReceipts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deduplicates concurrent import requests', async () => {
    let resolveRequest!: (value: any) => void;

    (api.post as jest.Mock).mockImplementation(() => new Promise((resolve) => {
      resolveRequest = resolve;
    }));

    const promise1 = gmailApi.importReceipts();
    const promise2 = gmailApi.importReceipts();

    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith('/gmail/import', {}, { timeout: 300000 });

    resolveRequest({
      data: {
        success: true,
        totalEmailsFound: 5,
        totalReceiptsProcessed: 4,
        totalReceiptsImported: 4,
        totalAmount: 42.5,
        errors: [],
      },
    });

    const [result1, result2] = await Promise.all([promise1, promise2]);

    expect(result1).toEqual(result2);
  });

  it('allows a new import after the previous one completes', async () => {
    (api.post as jest.Mock)
      .mockResolvedValueOnce({
        data: {
          success: true,
          totalEmailsFound: 1,
          totalReceiptsProcessed: 1,
          totalReceiptsImported: 1,
          totalAmount: 12,
          errors: [],
        },
      })
      .mockResolvedValueOnce({
        data: {
          success: true,
          totalEmailsFound: 2,
          totalReceiptsProcessed: 2,
          totalReceiptsImported: 2,
          totalAmount: 24,
          errors: [],
        },
      });

    await gmailApi.importReceipts();
    await gmailApi.importReceipts();

    expect(api.post).toHaveBeenCalledTimes(2);
  });
});
