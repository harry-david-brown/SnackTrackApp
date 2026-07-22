export type AnalyticsScope =
  | { kind: 'lifetime' }
  | { kind: 'year'; year: number };

export type SlideCategory =
  | 'headline'
  | 'perspective'
  | 'trend'
  | 'places'
  | 'habit'
  | 'pattern'
  | 'extreme-moment'
  | 'transition'
  | 'identity';

export interface EditorialCandidate<T> {
  id: string;
  category: SlideCategory;
  intensity: number;
  /** 0–1 confidence that this candidate represents a real pattern. */
  confidence?: number;
  value: T;
}

const OPTIONAL_CATEGORY_ORDER: SlideCategory[] = [
  'perspective',
  'trend',
  'places',
  'habit',
  'pattern',
  'extreme-moment',
];

const CONFLICTS = new Set([
  ['late-night-orders', 'night-owl'].sort().join(':'),
]);

const conflictsWith = (id: string, selectedIds: string[]) =>
  selectedIds.some(selectedId => CONFLICTS.has([id, selectedId].sort().join(':')));

const candidateScore = <T>(candidate: EditorialCandidate<T>) =>
  candidate.intensity * (candidate.confidence ?? 1);

/**
 * Pick at most one candidate per editorial category while preserving a fixed
 * narrative order. A small exhaustive search lets conflicting candidates fall
 * back to the next-best option in their category instead of dropping a beat.
 */
export function selectEditorialCandidates<T>(
  candidates: EditorialCandidate<T>[]
): EditorialCandidate<T>[] {
  const byCategory = new Map<SlideCategory, EditorialCandidate<T>[]>();

  for (const category of OPTIONAL_CATEGORY_ORDER) {
    byCategory.set(
      category,
      candidates
        .filter(candidate => candidate.category === category)
        .sort((a, b) => candidateScore(b) - candidateScore(a) || a.id.localeCompare(b.id))
    );
  }

  let best: EditorialCandidate<T>[] = [];
  let bestScore = -1;

  const visit = (categoryIndex: number, selected: EditorialCandidate<T>[]) => {
    if (categoryIndex === OPTIONAL_CATEGORY_ORDER.length) {
      const score = selected.reduce((sum, candidate) => sum + candidateScore(candidate), 0);
      if (selected.length > best.length || (selected.length === best.length && score > bestScore)) {
        best = [...selected];
        bestScore = score;
      }
      return;
    }

    const category = OPTIONAL_CATEGORY_ORDER[categoryIndex];
    const options = byCategory.get(category) ?? [];

    // Sparse data is valid, so every category can be omitted.
    visit(categoryIndex + 1, selected);

    for (const option of options) {
      if (!conflictsWith(option.id, selected.map(candidate => candidate.id))) {
        visit(categoryIndex + 1, [...selected, option]);
      }
    }
  };

  visit(0, []);

  return best.sort(
    (a, b) => OPTIONAL_CATEGORY_ORDER.indexOf(a.category) - OPTIONAL_CATEGORY_ORDER.indexOf(b.category)
  );
}

