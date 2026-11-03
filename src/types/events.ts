export const EVENTS = [
  ['100m', '100 m'],
  ['200m', '200 m'],
  ['400m', '400 m'],
  ['400mh', '400 m vallas'],
] as const
export const eventLabel = (v?: string) => EVENTS.find(([k]) => k === v)?.[1] ?? v ?? ''
