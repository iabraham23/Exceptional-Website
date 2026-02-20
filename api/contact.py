import json
import os
import random
import re
import string
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler

import boto3


EMAIL_REGEX = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
MAX_FIELD_LENGTH = 2000


def clean_text(value):
    if not isinstance(value, str):
        return ""
    return re.sub(r"\s+", " ", value.strip())[:MAX_FIELD_LENGTH]


def get_env(name):
    return (os.getenv(name) or "").strip()


def get_storage_config():
    region = get_env("AWS_REGION")
    access_key_id = get_env("AWS_WRITER_ACCESS_KEY_ID") or get_env("AWS_ACCESS_KEY_ID")
    secret_access_key = (
        get_env("AWS_WRITER_SECRET_ACCESS_KEY")
        or get_env("AWS_SECRET_ACCESS_KEY")
        or get_env("AWS_SECRET_ACESS_KEY")
    )
    session_token = get_env("AWS_WRITER_SESSION_TOKEN") or get_env("AWS_SESSION_TOKEN")
    bucket = get_env("AWS_S3_BUCKET")

    if not region or not access_key_id or not secret_access_key or not bucket:
        return None

    return {
        "region": region,
        "access_key_id": access_key_id,
        "secret_access_key": secret_access_key,
        "session_token": session_token,
        "bucket": bucket,
    }


def build_submission_id(timestamp):
    safe_timestamp = timestamp.replace(":", "-").replace(".", "-")
    random_suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=8))
    return f"{safe_timestamp}-{random_suffix}"


def build_object_key(now_utc, submission_id):
    year = now_utc.year
    month = f"{now_utc.month:02d}"
    day = f"{now_utc.day:02d}"
    return f"contact-submissions/{year}/{month}/{day}/{submission_id}.json"


def to_iso_utc(now_utc):
    return now_utc.isoformat(timespec="milliseconds").replace("+00:00", "Z")


def send_json(handler, status_code, payload):
    body = json.dumps(payload).encode("utf-8")
    handler.send_response(status_code)
    handler.send_header("Content-Type", "application/json")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


def bad_request(handler, message):
    send_json(handler, 400, {"ok": False, "error": message})


def parse_json_body(handler):
    try:
        content_length = int(handler.headers.get("content-length", "0"))
    except ValueError:
        content_length = 0

    if content_length <= 0:
        return {}

    raw = handler.rfile.read(content_length)
    try:
        parsed = json.loads(raw.decode("utf-8"))
    except Exception:
        return {}

    return parsed if isinstance(parsed, dict) else {}


class handler(BaseHTTPRequestHandler):
    def _method_not_allowed(self):
        send_json(self, 405, {"ok": False, "error": "Method not allowed."})

    def do_POST(self):
        storage_config = get_storage_config()
        if not storage_config:
            send_json(self, 500, {"ok": False, "error": "Storage is not configured."})
            return

        body = parse_json_body(self)
        first_name = clean_text(body.get("firstName"))
        last_name = clean_text(body.get("lastName"))
        email = clean_text(body.get("email"))
        phone = clean_text(body.get("phone"))
        career_stage = clean_text(body.get("careerStage"))
        sport = clean_text(body.get("sport"))
        message = clean_text(body.get("message"))
        referral = clean_text(body.get("referral"))
        website = clean_text(body.get("website"))

        if website:
            bad_request(self, "Unable to process submission.")
            return

        if not first_name or not last_name or not email:
            bad_request(self, "First name, last name, and email are required.")
            return

        if not EMAIL_REGEX.match(email):
            bad_request(self, "Please provide a valid email address.")
            return

        now_utc = datetime.now(timezone.utc)
        submitted_at = to_iso_utc(now_utc)
        submission_id = build_submission_id(submitted_at)
        object_key = build_object_key(now_utc, submission_id)

        record = {
            "submissionId": submission_id,
            "firstName": first_name,
            "lastName": last_name,
            "email": email,
            "phone": phone or "",
            "careerStage": career_stage or "",
            "sport": sport or "",
            "message": message or "",
            "referral": referral or "",
            "submittedAt": submitted_at,
            "source": self.headers.get("origin") or self.headers.get("referer") or "",
            "userAgent": self.headers.get("user-agent") or "",
        }

        try:
            s3_client = boto3.client(
                "s3",
                region_name=storage_config["region"],
                aws_access_key_id=storage_config["access_key_id"],
                aws_secret_access_key=storage_config["secret_access_key"],
                aws_session_token=storage_config["session_token"] or None,
            )
            s3_client.put_object(
                Bucket=storage_config["bucket"],
                Key=object_key,
                Body=json.dumps(record, indent=2).encode("utf-8"),
                ContentType="application/json",
                ServerSideEncryption="AES256",
            )
            send_json(self, 200, {"ok": True, "id": submission_id})
        except Exception as error:
            print(f"Contact form storage error: {error} objectKey={object_key}", flush=True)
            send_json(self, 500, {"ok": False, "error": "Unable to save your message right now."})

    do_GET = _method_not_allowed
    do_PUT = _method_not_allowed
    do_PATCH = _method_not_allowed
    do_DELETE = _method_not_allowed
    do_OPTIONS = _method_not_allowed
    do_HEAD = _method_not_allowed
