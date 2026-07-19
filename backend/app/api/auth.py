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
from app.schemas.schemas import LoginRequest, LoginResponse, RoleConfigResponse, UserProfile

router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer(auto_error=False)

DEMO_USERS = [
    {"email": "admin@opscore.com", "password": "admin123", "role_label": "Administrator"},
    {"email": "sre@opscore.com", "password": "engineer123", "role_label": "SRE Engineer"},
    {"email": "cto@opscore.com", "password": "manager123", "role_label": "Manager"},
    {"email": "change@opscore.com", "password": "change123", "role_label": "Change Manager"},
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


@router.get("/demo-users")
async def demo_users() -> list[dict]:
    from app.models.entities import UserRole
    from app.permissions import ROLE_LABELS, ROLE_LANDING_PAGES

    role_by_label = {label: role for role, label in ROLE_LABELS.items()}
    result = []
    for u in DEMO_USERS:
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
