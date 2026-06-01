# 🚀 Deploy Vercel - ZERO Application

## Structură Proiect
- **Frontend**: React app în folderul `/frontend` → Deploy pe Vercel
- **Backend**: FastAPI (Python) în folderul `/backend` → Deploy pe altă platformă

---

## Pasul 1: Deploy Backend (Separat)

### Opțiuni pentru backend:
- **Render.com** (Recommended - free tier, Python support)
- **Railway.app** 
- **Heroku** (acum platuit)
- **AWS** 

### Cu Render.com:
1. Mergi pe https://render.com și fă Sign Up
2. Creează un "New Web Service"
3. Conectează repo-ul tău GitHub
4. Configurare:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn server:app --host 0.0.0.0 --port 10000`
   - **Environment Variables**:
     ```
     MONGO_URL=mongodb+srv://...
     DB_NAME=zero
     JWT_SECRET=your-secret-key
     DEEPL_AUTH_KEY=your-deepl-key
     ```

5. Deploy și copiază URL-ul (ex: https://zero-api.onrender.com)

---

## Pasul 2: Configurează Environment Variables

### 2.1 - În frontend/.env.production
Actualizeaza cu URL-ul backend-ului tău:
```
REACT_APP_BACKEND_URL=https://zero-api.onrender.com
```

### 2.2 - În Vercel Dashboard
La deploy-ul Vercel, adaugă environment variables:
- **REACT_APP_BACKEND_URL**: `https://your-backend-url.com`

---

## Pasul 3: Deploy pe Vercel

### 3.1 - Conectează repo la Vercel
1. Mergi pe https://vercel.com
2. Click "Add New" → "Project"
3. Selectează repo-ul GitHub
4. Acceptă setările default (va folosi `vercel.json`)

### 3.2 - Configurează Environment Variables în Vercel
În Project Settings → Environment Variables:
```
REACT_APP_BACKEND_URL = https://your-backend-url.com
```

### 3.3 - Deploy
Apasă "Deploy" și așteptă ~2-3 minute

---

## Pasul 4: Configurează CORS pe Backend

În `backend/server.py`, asigură-te că CORS este configurat:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-vercel-app.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## Fișierele Configurare Adăugate

### ✅ `vercel.json`
Configurație Vercel - build command, output directory, env vars

### ✅ `.vercelignore`
Exclude-ți backend files din deploy

### ✅ `frontend/.env.production`
Environment variables pentru production

---

## Troubleshooting

| Problemă | Soluție |
|----------|---------|
| 404 API errors | Verifică REACT_APP_BACKEND_URL și CORS |
| Build fails | Asigură-te că frontend/build/ nu este în gitignore |
| Images nu se încarcă | Verifică CORS pe backend pentru upload endpoint |

---

## Comenzi Utile

```bash
# Test local
cd frontend && npm start

# Build
cd frontend && npm run build

# Test production build
npx serve -s frontend/build
```

---

**Status**: ✅ Gata de deploy! Urmează pașii de mai sus.
