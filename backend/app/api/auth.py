from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth import create_access_token, verify_password
from app.database import get_db
from app.models.entities import User
from app.permissions import get_role_config
from app.schemas.schemas import LoginRequest, LoginResponse, RoleConfigResponse, SessionResponse, UserProfile

router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer(auto_error=False)

from app.engineers import DEMO_AUTH_USERS, DEMO_USERS
from app.permissions import ROLE_LABELS

DEMO_USERS_API = [
    {
        "email": email,
        "password": DEMO_AUTH_USERS[email],
        "role_label": ROLE_LABELS[role],
        "name": name,
    }
    for name, email, role in DEMO_USERS
]


async def get_current_user(
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(security)],
    db: AsyncSession = Depends(get_db),
) -> User:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    from app.auth import decode_access_token

    payload = decode_access_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    user = await db.scalar(
        select(User).options(selectinload(User.team)).where(User.id == int(payload["sub"]))
    )
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


async def get_optional_user(
    credentials: Annotated[Optional[HTTPAuthorizationCredentials], Depends(security)],
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    if not credentials:
        return None
    try:
        return await get_current_user(credentials, db)
    except HTTPException:
        return None


@router.post("/login", response_model=LoginResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)) -> LoginResponse:
    user = await db.scalar(select(User).options(selectinload(User.team)).where(User.email == payload.email))
    if not user or not user.password_hash or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Account is inactive")

    token = create_access_token(user.id, user.email, user.role.value)
    config = get_role_config(user.role)

    return LoginResponse(
        access_token=token,
        token_type="bearer",
        user=UserProfile.model_validate(user),
        landing_page=config["landing_page"],
        permissions=config["permissions"],
        nav_items=config["nav_items"],
        alert_scope=config["alert_scope"],
    )


@router.get("/me", response_model=UserProfile)
async def me(current_user: Annotated[User, Depends(get_current_user)]) -> UserProfile:
    return UserProfile.model_validate(current_user)


@router.get("/permissions", response_model=RoleConfigResponse)
async def get_permissions(current_user: Annotated[User, Depends(get_current_user)]) -> RoleConfigResponse:
    return RoleConfigResponse(**get_role_config(current_user.role))


@router.get("/session", response_model=SessionResponse)
async def get_session(current_user: Annotated[User, Depends(get_current_user)]) -> SessionResponse:
    config = get_role_config(current_user.role)
    return SessionResponse(
        user=UserProfile.model_validate(current_user),
        role=config["role"],
        role_label=config["role_label"],
        permissions=config["permissions"],
        landing_page=config["landing_page"],
        nav_items=config["nav_items"],
        alert_scope=config["alert_scope"],
    )


@router.get("/demo-users")
async def demo_users() -> list[dict]:
    from app.models.entities import UserRole
    from app.permissions import ROLE_LABELS, ROLE_LANDING_PAGES

    role_by_label = {label: role for role, label in ROLE_LABELS.items()}
    result = []
    for u in DEMO_USERS_API:
        role = role_by_label.get(u["role_label"], UserRole.ENGINEER)
        result.append(
            {
                "email": u["email"],
                "password": u["password"],
                "role": u["role_label"],
                "landing_page": ROLE_LANDING_PAGES.get(role, "/"),
            }
        )
    return result
