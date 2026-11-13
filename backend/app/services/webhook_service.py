import httpx
import logging
from typing import Dict, Any
from app.core.config import settings

logger = logging.getLogger(__name__)


async def trigger_n8n_webhook(endpoint_path: str, payload: Dict[str, Any]) -> bool:
    """Asynchronously dispatches an event payload to the n8n orchestrator webhook."""
    webhook_base = settings.N8N_WEBHOOK_URL.rstrip("/")
    url = f"{webhook_base}/{endpoint_path.lstrip('/')}"

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            headers = {
                "Content-Type": "application/json",
                "X-Agent-Secret": settings.AGENT_INTERNAL_SECRET,
            }
            response = await client.post(url, json=payload, headers=headers)
            if response.status_code in [200, 201, 202]:
                logger.info(f"Successfully triggered n8n webhook: {url} | Status: {response.status_code}")
                return True
            else:
                logger.warning(f"n8n webhook responded with non-200 code: {response.status_code} at {url}")
                return False
    except Exception as e:
        logger.warning(f"Could not reach n8n webhook at {url} (Orchestrator may be starting or idle): {str(e)}")
        return False

