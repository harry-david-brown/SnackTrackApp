/**
 * Public API-service boundary.
 * Consumers should import named services from `@services/api` rather than
 * reaching into the implementation files under `services/api/`.
 */

export { default as api, userApi, csvApi, receiptApi } from './api/index';
export { default } from './api/index';
