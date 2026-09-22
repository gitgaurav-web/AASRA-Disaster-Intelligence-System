import requests
import json
import sqlite3
import time

def test_sms(key, phone="8544534027", msg="[AASRA] TEST EMERGENCY ALERT: Multi-hazard early warning active. Safe Shelter: Inter College. Helpline: 1077"):
    url = "https://www.fast2sms.com/dev/bulkV2"
    headers = {
        "authorization": key.strip(),
        "Content-Type": "application/json"
    }
    payload = {
        "route": "q",
        "message": msg,
        "language": "english",
        "flash": 0,
        "numbers": str(phone)
    }
    try:
        res = requests.post(url, headers=headers, json=payload, timeout=10)
        return res.status_code, res.json()
    except Exception as e:
        return 0, str(e)

if __name__ == "__main__":
    key = "qeFg3zICGWrX9mEjSoNiMkpyvdxbK52afl0w1TUDPYHc6nRZBLVKXd8zt1ukBwHy7rleimxUICN5YbP4"
    status, data = test_sms(key)
    print(f"Status: {status}")
    print(json.dumps(data, indent=2))
