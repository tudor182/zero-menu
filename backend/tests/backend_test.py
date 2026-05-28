"""ZERO Menu API - end-to-end backend tests using requests against public URL."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8000").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@zero.ro"
ADMIN_PASSWORD = "admin123"


# ---------- Fixtures ----------
@pytest.fixture(scope="session")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


@pytest.fixture(scope="session")
def token(s):
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def auth_headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# ---------- Public endpoints ----------
class TestPublic:
    def test_root(self, s):
        r = s.get(f"{API}/")
        assert r.status_code == 200
        assert r.json().get("status") == "ok"

    def test_home_trending(self, s):
        r = s.get(f"{API}/home")
        assert r.status_code == 200
        data = r.json()
        assert "trending" in data
        assert isinstance(data["trending"], list)
        assert len(data["trending"]) <= 6

    def test_tipuri_mancare(self, s):
        r = s.get(f"{API}/tipuri", params={"subcategorie": "mancare"})
        assert r.status_code == 200
        tipuri = r.json()["tipuri"]
        assert len(tipuri) == 15
        assert "Burger" in tipuri and "SUSHI" in tipuri

    def test_tipuri_bauturi(self, s):
        r = s.get(f"{API}/tipuri", params={"subcategorie": "bauturi"})
        assert r.status_code == 200
        tipuri = r.json()["tipuri"]
        assert len(tipuri) == 13
        assert "Cocktails" in tipuri

    def test_produse_terasa_mancare(self, s):
        r = s.get(f"{API}/produse", params={"categorie": "terasa", "subcategorie": "mancare"})
        assert r.status_code == 200
        d = r.json()
        assert d["total"] > 0
        assert all(x["categorie"] == "terasa" and x["subcategorie"] == "mancare" for x in d["items"])
        assert len(d["tipuri"]) >= 10

    def test_produse_filter_by_tip(self, s):
        r = s.get(f"{API}/produse", params={"categorie": "restaurant", "subcategorie": "bauturi", "tip": "Cocktails"})
        assert r.status_code == 200
        d = r.json()
        assert d["total"] >= 1
        for x in d["items"]:
            assert x["tip"] == "Cocktails"
            assert x["categorie"] == "restaurant"

    def test_get_produs_increments_views(self, s):
        # pick first available product
        r = s.get(f"{API}/produse", params={"categorie": "terasa", "subcategorie": "mancare", "limit": 1})
        items = r.json()["items"]
        assert items, "Expected seeded produse"
        pid = items[0]["id"]
        # Get current views
        before = s.get(f"{API}/produse", params={"categorie": "terasa", "subcategorie": "mancare", "limit": 200}).json()["items"]
        before_views = next(x["vizualizari"] for x in before if x["id"] == pid)
        # Hit detail endpoint
        r2 = s.get(f"{API}/produse/{pid}")
        assert r2.status_code == 200
        produs = r2.json()
        assert produs["id"] == pid
        assert produs["vizualizari"] == before_views + 1

    def test_get_produs_404(self, s):
        r = s.get(f"{API}/produse/non-existent-id-xyz")
        assert r.status_code == 404


# ---------- Auth ----------
class TestAuth:
    def test_login_success(self, s):
        r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200
        d = r.json()
        assert "access_token" in d
        assert d["user"]["email"] == ADMIN_EMAIL
        assert d["user"]["role"] == "admin"

    def test_login_bad_password(self, s):
        r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrongpass"})
        assert r.status_code == 401

    def test_login_unknown_user(self, s):
        r = s.post(f"{API}/auth/login", json={"email": "nope@zero.ro", "password": "x"})
        assert r.status_code == 401

    def test_me_with_token(self, s, auth_headers):
        r = s.get(f"{API}/auth/me", headers=auth_headers)
        assert r.status_code == 200
        d = r.json()
        assert d["email"] == ADMIN_EMAIL
        assert d["role"] == "admin"

    def test_me_without_token(self, s):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401


# ---------- Admin CRUD ----------
class TestAdminCRUD:
    def test_create_requires_auth(self, s):
        r = requests.post(f"{API}/admin/produse", json={
            "nume": "TEST_x", "descriere": "x", "pret": 1.0,
            "categorie": "terasa", "subcategorie": "mancare", "tip": "Burger"
        })
        assert r.status_code == 401

    def test_full_crud_lifecycle(self, s, auth_headers):
        # CREATE
        payload = {
            "nume": "TEST_ZERO_Item",
            "descriere": "Created by automated test",
            "pret": 99.5,
            "imagine": "https://example.com/x.jpg",
            "categorie": "terasa",
            "subcategorie": "mancare",
            "tip": "Burger",
        }
        r = s.post(f"{API}/admin/produse", headers=auth_headers, json=payload)
        assert r.status_code == 200, r.text
        created = r.json()
        assert created["nume"] == "TEST_ZERO_Item"
        assert created["pret"] == 99.5
        pid = created["id"]

        # GET via public list to verify persistence
        r2 = s.get(f"{API}/produse/{pid}")
        assert r2.status_code == 200
        assert r2.json()["nume"] == "TEST_ZERO_Item"

        # UPDATE
        r3 = s.put(f"{API}/admin/produse/{pid}", headers=auth_headers, json={"pret": 123.0, "nume": "TEST_ZERO_Updated"})
        assert r3.status_code == 200
        assert r3.json()["pret"] == 123.0
        assert r3.json()["nume"] == "TEST_ZERO_Updated"

        # Verify persisted
        r4 = s.get(f"{API}/produse/{pid}")
        assert r4.json()["nume"] == "TEST_ZERO_Updated"

        # DELETE
        r5 = s.delete(f"{API}/admin/produse/{pid}", headers=auth_headers)
        assert r5.status_code == 200
        assert r5.json()["deleted"] is True

        # Confirm gone
        r6 = s.get(f"{API}/produse/{pid}")
        assert r6.status_code == 404

    def test_update_nonexistent_404(self, s, auth_headers):
        r = s.put(f"{API}/admin/produse/nope-xyz", headers=auth_headers, json={"pret": 1.0})
        assert r.status_code == 404

    def test_delete_nonexistent_404(self, s, auth_headers):
        r = s.delete(f"{API}/admin/produse/nope-xyz", headers=auth_headers)
        assert r.status_code == 404

    def test_admin_list(self, s, auth_headers):
        r = s.get(f"{API}/admin/produse", headers=auth_headers)
        assert r.status_code == 200
        assert "items" in r.json()
        assert len(r.json()["items"]) > 0


# ---------- Analytics ----------
class TestAnalytics:
    def test_analytics_requires_auth(self):
        r = requests.get(f"{API}/admin/analytics")
        assert r.status_code == 401

    def test_analytics(self, s, auth_headers):
        r = s.get(f"{API}/admin/analytics", headers=auth_headers)
        assert r.status_code == 200
        d = r.json()
        for k in ["total_produse", "total_vizite", "unique_ips_24h", "top_produse", "per_locatie"]:
            assert k in d, f"missing {k}"
        assert d["total_produse"] >= 100
        assert isinstance(d["top_produse"], list)
        assert isinstance(d["per_locatie"], list)



# ---------- Security headers (iteration 2) ----------
class TestSecurityHeaders:
    def test_security_headers_on_public(self, s):
        r = s.get(f"{API}/")
        assert r.status_code == 200
        assert r.headers.get("X-Content-Type-Options") == "nosniff"
        assert r.headers.get("X-Frame-Options") == "DENY"
        assert "strict-origin" in (r.headers.get("Referrer-Policy") or "")
        pp = r.headers.get("Permissions-Policy") or ""
        assert "geolocation=()" in pp and "microphone=()" in pp and "camera=()" in pp

    def test_security_headers_on_produse(self, s):
        r = s.get(f"{API}/produse", params={"categorie": "terasa", "subcategorie": "mancare", "limit": 1})
        assert r.status_code == 200
        assert r.headers.get("X-Content-Type-Options") == "nosniff"
        assert r.headers.get("X-Frame-Options") == "DENY"


# ---------- Pydantic validation on admin create (iteration 2) ----------
class TestProdusValidation:
    def test_empty_nume_rejected(self, s, auth_headers):
        r = s.post(f"{API}/admin/produse", headers=auth_headers, json={
            "nume": "", "descriere": "x", "pret": 1.0,
            "categorie": "terasa", "subcategorie": "mancare", "tip": "Burger",
        })
        assert r.status_code == 422

    def test_negative_price_rejected(self, s, auth_headers):
        r = s.post(f"{API}/admin/produse", headers=auth_headers, json={
            "nume": "TEST_neg", "descriere": "x", "pret": -1,
            "categorie": "terasa", "subcategorie": "mancare", "tip": "Burger",
        })
        assert r.status_code == 422

    def test_too_long_nume_rejected(self, s, auth_headers):
        r = s.post(f"{API}/admin/produse", headers=auth_headers, json={
            "nume": "x" * 201, "descriere": "x", "pret": 1.0,
            "categorie": "terasa", "subcategorie": "mancare", "tip": "Burger",
        })
        assert r.status_code == 422


# ---------- Brute-force lockout (iteration 2) ----------
# Uses a unique email so it doesn't lock out the real admin for other tests.
class TestBruteForceLockout:
    BAD_EMAIL = "lockout-probe@zero.ro"

    def _cleanup(self):
        # Best-effort: use mongosh to clear this identifier. Not critical if fails.
        import subprocess
        subprocess.run(
            ["mongosh", "--quiet", "--eval",
             'db=db.getSiblingDB("zero_menu"); db.login_attempts.deleteMany({})'],
            capture_output=True, timeout=10,
        )

    def test_lockout_after_5_failed_attempts(self, s):
        self._cleanup()
        # 5 bad attempts
        for i in range(5):
            r = s.post(f"{API}/auth/login", json={"email": self.BAD_EMAIL, "password": "wrong"})
            assert r.status_code == 401, f"attempt {i+1}: expected 401, got {r.status_code}"
        # 6th attempt -> locked
        r6 = s.post(f"{API}/auth/login", json={"email": self.BAD_EMAIL, "password": "wrong"})
        assert r6.status_code == 429, f"expected 429, got {r6.status_code} {r6.text}"
        detail = r6.json().get("detail", "")
        assert "15" in detail or "minute" in detail.lower()

    def test_correct_password_still_locked(self, s):
        # After above test, the real admin identifier is NOT locked (different email).
        # This test locks admin with 5 bad tries, then verifies even correct password = 429.
        self._cleanup()
        for _ in range(5):
            s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"})
        r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 429
        # cleanup so downstream tests can login again
        self._cleanup()

    def test_cleanup_restores_login(self, s):
        # After cleanup, correct password works again
        r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200
