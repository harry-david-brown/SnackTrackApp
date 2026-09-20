import { canCaptureWrappedSlides } from '@components/wrapped/wrappedCapturePolicy';

it('keeps the DOM-based web capture tree out of the live Wrapped journey', () => {
  expect(canCaptureWrappedSlides('web')).toBe(false);
  expect(canCaptureWrappedSlides('ios')).toBe(true);
  expect(canCaptureWrappedSlides('android')).toBe(true);
});
