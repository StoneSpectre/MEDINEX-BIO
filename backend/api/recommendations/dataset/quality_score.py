import math
import datetime

def compute_quality_score(d: dict, max_n: int, max_c: int) -> float:
    # Size signal: log-normalised
    size = math.log(d.get('sample_size', 0) + 1) / math.log(max_n + 1)

    # Freshness: days since update, capped at 3 years
    days_old = (datetime.date.today() -
                d['last_updated'].date()).days if d.get('last_updated') else 1095
    freshness = max(0.0, 1.0 - days_old / 1095)

    # Citation signal: log-normalised
    citations = math.log(d.get('citation_count', 0) + 1) / math.log(max_c + 1)

    # Completeness: from metadata (1.0 if unknown)
    completeness = d.get('completeness', 1.0)

    return (0.35 * size + 0.25 * freshness
            + 0.25 * citations + 0.15 * completeness)
