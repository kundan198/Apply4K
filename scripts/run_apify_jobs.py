#!/usr/bin/env python3
"""Run the Apify LinkedIn jobs actor and save dataset items."""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request


API = "https://api.apify.com/v2"


def request_json(url: str, token: str, method: str = "GET", payload: dict | None = None) -> dict | list:
    data = None
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/json"}
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            body = resp.read().decode("utf-8")
            return json.loads(body) if body else {}
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Apify HTTP {exc.code}: {detail}") from exc


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--actor", default="curious_coder/linkedin-jobs-scraper")
    parser.add_argument("--queries")
    parser.add_argument("--location")
    parser.add_argument("--urls", nargs="*")
    parser.add_argument("--count", type=int, default=50)
    parser.add_argument("--out", required=True)
    parser.add_argument("--timeout", type=int, default=900)
    args = parser.parse_args()

    token = os.environ.get("APIFY_TOKEN", "").strip()
    if not token:
        print("APIFY_TOKEN is required", file=sys.stderr)
        return 2

    actor_id = urllib.parse.quote(args.actor.replace("/", "~"), safe="")
    run_url = f"{API}/acts/{actor_id}/runs"
    if args.urls:
        actor_input = {
            "urls": args.urls,
            "count": args.count,
        }
    else:
        if not args.queries or not args.location:
            parser.error("--queries and --location are required unless --urls is provided")
        actor_input = {
            "queries": args.queries,
            "location": args.location,
            "count": args.count,
        }
    run = request_json(run_url, token, method="POST", payload=actor_input)
    run_data = run.get("data", run)
    run_id = run_data["id"]
    print(f"Started Apify run {run_id}")

    deadline = time.time() + args.timeout
    status = run_data.get("status")
    dataset_id = run_data.get("defaultDatasetId")
    while time.time() < deadline:
        current = request_json(f"{API}/actor-runs/{run_id}", token)
        data = current.get("data", current)
        status = data.get("status")
        dataset_id = data.get("defaultDatasetId") or dataset_id
        print(f"status={status}")
        if status in {"SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"}:
            break
        time.sleep(10)

    if status != "SUCCEEDED":
        raise RuntimeError(f"Apify run ended with status {status}")
    if not dataset_id:
        raise RuntimeError("Apify run did not provide a dataset id")

    items_url = f"{API}/datasets/{dataset_id}/items?clean=true"
    items = request_json(items_url, token)
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(items, f, indent=2, ensure_ascii=False)
    print(f"Saved {len(items) if isinstance(items, list) else 0} items to {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
