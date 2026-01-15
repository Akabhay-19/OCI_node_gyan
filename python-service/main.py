import os
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import google.generativeai as genai
from pypdf import PdfReader
from dotenv import load_dotenv
import json
import io

# Load environment variables from the parent directory or local .env
load_dotenv(dotenv_path="../.env")
load_dotenv() 

app = FastAPI(title="Gyan.AI Mindmap Service", version="2.0")

# Allow CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify the frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Gemini
api_key = os.getenv("GEMINI_API_KEY") or os.getenv("VITE_GEMINI_API_KEY")
if not api_key:
    print("Warning: GEMINI_API_KEY not found in environment variables.")

genai.configure(api_key=api_key)

# Use Gemini 2.0 Flash for better performance
MODEL_NAME = "gemini-2.0-flash"

# Pydantic model for text-based mindmap generation
class TextMindmapRequest(BaseModel):
    topic: str = None
    text: str = None

def extract_text_from_pdf(file_content: bytes) -> str:
    """Extract text from PDF file."""
    try:
        reader = PdfReader(io.BytesIO(file_content))
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        return text
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading PDF: {str(e)}")

def extract_text_from_txt(file_content: bytes) -> str:
    """Extract text from TXT file."""
    try:
        return file_content.decode('utf-8')
    except UnicodeDecodeError:
        try:
            return file_content.decode('latin-1')
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Error reading TXT file: {str(e)}")

def extract_text_from_docx(file_content: bytes) -> str:
    """Extract text from DOCX file."""
    try:
        from docx import Document
        doc = Document(io.BytesIO(file_content))
        text = ""
        for para in doc.paragraphs:
            text += para.text + "\n"
        return text
    except ImportError:
        raise HTTPException(status_code=500, detail="python-docx not installed. Cannot process DOCX files.")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading DOCX file: {str(e)}")

def get_mindmap_prompt(text: str, is_topic: bool = False) -> str:
    """Generate the prompt for Gemini to create a mindmap."""
    if is_topic:
        base_prompt = f"""
You are an expert educational AI helper. 
Generate a comprehensive hierarchical structure for a concept map / mind map about: "{text}"

Create a detailed mindmap covering key concepts, subtopics, and relationships.
"""
    else:
        # Limit text length to avoid token limits
        truncated_text = text[:100000]
        base_prompt = f"""
You are an expert educational AI helper. 
Analyze the following text and generate a hierarchical structure for a concept map / mind map.

Text to analyze:
{truncated_text}
"""
    
    return base_prompt + """
The output must be strictly valid JSON.

Structure the JSON as a list of nodes and a list of edges.
Nodes should have: { "id": "1", "label": "Main Topic", "type": "root" }
Edges should have: { "source": "1", "target": "2", "label": "connection label" }

Ensure there is one central root node.
Break down the content into logical branches and sub-branches.
Keep labels concise (max 5 words).

Output Format Example:
{
  "nodes": [
    {"id": "root", "label": "Central Concept", "type": "input", "position": {"x": 0, "y": 0}},
    {"id": "1", "label": "Subtopic A", "position": {"x": 0, "y": 0}}
  ],
  "edges": [
    {"id": "e1", "source": "root", "target": "1"}
  ]
}

IMPORTANT: 
1. Do NOT calculate positions (x, y). Just output x:0, y:0. The frontend will handle layout.
2. Return ONLY the JSON string, no markdown formatting like ```json ... ```.
3. Generate at least 8-15 nodes for a comprehensive mindmap.
"""

def generate_with_gemini(prompt: str) -> dict:
    """Call Gemini API and parse the response."""
    try:
        model = genai.GenerativeModel(MODEL_NAME)
        response = model.generate_content(prompt)
        
        # Clean response if it contains markdown code blocks
        response_text = response.text.strip()
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
            
        data = json.loads(response_text.strip())
        return data
        
    except json.JSONDecodeError as e:
        print(f"JSON Parse Error: {e}")
        print(f"Response was: {response_text[:500]}")
        raise HTTPException(status_code=500, detail="Failed to parse AI response as JSON")
    except Exception as e:
        print(f"AI Generation Error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate mind map: {str(e)}")

@app.post("/generate-mindmap")
async def generate_mindmap(file: UploadFile = File(...)):
    """
    Generate a mindmap from an uploaded file.
    Supports: PDF, TXT, DOCX
    """
    filename = file.filename.lower()
    content = await file.read()
    
    # Determine file type and extract text
    if filename.endswith('.pdf'):
        text = extract_text_from_pdf(content)
    elif filename.endswith('.txt'):
        text = extract_text_from_txt(content)
    elif filename.endswith('.docx'):
        text = extract_text_from_docx(content)
    else:
        raise HTTPException(
            status_code=400, 
            detail="Unsupported file type. Please upload PDF, TXT, or DOCX files."
        )
    
    if not text.strip():
        raise HTTPException(status_code=400, detail="Could not extract any text from the file.")
    
    prompt = get_mindmap_prompt(text, is_topic=False)
    return generate_with_gemini(prompt)

@app.post("/generate-mindmap-from-text")
async def generate_mindmap_from_text(request: TextMindmapRequest):
    """
    Generate a mindmap from text or a topic name.
    Send either 'topic' for a topic-based mindmap, or 'text' for content-based mindmap.
    """
    if request.topic:
        prompt = get_mindmap_prompt(request.topic, is_topic=True)
    elif request.text:
        prompt = get_mindmap_prompt(request.text, is_topic=False)
    else:
        raise HTTPException(status_code=400, detail="Please provide either 'topic' or 'text' in the request body.")
    
    return generate_with_gemini(prompt)

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "model": MODEL_NAME, "version": "2.0"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
