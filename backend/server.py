import sys
import os
from pathlib import Path

# Determine the base directory
if os.path.exists('/app/backend'):
    BASE_DIR = '/app'
else:
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

sys.path.insert(0, os.path.join(BASE_DIR, 'backend'))

from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, Response
from fastapi.middleware.cors import CORSMiddleware
from jinja2 import Environment, FileSystemLoader
import jinja2

from database import init_database, run_startup_update, get_db_connection

# Create main app
app = FastAPI(redirect_slashes=False)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Setup Jinja2 environment manually
frontend_path = os.path.join(BASE_DIR, 'frontend')
templates_dir = os.path.join(frontend_path, 'templates')
static_dir = os.path.join(frontend_path, 'static')

# Ensure templates directory exists
os.makedirs(templates_dir, exist_ok=True)

# Create Jinja2 environment
jinja_env = Environment(
    loader=FileSystemLoader(templates_dir),
    autoescape=True
)

# Setup static files
app.mount("/static", StaticFiles(directory=static_dir), name="static")

# Custom template response
async def render_template(template_name: str, **context):
    template = jinja_env.get_template(template_name)
    return HTMLResponse(content=template.render(**context), media_type="text/html")

# Initialize database on startup
@app.on_event("startup")
def startup_event():
    init_database()
    run_startup_update()

# Routes

@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    return await render_template("index.html", request=request, active_items=[], complete_items=[])

@app.get("/settings", response_class=HTMLResponse)
async def settings_redirect(request: Request):
    # Redirect /settings to /settings/items as default
    return Response(status_code=302, headers={"Location": "/settings/items"})

@app.get("/settings/advanced", response_class=HTMLResponse)
async def settings_advanced(request: Request):
    return await render_template("settings_general.html", request=request)

@app.get("/settings/items", response_class=HTMLResponse)
async def settings_items(request: Request):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get all visible items
    cursor.execute("""
        SELECT i.id, i.item_name, i.quantity, i.category_id, c.name as category_name
        FROM items i
        LEFT JOIN categories c ON i.category_id = c.id
        WHERE i.visible = 1
        ORDER BY COALESCE(c."order", 999), i.item_name
    """)
    items = [dict(id=row[0], item_name=row[1], quantity=row[2], category_id=row[3], category_name=row[4]) for row in cursor.fetchall()]
    
    # Get categories
    cursor.execute('SELECT id, name FROM categories ORDER BY "order"')
    categories = [dict(id=row[0], name=row[1]) for row in cursor.fetchall()]
    
    conn.close()
    
    return await render_template("settings_items.html", request=request, items=items, categories=categories)

@app.get("/settings/categories", response_class=HTMLResponse)
async def settings_categories(request: Request):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get all categories
    cursor.execute('SELECT id, name, "order" FROM categories ORDER BY "order"')
    categories = [dict(id=row[0], name=row[1], order=row[2]) for row in cursor.fetchall()]
    
    conn.close()
    
    return await render_template("settings_categories.html", request=request, categories=categories)

# Mount API routers
from api.items import app as items_api
from api.categories import app as categories_api

app.mount("/api/items", items_api)
app.mount("/api/categories", categories_api)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
