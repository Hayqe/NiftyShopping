from fastapi import FastAPI, HTTPException, Query, Depends
from datetime import date
from typing import List
import sqlite3
from contextlib import contextmanager

import sys
sys.path.insert(0, '/app/backend')
from models import Item, ItemCreate, ItemUpdate, ItemInList
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

# ==================== ITEMS ENDPOINTS ====================

@app.get("/", response_model=List[ItemInList])
def get_active_items():
    """Get all active items (visible=1, listed=1) sorted by category order."""
    today = date.today().isoformat()
    with get_db() as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("""
            SELECT i.*, c.name as category_name, c."order" as category_order 
            FROM items i 
            LEFT JOIN categories c ON i.category_id = c.id 
            WHERE i.visible = 1 AND i.listed = 1 
            ORDER BY COALESCE(c."order", 999), i.item_name
        """)
        rows = cursor.fetchall()
        return [
            ItemInList(
                id=row["id"],
                category_id=row["category_id"],
                item_name=row["item_name"],
                quantity=row["quantity"],
                listed=bool(row["listed"]),
                visible=bool(row["visible"]),
                change_date=row["change_date"],
                category_name=row["category_name"],
                category_order=row["category_order"]
            ) for row in rows
        ]

@app.get("/complete", response_model=List[ItemInList])
def get_complete_items():
    """Get all complete items (visible=1, listed=0, change_date=today)."""
    today = date.today().isoformat()
    with get_db() as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("""
            SELECT i.*, c.name as category_name, c."order" as category_order 
            FROM items i 
            LEFT JOIN categories c ON i.category_id = c.id 
            WHERE i.visible = 1 AND i.listed = 0 AND i.change_date = ? 
            ORDER BY COALESCE(c."order", 999), i.item_name
        """, (today,))
        rows = cursor.fetchall()
        return [
            ItemInList(
                id=row["id"],
                category_id=row["category_id"],
                item_name=row["item_name"],
                quantity=row["quantity"],
                listed=bool(row["listed"]),
                visible=bool(row["visible"]),
                change_date=row["change_date"],
                category_name=row["category_name"],
                category_order=row["category_order"]
            ) for row in rows
        ]

@app.get("/search")
def search_items(q: str = Query(..., min_length=1)):
    """Search for items by name (autocomplete)."""
    with get_db() as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        search_pattern = f"%{q}%"
        cursor.execute("""
            SELECT i.*, c.name as category_name 
            FROM items i 
            LEFT JOIN categories c ON i.category_id = c.id 
            WHERE i.item_name LIKE ?
            ORDER BY i.item_name
            LIMIT 10
        """, (search_pattern,))
        rows = cursor.fetchall()
        return [
            {
                "id": row["id"],
                "item_name": row["item_name"],
                "category_id": row["category_id"],
                "category_name": row["category_name"],
                "quantity": row["quantity"]
            } for row in rows
        ]

@app.get("/all", response_model=List[ItemInList])
def get_all_items():
    """Get all items for settings page."""
    with get_db() as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("""
            SELECT i.*, c.name as category_name, c."order" as category_order 
            FROM items i 
            LEFT JOIN categories c ON i.category_id = c.id 
            WHERE i.visible = 1
            ORDER BY COALESCE(c."order", 999), i.item_name
        """)
        rows = cursor.fetchall()
        return [
            ItemInList(
                id=row["id"],
                category_id=row["category_id"],
                item_name=row["item_name"],
                quantity=row["quantity"],
                listed=bool(row["listed"]),
                visible=bool(row["visible"]),
                change_date=row["change_date"],
                category_name=row["category_name"],
                category_order=row["category_order"]
            ) for row in rows
        ]

@app.post("/", response_model=Item)
def create_item(item: ItemCreate):
    """Create a new item or update existing if it exists with the same name."""
    today = date.today().isoformat()
    with get_db() as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Check if item already exists (regardless of visible status)
        cursor.execute(
            "SELECT id FROM items WHERE item_name = ?",
            (item.item_name,)
        )
        existing = cursor.fetchone()
        
        if existing:
            # Update existing item
            item_id = existing["id"]
            cursor.execute(
                """UPDATE items SET 
                   category_id = COALESCE(?, category_id),
                   quantity = ?,
                   listed = 1,
                   visible = 1,
                   change_date = ?
                   WHERE id = ?""",
                (item.category_id, item.quantity, today, item_id)
            )
        else:
            # Create new item
            cursor.execute(
                """INSERT INTO items 
                   (category_id, item_name, quantity, listed, visible, change_date)
                   VALUES (?, ?, ?, 1, 1, ?)""",
                (item.category_id, item.item_name, item.quantity, today)
            )
            item_id = cursor.lastrowid
        
        conn.commit()
        
        # Return the created/updated item
        cursor.execute("SELECT * FROM items WHERE id = ?", (item_id,))
        row = cursor.fetchone()
        return Item(
            id=row["id"],
            category_id=row["category_id"],
            item_name=row["item_name"],
            quantity=row["quantity"],
            listed=bool(row["listed"]),
            visible=bool(row["visible"]),
            change_date=row["change_date"]
        )

@app.put("/{item_id}/complete")
def mark_item_complete(item_id: int):
    """Mark an item as complete (swipe right)."""
    today = date.today().isoformat()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE items SET listed = 0, change_date = ? WHERE id = ?",
            (today, item_id)
        )
        conn.commit()
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Item not found")
        return {"message": "Item marked as complete"}

@app.put("/{item_id}/delete")
def delete_item(item_id: int):
    """Delete an item (swipe left)."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE items SET visible = 0 WHERE id = ?",
            (item_id,)
        )
        conn.commit()
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Item not found")
        return {"message": "Item deleted"}

@app.put("/{item_id}/reactivate")
def reactivate_item(item_id: int):
    """Reactivate an item from complete list back to active list."""
    today = date.today().isoformat()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE items SET listed = 1, visible = 1, change_date = ? WHERE id = ?",
            (today, item_id)
        )
        conn.commit()
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Item not found")
        return {"message": "Item reactivated"}

@app.put("/{item_id}/", response_model=Item)
def update_item(item_id: int, item: ItemUpdate):
    """Update an item in settings."""
    with get_db() as conn:
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        # Build update query dynamically
        updates = []
        params = []
        if item.category_id is not None:
            updates.append("category_id = ?")
            params.append(item.category_id)
        if item.item_name is not None:
            updates.append("item_name = ?")
            params.append(item.item_name)
        if item.quantity is not None:
            updates.append("quantity = ?")
            params.append(item.quantity)
        
        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        params.append(item_id)
        query = f"UPDATE items SET {', '.join(updates)} WHERE id = ?"
        cursor.execute(query, params)
        conn.commit()
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Item not found")
        
        # Return updated item
        cursor.execute("SELECT * FROM items WHERE id = ?", (item_id,))
        row = cursor.fetchone()
        return Item(
            id=row["id"],
            category_id=row["category_id"],
            item_name=row["item_name"],
            quantity=row["quantity"],
            listed=bool(row["listed"]),
            visible=bool(row["visible"]),
            change_date=row["change_date"]
        )

@app.delete("/{item_id}/")
def permanently_delete_item(item_id: int):
    """Permanently delete an item from settings."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM items WHERE id = ?", (item_id,))
        conn.commit()
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Item not found")
        return {"message": "Item permanently deleted"}
