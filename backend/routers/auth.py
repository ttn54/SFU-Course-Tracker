"""
Authentication API routes.
Handles user registration and login with JWT tokens.
"""
from typing import Any
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlmodel import Session, select, SQLModel
from passlib.context import CryptContext
from jose import JWTError, jwt

from database import get_session
from models import User


class UserRegister(SQLModel):
    """User registration request."""
    email: str
    password: str


class UserLogin(SQLModel):
    """User login request."""
    email: str
    password: str


class TokenResponse(SQLModel):
    """Token response."""
    token: str
    user_id: int
    email: str


router = APIRouter(prefix="/auth", tags=["authentication"])

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings
SECRET_KEY = "your-secret-key-change-this-in-production"  # TODO: Move to .env
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

security = HTTPBearer()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Hash a password."""
    return pwd_context.hash(password)


def create_access_token(data: dict) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    session: Session = Depends(get_session)
) -> int:
    """Get current user ID from JWT token."""
    token = credentials.credentials
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials - no user ID in token"
            )
        return int(user_id)
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate credentials - JWT error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate credentials - {str(e)}"
        )


@router.post("/register", status_code=201, response_model=TokenResponse)
async def register(
    data: UserRegister,
    session: Session = Depends(get_session)
) -> TokenResponse:
    """
    Register a new user.
    
    Example:
    ```json
    POST /api/v1/auth/register
    {
        "email": "student@sfu.ca",
        "password": "securepassword"
    }
    ```
    """
    # Check if user already exists
    statement = select(User).where(User.email == data.email)
    existing_user = session.exec(statement).first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    hashed_password = get_password_hash(data.password)
    user = User(
        email=data.email,
        password=hashed_password,
        completed_courses=[]
    )
    
    session.add(user)
    session.commit()
    session.refresh(user)
    
    # Create access token
    token = create_access_token(data={"sub": str(user.id)})
    
    return TokenResponse(
        token=token,
        user_id=user.id,
        email=user.email
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    data: UserLogin,
    session: Session = Depends(get_session)
) -> TokenResponse:
    """
    Login and get JWT token.
    
    Example:
    ```json
    POST /api/v1/auth/login
    {
        "email": "student@sfu.ca",
        "password": "securepassword"
    }
    ```
    """
    # Find user
    statement = select(User).where(User.email == data.email)
    user = session.exec(statement).first()
    
    if not user or not verify_password(data.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Create access token
    access_token = create_access_token(data={"sub": str(user.id)})
    
    return TokenResponse(
        token=access_token,
        user_id=user.id,
        email=user.email
    )

