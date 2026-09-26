"""
DWM Data Mining Layer: Association Rule Mining (Apriori)
Discovers "frequently tried together" product sets from warehouse try-on events.
Persists rules to `mining_association_rules` for fast dashboard and recommendation queries.
"""
import sys
import os
import logging
from itertools import combinations
from collections import defaultdict
from decimal import Decimal
from typing import List, Dict, Set, Tuple, Any
from datetime import datetime

# Allow execution from repo root
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from dwm.connection import DWHSessionLocal
from dwm.models import FactTryonEvent, DimProduct, MiningAssociationRule

logger = logging.getLogger("dwm.mining.association_rules")
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter("[%(asctime)s] [%(levelname)s] [%(name)s]: %(message)s")
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)


def build_tryon_baskets(dwh_session) -> Tuple[List[Set[int]], Dict[int, Dict[str, str]]]:
    """
    Constructs shopping/fitting baskets by grouping products tried on by each user.
    Also returns product metadata lookup (ASIN, category, etc.).
    """
    products = dwh_session.query(DimProduct).all()
    product_meta = {
        p.product_key: {
            "amazon_product_id": p.amazon_product_id,
            "category": p.category,
        }
        for p in products
    }

    # Group fact events by user_key into baskets
    facts = dwh_session.query(FactTryonEvent.user_key, FactTryonEvent.product_key).all()
    user_baskets = defaultdict(set)
    for user_key, product_key in facts:
        user_baskets[user_key].add(product_key)

    # Filter out baskets with fewer than 2 items (rules require >= 2 items)
    baskets = [items for items in user_baskets.values() if len(items) >= 2]
    return baskets, product_meta


def run_apriori(
    baskets: List[Set[int]],
    min_support: float = 0.05,
    min_confidence: float = 0.2,
    min_lift: float = 1.0,
    max_itemset_size: int = 3
) -> List[Dict[str, Any]]:
    """
    Pure-Python implementation of the classic Apriori algorithm.
    Guarantees zero heavyweight external dependency issues and high determinism.
    """
    num_transactions = len(baskets)
    if num_transactions == 0:
        logger.warning("No multi-item baskets found. Cannot generate association rules.")
        return []

    logger.info("Running Apriori on %d transaction baskets (min_sup=%.2f, min_conf=%.2f, min_lift=%.2f)...",
                num_transactions, min_support, min_confidence, min_lift)

    # 1. Frequent 1-itemsets
    item_counts = defaultdict(int)
    for basket in baskets:
        for item in basket:
            item_counts[frozenset([item])] += 1

    itemset_support = {}
    frequent_itemsets = {}
    current_frequent = set()

    for itemset, count in item_counts.items():
        support = count / num_transactions
        if support >= min_support:
            current_frequent.add(itemset)
            itemset_support[itemset] = support

    if not current_frequent:
        logger.info("No frequent 1-itemsets met min_support threshold.")
        return []

    frequent_itemsets[1] = current_frequent
    k = 2

    # 2. Iterative candidate generation (k = 2 to max_itemset_size)
    while k <= max_itemset_size and frequent_itemsets.get(k - 1):
        prev_frequent = list(frequent_itemsets[k - 1])
        candidates = set()

        # Join step
        for i in range(len(prev_frequent)):
            for j in range(i + 1, len(prev_frequent)):
                union = prev_frequent[i] | prev_frequent[j]
                if len(union) == k:
                    # Prune step: all subsets of size k-1 must be frequent
                    all_subsets_frequent = True
                    for subset in combinations(union, k - 1):
                        if frozenset(subset) not in frequent_itemsets[k - 1]:
                            all_subsets_frequent = False
                            break
                    if all_subsets_frequent:
                        candidates.add(union)

        # Count support for candidates
        candidate_counts = defaultdict(int)
        for basket in baskets:
            for cand in candidates:
                if cand.issubset(basket):
                    candidate_counts[cand] += 1

        # Filter by min_support
        k_frequent = set()
        for cand, count in candidate_counts.items():
            support = count / num_transactions
            if support >= min_support:
                k_frequent.add(cand)
                itemset_support[cand] = support

        if k_frequent:
            frequent_itemsets[k] = k_frequent
            logger.info("Found %d frequent itemsets of size %d.", len(k_frequent), k)
            k += 1
        else:
            break

    # 3. Association Rule Generation (Antecedent -> Consequent)
    rules = []
    for size, itemsets in frequent_itemsets.items():
        if size < 2:
            continue
        for itemset in itemsets:
            itemset_sup = itemset_support[itemset]

            # Generate all non-empty proper subsets as antecedents
            for r in range(1, len(itemset)):
                for antecedent_tuple in combinations(itemset, r):
                    antecedent = frozenset(antecedent_tuple)
                    consequent = itemset - antecedent

                    antecedent_sup = itemset_support.get(antecedent)
                    consequent_sup = itemset_support.get(consequent)

                    if not antecedent_sup or not consequent_sup:
                        continue

                    # Confidence = P(A & C) / P(A) = support(itemset) / support(antecedent)
                    confidence = itemset_sup / antecedent_sup

                    # Lift = Confidence / P(C) = support(itemset) / (support(antecedent) * support(consequent))
                    lift = confidence / consequent_sup

                    if confidence >= min_confidence and lift >= min_lift:
                        rules.append({
                            "antecedents": sorted(list(antecedent)),
                            "consequents": sorted(list(consequent)),
                            "support": Decimal(str(round(itemset_sup, 4))),
                            "confidence": Decimal(str(round(confidence, 4))),
                            "lift": Decimal(str(round(lift, 4))),
                            "item_count": len(itemset),
                        })

    logger.info("Generated %d valid association rules.", len(rules))
    return rules


def persist_association_rules(rules: List[Dict[str, Any]], product_meta: Dict[int, Dict[str, str]]):
    """
    Saves generated association rules into `mining_association_rules` table.
    Cleans up old rules to maintain an up-to-date recommendation table.
    """
    dwh_session = DWHSessionLocal()
    try:
        # Clear previous run results
        dwh_session.query(MiningAssociationRule).delete()

        for r in rules:
            ant_keys_str = ",".join(str(k) for k in r["antecedents"])
            con_keys_str = ",".join(str(k) for k in r["consequents"])

            ant_cats = [product_meta.get(k, {}).get("category", "Unknown") for k in r["antecedents"]]
            con_cats = [product_meta.get(k, {}).get("category", "Unknown") for k in r["consequents"]]

            new_rule = MiningAssociationRule(
                antecedent_product_keys=ant_keys_str,
                consequent_product_keys=con_keys_str,
                antecedent_categories=",".join(ant_cats),
                consequent_categories=",".join(con_cats),
                support=r["support"],
                confidence=r["confidence"],
                lift=r["lift"],
                item_count=r["item_count"],
                created_at=datetime.utcnow(),
            )
            dwh_session.add(new_rule)

        dwh_session.commit()
        logger.info("Successfully persisted %d association rules to mining_association_rules.", len(rules))
    finally:
        dwh_session.close()


def generate_and_save_association_rules(
    min_support: float = 0.05,
    min_confidence: float = 0.2,
    min_lift: float = 1.0
) -> int:
    """Entrypoint for scheduling and pipeline execution."""
    dwh_session = DWHSessionLocal()
    try:
        baskets, product_meta = build_tryon_baskets(dwh_session)
    finally:
        dwh_session.close()

    rules = run_apriori(
        baskets,
        min_support=min_support,
        min_confidence=min_confidence,
        min_lift=min_lift
    )
    persist_association_rules(rules, product_meta)
    return len(rules)


if __name__ == "__main__":
    generate_and_save_association_rules()
