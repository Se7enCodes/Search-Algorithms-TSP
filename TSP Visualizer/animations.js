// Framer Motion-inspired animation utilities
class FramerAnimations {
    // Spring easing curves inspired by Framer Motion
    static easings = {
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
        bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        easeOut: 'cubic-bezier(0.16, 1, 0.3, 1)',
        easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)'
    };

    // Animate element with spring physics
    static animate(element, properties, options = {}) {
        const {
            duration = 0.6,
            easing = this.easings.spring,
            delay = 0,
            onComplete = null
        } = options;

        element.style.transition = `all ${duration}s ${easing} ${delay}s`;
        
        Object.keys(properties).forEach(key => {
            element.style[key] = properties[key];
        });

        if (onComplete) {
            setTimeout(onComplete, (duration + delay) * 1000);
        }
    }

    // Stagger animation for multiple elements
    static stagger(elements, properties, options = {}) {
        const {
            staggerDelay = 0.05,
            duration = 0.5,
            easing = this.easings.smooth,
            startDelay = 0
        } = options;

        elements.forEach((element, index) => {
            if (element) {
                const delay = startDelay + (index * staggerDelay);
                this.animate(element, properties, { duration, easing, delay });
            }
        });
    }

    // Fade in with scale
    static fadeInScale(element, options = {}) {
        const {
            duration = 0.5,
            delay = 0,
            scale = 0.95
        } = options;

        element.style.opacity = '0';
        element.style.transform = `scale(${scale})`;
        element.style.transition = `opacity ${duration}s ${this.easings.smooth}, transform ${duration}s ${this.easings.spring}`;
        
        requestAnimationFrame(() => {
            element.style.opacity = '1';
            element.style.transform = 'scale(1)';
        });
    }

    // Slide in from direction
    static slideIn(element, direction = 'up', options = {}) {
        const {
            duration = 0.6,
            distance = 30,
            delay = 0
        } = options;

        const directions = {
            up: `translateY(${distance}px)`,
            down: `translateY(-${distance}px)`,
            left: `translateX(${distance}px)`,
            right: `translateX(-${distance}px)`
        };

        element.style.opacity = '0';
        element.style.transform = directions[direction] || directions.up;
        element.style.transition = `opacity ${duration}s ${this.easings.smooth}, transform ${duration}s ${this.easings.spring}`;
        
        setTimeout(() => {
            element.style.opacity = '1';
            element.style.transform = 'translate(0, 0)';
        }, delay * 1000);
    }

    // Animate number counting
    static animateNumber(element, targetValue, options = {}) {
        const {
            duration = 1,
            decimals = 0,
            prefix = '',
            suffix = ''
        } = options;

        const startValue = parseFloat(element.textContent) || 0;
        const startTime = performance.now();

        const animate = (currentTime) => {
            const elapsed = (currentTime - startTime) / 1000;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function
            const eased = 1 - Math.pow(1 - progress, 3);
            const currentValue = startValue + (targetValue - startValue) * eased;
            
            element.textContent = prefix + currentValue.toFixed(decimals) + suffix;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                element.textContent = prefix + targetValue.toFixed(decimals) + suffix;
            }
        };

        requestAnimationFrame(animate);
    }

    // Pulse animation
    static pulse(element, options = {}) {
        const {
            scale = 1.05,
            duration = 0.3,
            repeat = false
        } = options;

        const originalTransform = element.style.transform || 'scale(1)';
        
        element.style.transition = `transform ${duration}s ${this.easings.spring}`;
        element.style.transform = `scale(${scale})`;
        
        setTimeout(() => {
            element.style.transform = originalTransform;
        }, duration * 1000);
    }

    // Initialize page animations
    static initPageAnimations() {
        // Stagger cards
        const cards = document.querySelectorAll('.card');
        this.stagger(cards, {
            opacity: '1',
            transform: 'translateY(0)'
        }, {
            staggerDelay: 0.08,
            duration: 0.6,
            startDelay: 0.2
        });

        // Animate stat items
        const statItems = document.querySelectorAll('.stat-item');
        this.stagger(statItems, {
            opacity: '1',
            transform: 'translateX(0)'
        }, {
            staggerDelay: 0.05,
            duration: 0.5,
            startDelay: 0.4
        });

        // Animate buttons
        const buttons = document.querySelectorAll('.btn');
        this.stagger(buttons, {
            opacity: '1',
            transform: 'scale(1)'
        }, {
            staggerDelay: 0.06,
            duration: 0.5,
            startDelay: 0.6
        });

        // Animate list items
        const listItems = document.querySelectorAll('.steps-list li');
        this.stagger(listItems, {
            opacity: '1',
            transform: 'translateX(0)'
        }, {
            staggerDelay: 0.1,
            duration: 0.5,
            startDelay: 0.8
        });
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FramerAnimations;
}
