"""
DWM Data Mining Layer - Pure Python K-Means Clustering for User Segmentation
Implements K-Means (Lloyd's algorithm) to segment users based on their
activity volume, try-on success rate, model quality score, wishlist adoption, and tenure.
"""
import math
import random
from typing import Dict, List, Any, Tuple


def euclidean_distance(pt1: List[float], pt2: List[float]) -> float:
    return math.sqrt(sum((a - b) ** 2 for a, b in zip(pt1, pt2)))


def run_kmeans(
    data_points: List[List[float]],
    k: int = 4,
    max_iters: int = 100,
    seed: int = 42
) -> Tuple[List[int], List[List[float]]]:
    """
    Pure Python K-Means clustering algorithm with fixed random seed for reproducibility.
    Returns:
        labels: cluster assignment index (0 to k-1) for each data point
        centroids: final cluster center coordinates
    """
    if not data_points or k <= 0:
        return [], []

    random.seed(seed)
    n = len(data_points)
    dim = len(data_points[0])

    if n <= k:
        return list(range(n)), data_points

    # Initialize centroids using k-means++ style spread
    centroids = [data_points[random.randint(0, n - 1)]]
    while len(centroids) < k:
        dists = [min(euclidean_distance(p, c) for c in centroids) for p in data_points]
        total_dist = sum(dists)
        if total_dist == 0:
            centroids.append(random.choice(data_points))
            continue
        probs = [d / total_dist for d in dists]
        chosen = random.choices(data_points, weights=probs, k=1)[0]
        centroids.append(chosen)

    labels = [0] * n

    for _ in range(max_iters):
        # 1. Assignment step
        new_labels = []
        for p in data_points:
            closest_idx = 0
            min_dist = float("inf")
            for c_idx, c in enumerate(centroids):
                d = euclidean_distance(p, c)
                if d < min_dist:
                    min_dist = d
                    closest_idx = c_idx
            new_labels.append(closest_idx)

        # Check convergence
        if new_labels == labels:
            break
        labels = new_labels

        # 2. Update centroids
        cluster_sums = [[0.0] * dim for _ in range(k)]
        cluster_counts = [0] * k

        for p, l in zip(data_points, labels):
            cluster_counts[l] += 1
            for d_idx in range(dim):
                cluster_sums[l][d_idx] += p[d_idx]

        for c_idx in range(k):
            if cluster_counts[c_idx] > 0:
                centroids[c_idx] = [cluster_sums[c_idx][d] / cluster_counts[c_idx] for d in range(dim)]

    return labels, centroids


def compute_silhouette_score(
    points: List[List[float]],
    labels: List[int],
    k: int,
    max_samples: int = 300
) -> float:
    """
    Computes sample silhouette score in pure Python.
    Score ranges from -1.0 to +1.0. Higher indicates denser, well-separated clusters.
    """
    if k < 2 or len(points) < 2 or len(set(labels)) < 2:
        return 0.0

    n = len(points)
    indices = list(range(n))
    if n > max_samples:
        random.seed(42)
        indices = random.sample(indices, max_samples)

    cluster_points: Dict[int, List[List[float]]] = {c: [] for c in range(k)}
    for idx, l in enumerate(labels):
        cluster_points[l].append(points[idx])

    scores = []
    for i in indices:
        p = points[i]
        own_c = labels[i]
        own_pts = cluster_points[own_c]
        if len(own_pts) <= 1:
            scores.append(0.0)
            continue

        a = sum(euclidean_distance(p, o) for o in own_pts if o is not p) / (len(own_pts) - 1)

        b = float("inf")
        for other_c in range(k):
            if other_c == own_c or not cluster_points[other_c]:
                continue
            dist = sum(euclidean_distance(p, o) for o in cluster_points[other_c]) / len(cluster_points[other_c])
            if dist < b:
                b = dist

        denom = max(a, b)
        scores.append((b - a) / denom if denom > 0 else 0.0)

    return round(sum(scores) / len(scores), 3) if scores else 0.0


def segment_users_kmeans(
    users: List[Dict[str, Any]],
    fact_events: List[Dict[str, Any]],
    k: int = 4
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], float]:
    """
    Extracts features per user, standardizes, runs K-Means, and produces:
      1. User-level cluster assignments
      2. Cluster profile summaries
      3. Overall silhouette score
    """
    # Aggregate facts per user
    user_facts: Dict[Any, Dict[str, Any]] = {}
    for f in fact_events:
        raw_uk = f.get("user_key") or f.get("user_id")
        try:
            u_key = int(raw_uk) if raw_uk is not None else 0
        except (ValueError, TypeError):
            u_key = str(raw_uk)

        if u_key not in user_facts:
            user_facts[u_key] = {"total": 0, "success": 0, "quality_sum": 0.0, "wishlist_count": 0}
        user_facts[u_key]["total"] += 1
        is_succ = (f.get("outcome_key") in (1, "1") or f.get("outcome") == "SUCCESS")
        if is_succ:
            user_facts[u_key]["success"] += 1
        q = f.get("quality_score") or 0.0
        try:
            user_facts[u_key]["quality_sum"] += float(q)
        except (ValueError, TypeError):
            pass
        saved = f.get("saved_after_tryon") or f.get("saved_to_wishlist")
        if saved in (True, "True", "true", 1, "1", "Yes", "yes"):
            user_facts[u_key]["wishlist_count"] += 1

    feature_matrix = []
    user_feature_rows = []

    for u in users:
        raw_uid = u.get("user_key") or u.get("user_id")
        try:
            uid = int(raw_uid) if raw_uid is not None else 0
        except (ValueError, TypeError):
            uid = str(raw_uid)

        stats = user_facts.get(uid, {"total": 0, "success": 0, "quality_sum": 0.0, "wishlist_count": 0})
        raw_tryons = u.get("total_tryons") or 0
        try:
            raw_tryons = int(raw_tryons)
        except (ValueError, TypeError):
            raw_tryons = 0

        total_tryons = stats["total"] if stats["total"] > 0 else raw_tryons
        succ_rate = round(stats["success"] / total_tryons, 4) if total_tryons > 0 else 0.85
        avg_qual = round(stats["quality_sum"] / total_tryons, 4) if total_tryons > 0 else 0.88
        wish_rate = round(stats["wishlist_count"] / total_tryons, 4) if total_tryons > 0 else 0.20

        # Raw feature vector: [total_tryons, succ_rate, avg_qual, wish_rate]
        raw_vec = [float(total_tryons), float(succ_rate), float(avg_qual), float(wish_rate)]
        feature_matrix.append(raw_vec)
        user_feature_rows.append({
            "user_id": uid,
            "name": u.get("name", f"User {uid}"),
            "email": u.get("email", ""),
            "total_tryons": total_tryons,
            "success_rate": succ_rate,
            "avg_quality_score": avg_qual,
            "wishlist_rate": wish_rate,
        })

    if not feature_matrix:
        return [], [], 0.0

    # Min-Max Normalization
    dim = len(feature_matrix[0])
    mins = [min(row[d] for row in feature_matrix) for d in range(dim)]
    maxs = [max(row[d] for row in feature_matrix) for d in range(dim)]

    normalized_matrix = []
    for row in feature_matrix:
        norm_row = []
        for d in range(dim):
            denom = maxs[d] - mins[d]
            norm_val = (row[d] - mins[d]) / denom if denom > 0 else 0.0
            norm_row.append(norm_val)
        normalized_matrix.append(norm_row)

    # Guard k <= n_samples
    actual_k = min(max(2, k), len(normalized_matrix))

    # Run K-Means with fixed seed for reproducibility
    labels, centroids = run_kmeans(normalized_matrix, k=actual_k, seed=42)

    # Compute silhouette score
    silhouette = compute_silhouette_score(normalized_matrix, labels, k=actual_k, max_samples=300)

    # Characterize clusters by average try-ons and success rate
    cluster_metrics: Dict[int, Dict[str, Any]] = {c: {"users": [], "total_tryons": 0, "success_rate": 0.0, "wishlist_rate": 0.0, "quality": 0.0} for c in range(actual_k)}
    for row_info, lbl in zip(user_feature_rows, labels):
        row_info["cluster_id"] = lbl
        cm = cluster_metrics[lbl]
        cm["users"].append(row_info)
        cm["total_tryons"] += row_info["total_tryons"]
        cm["success_rate"] += row_info["success_rate"]
        cm["wishlist_rate"] += row_info["wishlist_rate"]
        cm["quality"] += row_info["avg_quality_score"]

    # Calculate centroid averages per cluster
    centroid_stats = []
    for c in range(actual_k):
        cnt = len(cluster_metrics[c]["users"])
        avg_t = cluster_metrics[c]["total_tryons"] / cnt if cnt > 0 else 0.0
        avg_s = cluster_metrics[c]["success_rate"] / cnt if cnt > 0 else 0.0
        avg_w = cluster_metrics[c]["wishlist_rate"] / cnt if cnt > 0 else 0.0
        avg_q = cluster_metrics[c]["quality"] / cnt if cnt > 0 else 0.0
        centroid_stats.append({
            "cluster_id": c,
            "count": cnt,
            "avg_tryons": avg_t,
            "avg_success": avg_s,
            "avg_wishlist": avg_w,
            "avg_quality": avg_q,
        })

    # Rank clusters by volume (avg_tryons) descending
    sorted_by_volume = sorted(centroid_stats, key=lambda cs: cs["avg_tryons"], reverse=True)

    # Dynamic Persona Assignment based on centroid rankings
    cluster_name_map = {}
    cluster_desc_map = {}
    cluster_action_map = {}

    # Check if there is an At-Risk cluster (low success rate < 0.83 and not the #1 volume cluster)
    at_risk_cluster_id = None
    lowest_success = min(centroid_stats, key=lambda cs: cs["avg_success"])
    if lowest_success["avg_success"] < 0.83 and lowest_success["cluster_id"] != sorted_by_volume[0]["cluster_id"]:
        at_risk_cluster_id = lowest_success["cluster_id"]

    # Persona pool based on ranking by volume
    volume_personas = [
        ("Power Shoppers (High Frequency VIPs)", "High engagement volume with strong purchase intent.", "Offer VIP early-access to new collections, loyalty perks & one-click checkout."),
        ("Engaged Fashion Explorers", "Steady consistent try-on sessions across apparel categories with high satisfaction.", "Deliver personalized Apriori cross-category bundle recommendations."),
        ("Selective Style Seekers", "Moderate browsing with focused category evaluation.", "Promote mid-range trending pieces and curated seasonal lookbooks."),
        ("Occasional / Trial Users", "Low try-on activity typically testing initial platform features.", "Send onboarding tutorial, trending outfit previews, and first-order incentives."),
        ("Casual Window Shoppers", "Infrequent engagement with low conversion velocity.", "Re-engage via push notifications with price drop alerts and wishlist reminders."),
        ("Dormant Signups", "Minimal platform interaction post-registration.", "Send targeted win-back campaigns and introductory styling discounts.")
    ]

    persona_idx = 0
    for cs in sorted_by_volume:
        cid = cs["cluster_id"]
        avg_t_fmt = f"{cs['avg_tryons']:.1f}"
        avg_s_fmt = f"{cs['avg_success'] * 100:.1f}%"
        avg_w_fmt = f"{cs['avg_wishlist'] * 100:.1f}%"

        if cid == at_risk_cluster_id:
            cluster_name_map[cid] = "At-Risk / Sensitive Users"
            cluster_desc_map[cid] = f"Average {avg_t_fmt} try-ons, {avg_s_fmt} success rate ({100 - cs['avg_success'] * 100:.1f}% failure), and {avg_w_fmt} wishlist rate."
            cluster_action_map[cid] = "Trigger guided photo re-upload assistance modal, lighting checks, and retry apology coupons."
        else:
            p_name, _, p_action = volume_personas[min(persona_idx, len(volume_personas) - 1)]
            persona_idx += 1
            cluster_name_map[cid] = p_name
            cluster_desc_map[cid] = f"Average {avg_t_fmt} try-ons, {avg_s_fmt} success rate, and {avg_w_fmt} wishlist rate."
            cluster_action_map[cid] = p_action

    # Update user feature rows with names
    for row in user_feature_rows:
        cid = row["cluster_id"]
        row["cluster_name"] = cluster_name_map.get(cid, f"Cluster {cid}")

    # Build cluster profile summaries
    cluster_profiles = []
    total_all_users = len(user_feature_rows)

    for cs in centroid_stats:
        cid = cs["cluster_id"]
        cnt = cs["count"]
        if cnt == 0:
            continue
        pct_base = round((cnt / total_all_users) * 100, 1)

        cluster_profiles.append({
            "cluster_id": cid,
            "cluster_name": cluster_name_map.get(cid, f"Cluster {cid}"),
            "user_count": cnt,
            "pct_of_userbase": pct_base,
            "avg_tryons_per_user": round(cs["avg_tryons"], 1),
            "avg_success_rate_pct": round(cs["avg_success"] * 100, 1),
            "avg_quality_score": round(cs["avg_quality"], 2),
            "avg_wishlist_rate_pct": round(cs["avg_wishlist"] * 100, 1),
            "segment_description": cluster_desc_map.get(cid, ""),
            "recommended_marketing_action": cluster_action_map.get(cid, ""),
        })

    # Sort profiles descending by average try-ons per user for consistent card layout
    cluster_profiles.sort(key=lambda cp: cp["avg_tryons_per_user"], reverse=True)

    return user_feature_rows, cluster_profiles, silhouette
