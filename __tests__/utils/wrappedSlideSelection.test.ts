import {
  getRecapChapter,
  getSlideEntranceRole,
  groupSlidesByRecapChapter,
  selectEditorialCandidates,
  type EditorialCandidate,
} from '@components/wrapped/wrappedSlideSelection';

type Candidate = EditorialCandidate<string>;

const candidate = (
  id: string,
  category: Candidate['category'],
  intensity: number,
  confidence = 1
): Candidate => ({ id, category, intensity, confidence, value: id });

describe('selectEditorialCandidates', () => {
  it('derives recap chapters from editorial categories', () => {
    expect(getRecapChapter({ id: 'damage', category: 'headline' })).toBe('opening');
    expect(getRecapChapter({ id: 'waits', category: 'perspective' })).toBe('opening');
    expect(getRecapChapter({ id: 'usual', category: 'places' })).toBe('patterns');
    expect(getRecapChapter({ id: 'streak', category: 'habit' })).toBe('patterns');
    expect(getRecapChapter({ id: 'busy-day', category: 'extreme-moment' })).toBe('extremes');
    expect(getRecapChapter({ id: 'verdict', category: 'identity' })).toBe('verdict');

    const grouped = groupSlidesByRecapChapter([
      { id: 'waits', category: 'perspective' as const },
      { id: 'streak', category: 'habit' as const },
      { id: 'busy-day', category: 'extreme-moment' as const },
    ]);
    expect(grouped.opening.map(slide => slide.id)).toEqual(['waits']);
    expect(grouped.patterns.map(slide => slide.id)).toEqual(['streak']);
    expect(grouped.extremes.map(slide => slide.id)).toEqual(['busy-day']);
  });

  it('assigns entrance motion by narrative role rather than position', () => {
    expect(getSlideEntranceRole('headline', 'lifetime-intro')).toBe('rise');
    expect(getSlideEntranceRole('headline', 'lifetime-damage')).toBe('zoom');
    expect(getSlideEntranceRole('perspective')).toBe('slide');
    expect(getSlideEntranceRole('extreme-moment')).toBe('drop');
    expect(getSlideEntranceRole('transition')).toBe('quiet');
    expect(getSlideEntranceRole('identity')).toBe('reveal');
  });

  it('keeps one slide per category in the editorial narrative order', () => {
    const selected = selectEditorialCandidates([
      candidate('habit-weak', 'habit', 25),
      candidate('extreme', 'extreme-moment', 80),
      candidate('perspective', 'perspective', 30),
      candidate('places', 'places', 10),
      candidate('habit-strong', 'habit', 90),
      candidate('trend', 'trend', 40),
      candidate('pattern', 'pattern', 100),
    ]);

    expect(selected.map(item => item.value)).toEqual([
      'perspective',
      'trend',
      'places',
      'habit-strong',
      'pattern',
      'extreme',
    ]);
  });

  it('uses confidence when choosing the strongest candidate', () => {
    const selected = selectEditorialCandidates([
      candidate('flashy-but-thin', 'habit', 100, 0.2),
      candidate('well-supported', 'habit', 70, 0.9),
    ]);

    expect(selected.map(item => item.id)).toEqual(['well-supported']);
  });

  it('falls back to a non-conflicting candidate instead of dropping a category', () => {
    const selected = selectEditorialCandidates([
      candidate('night-owl', 'pattern', 100),
      candidate('weekend-warrior', 'pattern', 70),
      candidate('late-night-orders', 'extreme-moment', 100),
    ]);

    expect(selected.map(item => item.id)).toEqual(['weekend-warrior', 'late-night-orders']);
  });

  it('collapses sparse data without placeholders', () => {
    expect(selectEditorialCandidates([
      candidate('top-spots', 'places', 50),
    ]).map(item => item.id)).toEqual(['top-spots']);
    expect(selectEditorialCandidates([])).toEqual([]);
  });

  it('returns no more than the six optional editorial beats', () => {
    const selected = selectEditorialCandidates([
      ...Array.from({ length: 5 }, (_, index) => candidate(`perspective-${index}`, 'perspective', index)),
      ...Array.from({ length: 5 }, (_, index) => candidate(`habit-${index}`, 'habit', index)),
      candidate('trend', 'trend', 1),
      candidate('places', 'places', 1),
      candidate('pattern', 'pattern', 1),
      candidate('extreme', 'extreme-moment', 1),
    ]);

    expect(selected).toHaveLength(6);
  });
});
