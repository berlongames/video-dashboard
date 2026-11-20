from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from pydantic import BaseModel
import secrets

from app.core.config import get_settings

router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBasic()
settings = get_settings()


class LoginOk(BaseModel):
    username: str
    role: str = "admin"


def verify_admin(credentials: HTTPBasicCredentials = Depends(security)) -> str:
    correct_user = secrets.compare_digest(credentials.username, settings.admin_username)
    correct_pass = secrets.compare_digest(credentials.password, settings.admin_password)
    if not (correct_user and correct_pass):
        raise HTTPException(status_code=401, detail="Invalid credentials", headers={"WWW-Authenticate": "Basic"})
    return credentials.username


@router.get("/me", response_model=LoginOk)
def me(username: str = Depends(verify_admin)):
    return LoginOk(username=username)
