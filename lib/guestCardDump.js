/**
 * Full Guest Card dump for email body + Google Calendar description.
 * Empty / unfilled fields show as "-".
 */

function field(data, key) {
  const v = data[key];
  if (v === undefined || v === null) return '-';
  const s = String(v).trim();
  return s === '' ? '-' : s;
}

/** "14:30" or "09:05" → "2:30 PM" / "9:05 AM"; "-" stays "-". */
function time24to12Display(raw) {
  const s = String(raw == null ? '' : raw).trim();
  if (s === '' || s === '-') return '-';
  const m = s.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return s;
  const h24 = parseInt(m[1], 10) % 24;
  const min = m[2];
  const ap = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 || 12;
  return `${h12}:${min} ${ap}`;
}

/** Plain-text sections only (no email intro/footer). */
function buildGuestCardSectionsPlain(data) {
  const d = data || {};
  const lines = [
    '--- PROPERTY INFORMATION ---',
    `Property Address: ${field(d, 'propertyAddress')}`,
    `Source: ${field(d, 'source')}`,
    `Prospect / Showing Name: ${field(d, 'prospect')}`,
    `Phone: ${field(d, 'phone')}`,
    `Email: ${field(d, 'email')}`,
    `Move-in Date / Lease Term: ${field(d, 'moveInDate')}`,
    `Showing date: ${field(d, 'showingDate')}`,
    `Showing start: ${time24to12Display(field(d, 'showingStart'))}`,
    `Showing end: ${time24to12Display(field(d, 'showingEnd'))}`,
    '',
    '--- HH ---',
    `Adults: ${field(d, 'adults')}`,
    `Kids: ${field(d, 'kids')}`,
    `Pets: ${field(d, 'pets')}`,
    `Total HH Income: ${field(d, 'totalHouseholdIncome')}`,
    `Smoking: ${field(d, 'smoking')}`,
    `Vehicles: ${field(d, 'vehicles')}`,
    '',
    '--- APPLICANTS ---'
  ];

  const applicantLabels = ['Main Applicant / Main Prospect', 'Applicant 2', 'Co-Applicant 3', 'Co-Applicant 4'];
  for (let i = 1; i <= 4; i++) {
    lines.push(`${applicantLabels[i - 1]}: ${field(d, `applicant${i}_name`)}`);
    lines.push(`  Employer: ${field(d, `applicant${i}_employer`)}`);
    lines.push(`  Job Duration (Year/Month): ${field(d, `applicant${i}_jobDuration`)}`);
    lines.push(`  Full Time / Part Time: ${field(d, `applicant${i}_empType`)}`);
    lines.push(`  Income: ${field(d, `applicant${i}_income`)}`);
    lines.push(`  Credit Score: ${field(d, `applicant${i}_creditScore`)}`);
    lines.push(`  Employment Income: ${field(d, `applicant${i}_ei`)}`);
    lines.push(`  Child Care Benefit: ${field(d, `applicant${i}_ccb`)}`);
  }

  lines.push('', '--- ADDITIONAL ---');
  lines.push(`Reason for moving out from current place: ${field(d, 'reasonForMoving')}`);
  lines.push(`Did you give proper move out notice? (Yes/No): ${field(d, 'moveOutNotice')}`);
  lines.push(`Did you pay your rent on time? (Yes/No/Any missed payments): ${field(d, 'rentOnTime')}`);
  lines.push(`Overall Impression / Behaviour: ${field(d, 'overallConditionRight')}`);
  lines.push(`Other Comments / Phone call summary: ${field(d, 'otherCommentsRight')}`);
  lines.push(`Recommend to Apply: ${field(d, 'recommended')}`);
  lines.push('', '--- SCREENING ---');
  lines.push(`Pre-screened by: ${field(d, 'preScreenedBy')}`);
  lines.push(`Date: ${field(d, 'date')}`);
  lines.push(`Extra Notes / Preferred Showing: ${field(d, 'notes')}`);
  lines.push(`Employment Stability / Notes: ${field(d, 'employmentStability')}`);

  return lines.join('\r\n');
}

/** Calendar description = full dump + short footer (fits Google limits). */
function buildGuestCardCalendarDescription(data) {
  const sections = buildGuestCardSectionsPlain(data);
  const footer = '\r\n\r\n---\r\nProperty showing\r\nDeva Rentals';
  const combined = sections + footer;
  return combined.length > 8000 ? combined.slice(0, 7997) + '...' : combined;
}

module.exports = {
  buildGuestCardSectionsPlain,
  buildGuestCardCalendarDescription
};
