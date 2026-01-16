import os
from google import genai
from dotenv import load_dotenv

# 1. Load the secret from your local .env file
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    print("❌ Error: GEMINI_API_KEY not found in .env file.")
else:
    try:
        # 2. Configure the new GenAI client
        client = genai.Client(api_key=api_key)
        
        # 3. Make a test request using the correct model string
        response = client.models.generate_content(
            model='gemini-2.0-flash-exp', 
            contents="Say 'New library is working!'"
        )
        print(f"✅ Success! Gemini says: {response.text}")
    except Exception as e:
        print(f"❌ API Error: {e}")