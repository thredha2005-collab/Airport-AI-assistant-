import psycopg2

regions = [
    "ap-south-1", "ap-southeast-1", "ap-southeast-2", "ap-northeast-1", "ap-northeast-2",
    "eu-west-1", "eu-west-2", "eu-west-3", "eu-central-1", "eu-north-1",
    "us-east-1", "us-east-2", "us-west-1", "us-west-2", "sa-east-1", "ca-central-1"
]

project_ref = "zswrykgxjkpmczkrdlbi"
password = "qExTXiV6sGMAtc0b"

for r in regions:
    host = f"aws-0-{r}.pooler.supabase.com"
    conn_str = f"postgresql://postgres.{project_ref}:{password}@{host}:6543/postgres?sslmode=require"
    try:
        print(f"Trying region {r} ({host})...")
        conn = psycopg2.connect(conn_str)
        print(f"SUCCESS in region {r}!!!")
        conn.close()
        break
    except Exception as e:
        msg = str(e)
        if "tenant/user postgres" in msg and "not found" in msg:
            # Tenant not found, meaning wrong region
            continue
        else:
            # Tenant found, but maybe password/other issue, or it actually worked!
            print(f"Tenant found in region {r}! Result: {msg}")
            break
else:
    print("No region matched.")
