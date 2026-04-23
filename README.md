# NiftyGroceries - Mobile Shopping List App

NiftyGroceries is een mobiele boodschappenlijst applicatie met een schone, intuïtieve UI. Maak eenvoudig boodschappenlijstjes, markeer items als compleet, en beheer je producten en categorieën.

## 📱 Features

- **Boodschappenlijst beheer**: Voeg items toe, verwijder, of markeer als compleet
- **Autocomplete zoekfunctie**: Snelle productzoeking met + / - knoppen voor hoeveelheid
- **Swipe gestures**: Veg naar rechts om item als compleet te markeren, naar links om te verwijderen
- **Categorieën beheer**: Organiseer je producten in categorieën en pas de volgorde aan via drag & drop
- **Compleet/Actief toggle**: Switch tussen je actieve boodschappen en voltooide items
- **Database reset**: Maak alle data leeg voor een verse start

## 🏗️ Architectuur & Technologie

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **Database**: SQLite met persistente opslag via Docker volume
- **API Design**: RESTful endpoints met trailing slashes

### Frontend
- **UI Framework**: Tailwind CSS (via CDN)
- **Icons**: Font Awesome 6
- **JavaScript**: Pure Vanilla JS (geen frameworks)

### Deployment
- **Containerization**: Docker met docker-compose
- **Structuur**:
  ```
  backend/          # FastAPI application
  ├── api/         # API endpoints (items, categories, database)
  │   ├── __init__.py
  │   ├── items.py
  │   ├── categories.py
  │   └── database.py
  ├── database.py  # Database initialization & startup updates
  ├── models.py    # Pydantic models
  └── server.py    # Main FastAPI app with template rendering
  
  frontend/        # Static files
  ├── templates/   # Jinja2 HTML templates
  │   ├── base.html
  │   ├── index.html
  │   ├── settings.html
  │   ├── settings_general.html
  │   ├── settings_items.html
  │   └── settings_categories.html
  └── static/
      ├── css/
      │   └── styles.css
      └── js/
          └── app.js
  
  docker-compose.yml
  Dockerfile
  ```

## 🛠️ Technische Details

### Database Schema
- **items**: id, category_id, item_name, quantity, listed, visible, change_date
- **categories**: id, name, order

### Key Logics
- **Startup Update**: Automatische update bij start: items met `visible=1, listed=0` en `change_date != today` worden onzichtbaar
- **Swipe Actions**: 
  - Right → Mark as complete (listed=0, change_date=today)
  - Left → Delete (visible=0)
- **Autocomplete**: Returns ALL items from database (regardless of visible status) for search results
- **Drag & Drop Categories**: Client-side mouse-based drag and drop with server-side persistence

### Color Theme
| Element | Color | Hex Code |
|---------|-------|----------|
| Primary | Orange | `#c36322` |
| Primary Hover | Orange Dark | `#a8521f` |
| Header Background | Dark Brown | `#282520` |
| Recycle Button | Yellow | `#fbbf24` |

## 🚀 Installatie

### Prerequisites
- Docker
- Docker Compose
- Internetverbinding (voor Tailwind CSS CDN)

### Stappen

1. **Clone de repository:**
   ```bash
   git clone <repository-url>
   cd Boodschappen
   ```

2. **Build en start de containers:**
   ```bash
   docker-compose up -d --build
   ```

3. **Wacht tot de startup update is uitgevoerd** (automatisch bij eerste start)

4. **Open de applicatie:**
   ```
   # In browser openen
   http://localhost:8000
   ```

5. **Stop de applicatie:**
   ```bash
   docker-compose down
   ```

## 💡 Gebruik

### Eerste Keer Gebruik
1. Navigeer naar `http://localhost:8000`
2. Begin met typen in de zoekbalk om items toe te voegen
3. Gebruik + / - knoppen om de hoeveelheid aan te passen
4. Klik op het vinkje (✓) om de keuze te bevestigen

### Boodschappen Beheren
- **Toevoegen**: Typ in zoekbalk → selecteer of maak nieuw item
- **Compleet markeren**: Sleep item naar rechts (swipe) of use de ✓ knop
- **Verwijderen**: Sleep item naar links (swipe)
- **Reactiveren**: Op de "Compleet" tab, klik op de recycles (↻) knop

### Instellingen
- **Items**: Beheer alle producten (bewerken, verwijderen)
- **Categorieën**: Organiseer categorieën en pas volgorde aan via drag & drop
- **Geavanceerd**: Database reset (verwijderd ALL data - dubbele bevestiging!)

### Tips
- Items met `visible=0` zijn archief items, maar verschijnen wel in autocomplete
- De startup update zorgt ervoor dat incomplete items van gisteren automatisch worden verborgen
- Categorie volgorde wordt opgeslagen bij drag & drop

## 📝 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/items/` | Get active items (visible=1, listed=1) |
| GET | `/api/items/complete` | Get complete items (visible=1, listed=0, change_date=today) |
| GET | `/api/items/search?q=...` | Search items (returns ALL items regardless of visible) |
| GET | `/api/items/all` | Get all visible items |
| POST | `/api/items/` | Create/update item |
| PUT | `/api/items/{id}/complete` | Mark item as complete |
| PUT | `/api/items/{id}/delete` | Delete item (visible=0) |
| PUT | `/api/items/{id}/reactivate` | Reactivate item (listed=1, visible=1) |
| PUT | `/api/items/{id}/` | Update item |
| DELETE | `/api/items/{id}/` | Permanently delete item |
| GET | `/api/categories/` | Get all categories |
| POST | `/api/categories/` | Create category |
| PUT | `/api/categories/{id}/` | Update category |
| DELETE | `/api/categories/{id}/` | Delete category |
| POST | `/api/database/reset/` | Reset database (clear all tables) |

## 🔒 Data Persistence

Alle data wordt opgeslagen in een SQLite database op:
- **Docker**: `/app/data/niftyshopping.db` (gemount via Docker volume)
- **Local development**: `./data/niftyshopping.db`

De database wordt automatisch geïnitialiseerd bij eerste start en blijft behouden tussen container restarts.

## 🐛 Troubleshooting

### Tailwind CSS niet geladen
- Zorg dat je internetverbinding werkt (Tailwind wordt via CDN geladen)
- Check browser console voor foutmeldingen

### Database errors
- Controleer of het Docker volume bestaat: `docker volume ls`
- Start de container opnieuw: `docker-compose down && docker-compose up -d`

### API endpoints return 404
- Check of trailing slashes aanwezig zijn in de URL
- Alle API endpoints eindigen met `/` (bijv. `/api/items/`)

## 📜 Licentie

Dit project is ontwikkeld voor persoonlijk gebruik. Vrije toegang en gebruik onder eigen verantwoordelijkheid.
