# Nexora

Nexora یک سامانهٔ چندسازمانی برای تبدیل اسناد و منابع سازمانی به پایگاه دانش قابل پرسش است. کاربر مجموعهٔ دانش مجاز را انتخاب می‌کند، سؤال می‌پرسد و پاسخ را همراه با وضعیت اعتماد و منابع قابل بررسی می‌بیند.

## قابلیت‌ها

- مدیریت سازمان، نقش کاربر و نشست مبتنی بر کوکی امن
- مجموعه‌های دانش، بارگذاری سند، مشاهدهٔ وضعیت پردازش و تلاش مجدد
- استخراج متن PDF و فایل متنی، OCR اختیاری برای اسناد اسکن‌شده و ایندکس‌کردن در Qdrant
- گفت‌وگوی RAG، منابع پاسخ، برچسب اعتماد، بازخورد و اشتراک‌گذاری کنترل‌شده
- Assistantهای متصل به مجموعه‌های دانش
- Connector وب، GitHub و Webhook با همگام‌سازی زمان‌بندی‌شده
- Worker جداگانه برای پردازش سند و Scheduler جداگانه برای Connectorها
- رابط فارسی و انگلیسی، Light و Dark mode و طراحی واکنش‌گرا

## ساختار مخزن

```text
backend/                 FastAPI، مدل‌ها، migrationها، Workerها و تست‌ها
frontend/my-rag-app/     React، Vite و رابط کاربری
documents/               مستندات رسمی پروژه
DESIGN.md                قواعد طراحی رابط
```

## پیش‌نیازها

- Python 3.11 یا جدیدتر
- Node.js 20 یا جدیدتر و npm
- PostgreSQL
- یک نمونهٔ Qdrant قابل دسترس از Backend
- کلید OpenRouter یا ارائه‌دهندهٔ سازگار برای تولید پاسخ

برای پردازش PDFهای اسکن‌شده، یکی از ارائه‌دهندگان OCR باید جداگانه پیکربندی شود. OCR به‌صورت پیش‌فرض غیرفعال است؛ در این حالت فایل از سرور برای سرویس OCR خارجی ارسال نمی‌شود.

## راه‌اندازی محلی

### ۱. تنظیم Backend

در PowerShell از ریشهٔ مخزن:

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

فایل `backend/.env` را با مقادیر محیط خود کامل کنید. حداقل مقادیر لازم:

```dotenv
DATABASE_URL=postgresql+psycopg2://USER:PASSWORD@HOST:5432/DATABASE
AUTH_SECRET_KEY=یک_رشته_تصادفی_حداقل_۳۲_کاراکتری
APP_ENV=development
AUTH_COOKIE_SECURE=false
FRONTEND_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

QDRANT_URL=https://YOUR-QDRANT-ENDPOINT
QDRANT_API_KEY=YOUR-QDRANT-API-KEY
QDRANT_COLLECTION=rag_chunks

OPENROUTER_API_KEY=YOUR-OPENROUTER-API-KEY
OPENROUTER_MODEL=openrouter/free
```

سپس migrationها را اجرا کنید:

```powershell
alembic upgrade head
```

### ۲. اجرای سرویس‌ها

سه فرایند Backend باید هم‌زمان اجرا شوند و به یک پایگاه داده، فضای ذخیره‌سازی و Qdrant مشترک وصل باشند:

```powershell
# ترمینال اول
cd backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --host 0.0.0.0 --port 8000

# ترمینال دوم
cd backend
.\.venv\Scripts\Activate.ps1
python -m app.workers.document_worker

# ترمینال سوم
cd backend
.\.venv\Scripts\Activate.ps1
python -m app.workers.connector_scheduler_worker
```

API در `http://localhost:8000` در دسترس است. endpointهای نظارتی:

- `GET /health`: liveness سبک و بدون تغییر وضعیت
- `GET /ready`: readiness شامل PostgreSQL، Qdrant، فضای ذخیره‌سازی و Workerهای ضروری

`/ready` تا زمانی که Document Worker و Connector Scheduler فعال نباشند، وضعیت `503` برمی‌گرداند. این رفتار برای استقرار Production عمدی است.

### ۳. اجرای Frontend

```powershell
cd frontend/my-rag-app
npm install
npm run dev
```

رابط در `http://localhost:5173` اجرا می‌شود. Vite درخواست‌های `/api` را در محیط توسعه به `http://127.0.0.1:8000` پروکسی می‌کند.

## پیکربندی OCR

متن PDFهای دارای لایهٔ متنی به‌صورت محلی استخراج می‌شود. برای فایل‌های اسکن‌شده، یکی از تنظیمات زیر را در `backend/.env` فعال کنید.

### MinerU

```dotenv
OCR_PROVIDER=mineru
MINERU_API_TOKEN=YOUR-MINERU-TOKEN
MINERU_LANGUAGE=fa
MINERU_MODEL_VERSION=vlm
```

MinerU فایل اصلی را از طریق URL امضاشده دریافت و نتیجه را به‌صورت غیرهم‌زمان برمی‌گرداند. پیش از فعال‌سازی، سیاست محرمانگی سازمان دربارهٔ ارسال سند به سرویس خارجی را بررسی کنید.

### انتخاب خودکار بین ارائه‌دهندگان

```dotenv
OCR_PROVIDER=auto
MINERU_API_TOKEN=
GOOGLE_VISION_API_KEY=
AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT=
AZURE_DOCUMENT_INTELLIGENCE_KEY=
```

در حالت `auto`، سامانه به‌ترتیب MinerU، Google Vision و Azure Document Intelligence را فقط در صورت وجود اعتبارنامه امتحان می‌کند. برای غیرفعال نگه‌داشتن OCR از `OCR_PROVIDER=disabled` استفاده کنید.

## اجرای آزمون‌ها

### Backend

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python -m pytest
```

آزمون OCR واقعی به‌صورت پیش‌فرض اجرا نمی‌شود. برای تست یک تصویر مصنوعی با Google Vision یا Azure، اعتبارنامه و متغیر فعال‌ساز مربوط را تنظیم کنید:

```powershell
$env:RUN_GOOGLE_VISION_OCR_INTEGRATION=1
python -m pytest -m integration
```

### Frontend

```powershell
cd frontend/my-rag-app
npm run test
npm run build
npm run test:e2e
```

## استقرار

در Production، API، Document Worker و Connector Scheduler را به‌عنوان فرایندهای مستقل اجرا کنید. همهٔ آن‌ها باید به PostgreSQL، Qdrant و `DOCUMENT_STORAGE_DIR` مشترک متصل باشند. پیش از شروع سرویس‌ها migrationها را اجرا کنید و موارد زیر را رعایت کنید:

- `APP_ENV=production` و `AUTH_COOKIE_SECURE=true`
- `FRONTEND_ORIGINS` فقط شامل دامنه‌های مجاز باشد
- `AUTH_SECRET_KEY` تصادفی و حداقل ۳۲ کاراکتر باشد
- کلیدهای OCR، Qdrant، OpenRouter و Connectorها در Secret Manager نگهداری شوند، نه در مخزن یا log
- سلامت سرویس را از `/health` و آماده‌بودن برای ترافیک را از `/ready` کنترل کنید
- حجم فایل مجاز به‌صورت پیش‌فرض ۱۰ مگابایت است؛ در صورت تغییر، ظرفیت ذخیره‌سازی و timeoutهای پردازش نیز بررسی شوند

## عیب‌یابی

| نشانه | بررسی پیشنهادی |
| --- | --- |
| فایل روی ۰٪ یا ۱۰٪ می‌ماند | اجرای `document_worker`، اتصال پایگاه داده، وضعیت `/ready` و خطای ثبت‌شده برای سند را بررسی کنید. |
| سند اسکن‌شده failed می‌شود | `OCR_PROVIDER`، اعتبارنامهٔ سرویس انتخاب‌شده، timeout و محدودیت صفحه را بررسی کنید. |
| Frontend خطای `ECONNREFUSED 127.0.0.1:8000` نشان می‌دهد | API با `uvicorn app.main:app --host 0.0.0.0 --port 8000` اجرا نشده یا روی پورت دیگری است. |
| `/ready` برابر 503 است | وضعیت PostgreSQL، Qdrant، مسیر ذخیره‌سازی و هر دو Worker را بررسی کنید. |
| Connector همگام‌سازی نمی‌شود | اجرای Scheduler، تنظیمات Connector، وضعیت lease و خطای آخر همگام‌سازی را بررسی کنید. |

## مستندات

- [قواعد طراحی](DESIGN.md)
- [مشخصات نیازمندی‌های نرم‌افزار](documents/SRS-Nexora.docx)
- [راهنمای Workerها و OCR](backend/README.md)
- [راهنمای بازیابی Connector](backend/CONNECTOR_SCHEDULER.md)

## ملاحظات امنیتی

فایل `.env` حاوی راز است و نباید commit شود. نشست‌ها، دسترسی سازمانی، فایل‌های اصلی و منابع پاسخ باید تنها در محدودهٔ مجاز کاربر استفاده شوند. پیش از اتصال OCR یا Connector ابری، دربارهٔ انتقال داده و نگهداری آن با سیاست سازمان هماهنگ شوید.
