import numpy as np
from sqlalchemy import text

async def compute_topic_velocity(
    cluster_id: str, db, horizon_months: int = 24
) -> dict:
    rows = (await db.execute(text(
        '''
        SELECT DATE_TRUNC('month', p.published_at) AS month,
               COUNT(*) AS paper_count
        FROM papers p
        JOIN paper_topic_clusters ptc ON ptc.paper_id = p.id
        WHERE ptc.cluster_id = :cid
          AND p.published_at >= NOW() - INTERVAL ':months months'
        GROUP BY 1 ORDER BY 1
        '''
    ), {'cid': cluster_id, 'months': horizon_months})).fetchall()

    if len(rows) < 3:
        return {'velocity': 0.0, 'trend': 'insufficient_data'}

    counts = np.array([r.paper_count for r in rows], dtype=float)
    months = np.arange(len(counts))

    # Linear trend coefficient
    slope = np.polyfit(months, counts, 1)[0]

    # Exponential fit for acceleration detection
    log_counts = np.log1p(counts)
    exp_slope  = np.polyfit(months, log_counts, 1)[0]

    trend = ('accelerating' if exp_slope > 0.05
             else 'growing' if slope > 0
             else 'declining')

    return {
        'velocity':   float(slope),        # papers/month change
        'exp_growth': float(exp_slope),     # exponential rate
        'trend':      trend,
        'recent_avg': float(counts[-3:].mean()),
    }
