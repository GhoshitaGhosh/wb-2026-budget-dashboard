"""Extract BP-3 department budget rows into a reviewable static JSON artifact.

Usage:
  python scripts/extract_bp3.py tmp/pdfs/2026_bp3.pdf data/extracted/bp3-budget-lines.json

The PDF is not committed. The extracted rows retain the source page, budget code,
four published periods, and the source's integer thousand-rupee unit.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import pdfplumber


CODE_RE = re.compile(r"^\s*(\d{2}-\d{4}-\d{2}-\d{3}-\d{3})\s+(.+)$")
DEPARTMENT_RE = re.compile(r"^\s*(.+? Department)\s+\[([A-Z]{2})\]\s*$")
VALUES_RE = re.compile(
    r"\s+(-?\d[\d,]*|-)\s+(-?\d[\d,]*|-)\s+(-?\d[\d,]*|-)\s+(-?\d[\d,]*|-)\s*$"
)


def parse_value(raw: str) -> int | None:
    if raw == "-":
        return None
    return int(raw.replace(",", ""))


def classify_amount(value: int | None) -> str:
    if value is None:
        return "not_stated"
    if value == 0:
        return "zero"
    if abs(value) == 1:
        return "token_provision"
    return "stated"


def funding_type(title: str) -> str:
    upper = title.upper()
    if "SNA-SPARSH" in upper or "{SPARSH}" in upper:
        return "centrally_sponsored_sparsh"
    if "CENTRAL SHARE" in upper or "CENTRAL ASSISTANCE" in upper:
        return "central_assistance"
    if "STATE SHARE" in upper:
        return "state_share"
    if "{EAP}" in upper or "EXTERNAL LOAN" in upper:
        return "externally_aided"
    if "{RIDF}" in upper:
        return "ridf"
    return "not_classified"


def finish(buffer: str | None, department: dict | None, page_number: int, rows: list[dict]) -> None:
    if not buffer or not department:
        return
    match = CODE_RE.match(" ".join(buffer.split()))
    if not match:
        return
    code, remainder = match.groups()
    values = VALUES_RE.search(remainder)
    if not values:
        return
    title = remainder[: values.start()].strip()
    if not title or title.lower().startswith(("total ", "major head")):
        return
    actual, budget, revised, current = [parse_value(value) for value in values.groups()]
    rows.append(
        {
            "budgetCode": code,
            "title": title,
            "departmentName": department["name"],
            "departmentCode": department["code"],
            "classification": "official_budget_line",
            "fundingType": funding_type(title),
            "amountStatus": classify_amount(current),
            "financials": {
                "actual2024Thousand": actual,
                "budget2025Thousand": budget,
                "revised2025Thousand": revised,
                "budget2026Thousand": current,
            },
            "source": {"sourceId": "bp-3", "page": page_number},
        }
    )


def extract(pdf_path: Path) -> list[dict]:
    rows: list[dict] = []
    department: dict | None = None
    buffer: str | None = None
    buffer_page = 0
    with pdfplumber.open(pdf_path) as pdf:
        for index, page in enumerate(pdf.pages[:276]):
            text = page.extract_text(layout=True) or ""
            for raw_line in text.splitlines():
                line = raw_line.strip()
                department_match = DEPARTMENT_RE.match(line)
                if department_match:
                    finish(buffer, department, buffer_page, rows)
                    buffer = None
                    department = {"name": department_match.group(1), "code": department_match.group(2)}
                    continue
                if CODE_RE.match(line):
                    finish(buffer, department, buffer_page, rows)
                    buffer = line
                    buffer_page = index + 1
                elif buffer and line and not line.startswith(("Total -", "Grand Total", "Salaries :", "Other Than Salaries", "Major Head :")):
                    if any(marker in line for marker in ("Rupees in Thousand", "Demand / Major", "Actuals Budget Revised Budget", "2024-2025")):
                        continue
                    buffer = f"{buffer} {line}"
            finish(buffer, department, buffer_page, rows)
            buffer = None
    deduped = {f"{row['departmentCode']}|{row['budgetCode']}": row for row in rows}
    return list(deduped.values())


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("Usage: extract_bp3.py <bp3.pdf> <output.json>")
    pdf_path = Path(sys.argv[1])
    output_path = Path(sys.argv[2])
    output_path.parent.mkdir(parents=True, exist_ok=True)
    rows = extract(pdf_path)
    output_path.write_text(json.dumps({"schemaVersion": 1, "sourceId": "bp-3", "rows": rows}, indent=2) + "\n", encoding="utf-8")
    print(f"Extracted {len(rows)} BP-3 budget lines to {output_path}.")


if __name__ == "__main__":
    main()
