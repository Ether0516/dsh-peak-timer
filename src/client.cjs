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
