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
    Pure Python K-Means clustering algorithm.
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


def segment_users_kmeans(
    users: List[Dict[str, Any]],
    fact_events: List[Dict[str, Any]],
    k: int = 4
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Extracts features per user, standardizes, runs K-Means, and produces:
      1. User-level cluster assignments
      2. Cluster profile summaries
    """
    # Aggregate facts per user
    user_facts = {}
    for f in fact_events:
        u_key = f.get("user_key") or f.get("user_id")
        if u_key not in user_facts:
            user_facts[u_key] = {"total": 0, "success": 0, "quality_sum": 0.0, "wishlist_count": 0}
        user_facts[u_key]["total"] += 1
        is_succ = (f.get("outcome_key") == 1 or f.get("outcome") == "SUCCESS")
        if is_succ:
            user_facts[u_key]["success"] += 1
        q = f.get("quality_score") or 0.0
        try:
            user_facts[u_key]["quality_sum"] += float(q)
        except (ValueError, TypeError):
            pass
        if f.get("saved_after_tryon") or f.get("saved_to_wishlist") in (True, "Yes"):
            user_facts[u_key]["wishlist_count"] += 1

    feature_matrix = []
    user_feature_rows = []

    for u in users:
        uid = u.get("user_key") or u.get("user_id")
        stats = user_facts.get(uid, {"total": 0, "success": 0, "quality_sum": 0.0, "wishlist_count": 0})
        total_tryons = stats["total"] if stats["total"] > 0 else (u.get("total_tryons") or 0)
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

    # Run K-Means
    labels, _ = run_kmeans(normalized_matrix, k=k, seed=42)

    # Characterize clusters by average try-ons and success rate
    cluster_metrics = {c: {"users": [], "total_tryons": 0, "success_rate": 0.0, "wishlist_rate": 0.0, "quality": 0.0} for c in range(k)}
    for row_info, lbl in zip(user_feature_rows, labels):
        row_info["cluster_id"] = lbl
        cm = cluster_metrics[lbl]
        cm["users"].append(row_info)
        cm["total_tryons"] += row_info["total_tryons"]
        cm["success_rate"] += row_info["success_rate"]
        cm["wishlist_rate"] += row_info["wishlist_rate"]
        cm["quality"] += row_info["avg_quality_score"]

    # Assign meaningful descriptive cluster names based on cluster centroids
    # Sort cluster IDs by avg try-ons
    cluster_avg_tryons = []
    for c in range(k):
        cnt = len(cluster_metrics[c]["users"])
        avg_t = cluster_metrics[c]["total_tryons"] / cnt if cnt > 0 else 0
        avg_s = cluster_metrics[c]["success_rate"] / cnt if cnt > 0 else 0
        cluster_avg_tryons.append((c, avg_t, avg_s))

    # Rank clusters
    cluster_avg_tryons.sort(key=lambda x: x[1], reverse=True)
    
    cluster_name_map = {}
    cluster_desc_map = {}
    cluster_action_map = {}

    for rank, (c_id, avg_t, avg_s) in enumerate(cluster_avg_tryons):
        if rank == 0:
            cluster_name_map[c_id] = "Power Shoppers (High Frequency VIPs)"
            cluster_desc_map[c_id] = "Highest try-on volume and frequent wishlist additions. Key drivers of conversion."
            cluster_action_map[c_id] = "Offer VIP early-access to new collections, loyalty perks & one-click checkout."
        elif avg_s < 0.80:
            cluster_name_map[c_id] = "At-Risk / Sensitive Users"
            cluster_desc_map[c_id] = "Users who experienced higher AI try-on failure rates or poor lighting rejections."
            cluster_action_map[c_id] = "Trigger guided photo re-upload assistance modal and send retry apology coupons."
        elif rank == 1:
            cluster_name_map[c_id] = "Engaged Fashion Explorers"
            cluster_desc_map[c_id] = "Steady consistent try-on sessions across multiple apparel categories with high satisfaction."
            cluster_action_map[c_id] = "Deliver personalized Apriori cross-category bundle recommendations."
        else:
            cluster_name_map[c_id] = "Occasional / Trial Users"
            cluster_desc_map[c_id] = "Low try-on counts (1-2 attempts). Typically new signups testing platform capabilities."
            cluster_action_map[c_id] = "Send onboarding tutorial, trending outfit previews, and first-order incentives."

    # Update user feature rows with names
    for row in user_feature_rows:
        cid = row["cluster_id"]
        row["cluster_name"] = cluster_name_map.get(cid, f"Cluster {cid}")

    # Build cluster profile summary
    cluster_profiles = []
    total_all_users = len(user_feature_rows)

    for c_id in range(k):
        cnt = len(cluster_metrics[c_id]["users"])
        if cnt == 0:
            continue
        c_users = cluster_metrics[c_id]["users"]
        avg_t = round(sum(u["total_tryons"] for u in c_users) / cnt, 1)
        avg_s = round((sum(u["success_rate"] for u in c_users) / cnt) * 100, 2)
        avg_q = round(sum(u["avg_quality_score"] for u in c_users) / cnt, 2)
        avg_w = round((sum(u["wishlist_rate"] for u in c_users) / cnt) * 100, 2)
        pct_base = round((cnt / total_all_users) * 100, 2)

        cluster_profiles.append({
            "cluster_id": c_id,
            "cluster_name": cluster_name_map.get(c_id, f"Cluster {c_id}"),
            "user_count": cnt,
            "pct_of_userbase": pct_base,
            "avg_tryons_per_user": avg_t,
            "avg_success_rate_pct": avg_s,
            "avg_quality_score": avg_q,
            "avg_wishlist_rate_pct": avg_w,
            "segment_description": cluster_desc_map.get(c_id, ""),
            "recommended_marketing_action": cluster_action_map.get(c_id, ""),
        })

    cluster_profiles.sort(key=lambda cp: cp["avg_tryons_per_user"], reverse=True)

    return user_feature_rows, cluster_profiles
