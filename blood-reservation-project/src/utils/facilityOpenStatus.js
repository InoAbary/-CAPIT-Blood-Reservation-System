const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONDAY_FIRST = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function shortDay(day) {
  return day.slice(0, 3);
}

function formatDays(daysOpen) {
  const days = MONDAY_FIRST.filter((day) => daysOpen.includes(day));
  if (days.length === 7) return 'Daily';
  if (days.length === 5 && days.every((day, index) => day === MONDAY_FIRST[index])) return 'Mon–Fri';
  if (days.length === 2 && days[0] === 'Saturday' && days[1] === 'Sunday') return 'Sat–Sun';

  const groups = [];
  for (let index = 0; index < days.length;) {
    let end = index;
    while (end + 1 < days.length && MONDAY_FIRST.indexOf(days[end + 1]) === MONDAY_FIRST.indexOf(days[end]) + 1) end += 1;
    groups.push(end > index ? `${shortDay(days[index])}–${shortDay(days[end])}` : shortDay(days[index]));
    index = end + 1;
  }
  return groups.join(', ');
}

function displayTime(value) {
  const [hour, minute] = value.split(':').map(Number);
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}${minute ? `:${String(minute).padStart(2, '0')}` : ''} ${period}`;
}

export function formatFacilityHours(operatingHours, fallback = 'Hours to be confirmed') {
  if (operatingHours?.source !== 'branch_admin' || !operatingHours.daysOpen?.length) return fallback;
  const days = formatDays(operatingHours.daysOpen);
  const time = operatingHours.is24Hours
    ? '24 hours'
    : `${displayTime(operatingHours.opensAt)}–${displayTime(operatingHours.closesAt)}`;
  return `${days} · ${time}`;
}

function minutesFromTime(value) {
  if (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return null;
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function philippinesTime(timestamp) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(timestamp));
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return { weekday: values.weekday, minutes: Number(values.hour) * 60 + Number(values.minute) };
}

export function getFacilityOpenStatus(operatingHours, timestamp = Date.now()) {
  if (operatingHours?.source !== 'branch_admin' || !Array.isArray(operatingHours.daysOpen)) {
    return { state: 'unknown', label: 'Hours not confirmed' };
  }
  const daysOpen = operatingHours.daysOpen;
  if (daysOpen.length === 0) return { state: 'unknown', label: 'Hours not confirmed' };

  const { weekday, minutes } = philippinesTime(timestamp);
  const todayIndex = WEEKDAYS.indexOf(weekday);
  const today = WEEKDAYS[todayIndex];
  if (operatingHours.is24Hours) {
    const isOpen = daysOpen.includes(today);
    return { state: isOpen ? 'open' : 'closed', label: isOpen ? 'Open now' : 'Closed now' };
  }

  const opensAt = minutesFromTime(operatingHours.opensAt);
  const closesAt = minutesFromTime(operatingHours.closesAt);
  if (opensAt === null || closesAt === null) return { state: 'unknown', label: 'Hours not confirmed' };

  const previousDay = WEEKDAYS[(todayIndex + 6) % 7];
  const isOvernight = closesAt <= opensAt;
  const isOpen = isOvernight
    ? (daysOpen.includes(today) && minutes >= opensAt)
      || (daysOpen.includes(previousDay) && minutes < closesAt)
    : daysOpen.includes(today) && minutes >= opensAt && minutes < closesAt;
  return { state: isOpen ? 'open' : 'closed', label: isOpen ? 'Open now' : 'Closed now' };
}
