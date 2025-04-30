from pydantic import BaseModel

class TopicRead(BaseModel):
    id: int
    name: str

    class Config:
        orm_mode = True
