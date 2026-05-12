/**
 * Form posts to this same origin (Node server): /api/submit-form
 * Calendar: /api/create-event (needs OAuth vars in server .env — App Password does not work for Calendar)
 */
const CALENDAR_API = {
  path: '/api/create-event',
  gcalSecret: ''
};

const form = document.getElementById('tenant-form');
const submitBtn = document.getElementById('submit-btn');
const clearBtn = document.getElementById('clear-btn');
const addGoogleCalendarBtn = document.getElementById('add-google-calendar-btn');
const toast = document.getElementById('toast');

function sync12hWrapToHidden(wrap) {
  const hidden = wrap.querySelector('input[type="hidden"]');
  if (!hidden) return;
  const hourEl = wrap.querySelector('.time-12h-hour');
  const minEl = wrap.querySelector('.time-12h-minute');
  const apEl = wrap.querySelector('.time-12h-ampm');
  const h = hourEl.value;
  const m = minEl.value;
  const ap = apEl.value;
  if (h === '' || m === '' || ap === '') {
    hidden.value = '';
    return;
  }
  const hNum = parseInt(h, 10);
  const mNum = parseInt(m, 10);
  let hour24;
  if (ap === 'AM') {
    hour24 = hNum === 12 ? 0 : hNum;
  } else {
    hour24 = hNum === 12 ? 12 : hNum + 12;
  }
  hidden.value = `${String(hour24).padStart(2, '0')}:${String(mNum).padStart(2, '0')}`;
}

function syncAll12hTimes() {
  document.querySelectorAll('[data-time-sync]').forEach(sync12hWrapToHidden);
}

function init12hTimePickers() {
  const hourOpts =
    '<option value="">—</option>' +
    Array.from({ length: 12 }, (_, i) => {
      const v = i + 1;
      return `<option value="${v}">${v}</option>`;
    }).join('');
  const minOpts =
    '<option value="">—</option>' +
    Array.from({ length: 60 }, (_, i) => `<option value="${i}">${String(i).padStart(2, '0')}</option>`).join('');
  const apOpts = '<option value="">—</option><option value="AM">AM</option><option value="PM">PM</option>';

  document.querySelectorAll('[data-time-sync]').forEach((wrap) => {
    const hSel = wrap.querySelector('.time-12h-hour');
    const mSel = wrap.querySelector('.time-12h-minute');
    const aSel = wrap.querySelector('.time-12h-ampm');
    if (hSel.dataset.inited === '1') return;
    hSel.dataset.inited = '1';
    hSel.innerHTML = hourOpts;
    mSel.innerHTML = minOpts;
    aSel.innerHTML = apOpts;
    const update = () => sync12hWrapToHidden(wrap);
    hSel.addEventListener('change', update);
    mSel.addEventListener('change', update);
    aSel.addEventListener('change', update);
  });
  syncAll12hTimes();
}

function getFormData() {
  syncAll12hTimes();
  const fd = new FormData(form);
  const data = {};
  for (const [key, value] of fd.entries()) {
    data[key] = value;
  }
  return data;
}

function showToast(message, type, durationMs) {
  toast.textContent = message;
  toast.className = 'toast show ' + (type === 'error' ? 'error' : 'success');
  const ms = durationMs != null ? durationMs : type === 'error' ? 5200 : 4200;
  setTimeout(() => toast.classList.remove('show'), ms);
}

function showSubmitSuccessToast(sentTo, bccTo) {
  const lines = ['Form submitted', '', 'Your Guest Card has been emailed.'];
  if (sentTo) lines.push('', sentTo);
  if (bccTo && bccTo !== sentTo) lines.push('', `Copy also sent to: ${bccTo}`);
  lines.push('', 'If you do not see it, check Spam or Promotions.');
  showToast(lines.join('\n'), 'success', 6500);
}

function setSubmitting(loading) {
  submitBtn.disabled = loading;
  submitBtn.textContent = loading ? 'Sending...' : 'Submit Form';
}

async function sendEmail(data) {
  try {
    const res = await fetch('/api/submit-form', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    let json = {};
    try {
      json = await res.json();
    } catch {
      /* ignore */
    }
    if (!res.ok) {
      showToast(json.error || json.detail || `Send failed (${res.status})`, 'error');
      return false;
    }
    return { ok: true, sentTo: json.sentTo, bccTo: json.bccTo };
  } catch (err) {
    console.error(err);
    showToast('Could not reach server. Run `npm start` and open http://localhost:3000', 'error');
    return false;
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = getFormData();
  setSubmitting(true);
  const ok = await sendEmail(data);
  setSubmitting(false);
  if (ok && ok.ok) {
    showSubmitSuccessToast(ok.sentTo, ok.bccTo);
    form.reset();
    syncAll12hTimes();
  } else if (ok === false) {
    /* error already toasted */
  }
});

clearBtn.addEventListener('click', () => {
  form.reset();
  syncAll12hTimes();
  showToast('Form cleared.', 'success');
});

function padTimeForDate(timeStr) {
  if (!timeStr) return null;
  return timeStr.length === 5 ? `${timeStr}:00` : timeStr;
}

/** Local calendar day + N (no UTC), for end-after-midnight. */
function ymdAddDays(ymd, deltaDays) {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(y, m - 1, d + deltaDays);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

function timeToMinutes(hms) {
  const [h, m] = hms.split(':').map(Number);
  return h * 60 + m;
}

function calendarApiUrl() {
  try {
    return new URL(CALENDAR_API.path, window.location.origin).toString();
  } catch {
    return CALENDAR_API.path;
  }
}

async function createCalendarEventFromForm() {
  const data = getFormData();
  const dateStr = (data.showingDate || '').trim();
  const startT = padTimeForDate((data.showingStart || '').trim());
  const endT = padTimeForDate((data.showingEnd || '').trim());

  if (!dateStr || !startT || !endT) {
    showToast('Please set showing date, start time, and end time.', 'error');
    return;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    showToast('Invalid date. Check your entries.', 'error');
    return;
  }

  let endYmd = dateStr;
  if (timeToMinutes(endT) <= timeToMinutes(startT)) {
    endYmd = ymdAddDays(dateStr, 1);
  }

  const startDateTime = `${dateStr}T${startT}`;
  const endDateTime = `${endYmd}T${endT}`;
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Calendar title: address → phone → prospect → Deva Rentals → Property showing
  const addr = (data.propertyAddress || '').trim();
  const phone = (data.phone || '').trim();
  const prospect = (data.prospect || '').trim();
  const titleOrdered = [addr, phone, prospect].filter(Boolean);
  const suffix = ' — Deva Rentals — Property showing';
  const summary =
    titleOrdered.length > 0
      ? `${titleOrdered.join(' — ')}${suffix}`
      : 'Deva Rentals — Property showing';
  const location = addr || undefined;

  const headers = { 'Content-Type': 'application/json' };
  if (CALENDAR_API.gcalSecret) {
    headers['x-gcal-secret'] = CALENDAR_API.gcalSecret;
  }

  const payload = {
    summary,
    location,
    startDateTime,
    endDateTime,
    timeZone,
    formData: data
  };

  addGoogleCalendarBtn.disabled = true;
  const prevLabel = addGoogleCalendarBtn.textContent;
  addGoogleCalendarBtn.textContent = 'Saving to calendar…';

  try {
    const res = await fetch(calendarApiUrl(), {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    let json = {};
    try {
      json = await res.json();
    } catch {
      /* ignore */
    }

    if (!res.ok) {
      const msg =
        json.error ||
        json.detail ||
        (res.status === 503
          ? 'Calendar not configured on server (.env OAuth vars). App Password is only for email.'
          : `Request failed (${res.status})`);
      showToast(String(msg), 'error');
      return;
    }

    showToast('Saved to your Google Calendar.', 'success');
  } catch (e) {
    console.error(e);
    showToast('Could not reach calendar API.', 'error');
  } finally {
    addGoogleCalendarBtn.disabled = false;
    addGoogleCalendarBtn.textContent = prevLabel;
  }
}

if (addGoogleCalendarBtn) {
  addGoogleCalendarBtn.addEventListener('click', () => {
    createCalendarEventFromForm();
  });
}

init12hTimePickers();
