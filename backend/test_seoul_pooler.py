import psycopg2

project_ref = "zswrykgxjkpmczkrdlbi"
password = "qExTXiV6sGMAtc0b"
host = "aws-0-ap-northeast-2.pooler.supabase.com"

# Test 1: Port 6543 (Transaction mode)
try:
    print("Testing Seoul Pooler on port 6543...")
    conn_str = f"postgresql://postgres.{project_ref}:{password}@{host}:6543/postgres?sslmode=require"
    conn = psycopg2.connect(conn_str)
    print("SUCCESS on 6543!")
    conn.close()
except Exception as e:
    print(f"FAILED on 6543: {e}")

# Test 2: Port 5432 (Session mode)
try:
    print("\nTesting Seoul Pooler on port 5432...")
    conn_str = f"postgresql://postgres.{project_ref}:{password}@{host}:5432/postgres?sslmode=require"
    conn = psycopg2.connect(conn_str)
    print("SUCCESS on 5432!")
    conn.close()
except Exception as e:
    print(f"FAILED on 5432: {e}")
