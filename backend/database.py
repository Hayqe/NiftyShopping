import sqlite3
from datetime import datetime
import os

# Determine DB path based on environment
if os.path.exists('/app'):
    DB_PATH = "/app/data/niftyshopping.db"
else:
    # Local development - use relative path from backend directory
    DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "niftyshopping.db")

def get_db_connection():
    """Create and return a database connection."""
    # Ensure data directory exists
    os.makedirs(os.path.dirname(os.path.abspath(DB_PATH)), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_database():
    """Initialize the database with the required tables."""
    os.makedirs(os.path.dirname(os.path.abspath(DB_PATH)), exist_ok=True)
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Create categories table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            "order" INTEGER NOT NULL
        )
    """)
    
    # Create items table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category_id INTEGER,
            item_name TEXT NOT NULL,
            quantity INTEGER DEFAULT 1,
            listed BOOLEAN DEFAULT 1,
            visible BOOLEAN DEFAULT 1,
            change_date DATE,
            FOREIGN KEY (category_id) REFERENCES categories(id)
        )
    """)
    
    # Insert default categories if not exists
    cursor.execute('SELECT COUNT(*) FROM categories')
    if cursor.fetchone()[0] == 0:
        default_categories = [
            (1, 'Zuivel', 1),
            (2, 'Groenten', 2),
            (3, 'Fruit', 3),
            (4, 'Vlees & Vis', 4),
            (5, 'Drank', 5),
            (6, 'Brood & Banket', 6),
            (7, 'Diepvries', 7),
            (8, 'Kruiden & Specerijen', 8),
            (9, 'Snoep & Chips', 9),
            (10, 'Huishouden', 10),
            (11, 'Overig', 11)
        ]
        cursor.executemany(
            'INSERT INTO categories (id, name, "order") VALUES (?, ?, ?)',
            default_categories
        )
    
    conn.commit()
    conn.close()

def run_startup_update():
    """Run the startup update query from PRD section 3.A."""
    conn = get_db_connection()
    cursor = conn.cursor()
    today = datetime.now().strftime("%Y-%m-%d")
    
    cursor.execute(
        'UPDATE items SET visible = 0, listed = 0 WHERE visible = 1 AND listed = 0 AND change_date != ?',
        (today,)
    )
    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_database()
    run_startup_update()
    print("Database initialized successfully.")
