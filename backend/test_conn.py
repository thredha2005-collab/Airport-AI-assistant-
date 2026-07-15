import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

# Test 1: Direct connection using hostname db.zswrykgxjkpmczkrdlbi.supabase.co
# Note: Since db.zswrykgxjkpmczkrdlbi.supabase.co only has IPv6 address, if IPv6 is not supported on client machine, this will fail.
try:
    print("Testing Direct Connection (IPv6)...")
    conn = psycopg2.connect("postgresql://postgres:qExTXiV6sGMAtc0b@db.zswrykgxjkpmczkrdlbi.supabase.co:5432/postgres")
    print("Direct Connection SUCCESSFUL!")
    conn.close()
except Exception as e:
    print(f"Direct Connection FAILED: {e}")

# Test 2: Connection Pooler (ap-south-1) with project-ref username on port 6543
try:
    print("\nTesting Pooler Connection (IPv4 ap-south-1)...")
    conn = psycopg2.connect("postgresql://postgres.zswrykgxjkpmczkrdlbi:qExTXiV6sGMAtc0b@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require")
    print("Pooler Connection SUCCESSFUL!")
    conn.close()
except Exception as e:
    print(f"Pooler Connection FAILED: {e}")

# Test 3: Connection Pooler (other region, e.g. us-east-1 just in case)
try:
    print("\nTesting Pooler Connection (IPv4 us-east-1)...")
    conn = psycopg2.connect("postgresql://postgres.zswrykgxjkpmczkrdlbi:qExTXiV6sGMAtc0b@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require")
    print("Pooler Connection SUCCESSFUL!")
    conn.close()
except Exception as e:
    print(f"Pooler Connection FAILED: {e}")
