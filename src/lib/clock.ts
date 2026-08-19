export interface Clock {
  now(): Date;
}

export const systemClock: Clock = {
  now: () => new Date(),
};

export function createFixedClock(iso: string): Clock {
  const frozen = new Date(iso);
  return {
    now: () => new Date(frozen.getTime()),
  };
}

export function toIso(date: Date): string {
  return date.toISOString();
}
