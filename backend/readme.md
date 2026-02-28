# Transformer Design Backend

This is the backend for the transformer design application. It provides a FastAPI
server exposing an endpoint for performing design calculations.

## Setup

1. Open a terminal and navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Running the Server

Start the FastAPI application using `uvicorn`:
```bash
cd backend
uvicorn api.main:app --reload
```

By default, the server will listen on `http://127.0.0.1:8000`.

## Using the API

Open your browser and navigate to `http://127.0.0.1:8000/docs` to view the
interactive Swagger UI.

- Expand the `/design` POST endpoint.
- Provide the required input parameters in JSON form.
- Click **Execute** to submit the request and receive the design results.

The response will contain the calculated transformer design data.
