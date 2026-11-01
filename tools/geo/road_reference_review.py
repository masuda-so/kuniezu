"""Modern-routing quality review. A clean modern route is not a verified historic road."""
import math

def distance(a,b):
    return math.hypot((b[0]-a[0])*math.cos(math.radians((a[1]+b[1])/2)),b[1]-a[1])*111320

def review_anchors(points):
    """Flag misplaced intermediate controls before querying a routing service."""
    if len(points)<2:raise ValueError('At least two road anchors are required')
    length=sum(distance(a,b)for a,b in zip(points,points[1:]))
    endpoint=distance(points[0],points[-1])
    issues=['anchor-detour-over-4x-endpoint-distance']if endpoint>1000 and length>endpoint*4 else[]
    return {'issues':issues,'anchorDistanceMetres':length,'endpointDistanceMetres':endpoint,
            'scope':'Input-control geometry only. A flagged sequence is retained for review, not declared historically impossible.'}

def review_candidate(points,requested,snapped,total_metres):
    cumulative=[0.0];first={};closed=[]
    for i,p in enumerate(points):
        if i:cumulative.append(cumulative[-1]+distance(points[i-1],p))
        key=tuple(p)
        if key in first:
            j=first[key];length=cumulative[i]-cumulative[j]
            if i-j>1 and length>=2000:closed.append({'first':j,'last':i,'lengthMetres':length,'junction':p})
        else:first[key]=i
    maximum_snap=max((p.get('distance',0) for p in snapped),default=0)
    direct=sum(distance(a,b) for a,b in zip(requested,requested[1:]))
    issues=[]
    if maximum_snap>250:issues.append('waypoint-snap-over-250m')
    if direct and total_metres>direct*3:issues.append('route-over-3x-waypoint-distance')
    if closed:issues.append('closed-excursion-over-2km')
    return {'issues':issues,'maxSnapMetres':maximum_snap,'waypointDistanceMetres':direct,'routeDistanceMetres':total_metres,'largestClosedExcursion':max(closed,key=lambda r:r['lengthMetres'])if closed else None,'scope':'Modern routing checks only; flagged geometry is retained for review, not deleted as a historical road.'}
