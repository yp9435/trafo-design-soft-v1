from fastapi import FastAPI
from input_model import TransformerDesignInput
from design_engine import TransformerDesignEngine

app = FastAPI()

@app.get("/")
def home():
    return {"message": "API working"}

@app.post("/design")
def design_transformer(data: TransformerDesignInput):
    engine = TransformerDesignEngine(data)
    results = engine.run()
    return results