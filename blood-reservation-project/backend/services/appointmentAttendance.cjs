const Appointment = require('../../db/models/appointmentSchedules.cjs');

const LAST_APPOINTMENT_TIME = '15:00';

const manilaDay = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Asia/Manila',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function formatManilaDay(date) {
  return manilaDay.format(date);
}

function getNoShowDeadline(date) {
  return new Date(`${formatManilaDay(date)}T${LAST_APPOINTMENT_TIME}:00+08:00`);
}

function markNoShows(scope = {}, now = new Date()) {
  return Appointment.updateMany(
    {
      ...scope,
      status: 'approved',
      noShowAt: { $lt: now },
      date: { $lte: now },
    },
    { $set: { status: 'no_show' } },
    { runValidators: true }
  );
}

function startAppointmentAttendance() {
  let running = false;

  async function check() {
    if (running) return;
    running = true;

    try {
      await markNoShows();
    } catch (error) {
      console.error('Appointment attendance check failed:', error.message);
    } finally {
      running = false;
    }
  }

  void check();
  const timer = setInterval(check, 60000);
  timer.unref();
  return () => clearInterval(timer);
}

module.exports = {
  formatManilaDay,
  getNoShowDeadline,
  markNoShows,
  startAppointmentAttendance,
};