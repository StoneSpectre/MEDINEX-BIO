from uuid import UUID, UUID
from fastapi import HTTPException, status

# Hardcoded test user ID for now since JWT auth is mocked in Steps 1-3
MOCK_USER_ID = UUID("00000000-0000-0000-0000-000000000001")

async def get_current_user_id() -> UUID:
    """
    Mock authentication dependency.
    In production (Step 7), this will parse the JWT from the Authorization header,
    validate it against the issuer, and return the user's UUID.
    """
    return MOCK_USER_ID
