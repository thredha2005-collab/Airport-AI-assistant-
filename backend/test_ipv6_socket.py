import socket

def test_ipv6(port):
    print(f"Testing socket connect to IPv6 address on port {port}...")
    try:
        # Create socket using AF_INET6
        s = socket.socket(socket.AF_INET6, socket.SOCK_STREAM)
        s.settimeout(5.0)
        s.connect(("2406:da12:557:f800:fb3b:6a62:57c1:18a5", port))
        print(f"Socket connect to IPv6 on port {port} SUCCESSFUL!")
        s.close()
    except Exception as e:
        print(f"Socket connect to IPv6 on port {port} FAILED: {e}")

test_ipv6(5432)
test_ipv6(6543)
