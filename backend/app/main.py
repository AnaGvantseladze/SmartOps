from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.api.routes import router
from app.config import settings
from app.database import Base, async_session, engine
from app.seed import ensure_auth_users, seed_demo_data


@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.seed import ensure_auth_schema

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await ensure_auth_schema(engine)
    if settings.seed_demo_data:
        async with async_session() as session:
            await seed_demo_data(session)
            await ensure_auth_users(session)
    yield
    await engine.dispose()


app = FastAPI(
    title="OpsCore API",
    description="Unified Service Lifecycle Platform — Alert, Incident, and Change Management",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api/v1")
app.include_router(router, prefix="/api/v1")


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "opscore-api"}
