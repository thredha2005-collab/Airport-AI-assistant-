import psycopg2

project_ref = "zswrykgxjkpmczkrdlbi"
password = "qExTXiV6sGMAtc0b"
host = "aws-0-ap-northeast-2.pooler.supabase.com"

# Test 1: Username = postgres, Database = project_ref
try:
    print("Testing Pooler: User = postgres, DB = project_ref...")
    conn_str = f"postgresql://postgres:{password}@{host}:6543/{project_ref}?sslmode=require"
    conn = psycopg2.connect(conn_str)
    print("SUCCESS!")
    conn.close()
except Exception as e:
    print(f"FAILED: {e}")

# Test 2: Username = postgres, Database = postgres, with options or search path
try:
    print("\nTesting Pooler: User = postgres, DB = postgres...")
    conn_str = f"postgresql://postgres:{password}@{host}:6543/postgres?sslmode=require"
    conn = psycopg2.connect(conn_str)
    print("SUCCESS!")
    conn.close()
except Exception as e:
    print(f"FAILED: {e}")
