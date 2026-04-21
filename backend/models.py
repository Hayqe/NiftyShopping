from pydantic import BaseModel
from typing import Optional
from datetime import date

class CategoryBase(BaseModel):
    name: str
    order: int

class CategoryCreate(CategoryBase):
    pass

class Category(CategoryBase):
    id: int

class ItemBase(BaseModel):
    category_id: Optional[int] = None
    item_name: str
    quantity: int = 1

class ItemCreate(ItemBase):
    pass

class ItemUpdate(BaseModel):
    category_id: Optional[int] = None
    item_name: Optional[str] = None
    quantity: Optional[int] = None

class Item(ItemBase):
    id: int
    listed: bool
    visible: bool
    change_date: Optional[date] = None

class ItemInList(Item):
    category_name: Optional[str] = None
    category_order: Optional[int] = None
