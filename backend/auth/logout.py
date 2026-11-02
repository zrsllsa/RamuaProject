from fastapi import APIRouter

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


@router.post("/logout")
def logout():
    return {
        "message": "Logout endpoint"
    }