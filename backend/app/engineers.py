from app.auth import hash_password
from app.models.entities import User, UserRole

DEMO_PASSWORD = "engineer123"

DEMO_USERS: list[tuple[str, str, UserRole]] = [
    ("Saba Kekelia", "saba.kekelia.1@btu.edu.ge", UserRole.ADMIN),
    ("Ana Gvantseladze", "ana.gvantseladze@btu.edu.ge", UserRole.MANAGER),
    ("Eka Kesanashvili", "eka.kesanashvili@btu.edu.ge", UserRole.ENGINEER),
    ("Giorgi Tabatadze", "giorgi.tabatadze@btu.edu.ge", UserRole.CHANGE_MANAGER),
]

ENGINEERS = [(name, email) for name, email, _ in DEMO_USERS]

DEMO_AUTH_USERS = {email: DEMO_PASSWORD for _, email, _ in DEMO_USERS}


def build_demo_users(team_id: int | None = None) -> list[User]:
    return [
        User(
            name=name,
            email=email,
            role=role,
            team_id=team_id,
            password_hash=hash_password(DEMO_PASSWORD),
        )
        for name, email, role in DEMO_USERS
    ]


build_engineer_users = build_demo_users
