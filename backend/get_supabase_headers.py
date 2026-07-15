import httpx

try:
    url = "https://zswrykgxjkpmczkrdlbi.supabase.co"
    print(f"Fetching {url}...")
    resp = httpx.get(url)
    print("Status code:", resp.status_code)
    print("Headers:")
    for k, v in resp.headers.items():
        print(f"  {k}: {v}")
except Exception as e:
    print("Error:", e)
