import numpy as np
import matplotlib.pyplot as plt
import matplotlib.animation as animation

# --- Setup ---
# No. of cities (N) (Randomly generated)
N = 20
cities = np.random.rand(N, 2)

def total_distance(route):
    d = 0
    for i in range(len(route)):
        a, b = cities[route[i]], cities[route[(i+1) % len(route)]]
        d += np.linalg.norm(a - b)
    return d

def two_opt_swap(route):
    r = route.copy()
    i, j = sorted(np.random.choice(len(r), 2, replace=False))
    r[i:j+1] = r[i:j+1][::-1]  # reverse the segment
    return r

# --- Hill Climbing State ---
current = list(np.random.permutation(N))
current_dist = total_distance(current)

# --- Animation ---
fig, ax = plt.subplots()
line, = ax.plot([], [], 'b-o')
title = ax.set_title("")
ax.scatter(cities[:, 0], cities[:, 1], c='red', zorder=5)

def init():
    line.set_data([], [])
    return line,

def update(frame):
    global current, current_dist

    for _ in range(3):  # 10 attempts per frame (speeds it up)
        neighbor = two_opt_swap(current)
        nd = total_distance(neighbor)
        if nd < current_dist:
            current, current_dist = neighbor, nd

    # Draw route (loop back to start)
    route = current + [current[0]]
    x = cities[route, 0]
    y = cities[route, 1]
    line.set_data(x, y)
    title.set_text(f"Distance: {current_dist:.4f}")
    return line, title

ani = animation.FuncAnimation(fig, update, frames=50,
                               init_func=init, interval=50, blit=True)
plt.show()