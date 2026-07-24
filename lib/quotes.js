export const QUOTES = [
  "Focus on the goal, not the obstacle.",
  "Small focus, big results.",
  "Your focus determines your reality.",
  "Discipline fuels sharp focus.",
  "Stay focused, stay unstoppable.",
  "Focus fuels your success.",
  "Distraction kills your dreams.",
  "Eyes forward, mind sharp.",
  "Laser focus wins battles.",
  "Eliminate distractions, maximize productivity.",
  "Focus on the positive, success follows.",
  "Your focus is your superpower.",
  "Focus on your goals, conquer your fears.",
  "Stay focused, stay determined.",
  "Focus now, future follows.",
  "One goal, one mission.",
  "Deep focus, great results.",
  "Small distractions, big losses.",
  "Consistency builds sharp focus.",
  "Focus, execute, achieve greatness.",
  "Distraction delays your success.",
  "Prioritize focus over everything.",
  "Zero excuses, total focus.",
  "Focus sharpens your vision.",
  "Success follows extreme focus.",
  "Cut noise, amplify results.",
];

export function randomQuote() {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)];
}
