from fastapi import FastAPI, HTTPException
import sqlite3
from contextlib import contextmanager

import sys
sys.path.insert(0, '/app/backend')
from database import get_db_connection

app = FastAPI(redirect_slashes=False)

# Database context manager
@contextmanager
def get_db():
    conn = get_db_connection()
    try:
        yield conn
    finally:
        conn.close()

@app.post("/reset/")
def reset_database():
    """Reset the database by clearing all data from items and categories tables."""
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Delete all items
        cursor.execute("DELETE FROM items")
        
        # Delete all categories
        cursor.execute("DELETE FROM categories")
        
        conn.commit()
        
        return {"message": "Database reset successfully. All data removed from items and categories tables."}
