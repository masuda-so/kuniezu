import json

import pytest

from tools.geo import codh_preview


def test_edited_surface_preview_keeps_geometry_and_uses_shared_renderer(
    tmp_path, monkeypatch
):
    source = tmp_path / "source"
    source.mkdir()
    collections = {}
    for name, role in (("land", "land"), ("water", "water")):
        data = {
            "type": "FeatureCollection",
            "coordinateReferenceSystem": "OGC:CRS84",
            "features": [
                {
                    "type": "Feature",
                    "id": role,
                    "properties": {"drawRole": role, "note": "</script>"},
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[[130, 30], [131, 30], [131, 31], [130, 30]]],
                    },
                }
            ],
        }
        file = source / (name + ".geojson")
        file.write_text(json.dumps(data), encoding="utf-8")
        collections[name] = (data, file.read_bytes())

    def prepare(_manifest, output):
        output.mkdir()
        for key in ("coast-polygons", "lake-polygons", "roads", "posts"):
            (output / (key + ".geojson")).write_text(
                '{"type":"FeatureCollection","features":[]}', encoding="utf-8"
            )
        return {"datasets": []}

    monkeypatch.setattr(codh_preview, "prepare", prepare)
    result = codh_preview.build(tmp_path / "preview", canonical=source)
    html = result.read_text(encoding="utf-8")
    raw = html.split('<script type="application/json" id="data">', 1)[1].split(
        "</script>", 1
    )[0]
    payload = json.loads(raw)
    assert payload["layers"]["coast-polygons"] == collections["land"][0]
    assert payload["layers"]["lake-polygons"] == collections["water"][0]
    for name, (_, before) in collections.items():
        assert (source / (name + ".geojson")).read_bytes() == before
    assert "__VECTOR_RENDERER__" not in html
    assert "root.TKVectorMap={create}" in html
    assert "\\u003c/script>" in raw


def test_preview_rejects_mixed_surface_modes(tmp_path):
    with pytest.raises(ValueError, match="Choose"):
        codh_preview.build(tmp_path / "preview", surfaces=tmp_path, canonical=tmp_path)
