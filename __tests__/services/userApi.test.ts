import api from '../../services/api/client';
import { userApi } from '../../services/api/userApi';
import { validateAndAuthorizeUserId } from '../../utils/securityValidation';

jest.mock('../../services/api/client');
jest.mock('../../utils/securityValidation', () => ({
  validateAndAuthorizeUserId: jest.fn(),
  isValidEmail: jest.fn(() => true),
  sanitizeInput: jest.fn((value) => value),
}));

describe('userApi.resetOnboarding', () => {
  it('requests a complete authenticated import-data reset with an import-safe timeout', async () => {
    const userId = '5dbade07-0542-4ad9-b89d-abdaad15cd01';
    const response = {
      success: true,
      deletedReceipts: 257,
      message: 'Account import data reset successfully',
    };
    (validateAndAuthorizeUserId as jest.Mock).mockResolvedValue(userId);
    (api.post as jest.Mock).mockResolvedValue({ data: response });

    await expect(userApi.resetOnboarding(userId)).resolves.toEqual(response);
    expect(api.post).toHaveBeenCalledWith(
      `/users/${userId}/reset-onboarding`,
      {},
      { timeout: 360000 }
    );
  });
});
