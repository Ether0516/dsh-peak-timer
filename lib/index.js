import z from '@deepseek-ai/schemastery';
export const name = 'dsh-peak-timer';
export const Config = z.object({
  placement: z.union(['auto', 'bottom']).default('auto').volatile(),
  additionalHolidays: z.array(z.string().pattern(/^\d{4}-\d{2}-\d{2}$/)).default([]).volatile(),
  additionalCalendarYears: z.array(z.string().pattern(/^\d{4}$/)).default([]).volatile()
});
export function apply() {}
