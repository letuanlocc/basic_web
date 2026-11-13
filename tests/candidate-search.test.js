
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Seeker = require('../src/models/SeekerProfile');

function person(id, name, extra = {}) {
  return { user_id: String(id), user: { full_name: name }, area: 'Hải Châu', work_mode: 'offline',
    language_level: 2, has_experience: true, experience: 'Pha chế cà phê', strengths: 'Giao tiếp',
    availability: [{ slot: 'evening' }], ...extra };
}
function database(rows) {
  const ranges = [];
  return { ranges, from(table) {
    assert.equal(table, 'seeker_profiles');
    let predicates = [], start = 0, end = rows.length;
    const q = {
      select() { return q; },
      in(k, v) { predicates.push(r => v.includes(r[k])); return q; },
      eq(k, v) { predicates.push(r => r[k] === v); return q; },
      gte(k, v) { predicates.push(r => r[k] >= v); return q; },
      ilike(k, v) { predicates.push(r => r[k].includes(v.slice(1, -1))); return q; },
      order() { return q; },
      range(a, b) { ranges.push([a, b]); start = a; end = b; return q; },
      then(resolve, reject) { return Promise.resolve({ data: rows.filter(r => predicates.every(p => p(r))).slice(start, end + 1), error: null }).then(resolve, reject); },
    };
    return q;
  } };
}

test('matches Vietnamese names without accents, casing and extra spaces', async () => {
  const model = new Seeker(database([person(1, 'Đặng Minh An'), person(2, 'Trần Gia Linh')]));
  assert.deepEqual((await model.search({ q: '  DANG   minh an  ' })).map(r => r.user_id), ['1']);
  assert.equal((await model.search({ q: 'ĐẶNG MINH AN' })).length, 1);
});
test('matches profile text, area and availability together with filters', async () => {
  const model = new Seeker(database([person(1, 'An'), person(2, 'Bình', { work_mode: 'online', has_experience: false })]));
  assert.deepEqual((await model.search({ q: 'pha che hai chau ranh toi', work_mode: 'offline', has_experience: 'true', slots: 'evening', min_lang: '2' })).map(r => r.user_id), ['1']);
  assert.equal((await model.search({ q: 'An', slots: 'morning' })).length, 0);
});
test('finds candidates beyond first page and applies result limit after matching', async () => {
  const db = database([...Array.from({ length: 215 }, (_, i) => person(i, 'Không trùng')), person('target', 'Nguyễn Tuyết')]);
  assert.deepEqual((await new Seeker(db).search({ q: 'tuyet', limit: 1 })).map(r => r.user_id), ['target']);
  assert.deepEqual(db.ranges, [[0, 199], [200, 399]]);
});
test('availability filters are applied before limiting results', async () => {
  const db = database([person(1, 'An', { availability: [] }), person(2, 'Bình')]);
  assert.deepEqual((await new Seeker(db).search({ slots: 'evening', limit: 1 })).map(r => r.user_id), ['2']);
});
test('empty query lists candidates; unmatched and special text return no matches', async () => {
  const model = new Seeker(database([person(1, 'An')]));
  assert.equal((await model.search({ q: '   ' })).length, 1);
  assert.equal((await model.search({ q: '<script>%,()' })).length, 0);
  assert.equal((await model.search({ q: 'khong-tim-thay' })).length, 0);
});
test('invalid or oversized query fails before database access', async () => {
  const model = new Seeker({ from() { assert.fail('must not query'); } });
  for (const q of [[], {}, 'a'.repeat(201)]) await assert.rejects(model.search({ q }), e => e.status === 400);
});

function controller() {
  const elements = {};
  function el(value = '') { return { value, innerHTML: '', textContent: '', attrs: {}, listeners: {},
    setAttribute(k,v) { this.attrs[k] = v; }, addEventListener(k,f) { this.listeners[k] = f; } }; }
  for (const id of ['q','clist','ccount','fexp','farea','flang','fsort','freset']) elements[id] = el();
  elements.flang.value = ''; elements.fsort.value = 'updated';
  const form = el(); elements.q.closest = () => form;
  const requests = [], timers = new Map(); let next = 0;
  const context = {
    window: { CR_AUTH: { call(method, url) { return new Promise((resolve,reject) => requests.push({method,url,resolve,reject})); } } },
    document: { readyState: 'complete', body: { getAttribute() { return 'candidates'; } },
      getElementById(id) { return elements[id]; }, querySelectorAll() { return []; } },
    location: { search: '' }, URLSearchParams,
    setTimeout(f) { const id=++next; timers.set(id,f); return id; }, clearTimeout(id) { timers.delete(id); },
  };
  vm.runInNewContext(fs.readFileSync(require.resolve('../public/js/candidates.js'),'utf8'),context);
  return { elements, form, requests, timers, flush() { const callbacks=[...timers.values()];timers.clear();callbacks.forEach(f=>f()); } };
}
const tick = () => new Promise(resolve => setImmediate(resolve));
test('rapid typing debounces and late responses cannot overwrite latest result', async () => {
  const c = controller();
  c.elements.q.value = 'An'; c.elements.q.listeners.input();
  c.elements.q.value = 'Linh'; c.elements.q.listeners.input();
  c.flush();
  assert.equal(c.requests.length, 2);
  assert.equal(new URLSearchParams(c.requests[1].url.split('?')[1]).get('q'), 'Linh');
  c.requests[1].resolve([person(2,'Trần Gia Linh')]); await tick();
  c.requests[0].resolve([person(1,'Old result')]); await tick();
  assert.match(c.elements.clist.innerHTML, /Trần Gia Linh/);
  assert.doesNotMatch(c.elements.clist.innerHTML, /Old result/);
  assert.equal(c.elements.clist.attrs['aria-busy'], 'false');
});
test('submit searches immediately, reset clears keyword and filters', async () => {
  const c=controller(); let prevented=false;
  c.elements.q.value='Hải Châu'; c.elements.q.listeners.input();
  c.form.listeners.submit({preventDefault(){prevented=true;}});
  assert.equal(prevented,true); assert.equal(c.timers.size,0);
  assert.equal(new URLSearchParams(c.requests[1].url.split('?')[1]).get('q'),'Hải Châu');
  c.elements.farea.value='Hải Châu'; c.elements.freset.listeners.click(); c.flush();
  assert.equal(c.elements.q.value,''); assert.equal(c.elements.farea.value,'');
  assert.equal(new URLSearchParams(c.requests.at(-1).url.split('?')[1]).has('q'),false);
});
test('current errors and no-results are visible; stale errors are ignored', async () => {
  const c=controller(); c.elements.q.value='An'; c.form.listeners.submit({preventDefault(){}});
  c.requests[1].resolve([]); await tick();
  c.requests[0].reject(new Error('stale error')); await tick();
  assert.match(c.elements.clist.innerHTML,/Không có ứng viên phù hợp/);
  assert.doesNotMatch(c.elements.clist.innerHTML,/stale error/);
  c.form.listeners.submit({preventDefault(){}}); c.requests[2].reject(new Error('Network failed')); await tick();
  assert.match(c.elements.clist.innerHTML,/Network failed/); assert.equal(c.elements.clist.attrs['aria-busy'],'false');
});

test('typing invalidates a response even before debounce timer starts next request', async () => {
  const c=controller();
  c.elements.q.value='An'; c.elements.q.listeners.input();
  c.requests[0].resolve([person(1,'Stale initial candidate')]); await tick();
  assert.doesNotMatch(c.elements.clist.innerHTML,/Stale initial candidate/);
  c.flush(); c.requests[1].resolve([person(2,'An')]); await tick();
  assert.match(c.elements.clist.innerHTML,/>An</);
});

test('language filter distinguishes all levels, level zero, and minimum thresholds', async () => {
  const rows=[0,1,2,3,null].map((level,i)=>person(i,'Ứng viên '+i,{language_level:level}));
  const model=new Seeker(database(rows));
  assert.equal((await model.search()).length,5);
  assert.equal((await model.search({min_lang:'0'})).length,5); // giữ tương thích API cũ
  assert.deepEqual((await model.search({language_level:'0'})).map(r=>r.language_level),[0]);
  assert.deepEqual((await model.search({language_level:0})).map(r=>r.language_level),[0]);
  assert.deepEqual((await model.search({min_lang:'1'})).map(r=>r.language_level),[1,2,3]);
  assert.deepEqual((await model.search({min_lang:'2'})).map(r=>r.language_level),[2,3]);
  assert.deepEqual((await model.search({min_lang:'3'})).map(r=>r.language_level),[3]);
});
test('keyword search includes all four language labels without treating null as zero', async () => {
  const rows=[0,1,2,3,null].map((level,i)=>person(i,'Ứng viên '+i,{language_level:level}));
  const model=new Seeker(database(rows));
  for (const [q,level]of [['chua co ngoai ngu',0],['GIAO TIẾP CƠ BẢN',1],['ngoai ngu kha',2],['ngoai ngu tot',3]]) {
    assert.deepEqual((await model.search({q})).map(r=>r.language_level),[level]);
  }
});
test('invalid exact language levels are rejected before database access',async()=>{
  const model=new Seeker({from(){assert.fail('must not query');}});
  for(const language_level of [null,[],{},'4','-1','1.5','abc']) {
    await assert.rejects(model.search({language_level}),e=>e.status===400);
  }
});
test('HR zero-level option sends an exact filter and reset removes it',()=>{
  const c=controller();
  c.elements.flang.value='0';c.elements.flang.listeners.change();c.flush();
  let params=new URLSearchParams(c.requests.at(-1).url.split('?')[1]);
  assert.equal(params.get('language_level'),'0');assert.equal(params.has('min_lang'),false);
  c.elements.flang.value='2';c.elements.flang.listeners.change();c.flush();
  params=new URLSearchParams(c.requests.at(-1).url.split('?')[1]);
  assert.equal(params.get('min_lang'),'2');assert.equal(params.has('language_level'),false);
  c.elements.flang.value='0';c.elements.freset.listeners.click();c.flush();
  params=new URLSearchParams(c.requests.at(-1).url.split('?')[1]);
  assert.equal(c.elements.flang.value,'');assert.equal(params.has('language_level'),false);
});
