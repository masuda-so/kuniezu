"""Bidirectional geometric road graph. No assumptions about regional history or current access rights."""
import math,heapq
from road_reference_review import distance

class RouteCoverageError(ValueError):
    def __init__(self,message,diagnostics):
        super().__init__(message);self.diagnostics=diagnostics

def build_network(lines,join_metres=2):
    points=[];indices={};edges=[];cells={}
    def node(p):
        key=tuple(round(v,6)for v in p)
        if key in indices:return indices[key]
        gx,gy=int(math.floor(p[0]*100000)),int(math.floor(p[1]*100000));radius=max(1,math.ceil(join_metres/(111320*.00001*max(.1,math.cos(math.radians(p[1]))))))
        nearby=[i for x in range(gx-radius,gx+radius+1)for y in range(gy-radius,gy+radius+1)for i in cells.get((x,y),[]) if distance(points[i],p)<=join_metres]
        if nearby:indices[key]=min(nearby,key=lambda i:distance(points[i],p));return indices[key]
        i=len(points);indices[key]=i;points.append(list(key));edges.append({});cells.setdefault((gx,gy),[]).append(i);return i
    for line in lines:
        for a,b in zip(line,line[1:]):
            i,j=node(a),node(b)
            if i==j:continue
            d=distance(points[i],points[j]);edges[i][j]=min(d,edges[i].get(j,math.inf));edges[j][i]=min(d,edges[j].get(i,math.inf))
    return points,edges

def reference_route(lines,waypoints,max_snap=250):
    points,edges=build_network(lines)
    if not points:raise ValueError('No road geometry')
    # Select the component fitting all anchors; never join disconnected fragments to satisfy a route.
    remaining=set(range(len(points)));components=[]
    while remaining:
        component=set();stack=[next(iter(remaining))]
        while stack:
            i=stack.pop()
            if i in component:continue
            component.add(i);stack.extend(j for j in edges[i]if j not in component)
        remaining.difference_update(component)
        components.append(component)
    def fit(component):
        matches=[min(component,key=lambda i:distance(points[i],p))for p in waypoints]
        errors=[distance(points[i],p)for i,p in zip(matches,waypoints)]
        return (max(errors),sum(errors),-len(component)),matches
    chosen,matches=min(((component,fit(component))for component in components),key=lambda row:row[1][0]);largest=chosen
    snapped=[]
    for p,i in zip(waypoints,matches[1]):
        d=distance(points[i],p)
        if d>max_snap:
            # Report data coverage separately from the inability to reach one component.
            coverage=[]
            for anchor,chosen_id in zip(waypoints,matches[1]):
                nearest=min(range(len(points)),key=lambda j:distance(points[j],anchor))
                coverage.append({'anchor':anchor,'nearestAnyPoint':points[nearest],'nearestAnyMetres':distance(points[nearest],anchor),'nearestConnectedPoint':points[chosen_id],'nearestConnectedMetres':distance(points[chosen_id],anchor)})
            raise RouteCoverageError(f'Waypoint outside connected geometry: {p}, {d:.1f}m',{'components':len(components),'nodes':len(points),'chosenComponentNodes':len(chosen),'anchors':coverage,'scope':'取得済み形状の被覆と連結性。現実の道路の不存在を示さない。'})
        snapped.append({'node':i,'location':points[i],'distance':d})
    route=[];legs=[]
    for a,b in zip(snapped,snapped[1:]):
        start,end=a['node'],b['node'];dist={start:0};previous={};queue=[(0,start)]
        while queue:
            cost,i=heapq.heappop(queue)
            if cost!=dist[i]:continue
            if i==end:break
            for j,length in edges[i].items():
                candidate=cost+length
                if candidate<dist.get(j,math.inf):dist[j]=candidate;previous[j]=i;heapq.heappush(queue,(candidate,j))
        if end not in dist:raise ValueError('Disconnected road geometry')
        ids=[end]
        while ids[-1]!=start:ids.append(previous[ids[-1]])
        ids.reverse();segment=[points[i]for i in ids];route.extend(segment if not route else segment[1:]);legs.append(dist[end])
    return {'points':route,'snappedPoints':snapped,'legMetres':legs,'distanceMeters':sum(legs),'nodes':len(points),'connectedNodes':len(largest)}
