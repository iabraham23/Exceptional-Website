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
    access_key_id = get_env("AWS_ACCESS_KEY_ID")
    secret_access_key = get_env("AWS_SECRET_ACCESS_KEY") or get_env("AWS_SECRET_ACESS_KEY")
    bucket = get_env("AWS_S3_BUCKET")

    if not region or not access_key_id or not secret_access_key or not bucket:
        return None

    return {
        "bucket": bucket,
        "region": region,
        "access_key_id": access_key_id,
        "secret_access_key": secret_access_key,
    }


def build_submission_id(timestamp):
    safe_timestamp = timestamp.replace(":", "-").replace(".", "-")
    random_suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=8))
    return f"{safe_timestamp}-{random_suffix}"


def build_object_key(timestamp, submission_id):
    date = datetime.fromisoformat(timestamp.replace("Z", "+00:00")).astimezone(timezone.utc)
    return f"contact-submissions/{date.year}/{date.month:02d}/{date.day:02d}/{submission_id}.json"


def bad_request(handler, message):
    return handler.json_response(400, {"ok": False, "error": message})


class handler(BaseHTTPRequestHandler):
    def json_response(self, status_code, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def method_not_allowed(self):
        return self.json_response(405, {"ok": False, "error": "Method not allowed."})

    def do_GET(self):
        return self.method_not_allowed()

    def do_HEAD(self):
        return self.method_not_allowed()

    def do_PUT(self):
        return self.method_not_allowed()

    def do_PATCH(self):
        return self.method_not_allowed()

    def do_DELETE(self):
        return self.method_not_allowed()

    def do_OPTIONS(self):
        return self.method_not_allowed()

    def do_POST(self):
        storage_config = get_storage_config()
        if not storage_config:
            return self.json_response(500, {"ok": False, "error": "Storage is not configured."})

        content_length = int(self.headers.get("Content-Length", "0") or "0")
        raw_body = self.rfile.read(content_length) if content_length > 0 else b""

        body = {}
        if raw_body:
            try:
                parsed = json.loads(raw_body.decode("utf-8"))
                if isinstance(parsed, dict):
                    body = parsed
            except Exception:
                body = {}

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
            return bad_request(self, "Unable to process submission.")

        if not first_name or not last_name or not email:
            return bad_request(self, "First name, last name, and email are required.")

        if not EMAIL_REGEX.match(email):
            return bad_request(self, "Please provide a valid email address.")

        submitted_at = (
            datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")
        )
        submission_id = build_submission_id(submitted_at)
        object_key = build_object_key(submitted_at, submission_id)

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
            )
            s3_client.put_object(
                Bucket=storage_config["bucket"],
                Key=object_key,
                Body=json.dumps(record, indent=2, ensure_ascii=False),
                ContentType="application/json",
                ServerSideEncryption="AES256",
            )
            return self.json_response(200, {"ok": True, "id": submission_id})
        except Exception as error:
            print(f"Contact form storage error: {error}; objectKey={object_key}")
            return self.json_response(
                500, {"ok": False, "error": "Unable to save your message right now."}
            )
