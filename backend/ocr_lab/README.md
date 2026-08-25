# Nexora lightweight Persian OCR lab

This directory is an optional, isolated OCR proof of concept. It does not add
packages to the main backend environment and is not imported by the production
application.

## Disk footprint

- ONNX Runtime is CPU-only.
- The PP-OCRv5 mobile detector and Arabic/Persian recognizer are downloaded on
  first use into `models/`.
- The local models use about 13 MiB. On the tested Windows/Python 3.14 setup,
  the complete virtual environment uses about 290 MiB (roughly 303 MiB with
  models). This is isolated, but it is not a tiny browser-style dependency.

## Setup on Windows

```powershell
cd backend\ocr_lab
py -3.14 -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install --no-cache-dir -r requirements.txt
```

## Run

Images:

```powershell
.\.venv\Scripts\python.exe ocr_cli.py path\to\sample.jpg
```

PDFs:

```powershell
.\.venv\Scripts\python.exe ocr_cli.py path\to\scan.pdf --dpi 220
```

With known ground truth:

```powershell
.\.venv\Scripts\python.exe ocr_cli.py sample.png --expected "متن صحیح"
```

Results are written to `output/<filename>/report.json` and `text.txt`.

Run the dependency-free unit tests with:

```powershell
.\.venv\Scripts\python.exe -m unittest test_ocr_lab.py -v
```

## Remove everything

Run `remove_lab.ps1`. It deletes only this lab's virtual environment, downloaded
models, generated output, and local temporary files. Source files remain
available for later use. Pip's shared download cache is outside this directory
and is intentionally not touched because it may contain packages used by other
projects.

## Accuracy note

PP-OCRv5 Arabic supports the Persian character set, but it is a general OCR
model—not a Persian handwriting-specific model. A production decision must be
based on representative handwritten samples and their character error rate.
