from fastapi import FastAPI, HTTPException
from typing import List
import sqlite3
from contextlib import contextmanager

import sys
sys.path.insert(0, '/app/backend')
from models import Category, CategoryCreate
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

# ==================== CATEGORIES ENDPOINTS ====================

@app.get("/", response_model=List[Category])
def get_categories():
    """Get all categories ordered by their order field."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT id, name, "order" FROM categories ORDER BY "order"')
        rows = cursor.fetchall()
        return [Category(id=row[0], name=row[1], order=row[2]) for row in rows]

@app.post("/", response_model=Category)
def create_category(category: CategoryCreate):
    """Create a new category."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            'INSERT INTO categories (name, "order") VALUES (?, ?)',
            (category.name, category.order)
        )
        conn.commit()
        category_id = cursor.lastrowid
        return Category(id=category_id, name=category.name, order=category.order)

@app.put("/{category_id}/", response_model=Category)
def update_category(category_id: int, category: CategoryCreate):
    """Update an existing category."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            'UPDATE categories SET name = ?, "order" = ? WHERE id = ?',
            (category.name, category.order, category_id)
        )
        conn.commit()
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Category not found")
        return Category(id=category_id, name=category.name, order=category.order)

@app.delete("/{category_id}/")
def delete_category(category_id: int):
    """Delete a category."""
    with get_db() as conn:
        cursor = conn.cursor()
        # First, set items with this category to category_id = NULL
        cursor.execute(
            "UPDATE items SET category_id = NULL WHERE category_id = ?",
            (category_id,)
        )
        cursor.execute(
            "DELETE FROM categories WHERE id = ?",
            (category_id,)
        )
        conn.commit()
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Category not found")
        return {"message": "Category deleted successfully"}
