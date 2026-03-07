# Run Guide: GitHub README Generator

This guide provides instructions on how to set up and run the GitHub README Generator application.

## Prerequisites

- **Python 3.9+**: Ensure you have Python installed. You can check your version with `python --version`.
- **Pip**: Ensure you have `pip` installed for managing Python packages.

## Installation

1. **Navigate to the project directory**:
   ```bash
   cd d:/Hackathon/Hack-a-Mined/readme_github
   ```

2. **Create a virtual environment** (recommended):
   ```bash
   python -m venv venv
   ```

3. **Activate the virtual environment**:
   - **Windows**:
     ```bash
     .\venv\Scripts\activate
     ```
   - **Unix/macOS**:
     ```bash
     source venv/bin/activate
     ```

4. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

## Configuration

The application requires environment variables for GitHub and Groq API access. These are already pre-configured in the `.env` file within the `readme_github/` directory.

**File**: `d:/Hackathon/Hack-a-Mined/readme_github/.env`
```env
GITHUB_TOKEN=your_github_token
GROQ_API_KEY=your_groq_api_key
```

> [!IMPORTANT]
> Ensure your API keys have sufficient permissions. The GitHub token is used for repository analysis, and the Groq key is used for AI-powered README generation.

## Running the Application

1. **Start the FastAPI server**:
   Using `python -m uvicorn` is more reliable than the direct `uvicorn` command, especially in Conda or virtual environments:
   ```bash
   python -m uvicorn main:app --reload --port 8000
   ```

2. **Access the Web Interface**:
   Open your browser and navigate to:
   [http://localhost:8000](http://localhost:8000)

## Project Structure

- `main.py`: The core FastAPI application (Backend).
- `index.html`: The single-page frontend served by `main.py`.
- `requirements.txt`: List of Python dependencies.
- `.env`: Configuration file for API keys.

## Troubleshooting

- **Fatal error in launcher: Unable to create process**: This usually occurs in Conda environments when the `uvicorn.exe` path is broken. 
  - **Fix**: Use `python -m uvicorn` instead of just `uvicorn`.
- **ModuleNotFoundError**: Ensure you have activated the virtual environment and installed dependencies.
- **Port already in use**: If port 8000 is occupied, you can change it with the `--port` flag:
  ```bash
   python -m uvicorn main:app --reload --port 8080
  ```
