from fastapi import FastAPI

from auth.register import router as register_router
from auth.login import router as login_router
from auth.google import router as google_router
from auth.me import router as me_router
from auth.logout import router as logout_router
from auth.forgot_password import router as forgot_password_router
from auth.reset_password import router as reset_password_router
from auth.delete_account import router as delete_account_router


app = FastAPI(
    title="FastAPI-PROJECT-VC",
    version="1.0.0",
)


app.include_router(register_router)
app.include_router(login_router)
app.include_router(google_router)
app.include_router(me_router)
app.include_router(logout_router)
app.include_router(forgot_password_router)
app.include_router(reset_password_router)
app.include_router(delete_account_router)


@app.get("/")
def root():
    return {
        "message": "FastAPI-PROJECT-VC is running"
    }