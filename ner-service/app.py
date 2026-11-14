"""Dịch vụ NER tiếng Việt cho thanh tìm kiếm CaRảnh.

POST /ner  {"text": "cần người giỏi tiếng Anh ca tối ở Hải Châu"}
  -> {"keyword": "...", "entities": [{"text": "tiếng Anh", "label": "SKILL"}, ...]}

Chạy:  uvicorn app:app --port 8000   (từ trong thư mục ner-service/)
Cần: model/best_model.pt và vncorenlp/VnCoreNLP-1.1.1.jar (+ vncorenlp/models/) — xem README.md.
"""
import os
import re
import threading

BASE = os.path.dirname(os.path.abspath(__file__))
os.chdir(BASE)  # ViTagger tìm "vncorenlp/VnCoreNLP-1.1.1.jar" theo đường dẫn tương đối

from fastapi import FastAPI, HTTPException  # noqa: E402
from pydantic import BaseModel, Field  # noqa: E402

MODEL_PATH = os.environ.get("NER_MODEL_PATH", os.path.join("model", "best_model.pt"))
NO_CUDA = os.environ.get("NER_NO_CUDA", "1") != "0"
API_KEY = os.environ.get("NER_API_KEY", "")  # nếu đặt, Express phải gửi header x-api-key

# Từ thừa trong câu tìm kiếm: bỏ khỏi từ khóa. Chỉ gồm từ không mang nghĩa tìm kiếm.
STOPWORDS = {
    "cần", "can", "tìm", "tim", "kiếm", "kiem", "muốn", "muon", "cho", "tôi", "toi", "mình", "minh", "em", "anh", "chị",
    "giúp", "giup", "với", "voi", "và", "va", "là", "la", "ở", "o", "tại", "tai", "làm", "lam", "việc", "viec",
    "công", "cong", "có", "co", "không", "khong", "nào", "nao", "đang", "dang", "một", "mot", "các", "cac", "những",
    "nhung", "ạ", "nhé", "nhe", "nha", "đi", "di", "được", "duoc", "bạn", "ban", "người", "nguoi", "vào", "vao",
    "khu", "vực", "vuc", "gần", "gan", "quanh", "quận", "quan", "huyện", "huyen",
}
PUNCT = re.compile(r"^[\W_]+$", re.UNICODE)

app = FastAPI(title="CaRảnh NER")
_tagger = None
_lock = threading.Lock()  # VnCoreNLP chạy trên JVM, không gọi song song
_error = None


def _load():
    global _tagger, _error
    if not os.path.isfile(MODEL_PATH):
        _error = f"Chưa có checkpoint: {MODEL_PATH}"
        return
    if not os.path.isfile(os.path.join("vncorenlp", "VnCoreNLP-1.1.1.jar")):
        _error = "Thiếu vncorenlp/VnCoreNLP-1.1.1.jar"
        return
    try:
        from vphoberttagger.predictor import ViTagger
        _tagger = ViTagger(MODEL_PATH, no_cuda=NO_CUDA)
    except Exception as e:  # giữ dịch vụ sống để /health báo lỗi rõ ràng
        _error = f"Nạp model lỗi: {e}"


@app.on_event("startup")
def startup():
    _load()


class Body(BaseModel):
    text: str = Field(min_length=1, max_length=300)


@app.get("/health")
def health():
    return {"ok": _tagger is not None, "error": _error}


@app.post("/ner")
def ner(body: Body):
    if _tagger is None:
        raise HTTPException(503, _error or "Model chưa sẵn sàng")
    with _lock:
        tokens = _tagger.extract_entity_doc(body.text.strip())
    entities, rest = [], []
    for text, label in tokens:
        if label == "O":
            rest.append(text)
        elif label == "JOB":  # tên việc là phần của từ khóa, không phải bộ lọc
            rest.append(text)
        else:
            entities.append({"text": text, "label": label})
    keyword = " ".join(w for w in rest if w.lower() not in STOPWORDS and not PUNCT.match(w))
    return {"keyword": keyword.strip(), "entities": entities}


@app.middleware("http")
async def check_key(request, call_next):
    if API_KEY and request.url.path == "/ner" and request.headers.get("x-api-key") != API_KEY:
        from fastapi.responses import JSONResponse
        return JSONResponse({"detail": "Sai API key"}, status_code=401)
    return await call_next(request)
