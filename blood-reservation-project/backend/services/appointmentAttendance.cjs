const Appointment = require('../../db/models/appointmentSchedules.cjs');
const Donation = require('../../db/models/donation.cjs');

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

async function completeRecordedAppointments() {
  const appointments = await Appointment.aggregate([
    { $match: { status: 'attended' } },
    { $lookup: {
      from: Donation.collection.name,
      localField: '_id',
      foreignField: '_id',
      as: 'linkedDonation',
    } },
    { $match: { $expr: { $eq: [{ $arrayElemAt: ['$linkedDonation.appointmentID', 0] }, '$_id'] } } },
    { $project: { _id: 1 } },
  ]);

  if (appointments.length) {
    await Appointment.updateMany(
      { _id: { $in: appointments.map(appointment => appointment._id) }, status: 'attended' },
      { $set: { status: 'completed' } },
      { runValidators: true }
    );
  }
}

function startAppointmentAttendance() {
  let running = false;

  async function check() {
    if (running) return;
    running = true;

    try {
      await Promise.all([markNoShows(), completeRecordedAppointments()]);
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