import psycopg2

try:
    print("Testing local Supabase Postgres on localhost:54322...")
    conn = psycopg2.connect("postgresql://postgres:postgres@localhost:54322/postgres")
    print("Local Supabase Postgres SUCCESS!")
    conn.close()
except Exception as e:
    print(f"FAILED on 54322: {e}")
