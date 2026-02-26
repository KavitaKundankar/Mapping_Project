from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict
import csv
import io

from rapidfuzz import process, fuzz
from Utils.parse_uploded_file import parse_uploaded_file

app = FastAPI()

# In-memory store
standard_params: List[str] = []
parse_params: List[str] = []
mappings: Dict[str, str] = {}  # parse_param -> standard_param

FUZZY_THRESHOLD = 60  # scores below this = no good match


class MappingRequest(BaseModel):
    parse_param: str
    standard_param: str


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Upload endpoints
# ---------------------------------------------------------------------------

@app.post("/api/upload-standard")
async def upload_standard(file: UploadFile = File(...)):
    global standard_params
    standard_params = await parse_uploaded_file(file)
    return {"message": "Uploaded", "count": len(standard_params), "data": standard_params}


@app.post("/api/upload-parse")
async def upload_parse(file: UploadFile = File(...)):
    global parse_params, mappings
    parse_params = await parse_uploaded_file(file)
    mappings = {}
    return {"message": "Uploaded", "count": len(parse_params), "data": parse_params}


# ---------------------------------------------------------------------------
# Mapping endpoints
# ---------------------------------------------------------------------------

@app.get("/api/mapping/next")
def get_next_mapping():
    """Return the next unmapped parse parameter."""
    for param in parse_params:
        if param not in mappings:
            mapped = len(mappings)
            total = len(parse_params)
            return {"parse_param": param, "mapped": mapped, "total": total}
    return {"parse_param": None, "message": "All parameters mapped"}


@app.get("/api/mapping/fuzzy-suggest")
def fuzzy_suggest(parse_param: str):
    """Return top 5 fuzzy matches for a parse_param from standard_params."""
    if not standard_params:
        raise HTTPException(status_code=400, detail="No standard parameters loaded yet.")

    results = process.extract(parse_param, standard_params, scorer=fuzz.token_sort_ratio, limit=5)
    suggestions = [{"standard_param": name, "score": round(score)} for name, score, _ in results]
    best_score = suggestions[0]["score"] if suggestions else 0

    return {
        "parse_param": parse_param,
        "found": best_score >= FUZZY_THRESHOLD,
        "suggestions": suggestions,
    }


@app.post("/api/mapping/save")
def save_mapping(body: MappingRequest):
    if body.parse_param not in parse_params:
        raise HTTPException(status_code=404, detail="Parse param not found")
    mappings[body.parse_param] = body.standard_param
    return {"message": "Saved"}


@app.get("/api/mappings")
def get_mappings():
    return mappings


@app.get("/api/mappings/download")
def download_mappings():
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["parse_param", "standard_param"])
    for k, v in mappings.items():
        writer.writerow([k, v])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=mappings.csv"},
    )


@app.get("/api/standard-params")
def get_standard_params():
    return standard_params
