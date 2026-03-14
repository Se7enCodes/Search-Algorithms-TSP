import numpy as np
import matplotlib.pyplot as plt
import matplotlib.animation as animation
from matplotlib.gridspec import GridSpec
from matplotlib.widgets import Button

# --- Setup ---
N = 50
np.random.seed(42)
cities = np.random.rand(N, 2)
# For 2-Dimensional space

def total_distance(route):
    d = 0
    for i in range(len(route)):
        a, b = cities[route[i]], cities[route[(i+1) % len(route)]]
        d += np.linalg.norm(a - b)
    return d

def two_opt_swap(route):
    r = route.copy()
    i, j = sorted(np.random.choice(len(r), 2, replace=False))
    r[i:j+1] = r[i:j+1][::-1]
    return r

# --- State ---
# Randomly initialised travelling route, no intelligence.
current = list(np.random.permutation(N))
current_dist = total_distance(current)
best_dist = current_dist
best_route = current.copy()

distance_history = [current_dist]
iteration = [0]
acceptance_count = [0]       # how many solutions accepted
accepted_worse = [0]         # how many worse solutions accepted (SA-specific)

# Simulated Annealing parameters
initial_temp = 1.0
temp_decrease_rate = 0.99    # multiplicative cooling schedule
current_temp = [initial_temp]

# --- Figure Layout ---
fig = plt.figure(figsize=(12, 6))
gs = GridSpec(2, 2, figure=fig, width_ratios=[2, 1])

ax_route = fig.add_subplot(gs[:, 0])   # route (full left column)
ax_dist  = fig.add_subplot(gs[0, 1])   # distance over time
ax_info  = fig.add_subplot(gs[1, 1])   # text info panel

ax_route.set_xlim(-0.05, 1.05)
ax_route.set_ylim(-0.05, 1.05)
ax_route.set_title("TSP - Simulated Annealing", fontsize=13)
ax_route.scatter(cities[:, 0], cities[:, 1], c='red', zorder=5, s=60)

ax_dist.set_title("Distance over Iterations")
ax_dist.set_xlabel("Iteration")
ax_dist.set_ylabel("Distance")

ax_info.axis('off')

# Route line
line, = ax_route.plot([], [], 'b-o', lw=1.5, markersize=4)

# Status badge (top-left of route plot)
status_text = ax_route.text(
    0.02, 0.97, "", transform=ax_route.transAxes,
    fontsize=11, verticalalignment='top',
    bbox=dict(boxstyle='round,pad=0.4', facecolor='white', edgecolor='gray', alpha=0.85)
)

# Distance history line
dist_line, = ax_dist.plot([], [], 'b-', lw=1.5)
ax_dist.set_xlim(0, 300)

# Info text box
info_text = ax_info.text(
    0.05, 0.95, "", transform=ax_info.transAxes,
    fontsize=10, verticalalignment='top', family='monospace',
    bbox=dict(boxstyle='round,pad=0.5', facecolor='#f7f7f7', edgecolor='#cccccc')
)

def get_status():
    """Determine if we're exploring, exploiting, or converged based on temperature."""
    temp = current_temp[0]
    if temp > initial_temp * 0.3:
        return "exploring", f"🔥 Exploring (T={temp:.3f})", "#fff3cd", "#856404"
    elif temp > initial_temp * 0.05:
        return "exploiting", f"⚡ Exploiting (T={temp:.3f})", "#cfe2ff", "#084298"
    else:
        return "converged", f"❄ Converged (T={temp:.3f})", "#d1e7dd", "#0f5132"

def acceptance_probability(current_dist_val, neighbor_dist):
    """Calculate acceptance probability using Boltzmann distribution."""
    if neighbor_dist < current_dist_val:
        return 1.0
    else:
        delta = neighbor_dist - current_dist_val
        return np.exp(-delta / max(current_temp[0], 1e-8))

def init():
    line.set_data([], [])
    dist_line.set_data([], [])
    return line, dist_line, status_text, info_text

def update(frame):
    global current, current_dist, best_dist, best_route

    for _ in range(10):
        neighbor = two_opt_swap(current)
        nd = total_distance(neighbor)
        
        # Accept if better, or accept with probability based on temperature
        if nd < current_dist or np.random.random() < acceptance_probability(current_dist, nd):
            if nd < current_dist:
                # Better solution found
                current, current_dist = neighbor, nd
                acceptance_count[0] += 1
            else:
                # Worse solution accepted (for exploration)
                current, current_dist = neighbor, nd
                acceptance_count[0] += 1
                accepted_worse[0] += 1
            
            # Update global best if this is the best we've seen
            if current_dist < best_dist:
                best_dist = current_dist
                best_route = current.copy()

    iteration[0] += 1
    distance_history.append(current_dist)
    
    # Cool down temperature (multiplicative schedule)
    current_temp[0] *= temp_decrease_rate

    # --- Route plot ---
    route = current + [current[0]]
    x = cities[route, 0]
    y = cities[route, 1]
    line.set_data(x, y)

    # Route color based on status
    status, label, bg, fg = get_status()
    colors = {"exploring": "darkorange", "exploiting": "royalblue", 
              "converged": "mediumseagreen"}
    line.set_color(colors[status])

    # Status badge
    status_text.set_text(label)
    status_text.get_bbox_patch().set_facecolor(bg)
    status_text.set_color(fg)

    # --- Distance plot ---
    iters = list(range(len(distance_history)))
    dist_line.set_data(iters, distance_history)
    ax_dist.set_xlim(0, max(300, len(distance_history)))
    ax_dist.set_ylim(
        min(distance_history) * 0.95,
        max(distance_history) * 1.05
    )

    # --- Info panel (tracker) ---
    # Tracks iteration cnt, current and best dist, overall % improvement, acceptance rate, worse solutions accepted
    info_text.set_text(
        f"  Iteration   : {iteration[0]}\n"
        f"  Curr Dist   : {current_dist:.4f}\n"
        f"  Best Dist   : {best_dist:.4f}\n"
        f"  Improvement : {((distance_history[0] - best_dist) / distance_history[0] * 100):.1f}%\n"
        f"  Accepted    : {acceptance_count[0]} moves\n"
        f"  Worse acpt  : {accepted_worse[0]} times"
    )

    return line, dist_line, status_text, info_text

ani = animation.FuncAnimation(
    fig, update, frames=150,
    init_func=init, interval=40, blit=True
)

def restart(event):
    global current, current_dist, best_dist, best_route
    current = list(np.random.permutation(N))
    current_dist = total_distance(current)
    best_dist = current_dist
    best_route = current.copy()
    distance_history.clear()
    distance_history.append(current_dist)
    iteration[0] = 0
    acceptance_count[0] = 0
    accepted_worse[0] = 0
    current_temp[0] = initial_temp
    ani.event_source.start()   # un-stops the animation if it was halted

ax_button = plt.axes([0.45, 0.01, 0.1, 0.04])
btn = Button(ax_button, 'Restart')
btn.on_clicked(restart)

plt.tight_layout()
plt.show()
