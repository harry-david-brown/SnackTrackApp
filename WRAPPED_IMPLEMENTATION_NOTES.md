# 🎊 Wrapped Analytics - Frontend Implementation Guide

**Backend Status:** ✅ Complete and tested  
**Endpoint:** `GET /validation/user/:userId/summary?includeWrapped=true`  
**Performance:** <30ms first request, <15ms cached

---

## 🎯 Quick Implementation Checklist

### 1. Fetch Wrapped Data
```typescript
const response = await api.get(
  `/validation/user/${userId}/summary?includeWrapped=true`,
  { headers: { Authorization: `Bearer ${token}` } }
);

const wrapped = response.data.wrappedAnalytics;
```

### 2. Build Slide Components (13 slides)

**Shame Slides (Red/Pink Gradient):**
- `wrapped.shame.lateNightOrders` - 3am orders
- `wrapped.shame.laziestDay` - Most orders in one day
- `wrapped.shame.longestStreak` - Consecutive ordering days
- `wrapped.shame.singleItemOrders` - Tiny orders
- `wrapped.shame.chainDependency` - McDonald's addiction

**Flex Slides (Green/Gold Gradient):**
- `wrapped.flex.mostExpensiveOrder` - Bougie moment
- `wrapped.flex.coffeeAddiction` - Coffee spending
- `wrapped.flex.nightOwl` - Late-night orders

**Comparative Slides (Orange/Yellow Gradient):**
- `wrapped.comparative.couldHaveBought` - What you could have
- `wrapped.comparative.missedInvestment` - S&P 500 regret
- `wrapped.comparative.costPerMeal` - Delivery tax

**Pattern Slides (Blue/Purple Gradient):**
- `wrapped.patterns.peakHungerHour` - When you're hungriest
- `wrapped.patterns.weekendWarrior` - Weekend vs weekday

### 3. Slide Template Structure

```jsx
<WrappedSlide gradient={['#FF6B6B', '#FFE66D']}>
  <BigNumber>{data.count}</BigNumber>
  <Message>{data.message}</Message>
  <Detail>{data.detail}</Detail>
  <ShareButton onPress={() => share(slideImage)} />
</WrappedSlide>
```

### 4. Key Design Principles

Each slide must have:
- ✅ ONE big number (the hero stat)
- ✅ The roast message (already provided by backend)
- ✅ Supporting details
- ✅ Share button
- ✅ Emoji for personality
- ✅ Screenshot-worthy design

---

## 📊 Real Data Examples (for testing)

Test user: `q@u.u` (202 receipts, $5,136 spent)

You'll get analytics like:
- 22 orders between midnight-6am ($554.35)
- 5-day ordering streak
- 12% McDonald's dependency (24 orders)
- $608.92 on coffee
- $9,784 if invested in S&P 500
- $86.85 pizza at 2:14 AM

All of these are REAL and will vary per user!

---

## 🎨 Suggested Slide Order

1. **Total Spent** (warm up - existing slide)
2. **3am Regret** (start with shame - relatable)
3. **Laziest Day** (peak shame)
4. **Serial Orderer** (streak shame)
5. **Chain Dependency** (McDonald's roast)
6. **Single Items** (couldn't go get it)
7. **Most Expensive** (flex moment - relief from shame)
8. **Coffee Addiction** (flex/shame hybrid)
9. **Night Owl** (badge flex)
10. **Could Have Bought** (shock value)
11. **Missed Investment** (biggest shock)
12. **Cost Per Meal** (reality check)
13. **Peak Hunger** (fun insight)
14. **Weekend Warrior** (closing insight)
15. **Share Journey** (final CTA)

---

## 💡 Tips

**Handle Missing Data:**
```typescript
const slides = [
  wrapped.shame.lateNightOrders && <LateNightSlide data={...} />,
  wrapped.shame.laziestDay && <LaziestDaySlide data={...} />,
  // ... etc
].filter(Boolean); // Remove undefined slides
```

**Share Functionality:**
```typescript
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';

const shareSlide = async (slideRef) => {
  const uri = await captureRef(slideRef);
  await Sharing.shareAsync(uri);
};
```

**Navigation:**
```typescript
<ScrollView 
  horizontal 
  pagingEnabled 
  snapToInterval={width}
  decelerationRate="fast"
>
  {slides.map(slide => ...)}
</ScrollView>
```

---

## ✅ Backend Ready Checklist

- ✅ Endpoint working: `/summary?includeWrapped=true`
- ✅ All 13 analytics implemented
- ✅ Messages shareable and meme-worthy
- ✅ Performance optimized (<30ms)
- ✅ Cached for fast subsequent loads
- ✅ Tested with real data
- ✅ Production-ready

**You just need to make it beautiful!** 🎨

---

**Questions?** Check `FRONTEND_GUIDE.md` for full API docs and examples.

**When ready:** Return to backend repo to discuss Railway deployment! 🚀
