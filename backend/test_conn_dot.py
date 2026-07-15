import psycopg2

try:
    print("Testing Direct Connection with trailing dot (5432)...")
    conn = psycopg2.connect("postgresql://postgres:qExTXiV6sGMAtc0b@db.zswrykgxjkpmczkrdlbi.supabase.co.:5432/postgres")
    print("SUCCESS on 5432!")
    conn.close()
except Exception as e:
    print(f"FAILED on 5432: {e}")

try:
    print("\nTesting Direct Connection with trailing dot (6543)...")
    conn = psycopg2.connect("postgresql://postgres:qExTXiV6sGMAtc0b@db.zswrykgxjkpmczkrdlbi.supabase.co.:6543/postgres")
    print("SUCCESS on 6543!")
    conn.close()
except Exception as e:
    print(f"FAILED on 6543: {e}")
