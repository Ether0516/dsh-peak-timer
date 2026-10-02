window.__ModuleLoader__.load({id:"dsh-peak-timer",factory:(require)=>{const module={exports:{}};const exports=module.exports;
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


const TIMER_CSS=".dsh-peak-anchor{display:inline-flex;flex:none;align-items:center}\n.dsh-peak-anchor[hidden]{display:none}\n.dsh-peak-badge{display:inline-flex;align-items:center;gap:6px;white-space:nowrap;flex:none;font-family:var(--dsw-font-family,\"Microsoft YaHei\",sans-serif);font-size:13px;line-height:28px;font-weight:400;color:#1f7a42;cursor:help}\n.dsh-peak-badge[data-peak=\"true\"]{color:#c73042}\nbody[data-ds-dark-theme] .dsh-peak-badge{color:#69db96}\nbody[data-ds-dark-theme] .dsh-peak-badge[data-peak=\"true\"]{color:#ff8293}\n.dsh-peak-dot{width:5px;height:5px;background:currentColor;border-radius:50%;flex:none}\n.dsh-peak-count{font-variant-numeric:tabular-nums;font-family:inherit}\n.dsh-peak-estimate{font-size:10px;opacity:.8}\n.dsh-peak-footer{display:flex;justify-content:flex-end;margin:0 auto;padding:2px 24px 4px;box-sizing:border-box;width:100%;max-width:var(--dsh-composer-card-max-width,900px)}\n.dsh-peak-footer:empty{display:none}\n";
const React = require('react');
const {createPortal} = require('react-dom');
const h = React.createElement;
const ENTRY_ID = 'dsh-peak-timer';
function PeakTimer({form}) {
  const source = React.useMemo(() => ({subscribe: listener => form.subscribe(listener), getSnapshot: () => form.getSnapshot()}), [form]);
  const config = React.useSyncExternalStore(source.subscribe, source.getSnapshot, source.getSnapshot).value || {};
  const [now, setNow] = React.useState(Date.now);
  const [bottom, setBottom] = React.useState(false);
  const [mount, setMount] = React.useState(null);
  const anchor = React.useRef(null);
  React.useEffect(() => {
    let timer;
    const tick = () => {
      clearTimeout(timer);
      setNow(Date.now());
      if (!document.hidden) timer = setTimeout(tick, 1000 - Date.now()%1000 + 5);
    };
    tick();
    document.addEventListener('visibilitychange', tick);
    window.addEventListener('focus', tick);
    return () => {clearTimeout(timer); document.removeEventListener('visibilitychange',tick); window.removeEventListener('focus',tick);};
  }, []);
  React.useLayoutEffect(() => {
    const node = anchor.current;
    const card = node?.closest('[data-composer-card]');
    if (!card?.parentElement) return;
    const footer = document.createElement('div');
    footer.className = 'dsh-peak-footer';
    card.parentElement.appendChild(footer);
    setMount(footer);
    const measure = () => {
      // Current public slot has no responsive position API; observe only its
      // composer card and keep the footer inside the same input assembly.
      setBottom(config.placement === 'bottom' || card.clientWidth < 650);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(card);
    measure();
    return () => {observer.disconnect(); footer.remove();};
  }, [config.placement]);
  const state = scheduleAt(now, config);
  const remaining = countdown(state.next, now);
  const label = state.peak ? '高峰' : '空闲';
  const detail = [
    label + '时段' + (state.estimated ? '（预计）' : ''),
    (state.peak ? '转为空闲：' : '转为高峰：') + transitionLabel(state.next)
  ].join('\n');
  const badge = h('span', {
    className:'dsh-peak-badge', 'data-peak':String(state.peak), title:detail,
    role:'timer', 'aria-live':'off', 'aria-label': label+'时段，'+(state.peak?'距空闲':'距高峰')+' '+remaining+(state.estimated?'，预计值':'')
  }, h('span',{className:'dsh-peak-dot','aria-hidden':true}),
    h('span',{className:'dsh-peak-count'},remaining),
    state.estimated ? h('span',{className:'dsh-peak-estimate'},'预计') : null);
  return h(React.Fragment,null,
    h('span',{ref:anchor,className:'dsh-peak-anchor',hidden:bottom}, bottom ? null : badge),
    bottom && mount ? createPortal(badge,mount) : null);
}
const inject = ['slots','configForms'];
function apply(ctx) {
  ctx.effect(() => {
    const style = document.createElement('style'); style.dataset.plugin = ENTRY_ID;
    style.textContent = TIMER_CSS; document.head.appendChild(style);
    return () => style.remove();
  });
  const form = ctx.configForms.get(ENTRY_ID);
  ctx.slots.inject('conversation.input.right', () => ctx.slots.register({
    name:'conversation.input.right', id:ENTRY_ID, order:100, inject:()=>({form})
  }, PeakTimer));
}
module.exports = {apply,inject,PeakTimer};

return module.exports;}});
