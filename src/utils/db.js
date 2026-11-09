/** Lấy data từ kết quả supabase-js, ném lỗi có status nếu thất bại. */
function unwrap({ data, error }) {
  if (error) {
    const e = new Error(error.message);
    e.code = error.code;
    if (error.code === 'P0001') e.status = 400; // raise exception trong RPC/trigger
    else if (error.code === '42501') e.status = 403; // thiếu quyền / RLS
    else if (error.code === 'PGRST116') e.status = 404;
    throw e;
  }
  return data;
}

/** Chỉ giữ các field được phép. */
function pick(obj = {}, fields) {
  return Object.fromEntries(fields.filter((f) => obj[f] !== undefined).map((f) => [f, obj[f]]));
}

function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

module.exports = { unwrap, pick, httpError };
