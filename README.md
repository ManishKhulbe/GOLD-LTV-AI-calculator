### Frontend
```bash
npm run dev          # Vite dev server (default port 5173)
npm run build        # Production build
npm run lint         # ESLint
npm run preview      # Preview production build
```

### Backend
```bash
cd files
python -m venv .venv
source .venv/bin/activate                    # .venv already exists in files/
pip install -r requirements.txt
uvicorn main:app --reload --port 8001        # Must use port 8001 — frontend hardcodes 
```