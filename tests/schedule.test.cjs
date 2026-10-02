const {test} = require('node:test');
const assert = require('node:assert/strict');
const {scheduleAt,countdown,validDate} = require('../src/calendar.cjs');
const at = value => Date.parse(value+'+08:00');
test('half-open peak boundaries, midday break and evening', () => {
  for (const [time,peak,next] of [
    ['08:59:59',false,'09:00:00'],['09:00:00',true,'12:00:00'],
    ['11:59:59',true,'12:00:00'],['12:00:00',false,'14:00:00'],
    ['13:59:59',false,'14:00:00'],['14:00:00',true,'18:00:00'],
    ['17:59:59',true,'18:00:00']]) {
    const s=scheduleAt(at('2026-10-08T'+time));
    assert.equal(s.peak,peak); assert.equal(s.next,at('2026-10-08T'+next));
  }
  assert.equal(scheduleAt(at('2026-10-09T18:00:00')).next,at('2026-10-12T09:00:00'));
});
test('weekends include makeup workdays; long holidays skip to next real peak', () => {
  for (const day of ['2026-01-04','2026-02-14','2026-02-28','2026-05-09','2026-09-20','2026-10-10'])
    assert.equal(scheduleAt(at(day+'T10:00:00')).peak,false,day);
  for (let d=1;d<=7;d++) {
    const s=scheduleAt(at('2026-10-0'+d+'T10:00:00'));
    assert.equal(s.peak,false);assert.equal(s.next,at('2026-10-08T09:00:00'));assert.equal(s.estimated,false);
  }
  assert.equal(scheduleAt(at('2026-09-25T10:00:00')).next,at('2026-09-28T09:00:00'));
  assert.equal(scheduleAt(at('2026-02-16T10:00:00')).next,at('2026-02-24T09:00:00'));
});
test('UTC input is Beijing time, regardless of host timezone', () => {
  assert.equal(scheduleAt(Date.parse('2026-10-08T01:00:00Z')).peak,true);
  assert.equal(scheduleAt(Date.parse('2026-10-07T23:59:59Z')).peak,false);
});
test('unknown calendar years are disclosed, including transitions across years', () => {
  assert.equal(scheduleAt(at('2027-02-01T10:00:00')).estimated,true);
  assert.equal(scheduleAt(at('2026-12-31T18:00:00')).estimated,true);
  const options={additionalCalendarYears:['2027'],additionalHolidays:['2027-01-01']};
  const s=scheduleAt(at('2026-12-31T18:00:00'),options);
  assert.equal(s.next,at('2027-01-04T09:00:00'));assert.equal(s.estimated,false);
});
test('formatting covers multi-day holidays, last second and suspended clock jumps', () => {
  assert.equal(countdown(at('2026-10-08T09:00:00'),at('2026-10-02T10:00:00')),'143:00:00');
  assert.equal(countdown(86400000,0),'24:00:00');
  assert.equal(countdown((5*24+18)*3600000+9*60000+7000,0),'138:09:07');
  assert.equal(countdown(1001,1000),'00:00:01');assert.equal(countdown(0,1000),'00:00:00');
  assert.equal(countdown(null,0),'待更新');
  assert.equal(scheduleAt(at('2026-10-08T12:00:10')).peak,false);
  assert.equal(validDate('2026-02-30'),false);
});
