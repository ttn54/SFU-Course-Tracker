"""
Background Worker for Seat Availability Monitoring.
Uses APScheduler to periodically check seat counts and send alerts.
"""
import asyncio
import logging
from datetime import datetime
from typing import Any

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from sqlmodel import Session, select

from database import engine
from models import Watcher, Section
from services.crawler import SFUCrawler
from config import settings

logger = logging.getLogger(__name__)


class SeatWatcherWorker:
    """Background worker that monitors seat availability."""
    
    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self.crawler = SFUCrawler()
        self.is_running = False
    
    def start(self) -> None:
        """Start the background worker."""
        if self.is_running:
            logger.warning("Worker is already running")
            return
        
        # Add the seat checking job
        self.scheduler.add_job(
            self.check_all_watchers,
            trigger=IntervalTrigger(minutes=settings.SEAT_CHECK_INTERVAL_MINUTES),
            id="seat_watcher",
            name="Check seat availability for all watchers",
            replace_existing=True
        )
        
        self.scheduler.start()
        self.is_running = True
        logger.info(f"Seat watcher worker started (checking every {settings.SEAT_CHECK_INTERVAL_MINUTES} minutes)")
    
    def stop(self) -> None:
        """Stop the background worker."""
        if not self.is_running:
            return
        
        self.scheduler.shutdown()
        self.is_running = False
        logger.info("Seat watcher worker stopped")
    
    async def check_all_watchers(self) -> None:
        """
        Main job that checks all active watchers.
        Groups by section to avoid redundant API calls.
        """
        try:
            logger.info("Starting seat availability check...")
            
            with Session(engine) as session:
                # Get all active watchers
                statement = select(Watcher).where(Watcher.is_active == True)
                watchers = session.exec(statement).all()
                
                if not watchers:
                    logger.info("No active watchers found")
                    return
                
                logger.info(f"Checking {len(watchers)} active watchers")
                
                # Group watchers by section to minimize API calls
                sections_to_check: dict[int, list[Watcher]] = {}
                for watcher in watchers:
                    if watcher.section_id not in sections_to_check:
                        sections_to_check[watcher.section_id] = []
                    sections_to_check[watcher.section_id].append(watcher)
                
                # Check each unique section
                alerts_sent = 0
                for section_id, section_watchers in sections_to_check.items():
                    seats_opened = await self._check_section(session, section_id, section_watchers)
                    if seats_opened:
                        alerts_sent += len(section_watchers)
                
                logger.info(f"Seat check complete. Alerts sent: {alerts_sent}")
                
        except Exception as e:
            logger.error(f"Error in check_all_watchers: {e}", exc_info=True)
    
    async def _check_section(
        self,
        session: Session,
        section_id: int,
        watchers: list[Watcher]
    ) -> bool:
        """
        Check a specific section for seat availability.
        
        Returns:
            True if seats became available, False otherwise
        """
        try:
            # Get the section from database
            section = session.get(Section, section_id)
            
            if not section:
                logger.warning(f"Section {section_id} not found")
                return False
            
            # Parse course info from section
            course = section.course
            if not course:
                logger.warning(f"Course not found for section {section_id}")
                return False
            
            # Fetch current seat count from SFU
            # Parse term format (e.g., "Spring 2026" -> "2026/spring")
            term_parts = section.term.split()
            if len(term_parts) == 2:
                season, year = term_parts
                term_param = f"{year}/{season.lower()}"
            else:
                term_param = "2026/spring"  # Default
            
            seat_data = await self.crawler.fetch_seat_count(
                dept=course.dept,
                number=course.number,
                section=section.section_code,
                term=term_param
            )
            
            # Check if seats opened up
            old_available = section.seats_total - section.seats_enrolled
            new_available = seat_data['seats_total'] - seat_data['seats_enrolled']
            
            # Update section in database
            section.seats_total = seat_data['seats_total']
            section.seats_enrolled = seat_data['seats_enrolled']
            section.waitlist_total = seat_data['waitlist_total']
            section.waitlist_enrolled = seat_data['waitlist_enrolled']
            section.updated_at = datetime.utcnow()
            session.add(section)
            session.commit()
            
            # If seats became available, send alerts
            if new_available > 0 and old_available == 0:
                logger.info(f"🎉 SEATS OPENED for {course.id} {section.section_code}!")
                
                for watcher in watchers:
                    await self._send_alert(watcher, section, new_available)
                
                return True
            
            elif new_available > old_available:
                logger.info(f"Seats increased for {course.id} {section.section_code}: {old_available} -> {new_available}")
                
                for watcher in watchers:
                    await self._send_alert(watcher, section, new_available)
                
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error checking section {section_id}: {e}", exc_info=True)
            return False
    
    async def _send_alert(
        self,
        watcher: Watcher,
        section: Section,
        seats_available: int
    ) -> None:
        """
        Send an alert to a watcher.
        For now, this just logs to console. In production, this would send an email.
        
        Args:
            watcher: The watcher object
            section: The section with available seats
            seats_available: Number of seats now available
        """
        course = section.course
        
        alert_message = (
            f"🔔 ALERT SENT to {watcher.user_email}\n"
            f"   Course: {course.dept} {course.number} - {course.title}\n"
            f"   Section: {section.section_code}\n"
            f"   Term: {section.term}\n"
            f"   Seats Available: {seats_available}/{section.seats_total}\n"
            f"   Instructor: {section.instructor or 'TBD'}\n"
        )
        
        logger.info(alert_message)
        
        # TODO: In production, send actual email here
        # await send_email(
        #     to=watcher.user_email,
        #     subject=f"Seats Available: {course.dept} {course.number}",
        #     body=alert_message
        # )
    
    async def check_specific_section(self, section_id: int) -> dict[str, Any]:
        """
        Manually trigger a check for a specific section.
        Useful for testing or on-demand checks.
        
        Returns:
            Dictionary with check results
        """
        try:
            with Session(engine) as session:
                section = session.get(Section, section_id)
                
                if not section:
                    return {
                        "success": False,
                        "message": f"Section {section_id} not found"
                    }
                
                # Get watchers for this section
                statement = select(Watcher).where(
                    Watcher.section_id == section_id,
                    Watcher.is_active == True
                )
                watchers = session.exec(statement).all()
                
                # Check the section
                seats_opened = await self._check_section(session, section_id, watchers)
                
                return {
                    "success": True,
                    "section_id": section_id,
                    "course": f"{section.course.dept} {section.course.number}",
                    "seats_available": section.seats_total - section.seats_enrolled,
                    "watchers_alerted": len(watchers) if seats_opened else 0,
                    "message": "Check complete"
                }
                
        except Exception as e:
            logger.error(f"Error checking section {section_id}: {e}")
            return {
                "success": False,
                "message": str(e)
            }


# Global worker instance
_worker_instance: SeatWatcherWorker | None = None


def get_worker() -> SeatWatcherWorker:
    """Get or create the global worker instance."""
    global _worker_instance
    
    if _worker_instance is None:
        _worker_instance = SeatWatcherWorker()
    
    return _worker_instance


def start_worker() -> None:
    """Start the background worker."""
    worker = get_worker()
    worker.start()


def stop_worker() -> None:
    """Stop the background worker."""
    worker = get_worker()
    worker.stop()
