/**
 * API services - main export file
 * Re-exports all API modules for backward compatibility
 * 
 * @deprecated Import from './api' submodules directly for better tree-shaking
 * Example: import { userApi } from './api/userApi'
 */

export { default as api, userApi, csvApi, databaseApi, receiptApi, validationApi } from './api/index';
export { default } from './api/index';
