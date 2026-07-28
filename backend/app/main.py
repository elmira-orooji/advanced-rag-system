from fastapi import FastAPI

app = FastAPI(
    title="RAG Backend",
    version="1.0.0"
)

@app.get("/")
def root():
    return {
        "message": "Backend is running"
    }