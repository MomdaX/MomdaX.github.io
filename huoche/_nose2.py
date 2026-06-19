def analyze(fn):
    verts = []
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
                verts.append((x, y, z))
    xs = [v[0] for v in verts]
    xmax = max(xs)
    length = xmax - min(xs)
    body_half = 1.22
    # Slice from front backward in small steps, find where nose narrows
    print('%s  front X=%.2f  body half-width=%.2f' % (fn, xmax, body_half))
    print('  X(thin slice) -> max|z|  (looking for where nose tip narrows)')
    for depth in [0, 0.5, 1, 1.5, 2, 3, 4, 6, 8]:
        xlo = xmax - depth - 0.25
        xhi = xmax - depth + 0.25
        sv = [v for v in verts if xlo <= v[0] <= xhi]
        if sv:
            mz = max(abs(v[2]) for v in sv)
            my_lo = min(v[1] for v in sv)
            my_hi = max(v[1] for v in sv)
            print('    depth=%4.1f from front: max|z|=%.3f  Y=[%.3f,%.3f]  n=%d' % (depth, mz, my_lo, my_hi, len(sv)))
    print()

for fn in ['huoche8.obj', 'huoche16.obj']:
    analyze(fn)
