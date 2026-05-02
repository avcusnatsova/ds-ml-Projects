from fastapi import APIRouter, HTTPException, Depends, status
from passlib.context import CryptContext
from backend.models.schemas import UserCreate, UserLogin
from backend.services.database import users
from backend.utils.response import api_response
from datetime import datetime, timezone

router = APIRouter(tags=["Auth"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

@router.post("/register")
def register_user(user: UserCreate):
    existing_user = users.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(user.password)
    user_dict = {
        "email": user.email,
        "password": hashed_password,
        "role": user.role,
        "name": user.name,
        "created_at": datetime.now(timezone.utc)
    }
    users.insert_one(user_dict)
    return api_response(success=True, message="User registered successfully", data={"email": user.email, "role": user.role})

@router.post("/login")
def login_user(user: UserLogin):
    db_user = users.find_one({"email": user.email})
    if not db_user or not verify_password(user.password, db_user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    return api_response(success=True, message="Login successful", data={"email": db_user["email"], "role": db_user["role"], "name": db_user["name"]})
