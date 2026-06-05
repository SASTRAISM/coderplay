import { getLocalDateKey } from '@/lib/date'

const THOUGHTS = [
  { text: 'Small progress every day turns confusion into confidence.', author: 'CoderPlay AI' },
  { text: 'A beginner who keeps showing up will always outgrow fear.', author: 'CoderPlay AI' },
  { text: 'You do not need to know everything today. You only need to keep learning today.', author: 'CoderPlay AI' },
  { text: 'Every bug you solve teaches you how to think more clearly.', author: 'CoderPlay AI' },
  { text: 'Consistency beats intensity when you are building real skill.', author: 'CoderPlay AI' },
  { text: 'Strong coders are made one patient practice session at a time.', author: 'CoderPlay AI' },
  { text: 'The moment you ask why, real learning begins.', author: 'CoderPlay AI' },
  { text: 'Progress feels slow until one day the hard things feel natural.', author: 'CoderPlay AI' },
  { text: 'Keep writing, keep testing, keep improving. That is how confidence is built.', author: 'CoderPlay AI' },
  { text: 'One honest attempt teaches more than ten passive readings.', author: 'CoderPlay AI' },
  { text: 'Great programmers were once beginners who refused to quit.', author: 'CoderPlay AI' },
  { text: 'When a concept feels hard, stay with it a little longer. That is where growth lives.', author: 'CoderPlay AI' },
]

function hashDateKey(value: string): number {
  return value.split('').reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 1), 0)
}

export function getDailyThought(date = new Date()) {
  const key = getLocalDateKey(date)
  return THOUGHTS[hashDateKey(key) % THOUGHTS.length]
}
