from app.auth import hash_password
from app.models.entities import User, UserRole

ENGINEER_PASSWORD = "engineer123"

ENGINEERS: list[tuple[str, str]] = [
    ("Saba Kekelia", "saba.kekelia@btu.edu.ge"),
    ("Ana Gvantseladze", "ana.gvantseladze@btu.edu.ge"),
    ("Eka Kesanashvili", "eka.kesanashvili@btu.edu.ge"),
]

ENGINEER_EMAILS = {email for _, email in ENGINEERS}


def build_engineer_users(team_id: int | None = None) -> list[User]:
    return [
        User(
            name=name,
            email=email,
            role=UserRole.ENGINEER,
            team_id=team_id,
            password_hash=hash_password(ENGINEER_PASSWORD),
        )
        for name, email in ENGINEERS
    ]


DEMO_AUTH_USERS = {email: ENGINEER_PASSWORD for _, email in ENGINEERS}
