import type { RecapStory } from '@/types/recap';

export type AnalyticsScope =
  | { kind: 'lifetime' }
  | { kind: 'year'; year: number };

export interface PersonalizedStorySelectionOptions {
  minStories?: number;
  maxStories?: number;
}

/** Scores rank stories; only factual eligibility (not a score cutoff) limits the core deck. */
export function selectPersonalizedStories(
  stories: readonly RecapStory[],
  options: PersonalizedStorySelectionOptions = {}
): RecapStory[] {
  const minStories = Math.max(0, options.minStories ?? 6);
  const maxStories = Math.max(minStories, options.maxStories ?? 8);
  const selected: RecapStory[] = [];
  const safe = stories.filter(s => s.id !== 'spending-timeline' && s.id !== 'cancellation-cost' &&
    (s.id !== 'refunded-orders' || typeof s.value === 'number' && s.value >= 10));
  const duplicates = (a: RecapStory, b: RecapStory) => a.overlaps.includes(b.id) || b.overlaps.includes(a.id) ||
    a.id === b.id || Boolean(a.subject && a.subject === b.subject && a.family === b.family);
  const canAdd = (s: RecapStory) => !selected.some(t => duplicates(s, t)) &&
    !(s.id === 'history-total') && // Already represented by the reserved delivery picture.
    !(s.id === 'history-top-restaurant' && selected.some(t => t.id === 'restaurant-loyalty' || t.id === 'top-spots')) &&
    (!(s.format === 'money' || s.family === 'spending') || selected.filter(t => t.format === 'money' || t.family === 'spending').length < 2);
  const adjusted = (s: RecapStory) => s.score - (selected.some(t => t.family === s.family) ? 15 : 0);
  const rank = (a: RecapStory, b: RecapStory) => adjusted(b) - adjusted(a) || b.specificity - a.specificity || a.id.localeCompare(b.id);
  const primary = safe.filter(s => s.fallbackOrder === undefined && !safe.some(t =>
    t.fallbackOrder === undefined && t.specificity > s.specificity && duplicates(s, t)));
  const day = primary.find(s => s.id === 'most-deliveries-day' && typeof s.value === 'number' && s.value >= 3);
  if (day) selected.push(day);
  const habit = primary.filter(s => s.category === 'habit' && canAdd(s)).sort(rank)[0];
  if (habit) selected.push(habit);
  while (selected.length < minStories) {
    const next = primary.filter(canAdd).sort(rank)[0] ?? safe.filter(s => s.fallbackOrder !== undefined && canAdd(s)).sort((a, b) => a.fallbackOrder! - b.fallbackOrder! || a.id.localeCompare(b.id))[0];
    if (!next) break;
    selected.push(next);
  }
  while (selected.length < maxStories) {
    const next = primary.filter(s => canAdd(s) && adjusted(s) >= 75).sort(rank)[0];
    if (!next) break;
    selected.push(next);
  }
  const order = ['perspective', 'trend', 'places', 'habit', 'pattern', 'extreme-moment'];
  return selected.sort((a, b) => order.indexOf(a.category) - order.indexOf(b.category) || rank(a, b));
}

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

export type RecapChapter = 'opening' | 'patterns' | 'extremes' | 'verdict';

export interface ChapteredSlide {
  id: string;
  category: SlideCategory;
}

/** Chapters are presentation-owned; API categories remain factual/editorial metadata. */
export function getRecapChapter(slide: ChapteredSlide): RecapChapter {
  if (slide.category === 'extreme-moment') return 'extremes';
  if (slide.category === 'trend' || slide.category === 'places' ||
      slide.category === 'habit' || slide.category === 'pattern') return 'patterns';
  if (slide.category === 'transition' || slide.category === 'identity') return 'verdict';
  return 'opening';
}

export function groupSlidesByRecapChapter<T extends ChapteredSlide>(slides: readonly T[]): Record<RecapChapter, T[]> {
  const chapters: Record<RecapChapter, T[]> = {
    opening: [],
    patterns: [],
    extremes: [],
    verdict: [],
  };
  slides.forEach(slide => chapters[getRecapChapter(slide)].push(slide));
  return chapters;
}

export type SlideEntranceRole = 'rise' | 'zoom' | 'slide' | 'drop' | 'quiet' | 'reveal';

/** Motion follows the editorial role, so a sparse deck still tells the same story. */
export function getSlideEntranceRole(
  category: SlideCategory,
  slideId?: string
): SlideEntranceRole {
  if (category === 'identity') return 'reveal';
  if (category === 'transition') return 'quiet';
  if (category === 'extreme-moment') return 'drop';
  if (category === 'perspective' || category === 'habit') return 'slide';
  if (category === 'headline' && slideId === 'lifetime-damage') return 'zoom';
  return 'rise';
}

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
