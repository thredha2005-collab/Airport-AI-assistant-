import httpx

try:
    ip = "2406:da12:557:f800:fb3b:6a62:57c1:18a5"
    url = f"http://ip-api.com/json/{ip}"
    print(f"Fetching IP info from {url}...")
    resp = httpx.get(url)
    print("Status:", resp.status_code)
    print(resp.text)
except Exception as e:
    print("Error:", e)
