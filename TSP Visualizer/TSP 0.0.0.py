def TSP (cities):
    current = random_route(cities)
    
    while not stuck:
        neighbor = swap_two_cities(current)  # "2-opt" swap
        
        if distance(neighbor) < distance(current):
            current = neighbor  # climb!
        
        # else: discard and try again