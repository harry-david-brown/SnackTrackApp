import { selectEditorialCandidates, type EditorialCandidate } from '../../components/wrapped/wrappedSlideSelection';

type Candidate = EditorialCandidate<string>;

const candidate = (
  id: string,
  category: Candidate['category'],
  intensity: number,
  confidence = 1
): Candidate => ({ id, category, intensity, confidence, value: id });

describe('selectEditorialCandidates', () => {
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
