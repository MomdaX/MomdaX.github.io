import sys

def bbox(fn):
    xs = ys = zs = None
    n = 0
    with open(fn, 'r', encoding='utf-8', errors='ignore') as f:
        for line in f:
            if line.startswith('v '):
                p = line.split()
                if len(p) < 4:
                    continue
                try:
                    x, y, z = float(p[1]), float(p[2]), float(p[3])
                except ValueError:
                    continue
                xs = (x, x) if xs is None else (min(xs[0], x), max(xs[1], x))
                ys = (y, y) if ys is None else (min(ys[0], y), max(ys[1], y))
                zs = (z, z) if zs is None else (min(zs[0], z), max(zs[1], z))
                n += 1
    return n, xs, ys, zs

scale = 1.5
for fn in ['huoche8.obj', 'huoche16.obj']:
    n, xs, ys, zs = bbox(fn)
    print('%s  verts=%d' % (fn, n))
    print('  RAW  X(min,max,len)=%.3f, %.3f, %.3f' % (xs[0], xs[1], xs[1]-xs[0]))
    print('  RAW  Y(min,max,ht )=%.3f, %.3f, %.3f' % (ys[0], ys[1], ys[1]-ys[0]))
    print('  RAW  Z(min,max,wd )=%.3f, %.3f, %.3f' % (zs[0], zs[1], zs[1]-zs[0]))
    print('  SCALED(scale=%.1f) frontX=%.3f rearX=%.3f length=%.3f' % (
        scale, xs[1]*scale, xs[0]*scale, (xs[1]-xs[0])*scale))
