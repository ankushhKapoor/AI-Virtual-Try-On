"""
DWM Analytics & Data Mining Hub — End-to-End Smoke Test Suite
Tests all GET and POST endpoints for both data sources:
  1. 'benchmark_10k' (CSV benchmark dataset)
  2. 'live' (Live MySQL DWH, including empty DWH edge cases)

Edge parameters tested:
  - min_lift = 6.0 (Apriori empty state / threshold edge)
  - K = 2, 3, 4, 5, 6 (K-Means dynamic partitioning & silhouette score)
  - Empty live DWH (asserts clean 400 with structured detail, never 500)
"""

import sys
import os

# Ensure project root is in python path
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from fastapi.testclient import TestClient
from backend.main import app
from app.database.core.dependencies import get_current_admin


# Mock admin object to bypass database auth token in test environment
class MockAdmin:
    id = 1
    email = "admin@example.com"
    username = "admin"
    role = "admin"


# Apply dependency override
app.dependency_overrides[get_current_admin] = lambda: MockAdmin()
client = TestClient(app)


def assert_clean_response(resp, allowed_codes=(200,)):
    """Assert response code is in allowed_codes and never an unhandled 500."""
    assert resp.status_code != 500, f"Server returned 500 Internal Server Error: {resp.text}"
    assert resp.status_code in allowed_codes, (
        f"Expected status in {allowed_codes}, got {resp.status_code}: {resp.text}"
    )
    if resp.status_code >= 400:
        data = resp.json()
        assert "detail" in data, f"4xx error missing detail field: {data}"


# ─────────────────────────────────────────────────────────────
# 1. Overview / Stats Endpoint
# ─────────────────────────────────────────────────────────────
def test_dwm_stats():
    resp = client.get("/admin/dwm/stats")
    assert_clean_response(resp, (200,))
    data = resp.json()
    assert "benchmark_10k" in data
    assert "live_dwh" in data
    assert data["benchmark_10k"]["facts"] == 10000
    assert data["benchmark_10k"]["users"] == 1200


# ─────────────────────────────────────────────────────────────
# 2. Apriori Association Rules
# ─────────────────────────────────────────────────────────────
def test_apriori_benchmark_get_standard():
    resp = client.get("/admin/dwm/apriori?source=benchmark_10k&min_lift=1.0&min_confidence=0.15")
    assert_clean_response(resp, (200,))
    data = resp.json()
    assert data["total_rules"] > 0
    assert len(data["rules"]) == data["total_rules"]
    for r in data["rules"]:
        assert r["lift"] >= 1.0


def test_apriori_benchmark_get_edge_lift_6():
    """Testing edge filter min_lift=6.0 should produce empty state (0 rules), not an error."""
    resp = client.get("/admin/dwm/apriori?source=benchmark_10k&min_lift=6.0")
    assert_clean_response(resp, (200,))
    data = resp.json()
    assert data["total_rules"] == 0
    assert data["rules"] == []
    assert "max_lift_available" in data
    assert data["max_lift_available"] > 0, "max_lift_available should be populated for empty state"


def test_apriori_benchmark_post_run():
    resp = client.post(
        "/admin/dwm/apriori/run",
        json={"source": "benchmark_10k", "min_support": 0.02, "min_confidence": 0.15, "min_lift": 1.0}
    )
    assert_clean_response(resp, (200,))
    data = resp.json()
    assert "total_rules" in data
    assert "execution_time_ms" in data


def test_apriori_benchmark_post_run_edge_lift_6():
    resp = client.post(
        "/admin/dwm/apriori/run",
        json={"source": "benchmark_10k", "min_support": 0.05, "min_confidence": 0.20, "min_lift": 6.0}
    )
    assert_clean_response(resp, (200,))
    data = resp.json()
    assert data["total_rules"] == 0
    assert "max_lift_available" in data


def test_apriori_live_empty_dwh_guard():
    """Live DWH may be empty; verify clean 200 or 400, never 500."""
    resp_get = client.get("/admin/dwm/apriori?source=live")
    assert_clean_response(resp_get, (200, 400))

    resp_post = client.post(
        "/admin/dwm/apriori/run",
        json={"source": "live", "min_support": 0.02, "min_confidence": 0.15, "min_lift": 1.0}
    )
    assert_clean_response(resp_post, (200, 400))
    if resp_post.status_code == 400:
        err = resp_post.json()
        assert "detail" in err


# ─────────────────────────────────────────────────────────────
# 3. K-Means Clustering
# ─────────────────────────────────────────────────────────────
def test_kmeans_benchmark_get():
    resp = client.get("/admin/dwm/kmeans?source=benchmark_10k")
    assert_clean_response(resp, (200,))
    data = resp.json()
    assert "profiles" in data
    assert "silhouette_score" in data
    assert isinstance(data["silhouette_score"], (int, float))


def test_kmeans_benchmark_post_all_k(k_val=None):
    """Test dynamic clustering for all K in [2, 6] with silhouette score calculation."""
    k_list = [k_val] if k_val is not None else [2, 3, 4, 5, 6]
    for k in k_list:
        resp = client.post(
            "/admin/dwm/kmeans/run",
            json={"source": "benchmark_10k", "k": k}
        )
        assert_clean_response(resp, (200,))
        data = resp.json()
        assert len(data["profiles"]) == k
        assert "silhouette_score" in data
        assert -1.0 <= data["silhouette_score"] <= 1.0
        for profile in data["profiles"]:
            assert "cluster_name" in profile
            assert "segment_description" in profile
            assert "avg_tryons_per_user" in profile


def test_kmeans_live_empty_dwh_guard():
    resp_get = client.get("/admin/dwm/kmeans?source=live")
    assert_clean_response(resp_get, (200, 400))

    resp_post = client.post(
        "/admin/dwm/kmeans/run",
        json={"source": "live", "k": 3}
    )
    assert_clean_response(resp_post, (200, 400))


# ─────────────────────────────────────────────────────────────
# 4. Failure Correlation Analysis
# ─────────────────────────────────────────────────────────────
def test_correlations_benchmark_get_all():
    resp = client.get("/admin/dwm/correlations?source=benchmark_10k&dimension=all")
    assert_clean_response(resp, (200,))
    data = resp.json()
    assert "correlations" in data
    assert len(data["correlations"]) > 0


def test_correlations_budget_sign_bug_fixed():
    """Verify that Budget price bracket has negative correlation with failure."""
    resp = client.get("/admin/dwm/correlations?source=benchmark_10k&dimension=Price")
    assert_clean_response(resp, (200,))
    data = resp.json()
    budget_items = [
        item for item in data["correlations"]
        if "budget" in item["dimension_value"].lower()
    ]
    assert len(budget_items) > 0, "Budget price bracket not found in Price dimension"
    budget = budget_items[0]
    assert budget["correlation_with_failure"] < 0, (
        f"Budget failure correlation should be negative (protective), got {budget['correlation_with_failure']}"
    )
    assert "p_value" in budget
    assert "relative_risk" in budget
    assert "top_failure_reasons" in budget


def test_correlations_temporal_and_device_dimensions():
    for dim in ["Device & Method", "Category", "Temporal"]:
        resp = client.get(f"/admin/dwm/correlations?source=benchmark_10k&dimension={dim}")
        assert_clean_response(resp, (200,))
        data = resp.json()
        assert len(data["correlations"]) > 0


def test_correlations_benchmark_post_run():
    resp = client.post("/admin/dwm/correlations/run", json={"source": "benchmark_10k"})
    assert_clean_response(resp, (200,))


def test_correlations_live_empty_dwh_guard():
    resp_get = client.get("/admin/dwm/correlations?source=live")
    assert_clean_response(resp_get, (200, 400))

    resp_post = client.post("/admin/dwm/correlations/run", json={"source": "live"})
    assert_clean_response(resp_post, (200, 400))


# ─────────────────────────────────────────────────────────────
# 5. OLAP Time-Series Rollups
# ─────────────────────────────────────────────────────────────
def test_rollups_benchmark_daily_last_60_days():
    """Verify daily rollups return actual latest 60 days ending at 2026-03-31."""
    resp = client.get("/admin/dwm/rollups?source=benchmark_10k&period=daily")
    assert_clean_response(resp, (200,))
    data = resp.json()
    assert data["period"] == "daily"
    assert len(data["rollups"]) == 60
    assert data["data_points"] == 60
    # Chronological order ascending
    dates = [r["period_key"] for r in data["rollups"]]
    assert dates == sorted(dates), "Rollups should be sorted chronologically ascending"
    assert dates[-1] == "2026-03-31", f"Latest date should be 2026-03-31, got {dates[-1]}"


def test_rollups_benchmark_monthly():
    resp = client.get("/admin/dwm/rollups?source=benchmark_10k&period=monthly")
    assert_clean_response(resp, (200,))
    data = resp.json()
    assert data["period"] == "monthly"
    assert len(data["rollups"]) == 7


def test_rollups_benchmark_post_run():
    resp = client.post("/admin/dwm/rollups/run", json={"source": "benchmark_10k"})
    assert_clean_response(resp, (200,))


def test_rollups_live_empty_dwh_guard():
    resp_get = client.get("/admin/dwm/rollups?source=live&period=daily")
    assert_clean_response(resp_get, (200, 400))

    resp_post = client.post("/admin/dwm/rollups/run", json={"source": "live"})
    assert_clean_response(resp_post, (200, 400))


# ─────────────────────────────────────────────────────────────
# Standalone Runner
# ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    tests = [
        ("GET /admin/dwm/stats", test_dwm_stats),
        ("GET /admin/dwm/apriori (Standard)", test_apriori_benchmark_get_standard),
        ("GET /admin/dwm/apriori (Edge Lift=6)", test_apriori_benchmark_get_edge_lift_6),
        ("POST /admin/dwm/apriori/run (Benchmark)", test_apriori_benchmark_post_run),
        ("POST /admin/dwm/apriori/run (Lift=6 Empty State)", test_apriori_benchmark_post_run_edge_lift_6),
        ("Apriori Live DWH Guard (Clean 200/400)", test_apriori_live_empty_dwh_guard),
        ("GET /admin/dwm/kmeans (Benchmark)", test_kmeans_benchmark_get),
        ("POST /admin/dwm/kmeans/run (K=2..6 + Silhouette)", lambda: [test_kmeans_benchmark_post_all_k(k) for k in [2, 3, 4, 5, 6]]),
        ("K-Means Live DWH Guard (Clean 200/400)", test_kmeans_live_empty_dwh_guard),
        ("GET /admin/dwm/correlations (All Dimensions)", test_correlations_benchmark_get_all),
        ("Correlations: Sign Bug Fixed (Budget Negative)", test_correlations_budget_sign_bug_fixed),
        ("Correlations: Temporal & Device Dimensions", test_correlations_temporal_and_device_dimensions),
        ("POST /admin/dwm/correlations/run (Benchmark)", test_correlations_benchmark_post_run),
        ("Correlations Live DWH Guard (Clean 200/400)", test_correlations_live_empty_dwh_guard),
        ("GET /admin/dwm/rollups (Daily: Last 60 Days)", test_rollups_benchmark_daily_last_60_days),
        ("GET /admin/dwm/rollups (Monthly: 7 Months)", test_rollups_benchmark_monthly),
        ("POST /admin/dwm/rollups/run (Benchmark)", test_rollups_benchmark_post_run),
        ("Rollups Live DWH Guard (Clean 200/400)", test_rollups_live_empty_dwh_guard),
    ]

    passed = 0
    failed = 0
    print("\n" + "=" * 70)
    print("DWM ANALYTICS & DATA MINING HUB — SMOKE TEST SUITE")
    print("=" * 70)

    for name, test_fn in tests:
        try:
            test_fn()
            print(f"  [PASS] {name}")
            passed += 1
        except Exception as e:
            print(f"  [FAIL] {name}: {e}")
            failed += 1

    print("=" * 70)
    print(f"Results: {passed} PASSED, {failed} FAILED (Total: {len(tests)})")
    print("=" * 70 + "\n")

    if failed > 0:
        sys.exit(1)
