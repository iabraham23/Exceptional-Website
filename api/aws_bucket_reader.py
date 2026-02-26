import json
import os
from datetime import datetime, timezone
from pathlib import Path

import boto3
from openpyxl import Workbook

try:
    from dotenv import load_dotenv

    load_dotenv()
except Exception:
    # Optional for local runs only; CI should use environment variables.
    pass


FIELDNAMES = [
    "submissionId",
    "submittedAt",
    "firstName",
    "lastName",
    "email",
    "phone",
    "careerStage",
    "sport",
    "referral",
    "message",
    "source",
]

SCRIPT_DIR = Path(__file__).resolve().parent


def get_env_first(*names):
    for name in names:
        value = (os.getenv(name) or "").strip()
        if value:
            return value
    return ""


def get_s3_client(region_name=None):
    region = region_name or get_env_first("AWS_REGION")
    access_key = get_env_first("AWS_READER_ACCESS_KEY", "AWS_ACCESS_KEY_ID")
    secret_key = get_env_first("AWS_READER_SECRET_ACCESS_KEY", "AWS_SECRET_ACCESS_KEY")
    session_token = get_env_first("AWS_READER_SESSION_TOKEN", "AWS_SESSION_TOKEN")

    kwargs = {"region_name": region}
    if access_key and secret_key:
        kwargs["aws_access_key_id"] = access_key
        kwargs["aws_secret_access_key"] = secret_key
    if session_token:
        kwargs["aws_session_token"] = session_token

    return boto3.client("s3", **kwargs)


def get_current_month(reference_utc=None):
    reference = reference_utc or datetime.now(timezone.utc)
    return reference.year, reference.month


def list_keys_for_month(s3_client, bucket, year, month):
    prefix = f"contact-submissions/{year}/{month:02d}/"
    paginator = s3_client.get_paginator("list_objects_v2")
    keys = []

    for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
        for obj in page.get("Contents", []):
            keys.append(obj["Key"])

    return keys


def fetch_lead_record(s3_client, bucket, key):
    body = s3_client.get_object(Bucket=bucket, Key=key)["Body"].read()
    return json.loads(body.decode("utf-8"))


def normalize_lead(record):
    return {
        "submissionId": record.get("submissionId", ""),
        "submittedAt": record.get("submittedAt", ""),
        "firstName": record.get("firstName", ""),
        "lastName": record.get("lastName", ""),
        "email": record.get("email", ""),
        "phone": record.get("phone", ""),
        "careerStage": record.get("careerStage", ""),
        "sport": record.get("sport", ""),
        "referral": record.get("referral", ""),
        "message": record.get("message", ""),
        "source": record.get("source", ""),
    }


def fetch_monthly_leads(bucket, year, month, region_name=None):
    s3_client = get_s3_client(region_name=region_name)
    keys = list_keys_for_month(s3_client, bucket, year, month)

    rows = []
    for key in keys:
        record = fetch_lead_record(s3_client, bucket, key)
        rows.append(normalize_lead(record))

    rows.sort(key=lambda row: row["submittedAt"])
    return rows


def write_leads_to_xlsx(rows, out_xlsx):
    output_path = Path(out_xlsx)
    if output_path.suffix.lower() != ".xlsx":
        raise ValueError("Output file must use the .xlsx extension.")

    workbook = Workbook()
    worksheet = workbook.active
    worksheet.title = "Leads"

    worksheet.append(FIELDNAMES)
    for row in rows:
        worksheet.append([row.get(field, "") for field in FIELDNAMES])

    if str(output_path.parent) not in ("", "."):
        output_path.parent.mkdir(parents=True, exist_ok=True)

    workbook.save(str(output_path))
    return str(output_path)


def export_month_to_xlsx(bucket, year, month, out_xlsx, region_name=None):
    rows = fetch_monthly_leads(bucket, year, month, region_name=region_name)
    written_path = write_leads_to_xlsx(rows, out_xlsx)
    return {
        "count": len(rows),
        "file": written_path,
        "bucket": bucket,
        "year": year,
        "month": month,
    }


def fetch_leads_for_month_to_xlsx(
    bucket=None,
    year=None,
    month=None,
    out_xlsx=None,
    region_name=None,
):
    bucket_name = bucket or get_env_first("AWS_S3_BUCKET")
    if not bucket_name:
        raise ValueError("Bucket name is required. Set AWS_S3_BUCKET or pass bucket explicitly.")

    target_year = int(year) if year is not None else None
    target_month = int(month) if month is not None else None

    if (target_year is None) ^ (target_month is None):
        raise ValueError("Provide both year and month, or neither.")

    if target_year is None and target_month is None:
        target_year, target_month = get_current_month()

    if target_month < 1 or target_month > 12:
        raise ValueError("Month must be between 1 and 12.")

    output_path = out_xlsx or str(
        SCRIPT_DIR / "contact_leads" / f"leads-{target_year}-{target_month:02d}.xlsx"
    )
    return export_month_to_xlsx(
        bucket_name, target_year, target_month, output_path, region_name=region_name
    )


if __name__ == "__main__":
    # Default script run exports current month using AWS env vars.
    result = fetch_leads_for_month_to_xlsx()
    print(json.dumps(result))
