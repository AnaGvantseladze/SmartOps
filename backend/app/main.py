import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.api.admin_routes import router as admin_router
from app.api.auth import router as auth_router
from app.api.webhook_routes import admin_router as webhook_admin_router, public_router as webhook_public_router
from app.api.notification_routes import router as notification_router
from app.api.routes import router
from app.config import settings
from app.database import async_session, engine
from app.startup import get_startup_error, initialize_database, verify_database_connection

logger = logging.getLogger("smartops")


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await initialize_database()
    except Exception:
        # Keep the API online so /health can surface startup failures.
        logger.exception("Continuing with degraded startup after database initialization failure")
    yield
    await engine.dispose()


app = FastAPI(
    title="SmartOps API",
    description="Unified service-lifecycle platform — alert, incident, and change management in a single, modular hub.",
    version="0.1.0",
    lifespan=lifespan,
)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s", request.url.path)
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "path": request.url.path,
            "startup_error": get_startup_error(),
        },
    )


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api/v1")
app.include_router(admin_router, prefix="/api/v1")
app.include_router(notification_router, prefix="/api/v1")
app.include_router(webhook_admin_router, prefix="/api/v1")
app.include_router(router, prefix="/api/v1")

# Public webhook endpoint (no auth — called by Postman or external systems)
app.include_router(webhook_public_router, prefix="/api/v1/webhooks")


@app.get("/health")
async def health():
    connected = await verify_database_connection()
    payload = {
        "status": "healthy" if connected and not get_startup_error() else "degraded",
        "service": "opscore-api",
        "database": settings.database_url.split(":", 1)[0],
        "database_status": "connected" if connected else "unavailable",
    }
    if get_startup_error():
        payload["startup_error"] = get_startup_error()
    return payload
