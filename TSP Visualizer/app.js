// TSP Visualizer - Interactive Web Application
class TSPVisualizer {
    constructor() {
        this.canvas = document.getElementById('tsp-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.graphCanvas = document.getElementById('graph-canvas');
        this.graphCtx = this.graphCanvas.getContext('2d');
        
        // State
        this.cities = [];
        this.currentRoute = [];
        this.currentDistance = 0;
        this.bestDistance = Infinity;
        this.distanceHistory = [];
        this.iteration = 0;
        this.stuckCounter = 0;
        this.localOptimaDistances = [];
        this.isGlobal = false;
        this.isRunning = false;
        this.animationId = null;
        
        // Run tracking
        this.runs = []; // Array to store all runs
        this.currentRunIndex = -1;
        this.runStartIteration = 0;
        
        // Animation state
        this.lastBestDistance = Infinity;
        this.animationFrameId = null;
        
        // Settings
        this.numCities = 50;
        this.speed = 5;
        this.showPath = true;
        this.showCities = true;
        this.stuckThreshold = 50;
        
        // Animation
        this.animationProgress = 0;
        this.previousRoute = [];
        this.targetRoute = [];
        
        // Theme
        this.theme = 'light';
        
        this.init();
    }
    
    init() {
        // Set theme FIRST before anything else
        document.documentElement.setAttribute('data-theme', this.theme);
        
        this.setupCanvas();
        this.setupEventListeners();
        
        this.generateCities();
        this.initializeRoute(false); // First initialization, not a restart
        this.updateUI();
        
        // Small delay to ensure CSS variables are applied
        requestAnimationFrame(() => {
            this.draw();
            this.drawGraph();
        });
    }
    
    setupCanvas() {
        const resizeCanvas = () => {
            const rect = this.canvas.parentElement.getBoundingClientRect();
            this.canvas.width = rect.width - 32;
            this.canvas.height = 600;
            this.draw();
        };
        
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        
        // Graph canvas
        const resizeGraph = () => {
            const graphRect = this.graphCanvas.parentElement.getBoundingClientRect();
            this.graphCanvas.width = graphRect.width - 48;
            this.graphCanvas.height = 300;
            this.drawGraph();
        };
        
        resizeGraph();
        window.addEventListener('resize', resizeGraph);
    }
    
    setupEventListeners() {
        // Bulb at top, cord hangs down; user pulls cord end to stretch and toggle
        const bulbToggle = document.getElementById('bulb-toggle');
        const cordEnd = document.getElementById('cord-end');
        const cordSvg = document.getElementById('cord-svg');
        const cordPath = cordSvg ? cordSvg.querySelector('.cord-path') : null;
        
        if (bulbToggle && cordEnd && cordPath) {
            let isDragging = false;
            let startClientY = 0;
            let startPull = 0;
            let pullAmount = 0; // how far the cord is stretched down (px)
            const restLength = 60;   // cord length when relaxed
            const toggleThreshold = 35; // pull this far to toggle on release
            const maxPull = 80;
            
            document.documentElement.setAttribute('data-theme', this.theme);
            
            const updateCord = () => {
                const totalLength = restLength + pullAmount;
                cordSvg.style.height = totalLength + 'px';
                cordSvg.setAttribute('viewBox', `0 0 50 ${totalLength}`);
                cordPath.setAttribute('d', `M 25 0 L 25 ${totalLength}`);
                cordEnd.style.transform = `translateY(${pullAmount}px)`;
            };
            
            const handleToggle = () => {
                if (pullAmount >= toggleThreshold) {
                    // Stretched enough → toggle theme
                    if (this.theme === 'light') {
                        this.theme = 'dark';
                        document.documentElement.setAttribute('data-theme', 'dark');
                        this.draw();
                        this.drawGraph();
                    } else {
                        this.theme = 'light';
                        document.documentElement.setAttribute('data-theme', 'light');
                        this.draw();
                        this.drawGraph();
                    }
                }
                // Always spring cord back to relaxed
                pullAmount = 0;
                springCordBack();
            };
            
            const springCordBack = () => {
                const duration = 450;
                const startTime = performance.now();
                const startPull = pullAmount;
                
                const animate = (timestamp) => {
                    const elapsed = timestamp - startTime;
                    const progress = Math.min(elapsed / duration, 1);
                    const eased = 1 - Math.pow(1 - progress, 4); // ease out quart
                    pullAmount = startPull * (1 - eased);
                    updateCord();
                    if (progress < 1) requestAnimationFrame(animate);
                    else {
                        pullAmount = 0;
                        updateCord();
                        bulbToggle.classList.remove('dragging');
                        cordPath.style.transition = 'd 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)';
                    }
                };
                cordPath.style.transition = 'none';
                requestAnimationFrame(animate);
            };
            
            cordEnd.addEventListener('mousedown', (e) => {
                isDragging = true;
                startClientY = e.clientY;
                startPull = pullAmount;
                bulbToggle.classList.add('dragging');
                cordPath.style.transition = 'none';
                e.preventDefault();
            });
            
            document.addEventListener('mousemove', (e) => {
                if (isDragging) {
                    const dy = e.clientY - startClientY;
                    pullAmount = Math.max(0, Math.min(maxPull, startPull + dy));
                    updateCord();
                }
            });
            
            document.addEventListener('mouseup', () => {
                if (isDragging) {
                    isDragging = false;
                    handleToggle();
                }
            });
            
            cordEnd.addEventListener('touchstart', (e) => {
                isDragging = true;
                startClientY = e.touches[0].clientY;
                startPull = pullAmount;
                bulbToggle.classList.add('dragging');
                cordPath.style.transition = 'none';
                e.preventDefault();
            });
            
            document.addEventListener('touchmove', (e) => {
                if (isDragging) {
                    const dy = e.touches[0].clientY - startClientY;
                    pullAmount = Math.max(0, Math.min(maxPull, startPull + dy));
                    updateCord();
                    e.preventDefault();
                }
            });
            
            document.addEventListener('touchend', () => {
                if (isDragging) {
                    isDragging = false;
                    handleToggle();
                }
            });
            
            updateCord();
        }
        
        // Buttons
        document.getElementById('start-btn').addEventListener('click', () => this.start());
        document.getElementById('pause-btn').addEventListener('click', () => this.pause());
        document.getElementById('restart-btn').addEventListener('click', () => this.restart());
        
        // Settings
        const cityCountSlider = document.getElementById('city-count');
        const speedSlider = document.getElementById('speed');
        const showPathToggle = document.getElementById('show-path');
        const showCitiesToggle = document.getElementById('show-cities');
        
        cityCountSlider.addEventListener('input', (e) => {
            this.numCities = parseInt(e.target.value);
            document.getElementById('city-count-value').textContent = this.numCities;
            this.restart();
        });
        
        speedSlider.addEventListener('input', (e) => {
            this.speed = parseInt(e.target.value);
            document.getElementById('speed-value').textContent = this.speed;
        });
        
        showPathToggle.addEventListener('change', (e) => {
            this.showPath = e.target.checked;
            this.draw();
        });
        
        showCitiesToggle.addEventListener('change', (e) => {
            this.showCities = e.target.checked;
            this.draw();
        });
    }
    
    generateCities() {
        this.cities = [];
        for (let i = 0; i < this.numCities; i++) {
            this.cities.push({
                x: 0.1 + Math.random() * 0.8,
                y: 0.1 + Math.random() * 0.8
            });
        }
    }
    
    initializeRoute(isRestart = false) {
        // Save current run before starting new one (only if there's actual data)
        if (isRestart && this.distanceHistory.length > 0) {
            this.runs.push({
                distanceHistory: [...this.distanceHistory],
                startIteration: this.runStartIteration,
                endIteration: this.iteration,
                bestDistance: this.bestDistance,
                initialDistance: this.distanceHistory[0]
            });
        }
        
        this.currentRoute = Array.from({ length: this.numCities }, (_, i) => i);
        this.shuffleArray(this.currentRoute);
        this.currentDistance = this.calculateDistance(this.currentRoute);
        this.bestDistance = this.currentDistance;
        this.runStartIteration = this.iteration;
        this.distanceHistory = [this.currentDistance];
        this.stuckCounter = 0;
        this.localOptimaDistances = [];
        this.isGlobal = false;
        this.previousRoute = [...this.currentRoute];
        this.targetRoute = [...this.currentRoute];
        this.animationProgress = 1;
        this.currentRunIndex = this.runs.length;
    }
    
    calculateDistance(route) {
        let distance = 0;
        for (let i = 0; i < route.length; i++) {
            const city1 = this.cities[route[i]];
            const city2 = this.cities[route[(i + 1) % route.length]];
            const dx = city2.x - city1.x;
            const dy = city2.y - city1.y;
            distance += Math.sqrt(dx * dx + dy * dy);
        }
        return distance;
    }
    
    twoOptSwap(route) {
        const newRoute = [...route];
        const i = Math.floor(Math.random() * route.length);
        let j = Math.floor(Math.random() * route.length);
        while (j === i) {
            j = Math.floor(Math.random() * route.length);
        }
        
        const start = Math.min(i, j);
        const end = Math.max(i, j);
        
        // Reverse the segment
        for (let k = 0; k <= (end - start) / 2; k++) {
            [newRoute[start + k], newRoute[end - k]] = [newRoute[end - k], newRoute[start + k]];
        }
        
        return newRoute;
    }
    
    getStatus() {
        const isLight = this.theme === 'light';
        const primaryColor = isLight ? '#000000' : '#ffffff';
        const secondaryColor = isLight ? '#666666' : '#888888';
        const bgColor = isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.05)';
        const bgColorSubtle = isLight ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.03)';
        
        if (this.stuckCounter === 0) {
            return {
                status: 'improving',
                label: 'Improving',
                color: primaryColor,
                bgColor: bgColor
            };
        } else if (this.stuckCounter < this.stuckThreshold) {
            return {
                status: 'searching',
                label: `Searching (${this.stuckCounter})`,
                color: secondaryColor,
                bgColor: bgColorSubtle
            };
        } else {
            if (this.isGlobal) {
                return {
                    status: 'global',
                    label: 'Global Optimum',
                    color: primaryColor,
                    bgColor: bgColor
                };
            } else {
                return {
                    status: 'local',
                    label: 'Local Optimum',
                    color: secondaryColor,
                    bgColor: bgColorSubtle
                };
            }
        }
    }
    
    update() {
        if (!this.isRunning) return;
        
        let improved = false;
        
        // Try multiple swaps per frame
        for (let i = 0; i < 10; i++) {
            const neighbor = this.twoOptSwap(this.currentRoute);
            const neighborDistance = this.calculateDistance(neighbor);
            
            if (neighborDistance < this.currentDistance) {
                this.previousRoute = [...this.currentRoute];
                this.currentRoute = neighbor;
                this.currentDistance = neighborDistance;
                this.stuckCounter = 0;
                improved = true;
                this.animationProgress = 0;
                
                if (this.currentDistance < this.bestDistance) {
                    this.bestDistance = this.currentDistance;
                    this.isGlobal = false;
                }
                break;
            } else {
                this.stuckCounter++;
            }
        }
        
        this.iteration++;
        this.distanceHistory.push(this.currentDistance);
        
        // Check for local/global optima
        if (this.stuckCounter >= this.stuckThreshold) {
            if (this.localOptimaDistances.length === 0 || 
                this.currentDistance < Math.min(...this.localOptimaDistances)) {
                this.isGlobal = true;
            } else {
                this.isGlobal = false;
            }
            
            // Add to local optima if new
            if (!this.localOptimaDistances.some(d => Math.abs(d - this.currentDistance) < 1e-6)) {
                this.localOptimaDistances.push(this.currentDistance);
            }
        }
        
        // Update animation
        if (improved) {
            this.targetRoute = [...this.currentRoute];
        }
        
        this.animationProgress = Math.min(1, this.animationProgress + 0.1 * this.speed);
        
        this.updateUI();
        this.draw();
        this.drawGraph();
    }
    
    updateUI() {
        const status = this.getStatus();
        const statusBadge = document.getElementById('status-badge');
        
        // Animate status badge change only when status actually changes
        if (statusBadge) {
            const currentLabel = statusBadge.querySelector('.status-text')?.textContent;
            if (currentLabel !== status.label) {
                FramerAnimations.pulse(statusBadge, { scale: 1.05, duration: 0.2 });
            }
            statusBadge.innerHTML = `<span class="status-text">${status.label}</span>`;
            statusBadge.style.background = status.bgColor;
            statusBadge.style.borderColor = status.color;
            statusBadge.style.color = status.color;
        }
        
        // Update stats - use direct updates for performance, animate only on significant changes
        const iterationEl = document.getElementById('iteration');
        const currentDistEl = document.getElementById('current-dist');
        const bestDistEl = document.getElementById('best-dist');
        const improvementEl = document.getElementById('improvement');
        const stuckCountEl = document.getElementById('stuck-count');
        const localOptimaEl = document.getElementById('local-optima');
        
        if (iterationEl) {
            iterationEl.textContent = this.iteration;
        }
        
        if (currentDistEl) {
            currentDistEl.textContent = this.currentDistance.toFixed(4);
        }
        
        if (bestDistEl) {
            const oldValue = parseFloat(bestDistEl.textContent) || Infinity;
            if (this.bestDistance < oldValue - 0.001) {
                FramerAnimations.pulse(bestDistEl, { scale: 1.1, duration: 0.3 });
            }
            bestDistEl.textContent = this.bestDistance.toFixed(4);
        }
        
        const improvement = this.distanceHistory.length > 0 
            ? ((this.distanceHistory[0] - this.bestDistance) / this.distanceHistory[0] * 100).toFixed(1)
            : '0.0';
        if (improvementEl) {
            improvementEl.textContent = `${improvement}%`;
        }
        
        if (stuckCountEl) {
            stuckCountEl.textContent = this.stuckCounter;
        }
        
        if (localOptimaEl) {
            localOptimaEl.textContent = this.localOptimaDistances.length;
        }
    }
    
    draw() {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const padding = 40;
        const drawWidth = width - 2 * padding;
        const drawHeight = height - 2 * padding;
        
        // Clear canvas - use theme-aware color
        const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--bg-secondary').trim() || 
                       (this.theme === 'light' ? '#f5f5f5' : '#0a0a0a');
        this.ctx.fillStyle = bgColor;
        this.ctx.fillRect(0, 0, width, height);
        
        if (this.cities.length === 0) return;
        
        // Draw path with smooth animation
        if (this.showPath && this.currentRoute.length > 0) {
            const status = this.getStatus();
            this.ctx.strokeStyle = status.color;
            this.ctx.lineWidth = 1.5;
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';
            this.ctx.globalAlpha = 0.6;
            
            this.ctx.beginPath();
            
            // Interpolate between previous and current route for smooth animation
            const route = this.animationProgress < 1 
                ? this.interpolateRoute(this.previousRoute, this.targetRoute, this.animationProgress)
                : this.currentRoute;
            
            for (let i = 0; i <= route.length; i++) {
                const cityIdx = route[i % route.length];
                const city = this.cities[cityIdx];
                const x = padding + city.x * drawWidth;
                const y = padding + city.y * drawHeight;
                
                if (i === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
            }
            
            this.ctx.stroke();
            this.ctx.globalAlpha = 1;
        }
        
        // Draw cities
        if (this.showCities) {
            this.cities.forEach((city, idx) => {
                const x = padding + city.x * drawWidth;
                const y = padding + city.y * drawHeight;
                
                // City circle
                const cityColor = this.theme === 'light' ? '#000000' : '#ffffff';
                this.ctx.fillStyle = cityColor;
                this.ctx.beginPath();
                this.ctx.arc(x, y, 4, 0, Math.PI * 2);
                this.ctx.fill();
            });
        }
    }
    
    interpolateRoute(route1, route2, t) {
        // Simple interpolation - for smoother animation, you could use more sophisticated methods
        return t < 0.5 ? route1 : route2;
    }
    
    drawGraph() {
        const width = this.graphCanvas.width;
        const height = this.graphCanvas.height;
        const padding = 20;
        const graphWidth = width - 2 * padding;
        const graphHeight = height - 2 * padding;
        
        // Clear - use theme-aware color
        const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--bg-secondary').trim() || 
                       (this.theme === 'light' ? '#f5f5f5' : '#0a0a0a');
        this.graphCtx.fillStyle = bgColor;
        this.graphCtx.fillRect(0, 0, width, height);
        
        // Collect all distance values from all runs and current run
        const allDistances = [];
        this.runs.forEach(run => {
            allDistances.push(...run.distanceHistory);
        });
        if (this.distanceHistory.length > 0) {
            allDistances.push(...this.distanceHistory);
        }
        
        if (allDistances.length < 2) return;
        
        // Find min/max across all runs
        const minDist = Math.min(...allDistances);
        const maxDist = Math.max(...allDistances);
        const range = maxDist - minDist || 1;
        
        // Draw grid
        const gridColor = this.theme === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)';
        this.graphCtx.strokeStyle = gridColor;
        this.graphCtx.lineWidth = 1;
        for (let i = 0; i <= 5; i++) {
            const y = padding + (i / 5) * graphHeight;
            this.graphCtx.beginPath();
            this.graphCtx.moveTo(padding, y);
            this.graphCtx.lineTo(width - padding, y);
            this.graphCtx.stroke();
        }
        
        // Draw previous runs in lighter color
        const previousLineColor = this.theme === 'light' ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.3)';
        this.graphCtx.strokeStyle = previousLineColor;
        this.graphCtx.lineWidth = 1;
        this.graphCtx.lineCap = 'round';
        this.graphCtx.lineJoin = 'round';
        
        let totalIterations = 0;
        this.runs.forEach((run, runIdx) => {
            if (run.distanceHistory.length < 2) return;
            
            this.graphCtx.beginPath();
            for (let i = 0; i < run.distanceHistory.length; i++) {
                const globalIteration = totalIterations + i;
                const x = padding + (globalIteration / Math.max(1, allDistances.length - 1)) * graphWidth;
                const normalizedDist = (run.distanceHistory[i] - minDist) / range;
                const y = padding + graphHeight - normalizedDist * graphHeight;
                
                if (i === 0) {
                    this.graphCtx.moveTo(x, y);
                } else {
                    this.graphCtx.lineTo(x, y);
                }
            }
            this.graphCtx.stroke();
            totalIterations += run.distanceHistory.length;
        });
        
        // Draw current run in full color
        if (this.distanceHistory.length >= 2) {
            const lineColor = this.theme === 'light' ? '#000000' : '#ffffff';
            this.graphCtx.strokeStyle = lineColor;
            this.graphCtx.lineWidth = 1.5;
            this.graphCtx.lineCap = 'round';
            this.graphCtx.lineJoin = 'round';
            
            this.graphCtx.beginPath();
            for (let i = 0; i < this.distanceHistory.length; i++) {
                const globalIteration = totalIterations + i;
                const x = padding + (globalIteration / Math.max(1, allDistances.length - 1)) * graphWidth;
                const normalizedDist = (this.distanceHistory[i] - minDist) / range;
                const y = padding + graphHeight - normalizedDist * graphHeight;
                
                if (i === 0) {
                    this.graphCtx.moveTo(x, y);
                } else {
                    this.graphCtx.lineTo(x, y);
                }
            }
            this.graphCtx.stroke();
            
            // Draw gradient fill for current run only
            const gradientStart = this.theme === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)';
            const gradientEnd = this.theme === 'light' ? 'rgba(0, 0, 0, 0)' : 'rgba(255, 255, 255, 0)';
            const gradient = this.graphCtx.createLinearGradient(padding, padding, padding, height - padding);
            gradient.addColorStop(0, gradientStart);
            gradient.addColorStop(1, gradientEnd);
            
            this.graphCtx.lineTo(width - padding, height - padding);
            this.graphCtx.lineTo(padding, height - padding);
            this.graphCtx.closePath();
            this.graphCtx.fillStyle = gradient;
            this.graphCtx.fill();
        }
    }
    
    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.animate();
    }
    
    pause() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }
    
    restart() {
        this.pause();
        
        // Animate canvas fade out
        const canvasWrapper = document.querySelector('.canvas-wrapper');
        if (canvasWrapper) {
            canvasWrapper.style.opacity = '0.5';
            canvasWrapper.style.transform = 'scale(0.98)';
        }
        
        setTimeout(() => {
            this.generateCities();
            this.initializeRoute(true); // Pass true to indicate this is a restart
            
            // Animate canvas fade in
            if (canvasWrapper) {
                canvasWrapper.style.transition = 'opacity 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
                canvasWrapper.style.opacity = '1';
                canvasWrapper.style.transform = 'scale(1)';
            }
            
            this.updateUI();
            this.draw();
            this.drawGraph();
        }, 200);
    }
    
    animate() {
        if (!this.isRunning) return;
        
        // Update based on speed
        const updatesPerFrame = Math.max(1, Math.floor(this.speed / 2));
        for (let i = 0; i < updatesPerFrame; i++) {
            this.update();
        }
        
        this.animationId = requestAnimationFrame(() => this.animate());
    }
    
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Set initial theme FIRST, before anything else
    document.documentElement.setAttribute('data-theme', 'light');
    
    // Small delay to ensure CSS is applied
    setTimeout(() => {
        const visualizer = new TSPVisualizer();
        
        // Initialize Framer Motion-inspired animations
        setTimeout(() => {
            FramerAnimations.initPageAnimations();
        }, 100);
    }, 10);
});
