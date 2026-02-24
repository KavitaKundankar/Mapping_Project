from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional
import csv
import io
import json

app = FastAPI()

# Global variables

standard_params: List[str] = []
parse_params: List[str] = []
mappings: Dict[str, str] = {} # parse_param -> standard_param

class MappingRequest(BaseModel):
    parse_param: str
    standard_param: str

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Hello from FastAPI Backend!"}

@app.get("/api/data")
def get_data():
    return {"message": "Data from backend", "items": [1, 2, 3, 4, 5]}

async def parse_uploaded_file(file: UploadFile) -> List[str]:
    content = await file.read()
    filename = file.filename.lower()
    
    extracted = []
    
    if filename.endswith('.csv'):
        # Assume first column is the parameter name, skip header if present
        text = content.decode('utf-8')
        reader = csv.reader(io.StringIO(text))
        for row in reader:
            if row:
                extracted.append(row[0]) 
        # Simple heuristic: remove header if it looks like "name" or "param"
        if extracted and extracted[0].lower() in ['name', 'param', 'parameter']:
            extracted.pop(0)
            
    elif filename.endswith('.json'):
        data = json.loads(content)
        if isinstance(data, list):
            extracted = [str(item) for item in data]
        elif isinstance(data, dict):
             # Try to find a list value
            for val in data.values():
                if isinstance(val, list):
                    extracted = [str(item) for item in val]
                    break
    
    return [x.strip() for x in extracted if x.strip()]

@app.post("/api/upload-standard")
async def upload_standard(file: UploadFile = File(...)):
    global standard_params
    standard_params = await parse_uploaded_file(file)
    return {"message": "Standard parameters uploaded", "count": len(standard_params), "data": standard_params}

@app.post("/api/upload-parse")
async def upload_parse(file: UploadFile = File(...)):
    global parse_params, mappings
    # Only keep params that haven't been mapped yet? Or just reload all?
    # For simplicity, reload all, clear mappings for now or keep existing?
    # Let's clean slate for new upload
    parse_params = await parse_uploaded_file(file)
    mappings = {} 
    return {"message": "Parse parameters uploaded", "count": len(parse_params), "data": parse_params}

@app.get("/api/mapping/next")
def get_next_mapping():
    # Find first parse param not in mappings
    for param in parse_params:
        if param not in mappings:
            return {"parse_param": param, "remaining": len(parse_params) - len(mappings), "total": len(parse_params)}
    return {"parse_param": None, "message": "All parameters mapped"}

@app.post("/api/mapping/save")
def save_mapping(mapping: MappingRequest):
    if mapping.parse_param not in parse_params:
         raise HTTPException(status_code=404, detail="Parse parameter not found in uploaded list")
    
    mappings[mapping.parse_param] = mapping.standard_param
    return {"message": "Mapping saved", "mapping": mapping}

@app.get("/api/mappings")
def get_mappings():
    return mappings

@app.get("/api/mappings/download")
def download_mappings():
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["parse_param", "standard_param"])
    for parse_param, standard_param in mappings.items():
        writer.writerow([parse_param, standard_param])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=mappings.csv"}
    )

@app.get("/api/standard-params")
def get_standard_params():
    return standard_params
