# Wireframeهای کم‌جزئیات Nexora

فایل‌ها برای واردکردن مستقیم به Figma با Drag & Drop آماده شده‌اند. آن‌ها عمدی کم‌جزئیات هستند تا ساختار، وضعیت‌ها، سلسله‌مراتب محتوا و مسیرهای کاربر پیش از طراحی بصری نهایی بررسی شوند.

| فایل | پوشش |
| --- | --- |
| `nexora-wireframes-low-fi.svg` | مجموعهٔ پیشنهادی برای Figma: ۱۸ نمای خیلی کم‌جزئیات، با placeholder، ساختار صفحه و حالت‌های اصلی |
| `low-fi-pages/` | همان ۱۸ نما، هرکدام در یک SVG مستقل برای ورود جداگانه به Figma |
| `nexora-wireframes.svg` | Login، Workspace، Conversation، Sources، Knowledge base، Upload، Assistants، Team members، Settings و دو نمای موبایل |
| `nexora-wireframes-states.svg` | Empty state، صف و خطای OCR، Connector، اعلان‌ها، Analytics و Export، Dialogهای تأیید، ویرایش Assistant، خطاهای حساب، Drawer و Bottom sheet موبایل |

فایل `nexora-wireframes-low-fi.svg` مرجع اصلی برای شروع طراحی در Figma است؛ دو فایل دیگر برای زمانی هستند که به سطح جزئیات بیشتری در همان ساختار نیاز باشد. هر Wireframe با شمارهٔ ۰۱ تا ۱۸ نام‌گذاری شده است. جریان‌های رفتاری پشت این نماها در `../WORKFLOWS.md` قرار دارند.

برای ساخت فایل Figma با صفحه‌های جدا، محتویات پوشهٔ `low-fi-pages/` را هم‌زمان انتخاب و Drag & Drop کنید. برای یک نمای کلی، از فایل مجموعه استفاده کنید.

## حالت‌های لازم در طراحی نهایی

- صفحه‌های اصلی باید در Light، Dark و در صورت وجود متن فارسی، RTL بررسی شوند.
- دکمه‌ها، dropdownها، dialogها و drawerها باید حالت پیش‌فرض، hover، focus-visible، disabled و loading داشته باشند.
- مسیر بارگذاری سند باید queued، reading، OCR، indexing، indexed و failed را نشان دهد.
- پاسخ گفتگو باید waiting، قابل لغو، دارای منبع، پشتوانهٔ ناکافی و خطای سرویس را پوشش دهد.
- نماهای موبایل باید Drawer، Bottom sheet، فیلترها و Composer با کنترل‌های لمس‌پذیر ۴۴px را حفظ کنند.
