# Noon Report Parameter Mapping Tool

A specialized tool designed to map custom parameters from Noon Reports to a set of standardized parameters. It leverages fuzzy string matching and AI-powered suggestions (Google Gemini) to streamline the mapping process.

## Project Structure

- **`backend/`**: FastAPI server handling file uploads, mapping logic, and integration with Google Gemini.
- **`frontend/`**: React application built with Vite, providing a modern and responsive user interface for the mapping workflow.
- **CSV Files**: 
  - `standard_params.csv`: A sample source of truth for your standard naming conventions.
  - `parse_params.csv`: A sample set of target parameters that need mapping.

## Prerequisites

- **Python 3.10+** (A virtual environment `myenv` is already present in this project)
- **Node.js 18+**
- **Google Gemini API Key** (Required for AI-powered suggestions)

## Setup and Running the Code

Follow these steps to get the project up and running locally.

### 1. Backend Setup

1.  Navigate to the `backend` directory:
    ```bash
    cd backend
    ```
2.  Activate the virtual environment:
    ```bash
    source ../myenv/bin/activate
    ```
3.  Install the required Python packages:
    ```bash
    pip install -r requirements.txt
    ```
4.  Create a `.env` file in the `backend/` directory and add your Gemini API key:
    ```env
    GEMINI_API_KEY=your_gemini_api_key_here
    ```
5.  Start the FastAPI server:
    ```bash
    uvicorn main:app --reload --port 8001
    ```
    *The backend will be available at `http://localhost:8001`.*

### 2. Frontend Setup

1.  Navigate to the `frontend` directory:
    ```bash
    cd frontend
    ```
2.  Install the npm dependencies:
    ```bash
    npm install
    ```
3.  Start the Vite development server:
    ```bash
    npm run dev
    ```
    *The frontend will usually be available at `http://localhost:5173`.*

## Mapping Workflow

1.  **Upload Standard Parameters**: Upload a CSV or JSON file containing your standard parameter names.
2.  **Upload Target Parameters**: Upload the parameters extracted from your report that need mapping.
3.  **Sugestions**:
    - **Fuzzy Suggest**: Uses rapid string similarity matching.
    - **AI Suggest**: Uses Gemini LLM to understand semantic similarities between parameters.
4.  **Confirm & Save**: Select the best match or manually choose from the list.
5.  **Export**: Once all parameters are mapped, download the results as a CSV file.

## Features

- **Interactive Mapping UI**: Easily cycle through unmapped parameters.
- **AI-Powered Suggestions**: Leverages `gemini-2.0-flash-lite` for high-accuracy semantic matching.
- **Fuzzy Search**: Quick identification of similar string patterns.
- **Export to CSV**: Download your completed mapping for downstream processing.
