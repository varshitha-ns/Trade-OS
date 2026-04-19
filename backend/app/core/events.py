import asyncio
from typing import Callable, Dict, List, Any

class EventDispatcher:
    """
    A lightweight, asynchronous event bus for Continuous Intelligence.
    Allows agents to subscribe to events (e.g. RFQ_CREATED, CATALOG_CREATED)
    and execute logic automatically.
    """
    def __init__(self):
        self._subscribers: Dict[str, List[Callable]] = {}

    def subscribe(self, event_type: str, callback: Callable):
        """Register a callback for a specific event type."""
        if event_type not in self._subscribers:
            self._subscribers[event_type] = []
        self._subscribers[event_type].append(callback)

    async def emit(self, event_type: str, data: Any = None):
        """Emit an event asynchronously and trigger all subscribers without blocking."""
        print(f"📡 [EventDispatcher] Event emitted: {event_type}")
        if event_type in self._subscribers:
            for callback in self._subscribers[event_type]:
                # Fire and forget
                asyncio.create_task(self._execute_callback(callback, data))

    async def _execute_callback(self, callback: Callable, data: Any):
        try:
            if asyncio.iscoroutinefunction(callback):
                await callback(data)
            else:
                callback(data)
        except Exception as e:
            print(f"❌ [EventDispatcher] Error in subscriber for callback {callback.__name__}: {str(e)}")

# Global Singleton Event Bus
event_bus = EventDispatcher()
