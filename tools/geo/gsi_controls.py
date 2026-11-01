"""Select an explicitly named geographic control, never the first search hit."""
import math


def exact_point(features, title, bounds=None):
    matches=[]
    for feature in features:
        if feature.get('properties',{}).get('title')!=title:
            continue
        geometry=feature.get('geometry',{})
        point=geometry.get('coordinates',[])
        if geometry.get('type')!='Point' or len(point)!=2 or not all(isinstance(v,(int,float))and math.isfinite(v)for v in point):
            continue
        if bounds is not None:
            west,south,east,north=bounds
            if not(west<=point[0]<=east and south<=point[1]<=north):
                continue
        matches.append(list(point))
    if not matches:
        raise LookupError('Exact point is absent in the specified region: '+title)
    if len(matches)!=1:
        raise ValueError('Ambiguous exact point requires source review: '+title)
    return matches[0]
