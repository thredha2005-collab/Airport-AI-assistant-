import psycopg2

passwords = ["qExTXiV6sGMAtc0b", "postgres", "admin", "root", "password", ""]

for p in passwords:
    try:
        print(f"Testing local Postgres with password '{p}'...")
        conn = psycopg2.connect(f"postgresql://postgres:{p}@localhost:5432/postgres")
        print(f"SUCCESS with password '{p}'!")
        conn.close()
        break
    except Exception as e:
        print(f"FAILED: {e}")
