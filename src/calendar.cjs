// Announced national holiday periods, including the weekday days off.
// Weekend makeup workdays deliberately remain off-peak under DeepSeek's rule.
// https://www.gov.cn/zhengce/zhengceku/202511/content_7047091.htm
const HOLIDAY_PERIODS = [
  ['2026-01-01', '2026-01-03', '元旦'],
  ['2026-02-15', '2026-02-23', '春节'],
  ['2026-04-04', '2026-04-06', '清明节'],
  ['2026-05-01', '2026-05-05', '劳动节'],
  ['2026-06-19', '2026-06-21', '端午节'],
  ['2026-09-25', '2026-09-27', '中秋节'],
  ['2026-10-01', '2026-10-07', '国庆节']
];
const VERIFIED_YEARS = [2026];
const OFFSET = 8 * 3600000;
const DAY = 86400000;
const WINDOWS = [[9, 12], [14, 18]];
function dateKey(ms) { return new Date(ms + OFFSET).toISOString().slice(0, 10); }
function validDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value + 'T00:00:00Z')) && new Date(value + 'T00:00:00Z').toISOString().slice(0,10) === value;
}
function holidayName(key, options = {}) {
  if ((options.additionalHolidays || []).some(date => validDate(date) && date === key)) return '自定义节假日';
  return HOLIDAY_PERIODS.find(([start, end]) => key >= start && key <= end)?.[2] || '';
}
function knownYear(year, options) {
  return VERIFIED_YEARS.includes(year) || (options.additionalCalendarYears || []).map(Number).includes(year);
}
function dayInfo(dayStart, options) {
  const shifted = new Date(dayStart + OFFSET);
  const key = dateKey(dayStart);
  const weekday = shifted.getUTCDay();
  const holiday = holidayName(key, options);
  return { key, holiday, weekend: weekday === 0 || weekday === 6, known: knownYear(shifted.getUTCFullYear(), options) };
}
function scheduleAt(now = Date.now(), options = {}) {
  if (!Number.isFinite(now)) throw new TypeError('Invalid timestamp');
  const dayStart = Math.floor((now + OFFSET) / DAY) * DAY - OFFSET;
  const info = dayInfo(dayStart, options);
  const peak = !info.weekend && !info.holiday && WINDOWS.some(([start,end]) => now >= dayStart + start*3600000 && now < dayStart + end*3600000);
  if (peak) {
    const end = WINDOWS.find(([start,end]) => now >= dayStart+start*3600000 && now < dayStart+end*3600000)[1];
    return {peak, next: dayStart + end*3600000, estimated: !info.known, ...info};
  }
  let estimated = !info.known;
  // Bounded even if the user supplies a long custom shutdown calendar.
  for (let offset = 0; offset <= 370; offset++) {
    const start = dayStart + offset * DAY;
    const candidate = dayInfo(start, options);
    estimated ||= !candidate.known;
    if (candidate.weekend || candidate.holiday) continue;
    for (const [hour] of WINDOWS) {
      const next = start + hour * 3600000;
      if (next > now) return {peak, next, estimated, ...info};
    }
  }
  return {peak, next: null, estimated: true, ...info};
}
function countdown(next, now) {
  if (next === null) return '待更新';
  const seconds = Math.max(0, Math.ceil((next-now)/1000));
  const hh = Math.floor(seconds/3600), mm = Math.floor(seconds%3600/60), ss = seconds%60;
  return [hh,mm,ss].map(n => String(n).padStart(2,'0')).join(':');
}
function transitionLabel(ms) {
  if (ms === null) return '未找到下一次切换';
  const date = new Date(ms + OFFSET);
  return date.toISOString().slice(0,10)+' '+['日','一','二','三','四','五','六'][date.getUTCDay()]+' '+date.toISOString().slice(11,16)+'（北京时间）';
}
module.exports = {HOLIDAY_PERIODS, VERIFIED_YEARS, scheduleAt, countdown, transitionLabel, validDate};
