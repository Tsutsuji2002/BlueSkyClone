import requests
import time
import sys

def test_profile(handle):
    url = f"http://localhost:5000/api/users/profile/{handle}"
    start = time.time()
    try:
        response = requests.get(url, timeout=20)
        end = time.time()
        print(f"Profile: {handle}")
        print(f"Status Code: {response.status_code}")
        print(f"Latency: {end - start:.2f}s")
        if response.status_code == 200:
            data = response.json()
            user = data.get('user', {})
            print(f"Full Data: {data}")
            print(f"Display Name: {user.get('displayName')}")
            print(f"Following: {data.get('isFollowing')}")
            print(f"Followers: {user.get('followersCount')}")
        print("-" * 20)
    except Exception as e:
        print(f"Error for {handle}: {e}")

if __name__ == "__main__":
    handles = [
        "thedeerwhisperer.bsky.social",
        "bluesky.app",
        "did:plc:jrwqqeyrvd3sl4hxv7lqaarh" # Official Bluesky
    ]
    for h in handles:
        test_profile(h)
