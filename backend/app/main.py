from fastapi import FastAPI
from app.db.database import engine

app = FastAPI()


@app.get("/")
def root():
    return {
        "status": "Connected Successfully"
    }