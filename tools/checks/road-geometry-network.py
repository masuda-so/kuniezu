import pathlib,sys
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]/'geo'))
from road_geometry_network import reference_route,RouteCoverageError
# A small correct corridor must beat a larger unrelated component.
correct=[[136,35],[136.001,35],[136.002,35]];other=[[136.02+i*.001,35.02]for i in range(20)]
r=reference_route([correct,other],[correct[0],correct[-1]],max_snap=20);assert r['points']==correct;assert r['connectedNodes']==3
# Sub-metre tile rounding is normalized, without creating long invented joins.
a=[[136,35],[136.001,35]];b=[[136.0010003,35],[136.002,35]]
r=reference_route([a,b],[a[0],b[-1]],max_snap=5);assert r['distanceMeters']<190
try:reference_route([a,[[136.01,35],[136.011,35]]],[a[0],[136.011,35]],max_snap=20)
except ValueError:pass
else:raise AssertionError('disconnected geometry must not be bridged')
print('PASS: anchor-matched component, tile precision normalization, no invented joins across missing geometry')

# Covered endpoints in different components must be distinguished from missing shape.
try:reference_route([[[136,35],[136.001,35]],[[136.01,35],[136.011,35]]],[[136,35],[136.011,35]],max_snap=20)
except RouteCoverageError as e:
    assert e.diagnostics['components']==2
    assert all(row['nearestAnyMetres']<1 for row in e.diagnostics['anchors'])
    assert any(row['nearestConnectedMetres']>250 for row in e.diagnostics['anchors'])
else:raise AssertionError('must not join components')
print('PASS: covered but disconnected anchors distinguished from missing coverage')
