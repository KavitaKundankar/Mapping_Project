import os
import json
import re
import google.generativeai as genai
from fastapi import HTTPException
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

def llm_mapping(parse_param, standard_params):

    if not standard_params:
        raise HTTPException(status_code=400, detail="No standard parameters loaded yet.")

    if not GEMINI_API_KEY:

        return {
            "parse_param": parse_param,
            "found": False,
            "suggestions": [],
            "error": "GEMINI_API_KEY not configured in backend"
        }

    try:
        model = genai.GenerativeModel('gemini-2.5-flash-lite')
        
        prompt = f"""
        You are a data mapping assistant. I have a parameter from a report called "{parse_param}".
        I need to map it to one of the following standard parameters:
        {json.dumps(standard_params)}

        Suggest the top 5 most likely matches from the list above. 
        For each match, provide a confidence score between 0 and 100.
        
        Return the result ONLY as a JSON list of objects, each with "standard_param" and "score" keys.
        Example: [{{"standard_param": "Engine_Speed", "score": 65}}, ...]
        """

        response = model.generate_content(prompt)
        
        # Clean up the response text - sometimes Gemini adds markdown code blocks
        text = re.sub(r"^```json\s*|\s*```$", "", response.text.strip())
        text = text.strip()

        suggestions = json.loads(text)
        
        # Ensure it's a list and has at most 5 items
        if not isinstance(suggestions, list):
            suggestions = []
        
        suggestions = suggestions[:5]
        
        best_score = suggestions[0]["score"] if suggestions else 0

        return {
            "parse_param": parse_param,
            "found": best_score >= 60,
            "suggestions": suggestions
        }

    except Exception as e:
        print(f"Error in Gemini mapping: {e}")
        return {
            "parse_param": parse_param,
            "found": False,
            "suggestions": [],
            "error": str(e)
        }