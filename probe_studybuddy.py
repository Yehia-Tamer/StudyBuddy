import json
import sys

import httpx

BASE = "http://localhost:8000"
USER = {"username": "eval-user-a", "email": "eval-user-a@example.com", "password": "EvalUser!2026"}
PDF = "physics_notes.pdf"
QUESTION = sys.argv[1] if len(sys.argv) > 1 else "What is Newton's second law?"


def show(label, data):
    print(f"\n=== {label} ===")
    print(json.dumps(data, indent=2, ensure_ascii=False, default=str))


with httpx.Client(base_url=BASE, timeout=180) as client:
    print("register:", client.post("/auth/register", json=USER).status_code)  # error on reruns is fine

    r = client.post("/auth/login", data={"username": USER["username"], "password": USER["password"]})
    r.raise_for_status()
    client.headers["Authorization"] = f"Bearer {r.json()['access_token']}"

    with open(PDF, "rb") as f:
        r = client.post("/documents/pdf", files={"file": (PDF, f, "application/pdf")})
    r.raise_for_status()
    document = r.json()
    show("document", document)

    r = client.post("/conversations/", json={"document_id": document["id"]})
    r.raise_for_status()
    conversation_id = r.json()["id"]

    r = client.post(f"/conversations/{conversation_id}/messages", json={"content": QUESTION})
    print("\nmessage status:", r.status_code, f"({r.elapsed.total_seconds():.1f}s)")
    r.raise_for_status()
    show("response", r.json())