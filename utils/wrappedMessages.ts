import { UserSummary } from '../types/api';

// Simple seeded PRNG for deterministic randomness
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  // LCG (Linear Congruential Generator) algorithm
  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) % Math.pow(2, 32);
    return this.seed / Math.pow(2, 32);
  }

  // Get integer in range [min, max)
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min)) + min;
  }
}

// Generate a stable seed from user data
function generateSeed(userId: string, totalSpent: number, totalReceipts: number): number {
  // Create a deterministic hash from user data
  const str = `${userId}-${totalSpent}-${totalReceipts}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

// Message data structure with user's pre-screened messages
export const WRAPPED_MESSAGES = {
  totalDamage: {
    '<500': [
      "Honestly not terrible. You might actually be a functioning adult.",
      "Rookie numbers. Your friends are way worse.",
      "Congrats on having your shit together I guess",
      "This is actually impressive restraint",
    ],
    '500-1500': [
      "Not great but honestly could be so much worse",
      "This is fine. This is totally fine. Everything is fine.",
      "Your friends definitely spent more",
      "Somewhere between 'oops' and 'oh no'",
      "Mid-tier financial damage",
    ],
    '1500-3000': [
      "Starting to get spicy",
      "This is where it gets real",
      "Okay so you have a little problem",
      "That's a used car you just ate",
      "Your bank account felt this one",
    ],
    '3000-5000': [
      "Four grand. Say it out loud. Sounds crazy right?",
      "This is actually rent money",
      "We're entering 'yikes' territory",
      "That's a semester of community college",
      "Your future self is so disappointed",
    ],
    '5000-10000': [
      "This is a whole ass car",
      "Bro what are you doing",
      "That's a year of groceries you just skipped",
      "We've crossed into serious problem territory",
      "Your descendants will feel this financially",
    ],
    '10000-15000': [
      "Five figures. FIVE. FIGURES.",
      "Ten thousand dollars on food delivery apps",
      "This is a down payment in some markets",
      "I'm genuinely concerned about you",
      "You could have studied abroad for a year",
      "This number has made me personally angry",
    ],
    '15000-25000': [
      "FIFTEEN THOUSAND DOLLARS",
      "You've spent more on UberEats than most people's annual salary",
      "At this point just hire a personal chef",
      "Twenty grand on delivery apps is genuinely insane",
      "This is what some people make in a year",
      "Your financial advisor would cry if they saw this",
    ],
    '25000-35000': [
      "Twenty five THOUSAND dollars",
      "This is more than some people's student loans",
      "This is a year of rent in most cities",
      "I don't even know what to say anymore",
      "You've achieved legendary status in financial irresponsibility",
      "Thirty bands on takeout. THIRTY.",
    ],
    '35000-50000': [
      "THIRTY FIVE THOUSAND DOLLARS",
      "This is a salary. A FULL SALARY.",
      "You could have had a wedding with this money",
      "This is multiple cars",
      "Forty thousand dollars on food delivery I'm gonna be sick",
      "You're in the hall of fame now",
      "This needs to be studied by economists",
      "Half of a hundred thousand dollars on food apps",
    ],
    '50000-75000': [
      "FIFTY THOUSAND DOLLARS",
      "This is a down payment on a house",
      "You've spent a BMW on UberEats",
      "This is generational wealth you just ate",
      "I'm speechless. Genuinely fucking speechless.",
      "You could have paid off student loans with this",
      "This is more than most people make in a year",
      "Sixty grand. SIXTY GRAND ON UBEREATS.",
      "You need to be in a case study",
    ],
    '75000-100000': [
      "This is a house in some parts of America",
      "You've spent a luxury car on delivery apps",
      "This is not real. This cannot be real.",
      "Eighty thousand dollars. I'm forwarding this to the FBI.",
      "You're approaching six figures on food delivery",
      "This is a full year salary for most Americans",
      "You could have retired earlier with this money",
      "I have no words left",
    ],
    '100000+': [
      "ONE HUNDRED THOUSAND DOLLARS",
      "This is a house. AN ACTUAL HOUSE.",
      "You've spent a Tesla Model S on UberEats",
      "This number should not be possible",
      "You are the final boss of food delivery apps",
      "This is generational wealth that will never exist",
      "You could have bought a franchise with this",
      "Six figures. SIX FUCKING FIGURES.",
      "Delete this app. Delete your bank. Start your life over.",
      "You're a legend. A financially ruined legend.",
      "This is going in the Guinness Book of World Records",
      "Your great grandchildren will feel this",
      "I'm showing this to economists",
      "This is a down payment on multiple properties",
      "You've single-handedly kept UberEats profitable",
    ],
  },

  lateNightOrders: {
    '0': [
      "Wow look at you with your healthy sleep schedule and good decisions",
      "Either you're lying or you're no fun at parties",
      "You've never been drunk-hungry? Suspicious.",
      "Never ordered drunk food? Are you even living?",
      "Either lying or the most boring person alive",
      "Your 3am self has incredible restraint somehow",
    ],
    '1-5': [
      "A few late night mistakes. We've all been there.",
      "Your drunk self has better impulse control than most",
      "Respectable self-control for a degenerate",
      "A couple late night lapses in judgment. Classic.",
      "Your drunk self only makes bad decisions sometimes",
      "Reasonable amount of 3am chaos",
      "The occasional midnight munchies, we get it",
    ],
    '6-15': [
      "Your drunk self cannot be trusted with a phone",
      "Sober you is filing a restraining order against drunk you",
      "Someone needs to take your phone when you drink",
      "The delivery drivers know your drunk order by heart",
      "Double digits at 3am is a red flag",
      "Every time you go out, someone's delivering to you at 3am",
      "Your 3am self is single-handedly funding the night shift",
      "Drunk you has zero impulse control with that phone",
      "The drivers recognize your address at this point",
    ],
    '16-30': [
      "Your 3am self is keeping the gig economy alive",
      "I'm calling your mom",
      "Every weekend you blackout and wake up to a receipt",
      "This is every weekend. Every. Single. Weekend.",
      "You've ordered at 3am more times than you've been to the gym",
      "Your nocturnal ordering habits are psychiatric",
      "Someone needs to confiscate your phone after 11pm",
      "Twenty 3am orders is not a phase it's a pattern",
    ],
    '30+': [
      "Are you just... always awake at 3am?",
      "This is concerning on multiple levels",
      "Do you sleep? Do you eat during the day? What's happening?",
      "You've spent more at 3am than most people spend total",
      "Thirty times at 3am??? THIRTY???",
      "This is either a substance issue or a sleep issue or both",
      "You've built a relationship with the night shift drivers",
      "Are you nocturnal? What's your schedule?",
      "This frequency is genuinely alarming",
    ],
  },

  laziestDay: {
    '2-3': [
      "Breakfast, lunch, dinner. The holy trinity of laziness.",
      "Not cooking breakfast OR dinner is crazy",
      "You really woke up and chose violence against your wallet",
      "Three meals, zero cooking. The dream.",
      "You really said 'kitchen who?'",
      "Breakfast, lunch, dinner on someone else's labor",
      "Not a single meal from your own kitchen that day",
    ],
    '4-5': [
      "FOUR TIMES? IN ONE DAY?",
      "Did your stove break or is this a cry for help",
      "You ordered more times than you showered that day probably",
      "Your delivery driver thought you were having a party. You weren't.",
      "Four orders in 24 hours is psychotic",
      "Were you moving? Was your kitchen broken?",
      "You ordered more than you probably showered",
      "FOUR separate times you chose violence",
      "That's a meal every 4 hours delivered",
    ],
    '6-7': [
      "Seven separate orders. That's a meal every 2 hours.",
      "Were you okay? Blink twice if you need help.",
      "This is beyond laziness this is a lifestyle",
      "Your driver made enough off you for his own meal",
      "Six deliveries in one day. SIX.",
      "Did you tip the same driver multiple times in one day",
      "This is compulsive behavior at this point",
      "You ate every 2-3 hours and cooked zero times",
      "The driver started making conversation by visit three",
    ],
    '8+': [
      "What the fuck was happening that day",
      "This is not normal human behavior",
      "Were you challenging yourself? Did you lose a bet?",
      "Your bank sent a fraud alert for sure",
      "Eight plus orders. I need context immediately.",
      "This is beyond explanation",
      "Were you having a party or just spiraling",
      "The sheer audacity of ordering THIS many times",
      "Your driver earned their rent that day off you alone",
    ],
  },

  consecutiveDays: {
    '1-3': [
      "A little weekend binge. Cute.",
      "Honestly this is just a normal weekend",
      "A light weekend bender.",
      "Three days is just a long weekend of laziness",
      "Barely even counts as a streak honestly",
    ],
    '4-7': [
      "A full week without cooking. Impressive honestly.",
      "Your kitchen appliances filed for unemployment",
      "Week-long commitment to not trying",
      "Did you forget kitchens exist?",
      "A full week of not touching your stove",
      "Your groceries expired while you did this",
      "Week-long cooking strike",
    ],
    '8-14': [
      "Your oven is collecting dust and passive aggressive energy",
      "You haven't seen a vegetable in its natural form in weeks",
      "The drivers know your order before you do at this point",
      "Two weeks without cooking is actually impressive",
      "Your oven doesn't even remember what you look like",
      "The delivery drivers started asking about your day",
      "You set a new personal record for incompetence",
    ],
    '15-30': [
      "A whole ass month of not cooking",
      "Do you even remember what a grocery store looks like",
      "Your kitchen is just decorative at this point",
      "You've achieved weaponized incompetence",
      "Your kitchen is just a very expensive storage room now",
      "That's dedication to the bit.",
      "You forgot what cooking even is",
      "This is beyond lazy this is impressive",
    ],
    '30+': [
      "Over a month. OVER A MONTH WITHOUT COOKING.",
      "Your stove is a mythical object to you now",
      "This is an achievement and a mental health crisis",
      "Someone needs to do a wellness check",
      "You could have learned to cook in this time",
      "Over a month straight. This is a medical concern.",
      "You've achieved something no one should achieve",
      "Your stove could be sold as 'like new condition'",
      "This is the longest streak of bad decisions possible",
      "Guinness World Records should be notified",
    ],
  },

  chainDependency: {
    "McDonald's": [
      "The McDepression is real",
      "Ronald McDonald is personally thanking you",
      "You kept your local McDonald's in business single-handedly",
      "Bro it's cheaper if you just... go there",
      "Adding $8 in fees to a $6 meal is psychotic behavior",
      "Gave McDonald's $X like they need your help",
      "You're keeping the Golden Arches golden",
      "The dollar menu isn't a dollar when you add delivery",
      "You paid $10 in fees for a $7 meal how many times???",
      "There's one literally everywhere and you still delivered it",
    ],
    "Starbucks": [
      "Paying $15 for coffee delivery is a personality disorder",
      "The baristas know your voice on the app",
      "There's literally one on every corner and you still deliver it",
      "This is the most expensive caffeine addiction possible",
      "$X on delivery Starbucks is certifiable",
      "You paid someone to drive coffee to you that many times",
      "There's three Starbucks within walking distance probably",
      "Your barista knows your order through the app",
      "This is the most expensive caffeine habit scientifically possible",
    ],
    "Chipotle": [
      "You're keeping Chipotle's stock price up",
      "Just buy a burrito bowl subscription at this point",
      "The guac addiction is real",
      "You've consumed more Chipotle than most Chipotle employees",
      "You've consumed your body weight in Chipotle",
      "$X at one burrito chain is legendary status",
      "The extra guac added up didn't it",
      "You're in their corporate presentations for sure",
    ],
    "Taco Bell": [
      "Gourmet 4am cuisine",
      "You're either high or have no taste buds left",
      "Respect for the dedication to regret",
      "Your toilet hates you",
      "Taco Bell delivered is a war crime against your wallet",
      "Respect for the dedication to cheap drunk food",
      "Your digestive system is filing a complaint",
      "You've given Taco Bell more money than they deserve",
    ],
    'generic': [
      "You gave [chain] $X. They didn't even send a thank you card.",
      "You're in their customer loyalty hall of fame for sure",
      "This chain owns you now",
      "[Chain] is naming a menu item after you probably",
      "You're personally keeping this franchise alive",
      "Corporate is sending you a thank you basket",
      "$X at one chain. They didn't even give you a loyalty card.",
    ],
  },

  singleItemOrders: {
    '0-5': [
      "Wow you actually have some self-respect",
      "Look at you being reasonable",
      "Shocking self-control honestly",
      "You actually have standards. Weird.",
    ],
    '6-15': [
      "A dozen times you paid $10 to have someone bring you one thing",
      "You really couldn't just... go get it?",
      "These are the definition of unnecessary",
      "Ten times you paid $8 to deliver a $6 item",
      "The math ain't mathing on these orders",
      "Pure laziness distilled into transactions",
      "You really couldn't walk 5 minutes?",
      "These orders are more fees than food",
    ],
    '16-30': [
      "Thirty times. THIRTY TIMES you did this.",
      "You've spent more on delivery fees than the actual food",
      "This is weaponized laziness",
      "Your legs work. I've seen you walk.",
      "Twenty single-item deliveries is insanity",
      "You've paid more in fees than the food cost",
      "Each one of these was avoidable",
      "Your laziness is costing you exponentially",
      "Gas money would have been cheaper",
    ],
    '30+': [
      "You paid someone to walk further than you were willing to walk",
      "The audacity. The sheer audacity.",
      "You could have gotten so much exercise",
      "Gas money would have been cheaper than these fees",
      "Over thirty times. THIRTY separate single items.",
      "You spent more on delivery than the actual orders",
      "The environmental impact alone is staggering",
      "Your driver walked further than you were willing to",
      "This is advanced laziness",
    ],
  },

  mostExpensiveOrder: {
    '<50': [
      "A modest splurge. Cute.",
      "Treating yourself responsibly. Boring but smart.",
      "A reasonable splurge. Almost responsible.",
      "This isn't crazy. You're fine.",
    ],
    '50-100': [
      "Okay big spender",
      "Someone was feeling fancy",
      "Was it good though? It better have been worth it.",
      "Did you at least share this or just disrespect it solo?",
      "Sixty dollars for delivery is kinda crazy",
      "This better have been amazing",
      "Was it worth it though? Really?",
      "You could have gone to a real restaurant for this price",
      "Big spender energy for one order",
    ],
    '100-200': [
      "A HUNDRED DOLLARS? FOR DELIVERY?",
      "This better have been for a group or you're unhinged",
      "The driver was so confused delivering this",
      "You could have gone to an actual restaurant for this",
      "A HUNDRED DOLLARS ON DELIVERY???",
      "This is a nice restaurant bill but delivered",
      "I hope this fed like 5 people minimum",
      "The driver was so confused carrying this",
      "You could have gotten groceries for a week",
    ],
    '200+': [
      "What the fuck did you order",
      "This is a week of groceries. DELIVERED ONCE.",
      "I hope this was for like 8 people",
      "The driver thought they won the lottery",
      "Did you order the entire menu?",
      "Two hundred dollars in one order I'm gonna be sick",
      "Did you order one of everything",
      "This is a week of meals. DELIVERED. ONCE.",
      "The driver thought it was a catering order",
      "What the fuck was on this receipt",
    ],
  },

  coffeeSpending: {
    '<100': [
      "Reasonable caffeine habits. Weird.",
      "Either you're responsible or you hate coffee",
      "Totally normal coffee habits. Boring.",
      "Your caffeine consumption is responsible somehow",
      "Maybe you don't like coffee",
      "Maybe this is why you're so unproductive",
    ],
    '100-300': [
      "A few too many overpriced lattes",
      "Your caffeine addiction is moderate to concerning",
      "Just buy a coffee maker challenge",
      "Two hundred bucks on coffee is getting up there",
      "A couple too many $7 lattes",
      "Your caffeine dependency is showing",
      "That's a coffee maker and 6 months of beans",
    ],
    '300-800': [
      "This is a Nespresso machine. Multiple Nespresso machines.",
      "You've given more to coffee shops than to charity probably",
      "Coffee shops are your retirement plan apparently",
      "Five hundred dollars. On COFFEE.",
      "That's a premium espresso machine you didn't buy",
      "Your blood type is cold brew at this point",
      "Coffee shops see you coming and start celebrating",
      "This is a subscription service at this point",
    ],
    '800+': [
      "This is a car payment worth of COFFEE",
      "You have a substance abuse problem but it's legal",
      "Coffee shops are naming drinks after you",
      "Just install an IV of cold brew at this point",
      "This is rent money in some cities",
      "You have a dependency that requires intervention",
      "Starbucks is sending you a Christmas card",
      "Your blood is 40% overpriced espresso",
    ],
  },

  nightOwlPercentage: {
    '<20': [
      "Mostly normal eating hours. Functioning adult behavior.",
      "Your circadian rhythm is healthy and boring",
      "Mostly normal hours. Functioning adult detected.",
      "Your eating schedule is boring and healthy",
    ],
    '20-40': [
      "A healthy night owl tendency",
      "Late night snacker energy",
      "Your sleep schedule is questionable but not alarming",
      "Some late night tendencies, nothing alarming",
      "Night owl vibes but not concerning",
      "Your sleep schedule is questionable but manageable",
    ],
    '40-60': [
      "Half your orders are after 10pm what is your schedule",
      "Do you work nights or just hate daylight",
      "Your peak hours are everyone else's bedtime",
      "Half your food comes after 10pm what is happening",
      "Do you work nights or just hate daytime",
      "Your circadian rhythm is fucked",
      "Most people are winding down when you're ordering",
    ],
    '60-80': [
      "You're basically nocturnal",
      "The sun is your enemy apparently",
      "Night shift worker or vampire? Both?",
      "You've never heard of breakfast have you",
      "You're basically a vampire",
      "Three quarters of orders after 10pm is not normal",
    ],
    '80+': [
      "You literally only eat at night",
      "When do you sleep??? Do you sleep???",
      "This is not a normal human eating pattern",
      "The night shift drivers know you by name",
      "You exclusively eat at night. EXCLUSIVELY.",
      "This is not human behavior this is cryptid behavior",
      "You've never ordered during daylight hours have you",
      "Your circadian rhythm is non-existent",
      "Are you allergic to the sun?",
    ],
  },

  couldHaveBought: [
    "Priorities",
    "That's a lot of 'what if' moments",
    "You made choices... interesting ones",
    "Different paths, same destination",
    "That's opportunity cost in action",
  ],

  missedInvestment: {
    '<1000': [
      "Missing out on $[X] in gains. Not great, not terrible.",
      "Could've had an extra $[X]. Oh well.",
      "Could've had an extra $[X] but whatever",
      "Missing out on $[X]. Not devastating but not great.",
      "That's $[X] you won't have for retirement. Whoops.",
    ],
    '1000-3000': [
      "That's $[X] in lost investment returns",
      "You chose immediate gratification over $[X]",
      "Future you is so disappointed",
      "Your retirement fund is crying",
      "$[X] in investment returns you'll never see",
      "That's $[X] that could be growing right now",
      "You chose instant noodles over future wealth",
      "Compound interest is crying",
    ],
    '3000-7000': [
      "$[X] in lost gains. Let that sink in.",
      "You're literally $[X] poorer because of pad thai",
      "That's a car down payment in investment returns",
      "Your future self is sending hate mail back in time",
      "The opportunity cost is physically painful",
      "You could have $[X] more right now",
      "$[X] in wealth you just... deleted",
    ],
    '7000-15000': [
      "That's literally $[X] you don't have because of pad thai",
      "Your financial advisor just felt a disturbance in the force",
      "Dave Ramsey is having a panic attack somewhere",
      "Ten grand in returns. GONE. Because you can't cook.",
      "$[X] that could be compounding right now",
      "You're $[X] poorer because you can't meal prep",
      "That's a used car in investment returns you won't see",
    ],
    '15000-30000': [
      "You're $[X] poorer because you can't cook",
      "That's a down payment. That's a FUCKING DOWN PAYMENT.",
      "The opportunity cost is literally destroying me",
      "Warren Buffett is personally disappointed in you",
      "$[X] in investment returns gone. Absolutely gone.",
      "Twenty grand in returns you ate away",
      "This is a retirement fund you just consumed",
      "You could have $[X] MORE right now working for you",
      "That's a brand new car in lost investment gains",
    ],
    '30000-50000': [
      "Financial advisors are having nightmares about you",
      "$[X]. That's how much wealth you deleted.",
      "You could have had a down payment growing",
      "That's $[X] in compound interest you'll never see",
      "This is a new car in investment returns. GONE.",
      "Forty grand that could be making you more money",
      "Your portfolio would be thriving right now",
      "r/wallstreetbets is crying for you",
    ],
    '50000-75000': [
      "FIFTY THOUSAND DOLLARS in lost investment returns",
      "You could have $[X] working for you right now",
      "That's a house down payment in investment gains",
      "This is what financial trauma looks like",
      "Sixty grand in compound interest GONE",
      "You deleted a mid-tier Tesla in potential returns",
      "This could have been your retirement nest egg",
      "Your future self is screaming back through time",
      "$[X] that would be making you money while you sleep",
    ],
    '75000-100000': [
      "You're missing out on $[X] in investment returns",
      "Eighty grand that could be compounding right now",
      "This is generational wealth you ate",
      "You could have had $[X] growing at 10% annually",
      "Financial planners are using you as a cautionary tale",
      "That's almost six figures in returns. ALMOST SIX FIGURES.",
      "You chose delivery over a future mansion",
      "This number is going to haunt you for decades",
      "This is 'retire at 40' money. GONE.",
    ],
    '100000-150000': [
      "ONE HUNDRED THOUSAND DOLLARS in lost investment returns",
      "You're missing SIX FIGURES in potential wealth",
      "That's $[X] that could have changed your life",
      "This is a house. A FULL HOUSE in investment gains.",
      "You could have been on track to early retirement",
      "Six figure returns GONE because you can't use a stove",
      "This is 'fuck you money' you'll never have",
      "Your children's inheritance just vanished",
      "$[X] working for you would have been life-changing",
      "This is financial violence against your future self",
    ],
    '150000+': [
      "You're missing out on over $[X] in investment returns",
      "That's a MANSION down payment in lost wealth",
      "This is more money than most people will save in their lifetime",
      "You could have retired early with this",
      "Six figures. SIX FUCKING FIGURES in returns you'll never see.",
      "This is generational wealth that will NEVER exist now",
      "Financial advisors are showing this to clients as a horror story",
      "You chose UberEats over financial freedom",
      "$[X] compounding for 30 years would have made you a millionaire",
      "This number should be illegal",
      "Your grandchildren will never exist because you can't afford them now",
      "You've deleted a small fortune in potential returns",
      "This is what regret looks like in dollar signs",
    ],
  },

  costPerMeal: {
    '<5': [
      "Only $[X] extra per meal in fees. Almost reasonable.",
      "Could be worse honestly",
      "$[X] extra per meal isn't terrible honestly",
      "Could definitely be worse",
    ],
    '5-8': [
      "You're paying $[X] extra PER MEAL for the privilege of not cooking",
      "That's $[X] per meal you're just... giving away",
      "Multiply $[X] by every meal. Feel that? That's regret.",
      "That's $[X] per meal in pure fees",
      "You're paying $[X] extra just for convenience",
      "$[X] per meal that could have been... anything else",
      "Multiply that by every meal. Hurts doesn't it.",
    ],
    '8-12': [
      "$[X] per meal in pure waste",
      "You're basically paying double for everything",
      "That's almost what the actual food costs",
      "Ten bucks extra per meal is criminal",
      "You're basically doubling the cost of your food",
      "$[X] per meal is almost what the food costs",
      "That's a 100% markup you're just accepting",
    ],
    '12+': [
      "Over $[X] extra per meal what the fuck",
      "You're paying more in fees than some people spend on food",
      "The delivery fee is more expensive than making it yourself",
      "This is financial self-harm",
      "Over $[X] extra PER MEAL",
      "You're paying more in fees than actual food",
      "The delivery costs more than making it yourself",
      "This is genuinely unhinged spending",
    ],
  },

  peakHungerHour: {
    'breakfast': [
      "Ordering breakfast delivery is peak laziness",
      "Cereal exists. Eggs exist. What are you doing.",
      "You couldn't make toast?",
      "You order breakfast the most. Toast is basically free.",
      "Cereal exists. Eggs take 3 minutes.",
      "Breakfast delivery is peak 'I've given up'",
    ],
    'lunch': [
      "Standard lunch orders. Boring but normal.",
      "At least you're eating like a regular human",
      "Peak lunch ordering. Basic but understandable.",
      "At least this is normal human behavior",
    ],
    'dinner': [
      "Classic dinner ordering. Nothing to see here.",
      "The most common time to admit defeat",
      "Standard dinner delivery. Nothing special here.",
      "The most common time to admit defeat",
      "You're statistically average. Congrats?",
    ],
    'late-night': [
      "Your peak hunger is when normal people sleep",
      "You're a creature of the night",
      "This explains so much about you",
      "You're hungriest when everyone else sleeps",
      "Peak ordering at [time]am. Seek sunlight.",
      "Night creature energy",
    ],
    'chaos': [
      "You order the most at [time]am. Seek help.",
      "What is happening at [time] in the morning",
      "This is not a normal time to be hungry OR awake",
      "[time]am is your hungriest time. What the fuck.",
      "You order most at [time] in the morning. Why.",
      "This time doesn't even exist to most people",
      "You're ordering when everyone else is unconscious",
    ],
  },

  weekendWarrior: {
    'weekday': [
      "You order more on weekdays than weekends. Work stress hits different.",
      "Your weekday self hates cooking more than your weekend self",
      "At least you try on weekends?",
      "You order more during work days. Stress eating detected.",
      "Your weekday self has zero energy to cook",
      "At least weekends you try (barely)",
    ],
    'weekend': [
      "Your weekends are just non-stop ordering apparently",
      "You have time to cook on weekends. You just won't.",
      "Saturday and Sunday are for the delivery drivers",
      "Your weekends are delivery driver employment programs",
      "You have free time on weekends. Still won't cook.",
      "Saturday and Sunday are for the apps apparently",
    ],
    'balanced': [
      "Equally terrible every day of the week. Consistency is key!",
      "You don't discriminate. Every day is a good day to waste money.",
      "Your commitment to not cooking is impressive",
      "Every day is equally bad. Impressive consistency.",
      "You don't discriminate against any day of the week",
      "Your commitment to never cooking is admirable",
      "Monday through Sunday, all terrible choices",
    ],
  },
} as const;

// Helper functions to determine ranges
function getTotalDamageRange(totalSpent: number): keyof typeof WRAPPED_MESSAGES.totalDamage {
  if (totalSpent < 500) return '<500';
  if (totalSpent < 1500) return '500-1500';
  if (totalSpent < 3000) return '1500-3000';
  if (totalSpent < 5000) return '3000-5000';
  if (totalSpent < 10000) return '5000-10000';
  if (totalSpent < 15000) return '10000-15000';
  if (totalSpent < 25000) return '15000-25000';
  if (totalSpent < 35000) return '25000-35000';
  if (totalSpent < 50000) return '35000-50000';
  if (totalSpent < 75000) return '50000-75000';
  if (totalSpent < 100000) return '75000-100000';
  return '100000+';
}

function getLateNightRange(count: number): keyof typeof WRAPPED_MESSAGES.lateNightOrders {
  if (count === 0) return '0';
  if (count <= 5) return '1-5';
  if (count <= 15) return '6-15';
  if (count <= 30) return '16-30';
  return '30+';
}

function getLaziestDayRange(orderCount: number): keyof typeof WRAPPED_MESSAGES.laziestDay {
  if (orderCount <= 3) return '2-3';
  if (orderCount <= 5) return '4-5';
  if (orderCount <= 7) return '6-7';
  return '8+';
}

function getConsecutiveDaysRange(days: number): keyof typeof WRAPPED_MESSAGES.consecutiveDays {
  if (days <= 3) return '1-3';
  if (days <= 7) return '4-7';
  if (days <= 14) return '8-14';
  if (days <= 30) return '15-30';
  return '30+';
}

function getSingleItemRange(count: number): keyof typeof WRAPPED_MESSAGES.singleItemOrders {
  if (count <= 5) return '0-5';
  if (count <= 15) return '6-15';
  if (count <= 30) return '16-30';
  return '30+';
}

function getMostExpensiveRange(amount: number): keyof typeof WRAPPED_MESSAGES.mostExpensiveOrder {
  if (amount < 50) return '<50';
  if (amount < 100) return '50-100';
  if (amount < 200) return '100-200';
  return '200+';
}

function getCoffeeSpendingRange(spent: number): keyof typeof WRAPPED_MESSAGES.coffeeSpending {
  if (spent < 100) return '<100';
  if (spent < 300) return '100-300';
  if (spent < 800) return '300-800';
  return '800+';
}

function getNightOwlRange(percentage: number): keyof typeof WRAPPED_MESSAGES.nightOwlPercentage {
  if (percentage < 20) return '<20';
  if (percentage < 40) return '20-40';
  if (percentage < 60) return '40-60';
  if (percentage < 80) return '60-80';
  return '80+';
}

function getMissedInvestmentRange(amount: number): keyof typeof WRAPPED_MESSAGES.missedInvestment {
  if (amount < 1000) return '<1000';
  if (amount < 3000) return '1000-3000';
  if (amount < 7000) return '3000-7000';
  if (amount < 15000) return '7000-15000';
  if (amount < 30000) return '15000-30000';
  if (amount < 50000) return '30000-50000';
  if (amount < 75000) return '50000-75000';
  if (amount < 100000) return '75000-100000';
  if (amount < 150000) return '100000-150000';
  return '150000+';
}

function getCostPerMealRange(difference: number): keyof typeof WRAPPED_MESSAGES.costPerMeal {
  if (difference < 5) return '<5';
  if (difference < 8) return '5-8';
  if (difference < 12) return '8-12';
  return '12+';
}

function getPeakHungerCategory(hour: number): keyof typeof WRAPPED_MESSAGES.peakHungerHour {
  if (hour >= 6 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 15) return 'lunch';
  if (hour >= 15 && hour < 21) return 'dinner';
  if (hour >= 21 || hour < 3) return 'late-night';
  return 'chaos';
}

function getWeekendWarriorCategory(
  weekendOrders: number,
  weekdayOrders: number,
  weekendSpending: number,
  weekdaySpending: number
): keyof typeof WRAPPED_MESSAGES.weekendWarrior {
  const ratio = weekendSpending / weekdaySpending;
  if (ratio > 1.2) return 'weekend';
  if (ratio < 0.8) return 'weekday';
  return 'balanced';
}

// Helper function to interpolate placeholders in messages
function interpolateMessage(
  message: string,
  replacements: { [key: string]: string | number }
): string {
  let result = message;
  
  // Handle $[X] and $X placeholders (for amounts)
  if (replacements.X !== undefined) {
    const formattedValue = typeof replacements.X === 'number' 
      ? `$${replacements.X.toFixed(2)}` 
      : String(replacements.X);
    result = result.replace(/\$\[X\]/g, formattedValue);
    result = result.replace(/\$X/g, formattedValue);
  }
  
  // Handle [chain] and [Chain] placeholders
  if (replacements.chain !== undefined) {
    result = result.replace(/\[chain\]/gi, String(replacements.chain));
    result = result.replace(/\[Chain\]/g, String(replacements.chain));
  }
  
  // Handle [time] placeholder
  if (replacements.time !== undefined) {
    result = result.replace(/\[time\]/gi, String(replacements.time));
  }
  
  return result;
}

// Main function to get a deterministic message
export function getDeterministicMessage(
  category: string,
  analytics: UserSummary,
  value: number | string | undefined,
  seedOffset: number = 0,
  replacements?: { [key: string]: string | number }
): string {
  const seed = generateSeed(
    analytics.userId,
    analytics.totalSpent,
    analytics.totalReceipts
  ) + seedOffset;
  const rng = new SeededRandom(seed);

  // Always create a replacements object to ensure interpolation happens
  const replacementsObj: { [key: string]: string | number } = replacements || {};
  
  let selectedMessage = '';

  switch (category) {
    case 'totalDamage':
      const damageRange = getTotalDamageRange(analytics.totalSpent);
      const damageMessages = WRAPPED_MESSAGES.totalDamage[damageRange];
      selectedMessage = damageMessages[rng.nextInt(0, damageMessages.length)];
      break;

    case 'lateNightOrders':
      if (typeof value === 'number') {
        const lateNightRange = getLateNightRange(value);
        const lateNightMessages = WRAPPED_MESSAGES.lateNightOrders[lateNightRange];
        selectedMessage = lateNightMessages[rng.nextInt(0, lateNightMessages.length)];
      }
      break;

    case 'laziestDay':
      if (typeof value === 'number') {
        const laziestRange = getLaziestDayRange(value);
        const laziestMessages = WRAPPED_MESSAGES.laziestDay[laziestRange];
        selectedMessage = laziestMessages[rng.nextInt(0, laziestMessages.length)];
      }
      break;

    case 'consecutiveDays':
      if (typeof value === 'number') {
        const streakRange = getConsecutiveDaysRange(value);
        const streakMessages = WRAPPED_MESSAGES.consecutiveDays[streakRange];
        selectedMessage = streakMessages[rng.nextInt(0, streakMessages.length)];
      }
      break;

    case 'chainDependency':
      if (typeof value === 'string') {
        const chainName = value.toLowerCase();
        let chainKey: keyof typeof WRAPPED_MESSAGES.chainDependency = 'generic';
        
        if (chainName.includes("mcdonald") || chainName.includes("mcd")) {
          chainKey = "McDonald's";
        } else if (chainName.includes("starbucks")) {
          chainKey = "Starbucks";
        } else if (chainName.includes("chipotle")) {
          chainKey = "Chipotle";
        } else if (chainName.includes("taco bell") || chainName.includes("tacobell")) {
          chainKey = "Taco Bell";
        }
        
        const chainMessages = WRAPPED_MESSAGES.chainDependency[chainKey];
        selectedMessage = chainMessages[rng.nextInt(0, chainMessages.length)];
        
        // Add chain name and amount to replacements
        replacementsObj.chain = value;
        // Add totalSpent if available from analytics
        const wrapped = analytics.wrappedAnalytics;
        if (wrapped?.shame.chainDependency) {
          replacementsObj.X = wrapped.shame.chainDependency.totalSpent;
        }
      }
      break;

    case 'singleItemOrders':
      if (typeof value === 'number') {
        const singleItemRange = getSingleItemRange(value);
        const singleItemMessages = WRAPPED_MESSAGES.singleItemOrders[singleItemRange];
        selectedMessage = singleItemMessages[rng.nextInt(0, singleItemMessages.length)];
      }
      break;

    case 'mostExpensiveOrder':
      if (typeof value === 'number') {
        const expensiveRange = getMostExpensiveRange(value);
        const expensiveMessages = WRAPPED_MESSAGES.mostExpensiveOrder[expensiveRange];
        selectedMessage = expensiveMessages[rng.nextInt(0, expensiveMessages.length)];
      }
      break;

    case 'coffeeSpending':
      if (typeof value === 'number') {
        const coffeeRange = getCoffeeSpendingRange(value);
        const coffeeMessages = WRAPPED_MESSAGES.coffeeSpending[coffeeRange];
        selectedMessage = coffeeMessages[rng.nextInt(0, coffeeMessages.length)];
      }
      break;

    case 'nightOwlPercentage':
      if (typeof value === 'number') {
        const nightOwlRange = getNightOwlRange(value);
        const nightOwlMessages = WRAPPED_MESSAGES.nightOwlPercentage[nightOwlRange];
        selectedMessage = nightOwlMessages[rng.nextInt(0, nightOwlMessages.length)];
      }
      break;

    case 'couldHaveBought':
      selectedMessage = WRAPPED_MESSAGES.couldHaveBought[rng.nextInt(0, WRAPPED_MESSAGES.couldHaveBought.length)];
      break;

    case 'missedInvestment':
      if (typeof value === 'number') {
        // value is missedGains (passed from component)
        // This is correct for all messages, including "MORE" ones
        const investmentRange = getMissedInvestmentRange(value);
        const investmentMessages = WRAPPED_MESSAGES.missedInvestment[investmentRange];
        selectedMessage = investmentMessages[rng.nextInt(0, investmentMessages.length)];
        
        // Add missed gains to replacements (value is already missedGains)
        replacementsObj.X = value;
      }
      break;

    case 'costPerMeal':
      if (typeof value === 'number') {
        const mealRange = getCostPerMealRange(value);
        const mealMessages = WRAPPED_MESSAGES.costPerMeal[mealRange];
        selectedMessage = mealMessages[rng.nextInt(0, mealMessages.length)];
        
        // Add difference to replacements
        replacementsObj.X = value;
      }
      break;

    case 'peakHungerHour':
      if (typeof value === 'number') {
        const hungerCategory = getPeakHungerCategory(value);
        const hungerMessages = WRAPPED_MESSAGES.peakHungerHour[hungerCategory];
        selectedMessage = hungerMessages[rng.nextInt(0, hungerMessages.length)];
        
        // Add time to replacements
        const wrapped = analytics.wrappedAnalytics;
        if (wrapped?.patterns.peakHungerHour) {
          replacementsObj.time = wrapped.patterns.peakHungerHour.hourDisplay;
        }
      }
      break;

    case 'weekendWarrior':
      // This needs weekend/weekday data from analytics
      const wrapped = analytics.wrappedAnalytics;
      if (wrapped?.patterns.weekendWarrior) {
        const warriorCategory = getWeekendWarriorCategory(
          wrapped.patterns.weekendWarrior.weekendOrders,
          wrapped.patterns.weekendWarrior.weekdayOrders,
          wrapped.patterns.weekendWarrior.weekendSpending,
          wrapped.patterns.weekendWarrior.weekdaySpending
        );
        const warriorMessages = WRAPPED_MESSAGES.weekendWarrior[warriorCategory];
        selectedMessage = warriorMessages[rng.nextInt(0, warriorMessages.length)];
      }
      break;
  }

  // Fallback to a generic message if category/value not found
  if (!selectedMessage) {
    selectedMessage = "You made choices... interesting ones";
  }

  // Always interpolate placeholders (replacementsObj is always defined)
  selectedMessage = interpolateMessage(selectedMessage, replacementsObj);

  return selectedMessage;
}
