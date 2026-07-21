from fastapi import WebSocket


class AlertEventManager:
    def __init__(self) -> None:
        self.active: list[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active.append(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        if websocket in self.active:
            self.active.remove(websocket)

    async def broadcast(self, message: dict) -> None:
        for connection in list(self.active):
            try:
                await connection.send_json(message)
            except Exception:
                self.disconnect(connection)


alert_events = AlertEventManager()


async def notify_alert_created(alert_id: int) -> None:
    await alert_events.broadcast({"type": "alert.created", "alert_id": alert_id})


async def notify_alert_updated(alert_id: int) -> None:
    await alert_events.broadcast({"type": "alert.updated", "alert_id": alert_id})
