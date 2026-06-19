"""Sound settings model — per-user audio preferences."""

from sqlalchemy import Column, Integer, Float, Boolean, ForeignKey
from sqlalchemy.orm import relationship

from ..core.database import Base


class SoundSettings(Base):
    __tablename__ = "sound_settings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    master_volume = Column(Float, default=0.7)
    music_volume = Column(Float, default=0.5)
    sfx_volume = Column(Float, default=0.7)
    muted = Column(Boolean, default=False)

    user = relationship("User")
