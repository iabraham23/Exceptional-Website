const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

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

function getEnv(name) {
  return (process.env[name] || '').trim();
}

function getStorageConfig() {
  const region = getEnv('AWS_REGION');
  const accessKeyId = getEnv('AWS_ACCESS_KEY_ID');
  const secretAccessKey = getEnv('AWS_SECRET_ACCESS_KEY') || getEnv('AWS_SECRET_ACESS_KEY');
  const bucket = getEnv('AWS_S3_BUCKET');

  if (!region || !accessKeyId || !secretAccessKey || !bucket) {
    return null;
  }

  return {
    bucket,
    clientConfig: {
      region,
      credentials: {
        accessKeyId,
        secretAccessKey
      }
    }
  };
}

function padDatePart(value) {
  return String(value).padStart(2, '0');
}

function buildObjectKey(timestamp, submissionId) {
  const date = new Date(timestamp);
  const year = date.getUTCFullYear();
  const month = padDatePart(date.getUTCMonth() + 1);
  const day = padDatePart(date.getUTCDate());
  return `contact-submissions/${year}/${month}/${day}/${submissionId}.json`;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed.' });
  }

  const storageConfig = getStorageConfig();
  if (!storageConfig) {
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
  const objectKey = buildObjectKey(submittedAt, submissionId);

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
    userAgent: req.headers['user-agent'] || ''
  };

  try {
    const s3Client = new S3Client(storageConfig.clientConfig);
    await s3Client.send(
      new PutObjectCommand({
        Bucket: storageConfig.bucket,
        Key: objectKey,
        Body: JSON.stringify(record, null, 2),
        ContentType: 'application/json',
        ServerSideEncryption: 'AES256'
      })
    );

    return res.status(200).json({ ok: true, id: submissionId });
  } catch (error) {
    console.error('Contact form storage error:', error, { objectKey });
    return res.status(500).json({ ok: false, error: 'Unable to save your message right now.' });
  }
};
