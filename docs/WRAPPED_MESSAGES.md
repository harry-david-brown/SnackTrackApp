# Wrapped Journey Dynamic Roast Messages

## Overview

The Wrapped Journey feature uses a **deterministic message selection system** that ensures the same user data always generates the same Wrapped journey with the same roast messages. This provides a consistent, personalized experience while allowing for variation across different users.

## How It Works

### 1. Seed Generation

Each user's data generates a stable seed based on:
- `userId` - Unique user identifier
- `totalSpent` - Total amount spent on food delivery
- `totalReceipts` - Total number of orders

The seed is generated using a deterministic hash function, so the same inputs always produce the same seed.

### 2. Seeded Random Number Generator

A seeded PRNG (Pseudo-Random Number Generator) uses Linear Congruential Generator (LCG) algorithm to produce deterministic "random" numbers. This ensures:
- Same seed → same sequence of random numbers
- Different users → different messages (even with similar data)
- Same user → same messages every time

### 3. Message Selection

For each slide category, the system:
1. Determines the appropriate value range based on user data
2. Retrieves all available messages for that range
3. Uses the seeded RNG to select a consistent message index
4. Returns the selected message

### 4. Seed Offsets

Each slide uses a different seed offset (0, 1, 2, ...) to ensure that even if multiple slides have the same value range, they get different messages.

## Message Categories

### Total Damage (`totalDamage`)
**Value Ranges:** `<$500`, `$500-$1500`, `$1500-$3000`, `$3000-$5000`, `$5000-$10000`, `$10000-$15000`, `$15000-$25000`, `$25000-$35000`, `$35000-$50000`, `$50000-$75000`, `$75000-$100000`, `$100000+`

**Messages:** 5 variations per range

### Late Night Orders (`lateNightOrders`)
**Value Ranges:** `0`, `1-5`, `6-15`, `16-30`, `30+`

**Messages:** 5 variations per range

### Laziest Day (`laziestDay`)
**Value Ranges:** `2-3`, `4-5`, `6-7`, `8+`

**Messages:** 5 variations per range

### Consecutive Days (`consecutiveDays`)
**Value Ranges:** `1-3`, `4-7`, `8-14`, `15-30`, `30+`

**Messages:** 5 variations per range

### Chain Dependency (`chainDependency`)
**Chains:** `McDonald's`, `Starbucks`, `Chipotle`, `Taco Bell`, `generic`

**Messages:** 5 variations per chain

### Single Item Orders (`singleItemOrders`)
**Value Ranges:** `0-5`, `6-15`, `16-30`, `30+`

**Messages:** 5 variations per range

### Most Expensive Order (`mostExpensiveOrder`)
**Value Ranges:** `<$50`, `$50-$100`, `$100-$200`, `$200+`

**Messages:** 5 variations per range

### Coffee Spending (`coffeeSpending`)
**Value Ranges:** `<$100`, `$100-$300`, `$300-$800`, `$800+`

**Messages:** 5 variations per range

### Night Owl Percentage (`nightOwlPercentage`)
**Value Ranges:** `<20%`, `20-40%`, `40-60%`, `60-80%`, `80%+`

**Messages:** 5 variations per range

### Could Have Bought (`couldHaveBought`)
**Messages:** 5 variations (no ranges)

### Missed Investment (`missedInvestment`)
**Value Ranges:** `<$1000`, `$1000-$3000`, `$3000-$7000`, `$7000-$15000`, `$15000-$30000`, `$30000-$50000`, `$50000-$75000`, `$75000-$100000`, `$100000-$150000`, `$150000+`

**Messages:** 5 variations per range

### Cost Per Meal (`costPerMeal`)
**Value Ranges:** `<$5`, `$5-$8`, `$8-$12`, `$12+`

**Messages:** 5 variations per range

### Peak Hunger Hour (`peakHungerHour`)
**Categories:** `breakfast`, `lunch`, `dinner`, `late-night`, `chaos`

**Messages:** 5 variations per category

### Weekend Warrior (`weekendWarrior`)
**Categories:** `weekday`, `weekend`, `balanced`

**Messages:** 5 variations per category

## Adding New Messages

To add new message variations:

1. Open `utils/wrappedMessages.ts`
2. Find the relevant category in `WRAPPED_MESSAGES`
3. Add your new message to the appropriate range/category array
4. The system will automatically include it in selection

Example:
```typescript
totalDamage: {
  '<500': [
    "Your wallet is filing for divorce",
    "That's a whole lot of snacks",
    // Add your new message here:
    "New roast message here",
    // ... rest of messages
  ],
}
```

## Technical Details

### Seed Hash Function
```typescript
function generateSeed(userId: string, totalSpent: number, totalReceipts: number): number {
  const str = `${userId}-${totalSpent}-${totalReceipts}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}
```

### Seeded RNG Implementation
```typescript
class SeededRandom {
  private seed: number;
  
  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) % Math.pow(2, 32);
    return this.seed / Math.pow(2, 32);
  }
  
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min)) + min;
  }
}
```

## Usage in Components

```typescript
import { getDeterministicMessage } from '../utils/wrappedMessages';

// In your component:
const message = getDeterministicMessage(
  'totalDamage',        // Category
  analytics,            // UserSummary object
  undefined,            // Value (optional, depends on category)
  0                     // Seed offset (unique per slide)
);
```

## Determinism Guarantee

✅ **Same user data** → **Same messages**  
✅ **Different users** → **Different messages** (even with similar spending)  
✅ **Consistent across sessions** → No random variation  
✅ **Reproducible** → Perfect for testing and debugging

## Future Enhancements

Potential improvements:
- Value interpolation (e.g., `$[X]`, `[time]`, `[chain]` placeholders)
- Message templates with dynamic values
- A/B testing different message sets
- User preference-based message tone (playful vs. serious)

