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
    '0': [
      "Honestly not terrible. You might actually be a functioning adult.",
      "Rookie numbers. Your friends are way worse.",
      "Congrats on having your shit together I guess.",
      "This is actually impressive restraint.",
      "Just mid.",
      "This is suspiciously responsible of you.",
      "Are you sure you even have the app installed?",
      "Financially boring. Emotionally stable. Disgusting.",
      "You used UberEats like a normal person. Weird flex.",
      "Therapists hate you because you didn't cope with takeout.",
      "You're the friend who judges everyone else's spending from a moral high ground.",
      "Tutorial level.",
      "Your bank account barely noticed this.",
      "Teacher's pet status.",
      "You think you're better than me, fuck you.",
      "Statistically unlikely levels of restraint. Suspicious.",
      "You're either responsible or just broke. Both are valid.",
      "The rest of us are in hell and you're just... fine? Disgusting.",
      "You're like the designated driver of food delivery apps.",
    ],
    '500': [
      "Not great but honestly could be so much worse",
      "This is fine, but it's not good.",
      "Your friends definitely spent more",
      "Somewhere between 'oops' and 'oh no'",
      "Mid-tier financial damage",
      "Not ideal but not insane.",
      "You're in the danger zone but not the disaster zone yet",
      "Your bank account winced a little, but it'll walk it off.",
      "Your UberEats habit is annoying, not catastrophic.",
      "You're flirting with bad decisions, not fully dating them yet.",
      "This is a 'treat yourself' phase that knew when to stop.",
      "Your impulse control is weak but not embarrassing yet.",
      "This is the financial equivalent of a minor slip-up.",
      "You dipped your toe in bad decisions and pulled it back out.",
      "This is what 'I had a month' looks like.",
      "Your relationship with UberEats is casual, not codependent.",
      "Rookie damage. Your wallet will recover by next quarter.",
      "This is fine. Deeply unimpressive, but fine.",
      "You're bad at cooking but not catastrophically bad at money.",
      "This is the cost of occasionally being too tired to function."
    ],
    '1500': [
      "You hit four digits.",
      "Okay so you have a little problem.",
      "Your bank account felt this one.",
      "Two grand on convenience. Was it convenient?",
      "This is the 'I should probably stop' amount that you didn't stop at.",
      "Getting into actual money territory now.",
      "This is no longer 'oops'.",
      "You’ve spent enough to justify learning how to cook. You simply chose not to.",
      "'I’ll start meal prepping next week.'",
      "Your stomach is full and your savings account is starving.",
      "This is what happens when convenience wins every single argument.",
      "Congratulations, your laziness now has a measurable price.",
      "You’re not addicted, but you are in a committed situationship with delivery.",
      "This is a 'we need to talk' number for your budget.",
      "This is where hobbies go to die and delivery apps get rich.",
      "You've financially committed to never learning basic life skills.",
      "This is a vacation you didn't take.",
      "Your bank account is mumbling passive aggressive complaints.",
      "You're in the 'I should check my statements' zone but you won't.",
    ],
    '3000': [
      "This is actually rent money.",
      "That's a semester of community college.",
      "Your future self is so disappointed.",
      "This is no longer a phase. This is infrastructure.",
      "Your UberEats budget is starting to look like rent in some cities.",
      "You're one spreadsheet away from realizing how bad this really is.",
      "That's a used car you just ate.",
      "You've paid someone else's rent with your inability to meal prep.",
      "This is a MacBook. And one of the good ones too.",
      "You could've taken a week long vacation. Instead you took 300 small dopamine hits.",
      "This is what financial regret looks like before it fully sets in.",
      "You've crossed the threshold from 'oops' to 'oh fuck.'",
      "This money could've been invested. Instead it was digested.",
    ],
    '5000': [
      "This is a whole ass car.",
      "Bro what are you doing.",
      "That's a year of groceries you just skipped.",
      "We've crossed into serious problem territory.",
      "Your UberEats habit is officially more expensive than hobbies that involve specialized equipment.",
      "This is the kind of number that makes financial advisors close their laptops.",
      "Your coping mechanism comes with a delivery fee, service fee, tax, and tip.",
      "Five thousand dollars on apps. Apps that bring you food. Food you could make.",
      "Your credit score is watching in horror.",
      "Five grand is 'I paid off my credit card' money, not 'I ordered sushi 400 times' money.",
      "This is the kind of spending that makes your parents ask if you're okay.",
      "You've achieved what financial advisors call 'a significant behavioral issue.'",
    ],
    '10000': [
      "Five figures. FIVE. FIGURES.",
      "Ten thousand dollars on food delivery apps.",
      "I'm genuinely concerned about you.",
      "You could have studied abroad for a year.",
      "This number has made me personally angry.",
      "Ten grand could've changed your life.",
      "This is not food spending. This is a multi-season storyline.",
      "You could have flown somewhere beautiful. Instead food flew to you.",
      "At this point you should own equity in at least three local restaurants.",
      "You turned 'I don’t feel like cooking' into a five-figure expense.",
      "This is 'we need a family meeting' energy.",
      "This number belongs on a tax return.",
      "TEN THOUSAND DOLLARS.",
      "At this point just hire a personal chef.",
      "Your financial advisor would cry if they saw this.",
      "This is a down payment on a house in some states.",
      "You've entered 'call your parents' territory.",
      "This is tuition at a state school. You ate tuition.",
      "Your impulse control died somewhere around dollar four thousand.",
      "This is a therapist's salary. Maybe you should've hired one instead.",
    ],
    '20000': [
      "Twenty grand on delivery apps is genuinely insane.",
      "This is 'I need to sit down' money.",
      "Delivery is basically a recurring bill at this point.",
      "You could have remodeled the kitchen that you're obviously not using.",
      "Your self-control left the chat around several thousand dollars ago.",
      "This is what some people make in a year.",
      "This is 'move to a new city' money.",
      "This isn't a habit. This is an addiction with receipts.",
      "Twenty grand on delivery and you're still pretending you're not the problem.",
      "This is a master's degree at some schools.",
      "You've financially committed to never growing as a person.",
      "This money could've compounded in an index fund. Instead it decomposed in your trash can.",
      "Twenty THOUSAND dollars.",
      "This is a year of rent in most cities.",
      "I don't even know what to say anymore.",
      "You've achieved legendary status in financial irresponsibility.",
      "If finance Twitter found out about this they'd hunt you for sport.",
      "You've eaten enough delivery to qualify as a recurring corporate client.",
      "A QUARTER OF A HUNDRED THOUSAND.",
      "Your spending has entered 'Forbes article' territory.",
      "Your great-grandchildren will somehow feel this.",
      "Delete the app and become a monk.",
      "You're being used as a cautionary tale in personal finance classes. Right now. Somewhere.",
      "This is salary money. SALARY. You ate a salary.",
    ],
    '30000': [
      "Thirty bands on takeout. THIRTY.",
      "This is a year of rent in most cities.",
      "You've achieved legendary status in financial irresponsibility.",
      "This number should come with a trigger warning.",
      "You could've gone to grad school. You ate grad school.",
      "This number needs congressional oversight.",
      "You've spent enough to change your life and you changed nothing.",
      "This is 'interventions and spreadsheets' money.",
      "At this point you should be claiming these restaurants as dependents on your taxes.",
      "THIRTY THOUSAND DOLLARS.",
      "This is a salary. A FULL SALARY.",
      "You're in the hall of fame now",
      "This needs to be studied by economists",
      "You've discovered a new tax bracket of bad decisions.",
      "This is performance art.",
      "This is generational wealth that will literally never exist because of you.",
      "Your financial decisions need to be peer-reviewed.",
      "This isn't even funny anymore. This is a cry for help.",
    ],
    '40000': [
      "Forty thousand dollars on food delivery I'm gonna be sick.",
      "This is multiple cars.",
      "Has the bank ever called asking about fraud? I'm genuinely curious.",
      "This is an amount that should involve real estate.",
      "This looks less like spending and more like a structural failure.",
      "You could’ve opened a small restaurant yourself.",
      "You turned mild laziness into a multi-year economic event.",
      "This is 'your parents are calling a family meeting' money.",
      "Forty grand on delivery apps is a personality disorder, not a lifestyle choice.",
      "You've achieved levels of irresponsibility that require documentation.",
      "This is 'your mom asks if you're in a cult' money.",
      "At what point did you look at your bank account and think 'yeah this is fine'?",
      "Forty thousand dollars means you've personally funded someone's entire college education through delivery fees alone.",
      "Scientists need to study what the fuck is wrong with you.",
    ],
    '50000': [
      "FIFTY THOUSAND DOLLARS.",
      "Half of ONE HUNDRED THOUSAND DOLLARS.",
      "In some states you could have bought a house in cash.",
      "I'm speechless. Genuinely fucking speechless.",
      "You could have paid off your student loans with this.",
      "This is literally more than most people make in a year.",
      "You need to be in a case study.",
      "Half of a hundred thousand dollars on food apps.",
      "You’ve achieved 'statistically improbable' levels of takeout.",
      "This is more than many people spend on actual vehicles.",
      "This is a documentary waiting to happen.",
      "You're basically a case study in behavioral economics gone wrong.",
      "You spent a wedding AND a divorce on takeout.",
      "I need you to read that out loud so you can hear yourself.",
      "You could've bought a food truck, hired yourself, and saved money. That's how bad this is.",
      "Your mom probably thinks you're being blackmailed.",
      "Somewhere a financial advisor just felt a disturbance in the force and doesn't know why.",
      "The app should send you a W2 at this point. You're basically an investor.",
    ],
    '60000': [
      "Sixty grand. SIXTY GRAND ON UBEREATS.",
      "You've spent a BMW on UberEats.",
      "Your UberEats usage has its own environmental impact.",
      "Sixty thousand dollars I'm gonna puke.",
      "This is a down payment on a house in a major city.",
      "You know what costs less than sixty grand? Hiring a person to cook for you. An actual human being. Daily.",
      "This is the kind of number that makes people ask if you're okay and genuinely mean it.",
      "You've spent more on DELIVERY FEES than some people spend on their annual food budget.",
      "At sixty grand you're not ordering dinner anymore, you're making political donations to Big Delivery.",
      "You could've gone to therapy for ten years straight and it would've been cheaper than whatever this coping mechanism is.",
    ],
    '70000': [
      "This is not real. This can't be real.",
      "You're approaching six figures on food delivery",
      "You could have retired early with this money",
      "You’ve done long-term damage in bite-sized increments.",
      "Seventy thousand dollars. People retire on less.",
      "This is a house in Ohio. A WHOLE HOUSE.",
      "You're approaching six figures on takeout and SOMEHOW that's not even the worst part.",
      "I genuinely think you need a priest.",
      "Your poor choices have a market value now.",
      "Your bank account is just screaming into the void at this point.",
      "The delivery drivers have a group chat about you. I guarantee it.",
      "This isn't rock bottom. This is bedrock. This is geological layers of bad decisions.",
    ],
    '80000': [
      "Eighty thousand dollars. The IRS is interested.",
      "I have no words.",
      "This number should appear in case studies.",
      "You’ve hit urban legend status.",
      "Your delivery habit has macroeconomic implications.",
      "That's someone's entire salary for TWO YEARS that you just... absorbed into your body.",
      "I need to sit down. I need a chair. I'm dizzy.",
      "Your financial decisions have achieved sentience and they're asking for help.",
      "This is the kind of spending that gets you a phone call from someone at the bank asking if you've been kidnapped.",
      "You've spent more on convenience fees than most people spend on... anything. Literally anything.",
      "At this point the app should be sending you quarterly reports like you're a shareholder.",
      "Whatever you do, do not let your parents find out about this. Take it to the grave.",
    ],
    '100000': [
      "ONE HUNDRED THOUSAND DOLLARS.",
      "SIX FIGURES.",
      "This is a house. AN ACTUAL HOUSE.",
      "This number should not be possible.",
      "You are the final boss of food delivery apps.",
      "This is generational wealth that will never exist.",
      "You could have bought a franchise with this.",
      "Six figures. SIX FUCKING FIGURES.",
      "Delete this app. Delete your bank. Start your life over.",
      "You're a legend. A financially ruined legend.",
      "This is a six-figure confession, not a cute little stat.",
      "You've eaten an entire career’s worth of savings in cardboard boxes.",
      "A HUNDRED THOUSAND DOLLARS. ONE. HUNDRED. THOUSAND.",
      "This is a HOUSE. A literal house in multiple states.",
      "You ate six figures. Six fucking figures.",
    ],
    '150000': [
      "This is going in the Guinness Book of World Records.",
      "ONE HUNDRED-AND-FIFTY-THOUSAND-DOLLARS.",
    ],
    '250000': [
      "A QUARTER MILLION DOLLARS.",
      "You've spent more on UberEats than most people spend on their entire lives up to age 30.",
      "This is a house. Not a down payment. A HOUSE. With a yard. And a kitchen you'll never fucking use.",
      "This is 'the IRS has questions' money.",
      "You're a fucking patron saint of the gig economy.",
      "Congratulations, you're the final boss.",
      "How much fucking money do you have?",
    ],
    '500000': [
      "HALF A MILLION DOLLARS ON DELIVERY.",
      "You could've bought a house in cash in most cities. MOST CITIES.",
      "Five hundred thousand dollars. That's startup capital. That's 'fuck you' money. That's retirement.",
      "You've spent more on delivery than 90% of businesses make in revenue.",
      "This isn't even your final form, is it?",
      "This is Lamborghini money that went to guys in Honda Civics instead.",
      "You've achieved god tier status in financial irresponsibility.",
      "The SEC wants to know your location.",
      "Are you a Saudi prince? If so can you help me please DM me.",
    ],
    '1000000': [
      "xQC",
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
      "Zero late night orders means you either have your life together or you're lying.",
      "Not even once?",
      "Your sleep schedule is healthy and I'm disgusted.",
    ],
    '1': [
      "Your drunk self has better impulse control than most",
      "Respectable self-control for a degenerate",
      "Just a few orders. You're basically a saint.",
      "You slipped up like twice. Adorable.",
      "Congrats on having self-control 99% of the time.",
      "This is beginner shit. Your friends are way worse.",
      "This is 'I broke up with someone' numbers, not 'I have a problem' numbers.",
      "You can count your late night mistakes on one hand. Look at you.",
      "The delivery driver doesn't even remember you.",
      "This is so low it's basically a rounding error.",
      "You ordered after midnight like twice and probably felt guilty both times.",
      "Amateur hour. Come back when you've got double digits.",
      "You had one bad week.",

    ],
    '5': [
      "Your drunk self only makes bad decisions sometimes",
      "Only a handful of 3am regrets. Could be worse.",
      "A few late night mistakes. We've all been there.",
      "Your drunk self has better impulse control than most",
      "Respectable self-control for a degenerate",
      "A few late night mistakes. We've all been there.",
      "A couple late night lapses in judgment. Classic.",
      "The occasional midnight munchies, we get it",
      "You had one weird month.",
      "You folded. Not often, but you folded.",
      "This is the number of times you've texted your ex. Oh wait, wrong app."
    ],
    '10': [
      "You've got a little problem brewing.",
      "This is 'I had a semester' energy.",
      "This is rehab numbers for some people.",
      "Double digits at 3am is a red flag",
      "You've got a routine and it's concerning.",
      "Once a month you completely abandon your values after 11pm.",
      "Your willpower has a bedtime and it's earlier than yours.",
      "Something happens to your brain when the sun goes down and that something is expensive.",
      "You're not an addict but you're definitely a regular.",
      "Your bank account has nightmares about your sleep schedule.",
      "This is the exact number where it stops being 'sometimes' and becomes 'a pattern.'",
      "Not enough to be terrifying. Just enough to be a red flag.",
      "It's less of a 'sleep schedule' and more of a 'sleep suggestion.'"
    ],
    '15': [
      "The drivers recognize your address at this point",
      "Your drunk self cannot be trusted with a phone",
      "Sober you is filing a restraining order against drunk you",
      "Someone needs to take your phone when you drink",
      "I know exactly what kind of person you are.",
      "You drunk order food the way some people text their exes.",
      "Your 3am self is keeping the gig economy alive",
      "I'm calling your mom",
      "Every weekend you blackout and wake up to a receipt",
      "This is every weekend. Every. Single. Weekend.",
      "You've ordered at 3am more times than you've been to the gym",
      "Your nocturnal ordering habits are psychiatric",
      "Someone needs to confiscate your phone after 11pm",
      "The delivery drivers know your drunk order by heart",
      "Every time you go out, someone's delivering to you at 3am",
      "Drunk you has zero impulse control with that phone",
    ],
    '20': [
      "Your credit card company sends concerned emails at this point.",
      "You just couldn't drink water and go to bed like a normal person.",
      "Your poor choices have predictable timing.",
      "Twenty late night orders means you're either a streamer, an insomniac, or both.",
      "You couldn't make it sunrise without reinforcements?",
      "Twenty 3am orders is not a phase it's a pattern.",
      "You're averaging almost two per month.",
      "This is not a phase. This is infrastructure.",
      "You've got a late night food ordering problem and everyone knows it except you.",
      "Some delivery driver has absolutely seen you in your worst pajamas multiple times.",
      "Your neighbors think you're either a drug dealer or just really, really sad.",
      "This is 'I don't even feel shame anymore' territory.",
      "You've ordered food after midnight enough times that it's basically a second dinner schedule.",
      "You're the reason why those 24 hour restaurants exist.",
      "This is the kind of consistency that should be applied to literally anything else in your life.",
      "You treat 2am like it's brunch time.",
      "You've single-handedly justified the existence of the overnight shift.",
      "I know you don't read those credit card statements but you should probably start.",
      "Your life is a series of small surrenders and constant mistakes.",
    ],
    '25': [
      "You're in a situationship with 3am cravings.",
      "Your circadian rhythm is fucked and so is your budget.",
      "The overnight delivery drivers have a nickname for you. It's not good.",
      "This is what 'I'll fix my life tomorrow' looks like in data form.",
      "You treat midnight like it's happy hour.",
      "Every Friday and Saturday ends the same way huh?",
      "You've got a more consistent late night routine than people who actually work night shifts.",
      "Your 2am cravings have more control over your life than you do.",
      "This is what happens when you refuse to keep snacks in your house out of principle.",
      "How many times have you woken up confused on your couch with empty containers?",
      "This is a recurring mental health episode.",
      "The overnight McDonald's staff could pick you out of a lineup.",
      "You've achieved a level of late night ordering that requires its own budget category.",
      "You know you have a problem and you don't care.",
      "The delivery app notifications at 1am aren't suggestions anymore. They're summons.",
      "Your poor life choices have operating hours and they're LATE.",
      "The number of times you betrayed the version of yourself that set an alarm for the morning.",
      "You love being awake and hungry and stupid."
    ],
    '30': [
      "Are you just... always awake at 3am?",
      "This is concerning on multiple levels.",
      "Do you sleep? Do you eat during the day? What's happening?",
      "You've spent more at 3am than most people spend total.",
      "This is either a substance issue or a sleep issue or both.",
      "Are you nocturnal? What's your schedule?",
      "This frequency is genuinely alarming.",
      "Vampiric levels of nocturnal activity."
    ],
  },

  laziestDay: {
    '2': [
      "Not cooking breakfast OR dinner is crazy.",
      "You really woke up and chose violence against your wallet.",
      "You ordered more times than you showered that day probably.",
      "You couldn't even make it 6 hours between moments of weakness.",
      "Ordering twice in one day is a cry for help disguised as convenience.",
      "Two separate times in 24 hours you were pathetic.",
      "The same delivery driver came back. They KNEW. They saw you again and they KNEW.",
      "You ordered delivery for two different meals on the same day like some kind of medieval king.",
      "This is rock bottom but make it casual.",
      "Two orders means you saw the first delivery bag in your trash and said 'let's run it back.'",
    ],
    '3': [
      "Three meals, zero cooking. The dream.",
      "You really said 'kitchen who?'",
      "Breakfast, lunch, dinner. The holy trinity of laziness.",
      "Not a single meal from your own kitchen that day.",
      "Breakfast, lunch, dinner on someone else's labor.",
      "Three orders in one day. THREE.",
      "You ordered breakfast, lunch, AND dinner like you're a hospital patient.",
      "This is the laziness equivalent of a hat trick.",
      "Three separate orders. Three separate moments of weakness. One catastrophic day.",

    ],
    '4': [
      "FOUR TIMES? IN ONE DAY?",
      "Did your stove break or is this a cry for help.",
      "Your delivery driver thought you were having a party. You weren't.",
      "Four orders in 24 hours is psychotic.",
      "Were you moving? Was your kitchen broken?",
      "FOUR separate times you chose violence.",
      "That's a meal every 4 hours delivered.",
    ],
    '5': [
      "FIVE orders in one day. FIVE.",
      "You ordered food five times in 24 hours. That's a meal every 4-5 hours like you're a goddamn newborn.",
      "This is no longer lazy. This is performance art.",
      "Five deliveries to one address in one day should trigger a police wellness check.",
      "You've turned your apartment into a distribution center.",
      "This is what giving up looks like.",
      "Five orders means you spent more on delivery fees than the actual food.",
      "This is genuinely unwell behavior. Genuinely.",
    ],
    '6': [
      "Six deliveries in one day. SIX.",
      "This is beyond laziness this is a lifestyle",
      "Your driver made enough off you for his own meal",
      "Did you tip the same driver multiple times in one day",
      "This is compulsive behavior at this point",
      "You ate every 2-3 hours and cooked zero times",
      "The driver started making conversation by visit three",
    ],
    '7': [
      "SEVEN ORDERS IN ONE DAY.",
      "Were you okay? Blink twice if you need help.",
      "You ordered food SEVEN times in 24 hours. That's nearly once every three hours. Are you a competitive eater? Are you okay? WHAT HAPPENED?",
      "Seven deliveries to one address should automatically alert local authorities.",
      "You've turned your front door into a loading dock.",
      "This is what a complete mental breakdown looks like in receipt form.",
      "This is genuinely insane. Not funny insane. Clinical insane.",
      "The delivery apps flagged your account for suspicious activity and it wasn't fraud, it was just YOU.",
      "This is the kind of behavior that gets you on a watchlist.",
      "You've achieved legendary status and it's the worst kind of legend.",
      "Seven orders. One day. Zero dignity remaining.",
      "Your laziness has transcended into something that needs to be documented.",
      "This should be on your permanent record somehow.",
    ],
    '8': [
      "What the fuck was happening that day.",
      "This is not normal human behavior.",
      "Were you challenging yourself? Did you lose a bet?",
      "Your bank sent a fraud alert for sure.",
      "This is beyond explanation.",
      "Were you having a party or just spiraling.",
      "The sheer audacity of ordering THIS many times.",
      "Your driver earned their rent that day off you alone.",
    ],
  },

  consecutiveDays: {
    '1': [
      "You've never ordered two days in a row?",
      "Incredible self control.",
      "You order delivery and then actually take a break like some kind of functioning adult.",
      "Not even a single back-to-back order. Your discipline is frankly annoying.",
      "You've got restraint. Disgusting.",
      "Not a single consecutive day. You're making everyone else look bad.",
      "You order food and then just... stop? Unnatural behavior.",
      "Zero repeat days. Are you even human or just a really advanced budgeting app?",
      "Imagine having boundaries with delivery apps. Couldn't be the rest of us.",
      "You treat UberEats like a sometimes food and it's embarrassing for the rest of us.",
      "Not even two days in a row. Not even once. Get out.",
      "You've never spiraled. Not even a little bit. Suspicious.",
    ],
    '2': [
      "Two days of consecutive delivery. That's like being on a 24 hour diet.",
      "Two days in a row. The beginning of a dangerous pattern.",
      "You ordered twice in a row and probably told yourself it was fine both times.",
      "This is how it starts. Day one is a treat. Day two is a lifestyle.",
      "Two consecutive days means you tasted convenience and immediately wanted more.",
      "You dipped your toe in back-to-back ordering and liked what you felt.",
      "Day one: understandable. Day two: concerning character development.",
      "Two days straight of delivery is how addictions begin, just so you know.",
      "You saw yesterday's empty containers and said 'let's do that again.'",
      "This is the gateway drug of delivery habits.",
      "Two days in a row isn't a streak yet but it's definitely a red flag.",
      "You ordered, saw it was easy, and immediately removed all friction from your life.",
      "Consecutive days means you're one bad week away from a real problem.",
      "You gave yourself permission twice and that's how the slippery slope begins.",
    ],
    '3': [
      "Three days is just a long weekend of laziness",
      "A light weekend bender.",
      "Three days in a row. That's not a coincidence anymore, that's a habit forming.",
      "You ordered three days straight and your kitchen filed a missing persons report.",
      "Day one was a mistake. Day two was a choice. Day three was a lifestyle announcement.",
      "Three consecutive days means you've officially entered a delivery spiral.",
      "This is a streak now. A bad streak, but a streak.",
      "You went three days without cooking and probably felt nothing.",
      "Three days in a row is how people end up on intervention episodes.",
      "Your stove looked at you on day three like a disappointed parent.",
      "This is the exact length of time it takes to forget what your kitchen looks like.",
      "Three straight days of delivery means you've crossed the line from 'treating yourself' to 'avoiding yourself.'",
      "You built momentum in the wrong direction.",
      "Three days straight and you probably started getting comfortable with the shame.",
      "This is a multi-day event. A festival of poor choices.",
      "You went 72 hours without touching a pan and didn't even blink.",
      "Three consecutive days means your groceries are rotting while you fund someone else's rent.",
    ],
    '4': [
      "You ordered four consecutive days like you're conducting an experiment in financial self-harm.",
      "Day four is when it stops being a streak and starts being a cry for help.",
      "Four days straight means your kitchen is basically a storage unit at this point.",
      "This is almost a full work week of refusing to be an adult.",
      "Four consecutive days. Your delivery driver knows your schedule better than your boss does.",
      "Day four is when the shame becomes comfortable and that's truly when you've lost.",
      "You've been ordering so consistently that it's basically a subscription service now.",
      "This is what rock bottom looks like before it gets a basement.",
      "Four consecutive days means the delivery apps have more commitment from you than most of your relationships.",
      "This is a mini vacation from responsibility and your bank account paid for the trip.",
    ],
    '5': [
      "Five days in a row. This is a work week of pure surrender.",
      "FIVE CONSECUTIVE DAYS. You've officially abandoned all pretense of being a functioning human.",
      "Five days straight is when your kitchen starts considering legal action.",
      "This is a work week. A full work week of pure, unfiltered laziness.",
      "Five days in a row means you've spent more time with delivery drivers than your actual friends.",
      "Day five is when the delivery person stops saying 'enjoy your meal' and starts saying 'you good?'",
      "You went five consecutive days and your groceries literally expired waiting for you to remember they exist.",
      "Five days straight. At this point just hire a private chef, it'd be cheaper.",
      "This is what happens when 'I'll cook tomorrow' becomes a weekly mantra.",
      "You've ordered delivery for five days in a row and somehow convinced yourself each day was different.",
      "Five consecutive days means your delivery driver has seen you in the same sweatpants more than your roommate has.",
      "Five days running and your kitchen appliances are planning an escape.",
      "You made it to Friday ordering every single day. That's not a flex.",
      "Five straight days is serial behavior. This is a pattern that needs intervention.",
    ],
    '6': [
      "Six days in a row. You've officially crossed into 'what the fuck is wrong with you' territory.",
      "This is almost a full week of refusing to grow as a person.",
      "Six days straight means you've seen the same delivery driver more than you've seen sunlight.",
      "This is nearly a full week. A FULL WEEK of just... not trying.",
      "Six days running and the delivery apps are starting to think you're trapped in your apartment.",
      "Six consecutive days is a lifestyle now. Not a good lifestyle, but definitely a lifestyle.",
      "Day six is when your bank account starts the five stages of grief.",
      "Six days in a row means somewhere a delivery driver is telling their friends about 'this one guy.'",
      "You're one day away from a full week and honestly at this point just commit to the bit.",
      "Six straight days and you've probably forgotten what your kitchen even looks like.",
      "Six consecutive days. Your neighbors think you're either dying or a hermit.",
      "You've turned ordering delivery into a daily practice like meditation except way more expensive.",
      "Six days running is when it stops being about the food and starts being about the avoidance.",
      "This is almost biblical. On the seventh day you could've rested but you'll probably just order again.",
    ],
    '7': [
      "A full week without cooking. Impressive honestly.",
      "Did you forget kitchens exist?",
      "A full week of not touching your stove",
      "Week long cooking strike",
      "SEVEN DAYS IN A ROW. A FULL WEEK.",
      "You ordered delivery every single day for a week straight. That's commitment to the wrong thing.",
      "Seven consecutive days. This is no longer a habit, it's a documented streak of failure.",
      "Seven days in a row means you've achieved what most people can't: complete and total surrender.",
      "You went a full week ordering delivery like you're in some kind of twisted challenge.",
      "SEVEN. DAYS. STRAIGHT.",
      "A whole week and not once did you think 'maybe I should stop.' Incredible.",
      "Seven consecutive days is a streak that belongs on a fitness app, not a delivery app.",
      "You've ordered every single day for a week like you're allergic to your own stove.",
      "One full week of delivery. Your bank account is crying. Your kitchen is in witness protection.",
      "Seven days running means the delivery driver has your schedule memorized and they're worried.",
      "This is a week-long event. A festival. A celebration of poor choices.",
      "You made it seven days without touching a pan. Some people fast for a week. You... did this.",
      "A full seven days and you've turned 'I don't feel like cooking' into a religious practice.",
      "This is the kind of terrible streak that should come with an achievement.",
    ],
    '8': [
      "Eight days in a row. You've exceeded a full week and just kept going.",
      "EIGHT CONSECUTIVE DAYS. You broke through the seven-day barrier like it was nothing.",
      "Eight days straight means you looked at a full week of ordering and said 'but what if MORE.'",
      "You've been ordering for over a week. Your kitchen has filed for abandonment.",
      "Eight days in a row is when it stops being rock bottom and starts being a sinkhole.",
      "A week wasn't enough for you. You needed day eight. You needed to make sure everyone knew.",
      "Eight consecutive days and your delivery driver is considering adopting you out of concern.",
      "You've gone over a week without cooking and your smoke detector is bored.",
      "Eight days running means you're not even pretending anymore. This is just who you are now.",
      "Day eight is when your friends start asking if you're in a cult.",
      "You ordered delivery for eight days straight like you're trying to set a personal record for sadness.",
      "Eight consecutive days. Your groceries have given up. Your kitchen has given up. Your dignity left on day four.",
      "This is over a week of pure, unfiltered refusal to be a functioning adult.",
      "Eight days in a row means the delivery apps are concerned. Not about you. About their liability if something happens to you.",
      "You've been at this for eight days and honestly at this point it's impressive in the worst way possible.",
    ],
    '14': [
      "Two weeks without cooking is actually impressive.",
      "You haven't seen a vegetable in its natural form in weeks.",
      "FOURTEEN DAYS IN A ROW. TWO FULL WEEKS.",
      "You ordered delivery every single day for TWO WEEKS STRAIGHT.",
      "Fourteen consecutive days. This is a fortnight of failure.",
      "Two weeks without cooking. Your kitchen thinks you died.",
      "FOURTEEN DAYS. People go on vacation for less time than you've been ordering delivery.",
      "Two full weeks and not once did you have a moment of clarity. Not once.",
      "Fourteen days in a row means your delivery driver has been your only source of social contact.",
      "You've been ordering for two weeks straight like it's a government mandated program.",
      "Fourteen consecutive days. At this point your groceries are archaeological artifacts.",
      "Two weeks of daily delivery. Your oven is planning its escape.",
      "Fourteen days running and you've probably spent more on delivery fees than groceries would've cost for a month.",
      "TWO WEEKS. This is a lifestyle. This is a commitment. This is a problem.",
      "You made it two full weeks and your kitchen appliances have started a support group.",
      "Fourteen consecutive days means you've turned ordering delivery into a full-time routine.",
      "Two weeks straight. People have changed their entire lives in less time than you've been avoiding yours.",
      "Fourteen days in a row is when your friends stop asking questions and start planning interventions.",
      "You've been at this for two weeks. Your bank account is numb. It doesn't even feel pain anymore.",
      "Two full weeks of delivery and somewhere a financial advisor just got a cold shiver down their spine.",
    ],
    '15': [
      "Almost a full month of consecutive ordering. Your kitchen is legally considered abandoned property now.",
      "You've gone nearly a month without cooking, how are you still alive?",
      "Three to four weeks straight. This is the length of time people need to form a habit. You formed the worst one.",
      "You've been ordering delivery for close to a month like it's your actual job.",
      "Nearly thirty consecutive days means your delivery driver knows your life story at this point.",
      "You've gone weeks without touching a stove. Plural. WEEKS.",
      "This is almost a full calendar month of refusing to be a person.",
      "Three-plus weeks of daily delivery and your groceries have completely decomposed.",
      "The vegetables in your fridge didn't expire, they evolved into new lifeforms.",
      "You've been at this for nearly a month and your bank account has Stockholm syndrome.",
      "This is no longer avoidance, this is a full system shutdown.",
      "You've ordered delivery every single day for weeks and somehow still wake up and do it again.",
      "You've spent more quality time with delivery apps than actual humans.",
      "This is the kind of streak that gets studied in behavioral psychology classes.",
      "TYour kitchen has been declared an archeological site.",
      "Almost thirty days in a row. At this point cooking would feel like a betrayal of your new identity.",
      "You've been ordering for nearly a month straight and somehow never once thought 'maybe today's the day I stop.'",
    ],
    '30': [
      "Over a month. OVER A MONTH WITHOUT COOKING.",
      "This is an achievement and a mental health crisis.",
      "Someone needs to do a wellness check.",
      "This is a medical concern...",
      "You've achieved something no one should achieve.",
      "This is the longest streak of bad decisions possible.",
      "Guinness World Records should be notified.",
      "You ordered delivery every single day for a MONTH STRAIGHT. This is a medical condition.",
      "You've turned delivery into a utility bill.",
      "This is not a phase. This is your personality now.",
      "Your delivery driver should be listed as your emergency contact.",
      "A month. A FULL MONTH. People have had entire relationships that lasted shorter than your delivery streak.",
      "This is the kind of commitment people wish they had in their actual relationships.",
      "This needs to be in your medical records somewhere.",
      "You've achieved legendary status in the worst possible way.",
      "A full month of daily delivery means you've technically entered into a common-law marriage with the delivery driver.",
      "This is a streak that should come with a sponsorship deal.",
    ],
  },

  chainDependency: {
    "McDonald's": [
      "The McDepression is real.",
      "Ronald McDonald is personally thanking you.",
      "You kept your local McDonald's in business single-handedly.",
      "Bro it's cheaper if you just... go there.",
      "Adding $8 in fees to a $6 meal is psychotic behavior.",
      "Gave McDonald's money like they need your help.",
      "You're keeping the Golden Arches golden.",
      "The dollar menu isn't a dollar when you add delivery.",
      "You paid $10 in fees for a $7 meal how many times???",
      "There's one literally everywhere and you still delivered it.",
      "You're basically funding their next quarterly report.",
      "The cheapest option and you STILL managed to make it expensive.",
      "You chose the dollar menu lifestyle and still went broke.",
      "This makes it so much sadder somehow.",
      "Even your bad decisions are on a budget.",
      "The clown is laughing at you, not with you.",
      "You couldn't even be expensive about your terrible choices.",
      "You've been ordering McNuggets like they're a food group.",
      "You've single handedly kept the McFlurry machine broken in your area.",
      "Somehow more embarrassing than if it was somewhere fancy.",
      "You're the reason they have a '$1 $2 $3 Menu' and you still spent hundreds.",
      "The place designed to be cheap. And you still did damage.",
      "Your most expensive relationship is with a clown.",
      "You've been ordering fries more than you've been making eye contact with humans.",
      "You've eaten enough Big Macs to clog someone else's arteries.",
      "The value menu was supposed to save you. It did not.",
      "'I'm lovin' it...'",
      "How to go broke $8 at a time.",
    ],
    "Starbucks": [
      "Paying $20 for a coffee delivery is so fucking insane.",
      "There's literally one on every corner and you still deliver it.",
      "You paid someone to drive coffee to you that many times.",
      "There's three Starbucks within walking distance probably.",
      "Your barista knows your order through the app.",
      "This is the most expensive caffeine habit scientifically possible.",
      "You've spent coffee shop money on coffee that could've been free at home.",
      "Seven dollars at a time until you were broke. Iconic.",
      "You're the reason they can afford to union-bust.",
      "Your credit card debt came in a venti cup with your name spelled wrong.",
      "You paid rent money for drinks that are 90% ice.",
      "The baristas know your order, your schedule, and probably your credit score.",
      "You've spent mortgage payment money on oat milk upcharges.",
      "Treating Starbucks like a personality trait AND a second rent payment.",
      "You could've bought an espresso machine. You bought their espresso machine instead.",
      "Every drink order was a small financial crisis with foam on top.",
      "You turned a caffeine addiction into a full-blown economic disaster.",
      "Coffee makers are basically free at Goodwill. Did you know that? Like $5 at most.",
      "You've given them enough money to pay a barista's salary for a year.",
      "A grande mistake.",
      "If you make it at home it's literally like less than 50 cents per cup.",
    ],
    "Chipotle": [
      "The guac addiction is real.",
      "You've consumed more burritos than most Chipotle employees.",
      "This kind of money at one burrito chain is legendary.",
      "The extra guac added up didn't it.",
      "You're in their corporate presentations for sure.",
      "Fifteen dollars for rice and beans. Every time. And you never learned.",
      "You paid extra for literally everything.",
      "Sixteen dollars for ingredients that cost three dollars at the grocery store.",
      "You treated Chipotle like fine dining and paid the price accordingly.",
    ],
    "Taco Bell": [
      "Gourmet 4am cuisine.",
      "You're either high or have no taste buds left.",
      "Your toilet hates you.",
      "Taco Bell delivery is a war crime.",
      "Respect for the dedication to the cheapest and shittiest food.",
      "Your digestive system is filing a complaint.",
      "You've given Taco Bell more money than they deserve.",
      "Drunk you loves questionable decisions.",
      "The late night go-to for regret.",
    ],
    'generic': [
      "They didn't even send a thank you card.",
      "You're in their customer loyalty hall of fame for sure.",
      "[Chain] owns you now.",
      "They're naming a menu item after you probably.",
      "You're personally keeping this franchise alive.",
      "Corporate is sending you a thank you basket.",
      "They didn't even give you a loyalty card.",
      "You're a case study in brand loyalty.",
      "You found one place and just absolutely refused to stop.",
      "Your loyalty is admirable. Your spending is not.",
      "At least you're consistent. Consistently broke.",
      "Supporting local businesses by destroying your local bank account.",
      "Their rent is partially funded by your poor decisions.",
      "You're a regular and the receipts prove it.",
      "Loyal customer, terrible financial planner.",
      "You've kept this place afloat through sheer willpower and zero self-control.",
    ],
  },

  singleItemOrders: {
    '0': [
      "Wow you actually have some self-respect.",
      "Look at you being reasonable.",
      "Shocking self-control honestly.",
      "You actually have standards. Weird.",
      "Almost no single-item deliveries. Character development.",
      "You understand basic economics apparently.",
      "Almost zero single item orders. You plan your meals like a responsible adult.",
      "Single item orders are for impulsive disasters. You're not that.",
      "You actually think before ordering. Disgusting behavior.",
      "Nearly zero solo orders means you've got your shit together. Boring.",
      "You don't do impulse orders. You're the worst kind of person: functional.",
      "You're not out here ordering a single cookie at midnight like the rest of us.",
      "Zero chaotic energy in your order history. Deeply unrelatable.",
      "Single item orders require zero forethought and you have too much forethought.",
      "You don't do spontaneous. You do structured. I hate it.",
      "Never ordering just one random thing means you're probably meal planning. Get out.",
    ],
    '5': [
      "You really couldn't just... go get it?",
      "Pure laziness distilled into transactions.",
      "You really couldn't walk 5 minutes?",
      "These orders are more fees than food.",
      "A handful of single item orders. You've had some weak moments but not many.",
      "Occasional chaos, mostly controlled.",
      "You impulse ordered alone a few times. Just a little treat. A small financial wound.",
      "Single item orders in the single digits. You're flirting with bad decisions, not dating them.",
      "Less than ten solo orders means you've got decent restraint. For now.",
      "A handful of times you needed ONE thing and couldn't help yourself.",
      "You've had some 'fuck it' moments but they're rare enough to be forgivable.",
      "Under ten single orders. You're capable of chaos but you keep it contained.",
      "Occasional lone wolf orders. The impulse control is there, it just takes breaks sometimes.",
      "Single digits means you're mostly responsible with brief moments of weakness.",
      "A few solo orders scattered throughout. You're human. Barely.",
      "Less than ten times you went rogue. Could be worse. Will probably get worse.",
      "You order alone sometimes but not enough to be concerning yet.",
    ],
    '10': [
      "You're starting to build a habit here.",
      "Double digits. The impulse control is slipping.",
      "You're regularly making small, stupid decisions.",
      "You've crossed into 'this is becoming a pattern' territory.",
      "Each one was definitely worth the delivery fee, right?",
      "You paid $5 in fees for a $7 item. Math is not your thing.",
      "Around a dozen times you couldn't justify a full order but did it anyway.",
      "You've paid more in delivery fees than the actual items cost. Multiple times.",
      "This isn't occasional anymore. This is a you thing now.",
      "You're the reason the small order fee exists.",
      "You're out here ordering like items are free and delivery is a concept.",
      "You chose convenience over basic math.",
      "You really looked at a $3 item, saw the $6 delivery fee, and said 'yeah that math works.'",
      "Each one of these was a separate, distinct moment where your brain just fully shut off.",
      "Some poor driver circled the block looking for parking just to hand you a single thing.",
      "You looked at 'add more items to save on delivery' and said nah.",
      "You paid someone's hourly wage to bring you french fries. Once is funny. This many times is psychotic.",
      "Each solo order was its own little economic disaster and you just kept creating them.",
      "The math isn't mathing."
    ],
    '15': [
      "The delivery drivers have a name for you and it's not nice.",
      "This many solo orders means you've spent more on delivery fees than the food itself. Guaranteed.",
      "Someone's entire shift was just bringing you singular items and wondering what went wrong in your life.",
      "You've paid enough in delivery fees to have just bought a car and picked it up yourself.",
      "Each one was a separate, independent decision to be stupid.",
      "A driver risked their life in traffic to hand you one burrito. Then you did it again. And again. And again.",
      "Your order history looks like a cry for help written in single menu items.",
      "The environmental cost of your impulse control issues is measurable.",
      "You've normalized paying $15 to receive $3 worth of food and that's genuinely scary.",
      "Every single one of these could've been avoided by just thinking for five seconds.",
      "Drivers see your address pop up with one item and audibly groan.",
      "The carbon emissions from your solo item orders could power a small village.",
      "Your brain sees 'delivery fee: $6.99' and just doesn't process it as real money.",
      "Someone knocked on your door holding one french fry container and you both knew it was ridiculous but here we are.",
    ],
    '30': [
      "The audacity. The sheer audacity.",
      "A driver has brought you a single item more times than you've called your mother this year.",
      "This is pathological. This needs to be studied by people with degrees.",
      "Someone's retirement fund is being built on your inability to order more than two things.",
      "The algorithm keeps suggesting 'add items' and you keep hitting 'pay now'.",
      "Every driver in a 5-mile radius knows your address and fears it.",
      "You're the final boss of terrible ordering decisions.",
      "This many solo orders means you've personally contributed to climate change in a measurable way.",
      "You've created jobs. Bad jobs.",
      "A stranger got in their car for ONE thing this many times because of you.",
      "You're conducting psychological warfare on delivery drivers.",
      "This is a frequency that suggests you don't understand how restaurants work.",
      "This should unlock an achievement.",
      "Do you understand how terribly inefficient this is?",
    ],
  },

  mostExpensiveOrder: {
    '0': [
      "A modest splurge. Cute.",
      "Treating yourself responsibly. Boring but smart.",
      "A reasonable splurge. Almost responsible.",
      "This isn't crazy. You're fine.",
      "Your most expensive order was under fifty bucks. Responsible king shit.",
      "Not even fifty dollars on a single order. You've got limits and that's beautiful.",
      "Your priciest order was basically normal. Boring but smart.",
      "Under fifty bucks for your biggest order. You're either broke or disciplined.",
      "Your most expensive order couldn't even hit fifty. Frankly, I'm disappointed.",
      "Less than fifty on your worst day. You're playing it safe and I respect it.",
      "Your biggest splurge was pocket change. Zero chaos energy.",
      "Not even fifty dollars at your peak. You're the control group in this experiment.",
      "Your most expensive order is what some people spend on a regular Tuesday.",
      "Under fifty bucks max. You ordered like you actually check your bank account.",
      "Your highest order was reasonable and honestly that's no fun.",
      "Less than fifty for your biggest order means you never truly lost control.",
      "Your most expensive order is barely worth mentioning. Congrats on being normal I guess.",
      "Not even fifty bucks. You're out here ordering with a budget like some kind of adult.",
    ],
    '50': [
      "Okay big spender.",
      "Someone was feeling fancy.",
      "Did you at least share this or just disrespect it solo?",
      "This better have been amazing.",
      "Was it worth it though? Really?",
      "You could have gone to a real restaurant for this price.",
      "Big spender energy for one order.",
      "More than $50 for delivery is kinda crazy.",
      "That's a group dinner you ate alone.",
      "Did you feed friends or just yourself? Please say friends.",
      "That's grocery money you turned into styrofoam.",
      "Your most expensive order could've been a nice date. Instead it was you, alone.",
      "Almost three figures. You either had company or you have problems.",
      "You crossed a line and hopefully learned something.",
      "That's a night out at a real restaurant that you brought to your couch instead.",
      "Your max order was enough to make you pause before hitting confirm. You hit confirm anyway.",
      "That's a week of lunch you condensed into one mistake.",
      "This order was in the 'I'll regret this tomorrow' range and you were right.",
      "Almost a hundred dollars in one shot. The driver thought they were delivering to a party. They weren't.",
      "Your biggest order was substantial enough to hurt but not enough to be legendary.",
    ],
    '100': [
      "Was it good though? It better have been worth it.",
      "This better have been for a group or you're unhinged.",
      "You could have gone to an actual restaurant for this.",
      "This is a nice restaurant bill but delivered.",
      "I hope this fed like 4 people minimum.",
      "You could have gotten groceries for a week.",
      "Your biggest order broke a hundred dollars. That's a grocery haul you ate in one sitting.",
      "Triple digits on a single order. Did you black out or just give up?",
      "The driver definitely thought it was for a party.",
      "That's a utility payment. That's you, ordering dinner.",
      "You hit three figures on a single order and your bank account felt it personally.",
      "A hundred-plus dollars delivered to one person is a cry for help with appetizers.",
      "This is 'feeding a family' money that fed only you.",
      "Your priciest order could've been a night out somewhere nice. Instead it was your couch.",
      "Triple digit order means you either had friends over or you're going through something.",
      "The tip alone on this probably made the driver's night. The shame probably ruined yours.",
      "You ordered enough food in one go to justify meal prepping for a week.You are brave or broken.",
      "This is the kind of order that makes you lie when people ask what you did last night.",
      "That's a splurge that required recovery time.",
      "Your biggest order cost more than some people's car insurance and it was gone in 20 minutes.",
    ],
    '200': [
      "What the fuck did you order.",
      "I hope this was for like 8 people.",
      "The tax and tip must have been crazy.",
      "Did you order the entire menu?",
      "I'm gonna be sick.",
      "The driver thought it was a catering order.",
      "What the fuck was on this receipt?",
      "You spent multiple hundreds of dollars in a single order. Take that in.",
      "This is 'feeding an entire office' money that went to one address.",
      "Several hundred on one order. The driver pulled up expecting a conference. It was just you.",
      "That's rent money in some places.",
      "You could have paid off debt.",
      "Hundreds of dollars in one go. This wasn't dinner, this was a financial event.",
      "You ordered enough food to cater a small wedding and ate it in silence.",
      "The receipt for this order should've come with a warning label.",
      "Multiple hundreds on delivery. Your bank sent a fraud alert and then realized it was just you being you.",
      "This is the kind of order where you have to lie about how many people were actually there.",
      "Several hundred bucks one time. That's a plane ticket you converted into regret.",
      "You hit the hundreds and the driver assumed it was corporate. It was depression.",
      "Hundreds of dollars delivered and gone within an hour. Legendary in the worst way.",
      "This order cost more than some people's monthly entertainment budget. It WAS your entertainment.",
      
    ],
    '1000': [
      "What the actual fuck did you order?",
    ],
  },

  coffeeSpending: {
    '0': [
      "Reasonable caffeine habits. Weird.",
      "Either you're responsible or you hate coffee.",
      "Totally normal coffee habits. Boring.",
      "Your caffeine consumption is responsible somehow.",
      "Maybe you don't like coffee.",
      "Maybe this is why you're so unproductive.",
      "You either don't drink coffee or you make it at home like a psychopath.",
      "You've never had a barista spell your name wrong before.",
    ],
    '100': [
      "A few too many overpriced lattes.",
      "Your caffeine addiction is moderate.",
      "Just buy a coffee maker dude.",
      "That's a coffee maker and 6 months of beans.",
      "A hundred-ish on coffee. Casual drinker energy, nothing crazy.",
      "Your coffee spending is reasonable. Almost suspiciously reasonable.",
      "A hundred to two hundred on coffee all year. You've got moderation figured out somehow.",
      "This is the coffee budget of someone who has their shit together.",
      "Spent enough to have a habit but not enough to be a problem. Boring.",
      "You drink coffee like a normal person. Where's the chaos?",
      "This is 'I'll make it at home most days' energy and it's working.",
      "Your coffee spending suggests you have willpower. Unrelatable.",
      "You're coasting through life adequately caffeinated but not broke.",
      "This amount means you know where the line is and you don't cross it.",
      "Coffee spending in this range is what financial advisors call 'fine actually.'",
      "You spent a reasonable amount on coffee and somehow that's the most boring thing about you.",
    ],
    '200': [
      "Two hundred bucks on coffee is getting up there.",
      "A couple hundred on coffee. You've got a habit but it's not terminal yet.",
      "This is 'twice a week' coffee shop energy. Teetering on the edge.",
      "Two to three hundred means coffee is a treat, not a personality trait. Yet.",
      "You're flirting with a problem but haven't committed to it fully.",
      "This is the exact amount where it starts being a line item in your budget.",
      "A few hundred on coffee. You know the baristas' names but they don't know yours.",
      "Coffee spending in this range means you're one bad month from doubling it.",
      "This is 'I deserve this' money three times a week.",
      "Two hundred-ish on coffee. Not addicted, just deeply attached.",
      "You've crossed into 'this is becoming a thing' territory.",
      "A couple hundred means you're a regular somewhere but not THE regular.",
      "This is where coffee stops being fuel and starts being a coping mechanism.",
      "You're in the danger zone but still have plausible deniability.",
      "Coffee budget creeping up but not quite out of control. Give it time.",
    ],
    '300': [
      "Three to four hundred on coffee. That's a monthly subscription to mild addiction.",
      "You've spent enough on coffee to justify buying an espresso machine. You didn't buy one.",
      "This is 'I need coffee to function' money and it shows.",
      "Coffee isn't optional anymore, it's infrastructure.",
      "You're spending car insurance money on lattes.",
      "This amount means you've stopped making it at home entirely.",
      "You've crossed the threshold from 'hobby' to 'dependency with foam art.'",
      "This is enough to have bought a really nice coffee maker that you'll never use.",
      "You've financially committed to never being tired.",
      "You're paying rent to Starbucks.",
      "Coffee is a meal replacement to you.",
      "You don't have a caffeine addiction, the caffeine has you.",
      "This is the amount where people start asking if you're okay and you say 'I just need coffee.'",      
    ],
    '500': [
      "That's a plane ticket you drank.",
      "You've spent actual rent money on caffeine.",
      "This is a full-blown addiction with a rewards card.",
      "You've paid someone's weekly salary just in coffee orders.",
      "At this point coffee isn't a drink, it's a budget category.",
      "Five to ten coffees a week at ten bucks a pop. The math is mathing and it's ugly.",
      "You've spent close to a grand on bean water.",
      "The baristas know your name, your order, your schedule, and probably your social security number.",
      "This amount means coffee is no longer optional. It's a utility bill.",
      "You're spending 'nice vacation' money on staying awake.",
      "And you probably still don't own a French press.",
      "This is the coffee budget of someone who's given up on fighting it.",
      "You've turned a morning routine into a financial crisis, one venti at a time.",
    ],
    '1000': [
      "You have a substance abuse problem but it's legal.",
      "Just install an IV of cold brew at this point.",
      "You have a dependency that requires intervention.",
      "This is a subscription service at this point.",
      "You've spent a car payment on staying awake.",
      "This is a mortgage payment in some states. You drank it.",
      "You're personally funding someone else's college tuition.",
      "You could've bought a professional-grade espresso machine and still had change. You didn't.",
      "Over a thousand dollars and you still wake up tired. The irony.",
      "You've spent enough on coffee to have just hired a personal barista.",
      "That's a vacation. That's a computer. That's you, wide awake and broke.",
      "The coffee shop should be sending you dividends at this point.",
      "You're approaching two thousand dollars on caffeine. This is a substance dependency with tax.",
      "This amount means you've never once thought 'I could make this at home.'",
      "You've given a coffee chain enough money to expand into a new market.",
      "This is rehab-level spending except the rehab is just more coffee.",
    ],
    '2000': [
      "TWO THOUSAND DOLLARS ON COFFEE.",
      "You've spent multiple thousands on drinks that last fifteen minutes.",
      "This is a down payment on a car. You caffeinated it away.",
      "Two grand on coffee means you haven't been sober from caffeine in months.",
      "You could've gone to Europe. Instead you went to the coffee shop daily.",
      "Your heart rate is permanently elevated.",
      "You've spent enough to own a literal stake in the coffee shop.",
      "This amount requires a W2 from Starbucks. You're basically staff.",
      "Two thousand-plus means coffee is your primary expense after rent.",
      "You're not drinking coffee anymore. You're funding a small agricultural operation.",
      "This is the kind of spending that gets mentioned in your eulogy.",
      "Two grand on coffee and you still don't know how to use a pour-over.",
      "The coffee chain's quarterly earnings include a footnote about you.",
      "You've personally kept a location profitable during a recession.",
      "This is addiction with whipped cream on top.",
    ],
    '3000': [
      "You've spent a semester of tuition on being alert.",
      "This is a used Honda Civic. You drank a Honda Civic.",
      "Three grand on coffee means you're a shareholder whether they like it or not.",
      "You could've paid off credit card debt. You paid for oat milk instead.",
      "Three thousand-plus on coffee. Your veins are espresso at this point.",
      "This amount means you've never once considered the phrase 'home brewing.'",
      "Three grand. That's a month in Bali. That's a whole life experience. That's you, jittery.",
      "You're not a customer. You're a patron. You're a benefactor.",
      "Three thousand dollars means coffee isn't part of your routine. Your routine is coffee.",
      "You've achieved legendary status and your legacy tastes like caramel macchiato.",
      "At three grand you're not drinking coffee. Coffee is drinking you.",
      "Your blood is 40% overpriced espresso.",
    ],
    '4000': [
      "You've spent a brand new motorcycle on iced lattes.",
      "This is a year of car payments. You chose caffeine instead.",
      "Four grand on coffee and you probably still complain about being broke.",
      "You could've had a life-changing experience. You had four thousand mediocre coffees instead.",
      "You are paying the barista's rent.",
      "You've transcended customer status into folklore.",
      "You're spending luxury watch money on drinks that give you anxiety.",
      "This amount could've funded a startup. You funded your nervous system instead.",
      "Four grand on coffee. Your cardiologist is pre-writing your chart.",
      "The coffee shop franchised a new location because of you specifically.",
      "You've spent enough to make financial advisors weep openly.",
      "This isn't a coffee habit. This is a coffee career.",
      "You're not addicted to coffee. You ARE coffee.",
      "Four grand means every life decision you've made has been caffeinated and regrettable.",
    ],
    '5000': [
      "You've spent a decent used car on not falling asleep.",
      "This is college tuition. Multiple semesters. You drank it.",
      "You're a case study in behavioral economics.",
      "You could've changed your life. You changed your heart rate instead.",
      "Your blood type is espresso-negative.",
      "You've personally funded an entire supply chain from bean to cup.",
      "This amount means you've never been decaffeinated for more than eight hours.",
      "Somewhere a cardiologist just got a chill.",
      "You could've bought a reliable car, invested in stocks, or literally anything else.",
      "The baristas have a retirement plan and you're financing it.",
      "This is 'I don't have a problem, I have a lifestyle' money.",
      "You're not ordering coffee anymore. You're running a personal subsidy program for Big Coffee.",
      "This spending has its own tax implications.",
      "You've achieved what scientists call 'complete financial surrender to caffeine.'",
    ],
    '10000': [
      "You've spent five figures on caffeine. FIVE FIGURES.",
      "This is a new car. A NICE new car. That you drank.",
      "Five digits on coffee means you're not a customer, you're a business partner.",
      "You could've bought a franchise. Instead you funded one.",
      "This is down payment on a house money that went to almond milk upcharges.",
      "You don't have a habit. You have a portfolio.",
      "This amount should come with equity in the company.",
      "You've achieved a level of coffee spending that requires congressional oversight.",
      "Five digits on bean water. Your ancestors are confused.",
      "Five figures on coffee means your will to live is directly tied to your caffeine levels.",
      "This is the kind of number that gets you featured in financial horror stories.",
      "You're not human. You're a walking Starbucks quarterly report.",
    ],
    '100000': [
      "Mythical status. You are the coffee god.",
    ],
  },

  nightOwlPercentage: {
    '0': [
      "Mostly normal eating hours. Functioning adult behavior.",
      "Your circadian rhythm is healthy and boring.",
      "Your eating schedule is boring and healthy.",
    ],
    '20': [
      "A healthy night owl tendency.",
      "Late night snacker energy.",
      "Your sleep schedule is questionable but not alarming.",
      "Some late night tendencies, nothing alarming.",
      "Night owl vibes but not concerning.",
    ],
    '40': [
      "Half your orders are after 10pm what is your schedule.",
      "Do you work nights or just hate daylight?",
      "Your peak hours are everyone else's bedtime.",
      "Your circadian rhythm is fucked.",
      "Most people are winding down when you're ordering.",
    ],
    '60': [
      "You're basically nocturnal.",
      "The sun is your enemy apparently.",
      "Night shift worker or vampire? Both?",
      "You've never heard of breakfast have you.",
      "You're basically a vampire.",
      "Three quarters of orders after 10pm is not normal.",
    ],
    '80': [
      "You literally only eat at night.",
      "When do you sleep??? Do you sleep???",
      "This is not a normal human eating pattern.",
      "You exclusively eat at night. EXCLUSIVELY.",
      "This is not human behavior this is cryptid behavior.",
      "You've never ordered during daylight hours have you.",
      "Your circadian rhythm is non-existent.",
      "Are you allergic to the sun?",
    ],
  },

  couldHaveBought: [
    "Priorities.",
    "That's a lot of 'what if' moments.",
    "You made choices... interesting ones.",
    "Different paths, same destination.",
    "That's opportunity cost in action.",
  ],

  missedInvestment: {
    '0': [
      "Missing out on $[X] in gains. Not great, not terrible.",
      "Could've had an extra $[X]. Oh well.",
      "Could've had an extra $[X] but whatever.",
      "Missing out on $[X]. Not devastating but not great.",
      "That's $[X] you won't have for retirement. Whoops.",
    ],
    '1000': [
      "That's $[X] in lost investment returns.",
      "You chose immediate gratification over $[X].",
      "Future you is so disappointed.",
      "Your retirement fund is crying.",
      "$[X] in investment returns you'll never see.",
      "That's $[X] that could be growing right now.",
      "Compound interest is crying.",
    ],
    '3000': [
      "$[X] in lost gains. Let that sink in.",
      "You're literally $[X] poorer because of pad thai.",
      "That's a car down payment in investment returns.",
      "Your future self is sending hate mail back in time.",
      "The opportunity cost is physically painful.",
      "You could have $[X] more right now.",
      "$[X] in wealth you just... deleted.",
    ],
    '7000': [
      "That's literally $[X] you don't have because of pad thai.",
      "Your financial advisor just felt a disturbance in the force.",
      "Dave Ramsey is having a panic attack somewhere.",
      "Ten grand in returns. GONE. Because you can't cook.",
      "$[X] that could be compounding right now.",
      "You're $[X] poorer because you can't meal prep.",
      "That's a used car in investment returns you won't see.",
    ],
    '15000': [
      "You're $[X] poorer because you can't cook.",
      "That's a down payment. That's a FUCKING DOWN PAYMENT.",
      "The opportunity cost is literally destroying me.",
      "Warren Buffett is personally disappointed in you.",
      "$[X] in investment returns gone. Absolutely gone.",
      "This is a retirement fund you just consumed.",
      "You could have $[X] MORE right now working for you.",
      "That's a brand new car in lost investment gains.",
    ],
    '20000': [
      "Twenty grand in returns you ate away.",
      "That's a down payment. That's a FUCKING DOWN PAYMENT.",
      "The opportunity cost is literally destroying me.",
      "Warren Buffett is personally disappointed in you.",
      "$[X] in investment returns gone. Absolutely gone.",
      "This is a retirement fund you just consumed.",
      "You could have $[X] MORE right now working for you.",
      "That's a brand new car in lost investment gains.",
    ],
    '30000': [
      "Financial advisors are having nightmares about you.",
      "$[X]. That's how much wealth you deleted.",
      "You could have had a down payment growing.",
      "That's $[X] in compound interest you'll never see.",
      "This is a new car in investment returns. GONE.",
      "Your portfolio would be thriving right now.",
      "r/wallstreetbets is crying for you.",
    ],
    '40000': [
      "Forty grand that could be making you more money.",
      "Financial advisors are having nightmares about you.",
      "$[X]. That's how much wealth you deleted.",
      "You could have had a down payment growing.",
      "That's $[X] in compound interest you'll never see.",
      "This is a new car in investment returns. GONE.",
      "Your portfolio would be thriving right now.",
    ],
    '50000': [
      "FIFTY THOUSAND DOLLARS in lost investment returns.",
      "You could have $[X] working for you right now.",
      "That's a house down payment in investment gains.",
      "This is what financial trauma looks like.",
      "This could have been your retirement nest egg.",
      "Your future self is screaming back through time.",
      "$[X] that would be making you money while you sleep.",
    ],
    '60000': [
      "Sixty grand in compound interest GONE.",
      "You deleted a mid-tier Tesla in potential returns.",
      "FIFTY THOUSAND DOLLARS in lost investment returns.",
      "You could have $[X] working for you right now.",
      "That's a house down payment in investment gains.",
      "This is what financial trauma looks like.",
    ],
    '75000': [
      "You're missing out on $[X] in investment returns.",
      "This is generational wealth you ate.",
      "You could have had $[X] growing at 10% annually.",
      "Financial planners are using you as a cautionary tale.",
      "You chose delivery over a future mansion.",
      "This number is going to haunt you for decades.",
    ],
    '80000': [
      "Eighty grand that could be compounding right now.",
      "You're missing out on $[X] in investment returns.",
      "This is generational wealth you ate.",
      "You could have had $[X] growing at 10% annually.",
      "Financial planners are using you as a cautionary tale.",
      "That's almost six figures in returns. ALMOST SIX FIGURES.",
      "This is 'retire at 40' money. GONE.",
    ],
    '100000': [
      "ONE HUNDRED THOUSAND DOLLARS in lost investment returns.",
      "You're missing SIX FIGURES in potential wealth.",
      "That's $[X] that could have changed your life.",
      "This is a house. A FULL HOUSE in investment gains.",
      "You could have been on track to early retirement.",
      "Six figure returns GONE because you can't use a stove.",
      "This is 'fuck you money' you'll never have.",
      "Your children's inheritance just vanished.",
      "$[X] working for you would have been life-changing.",
      "This is financial violence against your future self.",
    ],
    '150000': [
      "You're missing out on over $[X] in investment returns.",
      "That's a MANSION down payment in lost wealth.",
      "This is more money than most people will save in their lifetime.",
      "You could have retired early with this.",
      "Six figures. SIX FUCKING FIGURES in returns you'll never see.",
      "This is generational wealth that will NEVER exist now.",
      "Financial advisors are showing this to clients as a horror story.",
      "You chose UberEats over financial freedom.",
      "$[X] compounding for 30 years would have made you a millionaire.",
      "This number should be illegal.",
      "Your grandchildren will never exist because you can't afford them now.",
      "You've deleted a small fortune in potential returns.",
      "This is what regret looks like in dollar signs.",
    ],
  },

  costPerMeal: {
    '0': [
      "Only $[X] extra per meal in fees. Almost reasonable.",
      "Could be worse honestly.",
      "$[X] extra per meal isn't terrible honestly.",
      "Could definitely be worse.",
    ],
    '5': [
      "You're paying $[X] extra PER MEAL for the privilege of not cooking.",
      "That's $[X] per meal you're just... giving away.",
      "Multiply $[X] by every meal. Feel that? That's regret.",
      "That's $[X] per meal in pure fees.",
      "You're paying $[X] extra just for convenience.",
      "$[X] per meal that could have been... anything else.",
      "Multiply that by every meal. Hurts doesn't it.",
    ],
    '8': [
      "$[X] per meal in pure waste.",
      "You're basically paying double for everything.",
      "That's almost what the actual food costs.",
      "You're basically doubling the cost of your food.",
      "$[X] per meal is almost what the food costs.",
      "That's a 100% markup you're just accepting.",
    ],
    '10': [
      "Ten bucks extra per meal is criminal.",
      "$[X] per meal in pure waste.",
      "You're basically paying double for everything.",
      "That's almost what the actual food costs.",
      "You're basically doubling the cost of your food.",
    ],
    '12': [
      "Over $[X] extra per meal what the fuck.",
      "You're paying more in fees than some people spend on food.",
      "The delivery fee is more expensive than making it yourself.",
      "This is financial self-harm.",
      "Over $[X] extra PER MEAL.",
      "You're paying more in fees than actual food.",
      "The delivery costs more than making it yourself.",
      "This is genuinely unhinged spending.",
    ],
  },

  peakHungerHour: {
    'breakfast': [
      "Ordering breakfast delivery is peak laziness.",
      "Cereal exists. Eggs exist. What are you doing.",
      "You couldn't make toast?",
      "You order breakfast the most. Toast is basically free.",
      "Cereal exists. Eggs take 3 minutes.",
      "Breakfast delivery is peak 'I've given up'.",
      "Morning delivery orders hit different (worse).",
      "Breakfast is literally the easiest meal and you still ordered it.",
    ],
    'lunch': [
      "Peak lunch ordering. At least you're predictable.",
      "At least you're eating like a regular human.",
      "You order most at lunch. Basic but honest.",
      "At least this is normal human behavior.",
      "Your lunch break is UberEats' busiest hour.",
      "Lunchtime is when you give up daily.",
    ],
    'dinner': [
      "The classic time to give up.",
      "The most common time to admit defeat.",
      "Standard dinner delivery. Nothing special here.",
      "The most common time to admit defeat.",
      "You're statistically average. Congrats?",
      "The 6-9pm window of shame.",
      "Everyone orders dinner. You're not special.",
      "The evening surrender to laziness.",
      "Dinnertime is when your willpower dies.",
    ],
    'late-night': [
      "Your peak hunger is when normal people sleep.",
      "You're a creature of the night.",
      "This explains so much about you.",
      "You're hungriest when everyone else sleeps.",
      "Peak ordering at [time]am. Seek sunlight.",
      "Night creature energy.",
    ],
    'chaos': [
      "You order the most at [time]am. Seek help.",
      "What is happening at [time] in the morning.",
      "This is not a normal time to be hungry OR awake.",
      "[time]am is your hungriest time. What the fuck.",
      "You order most at [time] in the morning. Why.",
      "This time doesn't even exist to most people.",
      "You're ordering when everyone else is unconscious.",
    ],
  },

  weekendWarrior: {
    'weekday': [
      "You order more on weekdays than weekends. Work stress hits different.",
      "Your weekday self hates cooking more than your weekend self.",
      "You order more during work days. Stress eating detected.",
      "Your weekday self has zero energy to cook.",
      "At least you try on the weekend (barely).",
      "At least weekends you have some dignity.",
      "Monday through Friday: peak suffering and peak ordering.",
    ],
    'weekend': [
      "Your weekends are just non-stop ordering apparently.",
      "You have time to cook on weekends. You just won't.",
      "Saturday and Sunday are for the delivery drivers.",
      "Your weekends are delivery driver employment programs.",
      "You have free time on weekends. Still won't cook.",
      "Saturday and Sunday are for the apps apparently.",
      "The weekend is when you really let loose (your wallet).",
    ],
    'balanced': [
      "Equally terrible every day of the week. Consistency is key!",
      "You don't discriminate. Every day is a good day to waste money.",
      "Your commitment to not cooking is impressive.",
      "Every day is equally bad. Impressive consistency.",
      "You don't discriminate against any day of the week.",
      "Your commitment to never cooking is admirable.",
      "Monday through Sunday, all terrible choices.",
      "Every day gets equal treatment (neglect).",
      "You're an equal opportunity food waster.",
    ],
  },

  spentThisYear: {
    '0': [
      "Is it January or something?",
      "Wow, you actually cooked this year. Character development.",
      "Either you're broke or you have self-control. Both are respectable honestly.",
      "You're not even worth roasting. Next.",
      "You ordered delivery like 4 times. Why are you even here?",
      "You either just downloaded this app or you're lying about your other accounts.",
      "Poverty is keeping you humble.",
      "Finally, someone with a functioning kitchen.",
      "You ordered once on your birthday.",
    ],
    '100': [
      "Congrats on being poor AND lazy.",
      "Just mid mid.",
      "This is the energy of someone who still thinks $8 delivery fees are too much.",
      "You're basically financially responsible. Get out of here, this app isn't for you.",
      "This is the spending of someone who still asks their parents for money.",
      "You discovered the 'pickup' option and it changed your life.",
      "This is what people spent in 2019. Are you a time traveler?",
      "You saw the delivery fee and said 'absolutely not' like a responsible adult.",
      "Are you okay? Do you have friends?",
      "You really looked at a $4.99 delivery fee and chose violence (walking to the restaurant).",
      "The only thing smaller than this number is your social life apparently.",
      "This screams 'I have roommates who judge me'.",
    ],
    '500': [
      "This is 'I'll start cooking tomorrow' energy for 365 days straight.",
      "A thousand bucks and you probably still complained about paying for extra sauce.",
      "You spent a nice TV on mediocre Chinese food and regret.",
      "Your New Year's resolution was clearly not 'learn to cook'.",
      "You're the type to order a $30 meal and then eat ramen for a week to compensate.",
      "The shame-to-spending ratio here is actually pretty balanced.",
      "Rent in a small town.",
      "This is a decent mattress. Maybe you would've been able to sleep at night.",
      "That's like 200 frozen pizzas.",
      "Your kitchen is just a really expensive storage room at this point.",
      "You bought a gym membership to offset this and never went. I can sense it.",
      "This is the budget of someone who thinks they're being responsible.",
      "A decent used car payment. Except you got cold fries instead.",
      "You spent rent money on soggy burritos. Respect the commitment to poor decisions.",
      "Your bank account is crying but at least you didn't have to do dishes.",
      "A gym membership you'd actually use costs less than this.",
      "You spent this much and still complained about the tip suggestions.",
      "This is starter-level financial damage. Give it time, you'll get worse.",
      "That's rent in some places. You ordered it instead.",
    ],
    '1000': [
      "That's a plane ticket. You could've gone somewhere. Instead you got Chipotle 80 times.",
      "A thousand dollars in delivery fees alone. The drivers are eating better than you.",
      "Your credit score dropped just from me looking at this.",
      "A thousand dollars and you definitely still ordered from the same 3 restaurants.",
      "This could've been a nice vacation. Instead it was 50 burritos.",
      "The driver has seen your house more than your own family has.",
      "You're telling me you spent a mortgage payment on McDonalds?",
      "Could be worse. Will probably get worse.",
      "That's a decent laptop you ate.",
      "Not catastrophic but definitely concerning.",
      "This is 'I had a year' money. A bad year, financially speaking.",
      "You spent enough to feel it but not enough to learn from it apparently.",
      "A thousand to two thousand means you're in the danger zone but still have plausible deniability.",
      "You've spent enough to justify meal prepping. You didn't meal prep.",
      "This is the amount where you start lying to yourself about 'needing' delivery.",
      "Your bank account noticed. You pretended not to.",
    ],
    '2000': [
      "This is a used car. You spent a whole ass car on UberEats. Where is your car. Show me the car.",
      "Two grand and you can't name a single meal.",
      "This is rent in a major city.",
      "Your landlord thinks you're a drug dealer with all these delivery drivers showing up.",
      "You invested in the economy. Just the worst part of it.",
      "That's a really nice vacation you didn't take.",
      "You spent a used car on not cooking.",
      "Two thousand-plus means delivery isn't occasional anymore. It's structural.",
      "You spent enough to change your life. You changed your delivery driver's life instead.",
      "That's multiple rent payments you ate.",
      "This is the exact dollar amount where ignorance stops being bliss.",
      "You've spent enough to pay off meaningful debt. You created regret instead.",
      "You funded someone's entire car payment through your laziness.",
      "Your friends have started to notice.",
      "You spent enough this year that pretending it's fine is now gaslighting yourself.",
    ],
    '3000': [
      "Three thousand dollars in convenience fees. The only thing convenient here is your financial ruin.",
      "You've made delivery a core part of your identity.",
      "You spent enough to completely change your financial situation. You chose not to.",
      "This is 'intervention from friends' money but your friends also order delivery so nobody's talking.",
      "Your stove is considering legal emancipation.",
      "You spent enough to fund a small business.",
      "This amount could've been invested. It was digested.",
      "You've spent enough that lying about it requires effort now.",
      "This is a whole ass computer. Multiple computers. A really nice gaming setup.",
      "Your delivery spending is competing with your actual bills.",
      "You spent enough this year to make your accountant cry if you had one.",
      "This is the amount where 'I deserve this' becomes 'I have a problem.'",
    ],
    '4000': [
      "Four grand on delivery and you still don't tip 20%. I know you don't.",
      "This is a semester of community college. You chose chicken tenders instead of education.",
      "Your DoorDash driver is taking his wife to Aruba with your tip money.",
      "The real crime is that half of this was probably service fees.",
      "You've spent enough to take a month off work. You worked and ordered delivery instead.",
      "This is student loan payment money. Possibly your entire student loan.",
      "You've financially committed to never growing as a person.",
      "You spent enough to get certified in something useful. You got really good at clicking 'confirm order' instead.",
      "You've spent enough that your delivery driver could probably claim you as a dependent.",
      "This amount represents actual life opportunities you traded for convenience.",
      "This means that the delivery fees alone probably hit four figures. Just the FEES.",
      "If your parents found out it would cause a massive screaming fight.",
      "You've achieved a level of spending where shame becomes background noise.",
      "This is enough money to have changed something meaningful. You changed nothing.",
    ],
    '5000': [
      "Actually don't show your parents.",
      "Genuinely HOW? Were you ordering for the whole floor? Are you okay?",
      "This is not normal behavior. Seek help. Actually don't, you can't afford it anymore.",
      "You spent a down payment on a house. What is wrong with you?",
      "Your ancestors survived wars for this?",
      "Genuinely concerned. Are you okay? Do you know how to turn on a stove?",
      "You're the reason they keep raising the prices.",
      "Does your mom know?",
    ],
    '10000': [
      "Ten bands. TEN. BANDS. You could've gotten a personal chef for less.",
      "This is a whole year of groceries for a family. You're a family of one eating McDonalds.",
      "Your driver has investment properties because of you.",
      "This is wealth redistribution but to the worst possible people.",
      "You know UberEats has shareholders right? You're some consultant's data point in a PowerPoint about customer retention.",
      "You've personally funded someone's food truck startup with this money.",
      "The delivery radius around your house is permanently trafficked.",
      "What the fuck is wrong with you?",
      "You need to be studied by scientists.",
      "Your bank statement looks like a hostage situation.",
      "Ten thousand dollars and you definitely still ate cereal for dinner sometimes.",
      "I don't have a joke. You need help.",
      "The IRS is going to audit you just out of curiosity.",
      "You need an intervention, not an app.",
      "Honestly impressive. Like I'm not even mad, I'm fascinated.",
    ],
    '20000': [
      "This HAS to be a business account. Please tell me this is a business account.",
    ],
  },

  deliveryWaits: {
    '0': [ // Under 12 hours
      "Not bad honestly. You barely even use this app.",
      "You've spent more time scrolling TikTok today than waiting for delivery all year.",
      "Congrats on having self-control I guess.",
      "This is the energy of someone who actually leaves their house.",
      "You ordered like three times. Why are you even checking this?",
      "Finally, someone who discovered the pickup option.",
      "Under x hours waiting. You're either responsible or just broke.",
    ],
    '720': [ // Around 1 day (24 hours)
      "A full day of your life spent waiting. That's a whole ass day.",
      "x hours of watching that little car icon move around.",
      "You've spent an entire day staring at 'Your driver is nearby'.",
      "That's a full 24 hours. You could've learned to make pasta in that time.",
      "One day gone. Just completely gone. For food you could've picked up.",
      "x hours of your life you'll never get back. Hope the spring rolls were worth it.",
      "A day of waiting. Your ancestors walked miles for food and you can't wait 30 minutes without complaining.",
    ],
    '2160': [ // Around 2-3 days
      "Multiple days of waiting. You could've binged an entire TV series.",
      "x hours of your life gone. Just... gone. For lukewarm fries.",
      "That's a long weekend. You spent a vacation waiting for food.",
      "Two days of watching a map. Two full days.",
      "x hours and the food still arrived cold half the time.",
      "That's 48+ hours of 'Your driver is 2 minutes away' lies.",
      "You've spent more time waiting for delivery than you've spent with some of your friends this year.",
    ],
    '4320': [ // Around 1 week
      "A full week of waiting. Seven days. x hours of watching a map.",
      "You spent a week of your life on this. A WEEK.",
      "That's a whole vacation. You went nowhere and got mediocre burritos.",
      "x hours of 'Your dasher is completing another delivery first'.",
      "One week. That's 168 hours of staring at your phone waiting for Chipotle.",
      "You could've driven across the country in this time. You didn't even leave your house.",
      "A week of your finite existence spent waiting. This is genuinely sad.",
      "That's more time than most people spend on actual hobbies.",
    ],
    '10080': [ // Around 2 weeks
      "Two weeks of your finite existence spent waiting for Chipotle.",
      "That's half a month. HALF A MONTH. Just standing by your door.",
      "You could've walked to every restaurant. Twice.",
      "x hours watching drivers take the wrong turn.",
      "Two full weeks. That's a whole pay period spent refreshing the app.",
      "x hours of your life watching that little car take detours.",
      "You've spent more time waiting than most people spend working out all year.",
      "Two weeks. Your time on earth is limited and you spent it like this.",
    ],
    '20160': [ // Around 3 weeks
      "Three weeks. That's almost a month of your life. Gone.",
      "x hours of refreshing the app. That's legitimately sad.",
      "You've spent more time waiting than most people spend on hobbies.",
      "Three weeks of 'driver is 8 minutes away' lies.",
      "x hours. That's longer than most people's entire vacation time for the year.",
      "Three weeks waiting. You could've learned to cook by now. Easily.",
      "That's 21 days of watching a car icon. 21 DAYS.",
      "You've spent more time waiting for delivery than most people spend reading all year.",
    ],
    '30240': [ // Around 1 month
      "A full month. You spent a MONTH of your life waiting.",
      "x days. That's a vacation, a road trip, learning a language. You got Panera.",
      "You've spent more time waiting for delivery than most people spend with their families.",
      "This is a part-time job's worth of waiting. Except you paid THEM.",
      "One month of your life. 30 days. 720 hours. Gone.",
      "You could've gotten in shape in this time. You chose to wait for Wingstop.",
      "A month. That's longer than some people's relationships last.",
      "x hours of 'Your order is being prepared' notifications that were definitely lies.",
    ],
    '51840': [ // Around 6 weeks
      "Six weeks of your life. Over a month. Just... waiting.",
      "x hours refreshing 'Where's my order?'.",
      "This is more time than most people spend on their honeymoon.",
      "You could've gotten a pilot's license in this time.",
      "Six weeks. That's a college summer session. You learned nothing.",
      "x days of staring at a map while your food got cold.",
      "You've spent more time waiting than most people spend job hunting.",
      "Six weeks of your finite existence. This is a mental health concern.",
    ],
    '60480': [ // Around 2 months
      "Two months of your life. Gone. Watching a map.",
      "x days waiting. That's a college semester. You learned nothing and got fat.",
      "A full quarter of a year spent waiting for soggy fries.",
      "This is pregnancy-length waiting. Except nothing was born except regret.",
      "Two months. 60 days. x hours. All gone.",
      "You could've learned an entire skill in this time. Guitar, coding, literally anything.",
      "That's more time than most people spend on self-improvement in a decade.",
      "Two full months of 'Your driver is nearby' while they were clearly lost.",
    ],
    '77760': [ // Around 3 months
      "Three months. A full quarter of a year. Waiting.",
      "x hours of your finite human existence spent on this.",
      "You could've become fluent in a language. You chose to wait for Wingstop.",
      "Your life is a series of 'Driver is completing another delivery first' notifications.",
      "Three months. That's a whole season. An entire season of waiting.",
      "x days of watching a car icon not move. This is concerning.",
      "You've spent more time waiting than most people spend with their significant others.",
      "A quarter of a year. 25% of 2024. Just... waiting. For food.",
    ],
    '129600': [ // Around 4-5 months
      "Almost half a year waiting. HALF A YEAR.",
      "x days of staring at your phone. Your ancestors are disappointed.",
      "This is more time than people spend raising a puppy to adulthood.",
      "Five months. You could've gotten a degree. You got cold french fries.",
      "x hours of your life you'll never get back. This is actually insane.",
      "Five months waiting. You could've written a book in this time.",
      "That's more time than most people spend on their jobs before quitting.",
      "Half a year almost. Your life is slipping away 45 minutes at a time.",
    ],
    '216000': [ // Around 6 months
      "Half a year of your life. SIX MONTHS. Waiting for delivery.",
      "x hours. That's longer than some people have been in relationships.",
      "Six months waiting. This is a cry for help.",
      "You've spent more time waiting than most people spend learning skills.",
      "Half a year. 180+ days. x hours. All waiting.",
      "You could've gotten fit, learned a language, and picked up a hobby. You did none of that.",
      "Six months of your finite existence on earth. Gone. For cold burritos.",
      "This is genuinely concerning. Are you okay? Do you have anyone to talk to?",
    ],
    '259200': [ // Around 9 months
      "Nine months. That's a full pregnancy. You birthed nothing but regret.",
      "x hours of waiting. This is genuinely concerning.",
      "You could've gone from 'never cooked' to 'decent home chef' in this time.",
      "Nine months. That's three quarters of a year. THREE QUARTERS.",
      "x days spent waiting for food. This is a psychological issue.",
      "You've spent more time waiting than most people spend sleeping in a month.",
      "Nine months of watching a car icon. Your life is passing you by.",
      "This is more time than people spend planning weddings. You got Sweetgreen.",
    ],
    '388800': [ // 1 year or more
      "Over a year of waiting. A FULL YEAR of your life.",
      "x days spent waiting. That's longer than most people stay at a job.",
      "You've waited longer than some empires have existed.",
      "I don't have a joke. You need professional help.",
      "A year of your life. Gone. This is actually insane.",
      "x hours. That's 365+ days. An entire trip around the sun spent waiting.",
      "You could've done literally anything else. Anything. You chose this.",
      "A full year. You've spent more time waiting for delivery than most people spend pursuing their dreams.",
      "One year of your finite time on earth. This is beyond a joke. Seek help.",
      "x days of waiting. Your life has meaning and this isn't it.",
    ],
  },
} as const;

// Helper functions to determine milestones
// Returns the highest milestone that is <= the value
function getTotalDamageMilestone(totalSpent: number): keyof typeof WRAPPED_MESSAGES.totalDamage {
  const milestones = [0, 500, 1500, 3000, 5000, 10000, 20000, 30000, 40000, 50000, 60000, 70000, 80000, 100000, 150000, 250000, 500000, 1000000];
  
  // Find the highest milestone <= totalSpent
  for (let i = milestones.length - 1; i >= 0; i--) {
    if (totalSpent >= milestones[i]) {
      return String(milestones[i]) as keyof typeof WRAPPED_MESSAGES.totalDamage;
    }
  }
  
  return '0';
}

function getLateNightMilestone(count: number): keyof typeof WRAPPED_MESSAGES.lateNightOrders {
  const milestones = [0, 1, 5, 10, 15, 20, 25, 30];
  
  // Find the highest milestone <= count
  for (let i = milestones.length - 1; i >= 0; i--) {
    if (count >= milestones[i]) {
      return String(milestones[i]) as keyof typeof WRAPPED_MESSAGES.lateNightOrders;
    }
  }
  
  return '0';
}

function getLaziestDayMilestone(orderCount: number): keyof typeof WRAPPED_MESSAGES.laziestDay {
  const milestones = [2, 3, 4, 5, 6, 7, 8];
  
  // Find the highest milestone <= orderCount
  for (let i = milestones.length - 1; i >= 0; i--) {
    if (orderCount >= milestones[i]) {
      return String(milestones[i]) as keyof typeof WRAPPED_MESSAGES.laziestDay;
    }
  }
  
  return '2';
}

function getConsecutiveDaysMilestone(days: number): keyof typeof WRAPPED_MESSAGES.consecutiveDays {
  const milestones = [1, 3, 4, 7, 8, 14, 15, 30];
  
  // Find the highest milestone <= days
  for (let i = milestones.length - 1; i >= 0; i--) {
    if (days >= milestones[i]) {
      return String(milestones[i]) as keyof typeof WRAPPED_MESSAGES.consecutiveDays;
    }
  }
  
  return '1';
}

function getSingleItemMilestone(count: number): keyof typeof WRAPPED_MESSAGES.singleItemOrders {
  const milestones = [0, 5, 10, 15, 30];
  
  // Find the highest milestone <= count
  for (let i = milestones.length - 1; i >= 0; i--) {
    if (count >= milestones[i]) {
      return String(milestones[i]) as keyof typeof WRAPPED_MESSAGES.singleItemOrders;
    }
  }
  
  return '0';
}

function getMostExpensiveMilestone(amount: number): keyof typeof WRAPPED_MESSAGES.mostExpensiveOrder {
  const milestones = [0, 50, 100, 200, 1000];
  
  // Find the highest milestone <= amount
  for (let i = milestones.length - 1; i >= 0; i--) {
    if (amount >= milestones[i]) {
      return String(milestones[i]) as keyof typeof WRAPPED_MESSAGES.mostExpensiveOrder;
    }
  }
  
  return '0';
}

function getCoffeeSpendingMilestone(spent: number): keyof typeof WRAPPED_MESSAGES.coffeeSpending {
  const milestones = [0, 100, 200, 300, 500, 1000, 2000, 3000, 4000, 5000, 10000, 100000];
  
  // Find the highest milestone <= spent
  for (let i = milestones.length - 1; i >= 0; i--) {
    if (spent >= milestones[i]) {
      return String(milestones[i]) as keyof typeof WRAPPED_MESSAGES.coffeeSpending;
    }
  }
  
  return '0';
}

function getNightOwlMilestone(percentage: number): keyof typeof WRAPPED_MESSAGES.nightOwlPercentage {
  const milestones = [0, 20, 40, 60, 80];
  
  // Find the highest milestone <= percentage
  for (let i = milestones.length - 1; i >= 0; i--) {
    if (percentage >= milestones[i]) {
      return String(milestones[i]) as keyof typeof WRAPPED_MESSAGES.nightOwlPercentage;
    }
  }
  
  return '0';
}

function getMissedInvestmentMilestone(amount: number): keyof typeof WRAPPED_MESSAGES.missedInvestment {
  const milestones = [0, 1000, 3000, 7000, 15000, 20000, 30000, 40000, 50000, 60000, 75000, 80000, 100000, 150000];
  
  // Find the highest milestone <= amount
  for (let i = milestones.length - 1; i >= 0; i--) {
    if (amount >= milestones[i]) {
      return String(milestones[i]) as keyof typeof WRAPPED_MESSAGES.missedInvestment;
    }
  }
  
  return '0';
}

function getCostPerMealMilestone(difference: number): keyof typeof WRAPPED_MESSAGES.costPerMeal {
  const milestones = [0, 5, 8, 10, 12];
  
  // Find the highest milestone <= difference
  for (let i = milestones.length - 1; i >= 0; i--) {
    if (difference >= milestones[i]) {
      return String(milestones[i]) as keyof typeof WRAPPED_MESSAGES.costPerMeal;
    }
  }
  
  return '0';
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

function getSpentThisYearMilestone(totalSpent: number): keyof typeof WRAPPED_MESSAGES.spentThisYear {
  const milestones = [0, 100, 500, 1000, 2000, 3000, 4000, 5000, 10000, 20000];
  
  // Find the highest milestone <= totalSpent
  for (let i = milestones.length - 1; i >= 0; i--) {
    if (totalSpent >= milestones[i]) {
      return String(milestones[i]) as keyof typeof WRAPPED_MESSAGES.spentThisYear;
    }
  }
  
  return '0';
}

function getDeliveryWaitsMilestone(totalMinutes: number): keyof typeof WRAPPED_MESSAGES.deliveryWaits {
  const milestones = [0, 720, 2160, 4320, 10080, 20160, 30240, 51840, 60480, 77760, 129600, 216000, 259200, 388800];
  
  // Find the highest milestone <= totalMinutes
  for (let i = milestones.length - 1; i >= 0; i--) {
    if (totalMinutes >= milestones[i]) {
      return String(milestones[i]) as keyof typeof WRAPPED_MESSAGES.deliveryWaits;
    }
  }
  
  return '0';
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
  
  // Handle x placeholder (for waiting time)
  // Replace "x hours" with actual hours (only if hours > 0)
  // Do this first so we don't replace "x" that's part of "x hours"
  if (replacements.hours !== undefined && typeof replacements.hours === 'number' && replacements.hours > 0) {
    const hoursText = replacements.hours === 1 ? 'hour' : 'hours';
    result = result.replace(/\bx hours\b/gi, `${replacements.hours} ${hoursText}`);
  }
  // Replace "x days" with actual days (only if days > 0)
  // Do this second so we don't replace "x" that's part of "x days"
  if (replacements.days !== undefined && typeof replacements.days === 'number' && replacements.days > 0) {
    const daysText = replacements.days === 1 ? 'day' : 'days';
    result = result.replace(/\bx days\b/gi, `${replacements.days} ${daysText}`);
  }
  // Replace standalone "x" with the formatted time string
  // This handles any remaining "x" that wasn't part of "x hours" or "x days"
  if (replacements.x !== undefined) {
    // Replace standalone "x" (word boundary on both sides ensures it's not part of another word)
    result = result.replace(/\bx\b/gi, String(replacements.x));
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
      const damageMilestone = getTotalDamageMilestone(analytics.totalSpent);
      const damageMessages = WRAPPED_MESSAGES.totalDamage[damageMilestone];
      selectedMessage = damageMessages[rng.nextInt(0, damageMessages.length)];
      break;

    case 'lateNightOrders':
      if (typeof value === 'number') {
        const lateNightMilestone = getLateNightMilestone(value);
        const lateNightMessages = WRAPPED_MESSAGES.lateNightOrders[lateNightMilestone];
        selectedMessage = lateNightMessages[rng.nextInt(0, lateNightMessages.length)];
      }
      break;

    case 'laziestDay':
      if (typeof value === 'number') {
        const laziestMilestone = getLaziestDayMilestone(value);
        const laziestMessages = WRAPPED_MESSAGES.laziestDay[laziestMilestone];
        selectedMessage = laziestMessages[rng.nextInt(0, laziestMessages.length)];
      }
      break;

    case 'consecutiveDays':
      if (typeof value === 'number') {
        const streakMilestone = getConsecutiveDaysMilestone(value);
        const streakMessages = WRAPPED_MESSAGES.consecutiveDays[streakMilestone];
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
        const singleItemMilestone = getSingleItemMilestone(value);
        const singleItemMessages = WRAPPED_MESSAGES.singleItemOrders[singleItemMilestone];
        selectedMessage = singleItemMessages[rng.nextInt(0, singleItemMessages.length)];
      }
      break;

    case 'mostExpensiveOrder':
      if (typeof value === 'number') {
        const expensiveMilestone = getMostExpensiveMilestone(value);
        const expensiveMessages = WRAPPED_MESSAGES.mostExpensiveOrder[expensiveMilestone];
        selectedMessage = expensiveMessages[rng.nextInt(0, expensiveMessages.length)];
      }
      break;

    case 'coffeeSpending':
      if (typeof value === 'number') {
        const coffeeMilestone = getCoffeeSpendingMilestone(value);
        const coffeeMessages = WRAPPED_MESSAGES.coffeeSpending[coffeeMilestone];
        selectedMessage = coffeeMessages[rng.nextInt(0, coffeeMessages.length)];
      }
      break;

    case 'nightOwlPercentage':
      if (typeof value === 'number') {
        const nightOwlMilestone = getNightOwlMilestone(value);
        const nightOwlMessages = WRAPPED_MESSAGES.nightOwlPercentage[nightOwlMilestone];
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
        const investmentMilestone = getMissedInvestmentMilestone(value);
        const investmentMessages = WRAPPED_MESSAGES.missedInvestment[investmentMilestone];
        selectedMessage = investmentMessages[rng.nextInt(0, investmentMessages.length)];
        
        // Add missed gains to replacements (value is already missedGains)
        replacementsObj.X = value;
      }
      break;

    case 'costPerMeal':
      if (typeof value === 'number') {
        const mealMilestone = getCostPerMealMilestone(value);
        const mealMessages = WRAPPED_MESSAGES.costPerMeal[mealMilestone];
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

    case 'spentThisYear':
      if (typeof value === 'number') {
        const spentThisYearMilestone = getSpentThisYearMilestone(value);
        const spentThisYearMessages = WRAPPED_MESSAGES.spentThisYear[spentThisYearMilestone];
        selectedMessage = spentThisYearMessages[rng.nextInt(0, spentThisYearMessages.length)];
      }
      break;

    case 'deliveryWaits':
      if (typeof value === 'number') {
        // value is totalMinutes
        const waitsMilestone = getDeliveryWaitsMilestone(value);
        const waitsMessages = WRAPPED_MESSAGES.deliveryWaits[waitsMilestone];
        selectedMessage = waitsMessages[rng.nextInt(0, waitsMessages.length)];
        
        // Format the time for replacement
        // Determine best format: days if >= 1 day, hours if >= 1 hour, else minutes
        const totalHours = value / 60;
        const totalDays = totalHours / 24;
        const roundedHours = Math.round(totalHours);
        const roundedDays = Math.round(totalDays);
        
        let formattedTime: string;
        if (totalDays >= 1) {
          formattedTime = `${roundedDays} ${roundedDays === 1 ? 'day' : 'days'}`;
        } else if (totalHours >= 1) {
          formattedTime = `${roundedHours} ${roundedHours === 1 ? 'hour' : 'hours'}`;
        } else {
          formattedTime = `${value} ${value === 1 ? 'minute' : 'minutes'}`;
        }
        
        // Also add hours and days separately for messages that need them
        replacementsObj.x = formattedTime;
        replacementsObj.hours = roundedHours;
        replacementsObj.days = roundedDays;
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

