from dotenv import load_dotenv
import os

load_dotenv()

SERVER_URL = "localhost"
PORT = "8900"
ENV = "info"
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")