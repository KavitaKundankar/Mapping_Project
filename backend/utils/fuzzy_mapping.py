from fastapi import HTTPException
from rapidfuzz import process, fuzz

FUZZY_THRESHOLD = 60

def fuzzy_mapping(parse_param, standard_params):
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