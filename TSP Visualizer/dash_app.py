import numpy as np
from dash import Dash, dcc, html, callback, Input, Output, State
import plotly.graph_objects as go
from plotly.subplots import make_subplots

# --- Setup ---
N = 50
np.random.seed(42)
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
    r[i:j+1] = r[i:j+1][::-1]
    return r

# --- Initialize Dash app ---
app = Dash(__name__)

app.layout = html.Div([
    html.H1("TSP Visualizer - Hill Climbing", style={"textAlign": "center", "marginBottom": 30}),
    
    html.Div([
        # Left column: Route visualization and distance plot
        html.Div([
            dcc.Graph(id='route-graph', style={'height': '600px'}),
            dcc.Graph(id='distance-graph', style={'height': '400px'}),
        ], style={'width': '70%', 'display': 'inline-block'}),
        
        # Right column: Info panel
        html.Div([
            html.Div(id='info-panel', style={
                'backgroundColor': '#f7f7f7',
                'border': '1px solid #cccccc',
                'borderRadius': '8px',
                'padding': '20px',
                'fontFamily': 'monospace',
                'fontSize': '12px',
                'whiteSpace': 'pre-wrap',
                'height': '600px',
                'overflowY': 'auto',
                'marginRight': '20px'
            }),
            html.Br(),
            html.Button('Restart', id='restart-btn', n_clicks=0, 
                       style={
                           'width': '100%',
                           'padding': '10px',
                           'fontSize': '14px',
                           'backgroundColor': '#007bff',
                           'color': 'white',
                           'border': 'none',
                           'borderRadius': '4px',
                           'cursor': 'pointer'
                       })
        ], style={'width': '28%', 'display': 'inline-block', 'verticalAlign': 'top'}),
    ]),
    
    # Interval component for animation
    dcc.Interval(id='interval-component', interval=100, n_intervals=0),
    
    # Store components for state management
    dcc.Store(id='state-store', data={
        'current': list(np.random.permutation(N)),
        'current_dist': 0,
        'best_dist': 0,
        'distance_history': [],
        'iteration': 0,
        'stuck_counter': 0,
        'is_global': False,
        'local_optima_distances': [],
        'initial_dist': 0
    })
], style={'padding': '20px'})

def get_status(stuck_counter):
    """Determine if we're improving, at local optima, or global optima."""
    STUCK_THRESHOLD = 50
    if stuck_counter == 0:
        return "improving", "🔼 Improving", "#d4edda", "#155724"
    elif stuck_counter < STUCK_THRESHOLD:
        return "searching", f"↔ Searching ({stuck_counter})", "#fff3cd", "#856404"
    else:
        return "local", "⚠ Local Optimum", "#f8d7da", "#721c24"

@callback(
    [Output('state-store', 'data'),
     Output('route-graph', 'figure'),
     Output('distance-graph', 'figure'),
     Output('info-panel', 'children')],
    [Input('interval-component', 'n_intervals'),
     Input('restart-btn', 'n_clicks')],
    [State('state-store', 'data')],
    prevent_initial_call=False
)
def update(n_intervals, n_clicks, stored_data):
    # Initialize or reset
    if not stored_data or n_clicks > 0:
        current = list(np.random.permutation(N))
        current_dist = total_distance(current)
        stored_data = {
            'current': current,
            'current_dist': current_dist,
            'best_dist': current_dist,
            'distance_history': [current_dist],
            'iteration': 0,
            'stuck_counter': 0,
            'is_global': False,
            'local_optima_distances': [],
            'initial_dist': current_dist
        }
    else:
        current = stored_data['current']
        current_dist = stored_data['current_dist']
        best_dist = stored_data['best_dist']
        stuck_counter = stored_data['stuck_counter']
        is_global = stored_data['is_global']
        local_optima_distances = stored_data['local_optima_distances']
        distance_history = stored_data['distance_history']
        initial_dist = stored_data['initial_dist']
        
        # Run 10 iterations of hill climbing
        STUCK_THRESHOLD = 50
        for _ in range(10):
            neighbor = two_opt_swap(current)
            nd = total_distance(neighbor)
            if nd < current_dist:
                current, current_dist = neighbor, nd
                stuck_counter = 0
                if current_dist < best_dist:
                    best_dist = current_dist
                    is_global = False
            else:
                stuck_counter += 1
        
        stored_data['current'] = current
        stored_data['current_dist'] = current_dist
        stored_data['best_dist'] = best_dist
        stored_data['stuck_counter'] = stuck_counter
        
        # Check for local optimum
        if stuck_counter >= STUCK_THRESHOLD:
            if not local_optima_distances or current_dist < min(local_optima_distances):
                is_global = True
            if not local_optima_distances or current_dist not in local_optima_distances:
                local_optima_distances.append(current_dist)
        
        stored_data['is_global'] = is_global
        stored_data['local_optima_distances'] = local_optima_distances
        
        stored_data['iteration'] += 1
        distance_history.append(current_dist)
        stored_data['distance_history'] = distance_history
    
    # --- Route plot ---
    current = stored_data['current']
    current_dist = stored_data['current_dist']
    best_dist = stored_data['best_dist']
    stuck_counter = stored_data['stuck_counter']
    is_global = stored_data['is_global']
    local_optima_distances = stored_data['local_optima_distances']
    distance_history = stored_data['distance_history']
    iteration = stored_data['iteration']
    initial_dist = stored_data['initial_dist']
    
    route = current + [current[0]]
    x = cities[route, 0]
    y = cities[route, 1]
    
    status, label, bg, fg = get_status(stuck_counter)
    colors = {"improving": "royalblue", "searching": "darkorange", 
              "local": "crimson", "global": "mediumseagreen"}
    line_color = colors[status]
    
    # Create route figure
    route_fig = go.Figure()
    route_fig.add_trace(go.Scatter(
        x=cities[:, 0], y=cities[:, 1],
        mode='markers',
        marker=dict(size=8, color='red'),
        name='Cities',
        hovertemplate='<b>City</b><br>X: %{x:.3f}<br>Y: %{y:.3f}'
    ))
    route_fig.add_trace(go.Scatter(
        x=x, y=y,
        mode='lines+markers',
        line=dict(color=line_color, width=2),
        marker=dict(size=4),
        name='Route',
        hovertemplate='<b>Route</b><br>X: %{x:.3f}<br>Y: %{y:.3f}'
    ))
    route_fig.update_layout(
        title=f"<b>TSP - Hill Climbing</b><br><sub>{label}</sub>",
        xaxis=dict(range=[-0.05, 1.05]),
        yaxis=dict(range=[-0.05, 1.05]),
        hovermode='closest',
        showlegend=False,
        height=600
    )
    
    # Create distance plot
    dist_fig = go.Figure()
    dist_fig.add_trace(go.Scatter(
        x=list(range(len(distance_history))),
        y=distance_history,
        mode='lines',
        line=dict(color='royalblue', width=2),
        fill='tozeroy',
        name='Distance'
    ))
    dist_fig.update_layout(
        title="Distance over Iterations",
        xaxis=dict(title="Iteration"),
        yaxis=dict(title="Distance"),
        hovermode='x unified',
        height=400
    )
    
    # Info panel
    improvement = ((initial_dist - best_dist) / initial_dist * 100) if initial_dist > 0 else 0
    info_text = (
        f"  Iteration   : {iteration}\n"
        f"  Curr Dist   : {current_dist:.4f}\n"
        f"  Best Dist   : {best_dist:.4f}\n"
        f"  Improvement : {improvement:.1f}%\n"
        f"  Stuck for   : {stuck_counter} iters\n"
        f"  Local optima: {len(local_optima_distances)} found"
    )
    
    return stored_data, route_fig, dist_fig, info_text

if __name__ == '__main__':
    app.run(debug=True)
