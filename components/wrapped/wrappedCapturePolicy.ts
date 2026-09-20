/** Native capture is supported; the web adapter relies on transient DOM clones that can leak into the live story. */
export const canCaptureWrappedSlides = (platform: string): boolean => platform !== 'web';
