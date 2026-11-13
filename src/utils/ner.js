// Phân tích câu tìm kiếm: gọi dịch vụ NER (ner-service/) nếu có, lỗi thì dùng bộ dự phòng.
// Trả về { keyword, entities: [{ text, label }], source: 'model' | 'fallback' }.

const TIMEOUT_MS = 4000;

const strip = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

const STOP = new Set(['can', 'tim', 'kiem', 'muon', 'cho', 'toi', 'minh', 'em', 'giup', 'voi', 'va', 'la', 'o', 'tai', 'lam',
  'viec', 'co', 'khong', 'nao', 'dang', 'mot', 'cac', 'nhung', 'a', 'nhe', 'nha', 'di', 'duoc', 'ban', 'nguoi', 'vao',
  'khu', 'vuc', 'gan', 'quanh', 'huyen']);

// Bộ dự phòng: chỉ nhận quận Đà Nẵng và vài mốc thời gian phổ biến.
const LOC = ['hai chau', 'thanh khe', 'son tra', 'ngu hanh son', 'lien chieu', 'cam le', 'hoa vang', 'da nang'];
const TIME = ['ca sang', 'ca chieu', 'ca toi', 'ca dem', 'cuoi tuan', 'buoi sang', 'buoi chieu', 'buoi toi'];

function fallback(text) {
  let rest = ' ' + strip(text).replace(/[^\p{L}\p{N}\s]/gu, ' ') + ' ';
  const orig = ' ' + String(text).replace(/\s+/g, ' ').trim() + ' ';
  const entities = [];
  const take = (list, label) => {
    for (const k of list) {
      if (rest.includes(' ' + k + ' ')) {
        rest = rest.replace(' ' + k + ' ', '  ');
        entities.push({ text: k, label });
      }
    }
  };
  take(LOC, 'LOC');
  take(TIME, 'TIME');
  // Giữ chữ có dấu cho nhãn: lấy lại đoạn gốc tương ứng
  const plainOrig = strip(orig);
  for (const e of entities) {
    const i = plainOrig.indexOf(e.text);
    if (i >= 0) e.text = orig.substr(i, e.text.length).trim();
  }
  const keyword = rest.split(/\s+/).filter((w) => w && !STOP.has(w)).join(' ');
  // keyword ở dạng không dấu sẽ làm tìm kiếm có dấu kém đi → dựng lại từ câu gốc
  const entPlain = new Set(entities.map((e) => strip(e.text)));
  const words = String(text).split(/\s+/).filter(Boolean);
  const kept = [];
  for (let i = 0; i < words.length; i++) {
    const w1 = strip(words[i]).replace(/[^\p{L}\p{N}]/gu, '');
    const w2 = i + 1 < words.length ? w1 + ' ' + strip(words[i + 1]).replace(/[^\p{L}\p{N}]/gu, '') : '';
    const w3 = i + 2 < words.length ? w2 + ' ' + strip(words[i + 2]).replace(/[^\p{L}\p{N}]/gu, '') : '';
    const hit = [w3, w2].find((g) => g && entPlain.has(g));
    if (hit) { i += hit.split(' ').length - 1; continue; }
    if (entPlain.has(w1)) continue;
    if (!w1 || STOP.has(w1)) continue;
    kept.push(words[i]);
  }
  return { keyword: kept.join(' ') || keyword, entities, source: 'fallback' };
}

async function analyze(text) {
  const q = String(text || '').trim().slice(0, 300);
  if (!q) return { keyword: '', entities: [], source: 'fallback' };
  const url = process.env.NER_SERVICE_URL;
  if (url) {
    try {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
      const headers = { 'content-type': 'application/json' };
      if (process.env.NER_API_KEY) headers['x-api-key'] = process.env.NER_API_KEY;
      const r = await fetch(url.replace(/\/$/, '') + '/ner', { method: 'POST', headers, body: JSON.stringify({ text: q }), signal: ctl.signal });
      clearTimeout(timer);
      if (r.ok) {
        const d = await r.json();
        return { keyword: d.keyword || '', entities: Array.isArray(d.entities) ? d.entities : [], source: 'model' };
      }
    } catch (e) { /* rơi xuống bộ dự phòng */ }
  }
  return fallback(q);
}

module.exports = { analyze, strip };
