# ner-service – NER cho thanh tìm kiếm

Dịch vụ Python (FastAPI) bọc model PhoBERT NER. Express gọi `POST /ner`, nhận lại nhãn **SKILL / TIME / LOC** và **từ khóa đã lọc từ thừa**.

## Bạn cần bỏ vào đâu

| File | Đặt tại | Lấy từ |
|---|---|---|
| Checkpoint đã train (`best_model.pt`) | `ner-service/model/best_model.pt` | Colab sau khi train 5000 câu |
| `VnCoreNLP-1.1.1.jar` | `ner-service/vncorenlp/VnCoreNLP-1.1.1.jar` | `D:\training model\phobert_ner\vncorenlp\` |
| Thư mục `models/` của VnCoreNLP | `ner-service/vncorenlp/models/` | cùng thư mục trên |

Code `vphoberttagger/` đã được sao chép sẵn từ `VPhoBertTagger`. Nếu bạn sửa code model ở repo gốc thì chép lại vào đây.

Checkpoint phải được train với cùng bộ nhãn: `O, B/I-SKILL, B/I-JOB, B/I-TIME, B/I-LOC`.

## Chạy thử trên máy
```
cd ner-service
python -m venv .venv && .venv\Scripts\activate
pip install torch==2.7.1 --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt
uvicorn app:app --port 8000
```
Kiểm tra: `curl localhost:8000/health` → `{"ok":true}`; rồi
`curl -X POST localhost:8000/ner -H "content-type: application/json" -d "{\"text\":\"cần người giỏi tiếng Anh ca tối ở Hải Châu\"}"`.

Trong `.env` của app chính thêm: `NER_SERVICE_URL=http://localhost:8000`.
Chưa đặt biến này hoặc dịch vụ lỗi/quá 4 giây → Express tự dùng bộ nhận diện dự phòng (từ điển quận Đà Nẵng + danh sách từ thừa), tìm kiếm vẫn chạy.

## Deploy
Vercel không chạy được (model ~515MB, cần Java). Dùng Render / Railway / Hugging Face Spaces (Docker, có `Dockerfile`). Checkpoint vượt giới hạn git, nên tải lên nơi deploy (volume, hoặc tải từ Hugging Face Hub / Google Drive trong lúc build). Rồi đặt `NER_SERVICE_URL` (và `NER_API_KEY` ở cả hai bên nếu muốn khóa) trên Vercel.

Biến môi trường của dịch vụ: `NER_MODEL_PATH`, `NER_NO_CUDA` (mặc định 1 = CPU), `NER_API_KEY`.
