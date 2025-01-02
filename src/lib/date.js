import dayjs from 'dayjs';

export function reformatDate(dateStr, toFormat, fromFormat = 'YYYY-MM-DD') {
  if (dateStr === 'Present') return 'Present';
  return dayjs(dateStr).format(toFormat)
}
