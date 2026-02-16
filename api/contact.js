const { put } = require('@vercel/blob');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_FIELD_LENGTH = 2000;

function cleanText(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim().replace(/\s+/g, ' ').slice(0, MAX_FIELD_LENGTH);
}

function badRequest(res, message) {
  return res.status(400).json({ ok: false, error: message });
}

function buildSubmissionId(timestamp) {
  return `${timestamp.replace(/[:.]/g, '-')}-${Math.random().toString(36).slice(2, 10)}`;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed.' });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(500).json({ ok: false, error: 'Storage is not configured.' });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const firstName = cleanText(body.firstName);
  const lastName = cleanText(body.lastName);
  const email = cleanText(body.email);
  const phone = cleanText(body.phone);
  const careerStage = cleanText(body.careerStage);
  const sport = cleanText(body.sport);
  const message = cleanText(body.message);
  const referral = cleanText(body.referral);
  const website = cleanText(body.website);
  const turnstileToken = cleanText(body.turnstileToken);

  if (website) {
    return badRequest(res, 'Unable to process submission.');
  }

  if (!firstName || !lastName || !email) {
    return badRequest(res, 'First name, last name, and email are required.');
  }

  if (!EMAIL_REGEX.test(email)) {
    return badRequest(res, 'Please provide a valid email address.');
  }

  const submittedAt = new Date().toISOString();
  const submissionId = buildSubmissionId(submittedAt);
  const blobPath = `contact-submissions/${submissionId}.json`;

  const record = {
    submissionId,
    firstName,
    lastName,
    email,
    phone: phone || '',
    careerStage: careerStage || '',
    sport: sport || '',
    message: message || '',
    referral: referral || '',
    submittedAt,
    source: req.headers.origin || req.headers.referer || '',
    userAgent: req.headers['user-agent'] || '',
    turnstileToken: turnstileToken || ''
  };

  try {
    const blob = await put(blobPath, JSON.stringify(record, null, 2), {
      access: 'private',
      addRandomSuffix: false,
      contentType: 'application/json'
    });

    return res.status(200).json({ ok: true, id: submissionId, path: blobPath, url: blob.url });
  } catch (error) {
    console.error('Contact form storage error:', error);
    return res.status(500).json({ ok: false, error: 'Unable to save your message right now.' });
  }
};
