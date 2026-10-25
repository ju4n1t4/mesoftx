"""Public aggregation and minimum group suppression rules."""
from app.application.dto import PublicIndicatorsResponse, PublicLevelItem, PublicSoIndicator

LEVEL_LABELS = {4: "Supera", 3: "Bueno", 2: "En desarrollo", 1: "Insatisfactorio"}
LEVEL_SCORE = {4: 100, 3: 75, 2: 50, 1: 25}


def build_public_response(
    outcomes: list[tuple[str, str]],
    counts: list[tuple[str, int, int]],
    students_by_so: dict[str, int],
    min_group_size: int,
) -> PublicIndicatorsResponse:
    """Función pura (probada sin base de datos): agrega y aplica la supresión."""
    by_so: dict[str, dict[int, int]] = {}
    for so_id, rank, n in counts:
        by_so.setdefault(so_id, {})[rank] = n

    items: list[PublicSoIndicator] = []
    averages: list[int] = []
    grand_total = 0
    for so_id, description in outcomes:
        dist = by_so.get(so_id, {})
        total = sum(dist.values())
        students = students_by_so.get(so_id, 0)
        suppressed = total > 0 and students < min_group_size
        levels: list[PublicLevelItem] = []
        if total > 0 and not suppressed:
            levels = [
                PublicLevelItem(rank=r, label=LEVEL_LABELS[r], pct=round(100 * dist.get(r, 0) / total))
                for r in (4, 3, 2, 1)
            ]
            averages.append(round(sum(LEVEL_SCORE[r] * n for r, n in dist.items()) / total))
            grand_total += total
        items.append(PublicSoIndicator(
            so_id=so_id, description=description,
            assessments=0 if suppressed else total,
            students=0 if suppressed else students,
            suppressed=suppressed, levels=levels,
        ))
    return PublicIndicatorsResponse(
        min_group_size=min_group_size,
        average_pct=round(sum(averages) / len(averages)) if averages else None,
        total_assessments=grand_total,
        items=items,
    )


