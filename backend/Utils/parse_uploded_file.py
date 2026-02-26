from fastapi import UploadFile
from typing import List
import io
import csv
import json

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