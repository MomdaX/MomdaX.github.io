import sys

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
    # Look at vertex distribution near the nose (front): how far back does the nose taper?
    # Bin the front 15% of length and count vertices per step
    xmin = min(xs)
    length = xmax - xmin
    print('%s  length=%.2f  xmax(front)=%.2f' % (fn, length, xmax))
    front_start = xmax - length * 0.10  # last 10% = front 10%
    nose_verts = [v for v in verts if v[0] >= front_start]
    if nose_verts:
        nz = [v[2] for v in nose_verts]
        ny = [v[1] for v in nose_verts]
        nx = [v[0] for v in nose_verts]
        print('  front-10%% verts=%d' % len(nose_verts))
        print('    X range in nose region: %.3f .. %.3f' % (min(nx), max(nx)))
        print('    |Z| range in nose region: %.3f .. %.3f  (body half-width ~1.22)' % (min(abs(z) for z in nz), max(abs(z) for z in nz)))
        print('    Y range in nose region: %.3f .. %.3f' % (min(ny), max(ny)))
    # Find where nose starts tapering: the X beyond which |z| max shrinks below 50% of body halfwidth
    body_half = 1.22
    # sample x in slices
    step = length / 50
    taper_x = None
    for k in range(50, 0, -1):
        xlo = xmax - k*step
        xhi = xmax - (k-1)*step
        slice_v = [v for v in verts if xlo <= v[0] < xhi]
        if slice_v:
            mz = max(abs(v[2]) for v in slice_v)
            if mz > body_half * 0.5:
                taper_x = xlo
                break
    print('  nose taper begins (|z|>50%%body) at X=%.3f  (nose depth from front=%.3f)' % (taper_x, xmax - taper_x if taper_x else -1))

for fn in ['huoche8.obj', 'huoche16.obj']:
    analyze(fn)
    print()
