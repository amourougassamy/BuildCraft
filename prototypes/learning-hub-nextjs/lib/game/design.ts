export type Use = 'office' | 'classroom' | 'assembly'
export type Design = { width: number; depth: number; floors: number; story: number; grid: number; member: 'small' | 'medium' | 'large'; braces: string[]; foundation: 'small' | 'medium' | 'large'; soil: 'firm' | 'medium' | 'soft'; ac: number; insulation: 'basic' | 'better' | 'high'; use: Use; door: 'front' | 'left' | 'right' }
export const baseline: Design = { width: 60, depth: 40, floors: 2, story: 12, grid: 20, member: 'medium', braces: ['front', 'back'], foundation: 'medium', soil: 'medium', ac: 8, insulation: 'better', use: 'office', door: 'front' }
export const braceSides = ['front', 'back', 'left', 'right'] as const
export function validDesign(v: unknown): v is Design {
  if (!v || typeof v !== 'object') return false
  const d = v as Design
  const intRange = (n: unknown, a: number, b: number, step = 1) => typeof n === 'number' && Number.isFinite(n) && n >= a && n <= b && (n - a) % step === 0
  return intRange(d.width, 30, 100, 5) && intRange(d.depth, 30, 80, 5) && intRange(d.floors, 1, 4) && intRange(d.story, 10, 16, 2) && [10, 15, 20].includes(d.grid) && ['small','medium','large'].includes(d.member) && Array.isArray(d.braces) && d.braces.every(x => braceSides.includes(x as typeof braceSides[number])) && new Set(d.braces).size === d.braces.length && ['small','medium','large'].includes(d.foundation) && ['firm','medium','soft'].includes(d.soil) && intRange(d.ac, 0, 20) && ['basic','better','high'].includes(d.insulation) && ['office','classroom','assembly'].includes(d.use) && ['front','left','right'].includes(d.door)
}
