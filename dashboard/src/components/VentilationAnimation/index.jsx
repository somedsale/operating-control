import { useEffect, useRef } from 'react';

// Particle class to manage individual particles in a circular cluster
class Particle {
  constructor(x, y, angle, radius) {
    this.centerX = x;
    this.centerY = y;
    this.angle = angle;
    this.radius = radius;
    this.x = this.centerX + Math.cos(this.angle) * this.radius;
    this.y = this.centerY + Math.sin(this.angle) * this.radius;
    this.size = Math.random() * 3 + 1;
    this.speedY = Math.random() * 2 + 1;
  }

  update(canvasHeight) {
    this.y += this.speedY;
    this.centerY += this.speedY;
    if (this.centerY > canvasHeight) {
      this.centerY = 0;
      this.y = this.centerY + Math.sin(this.angle) * this.radius;
    }
    this.x = this.centerX + Math.cos(this.angle) * this.radius;
    this.y = this.centerY + Math.sin(this.angle) * this.radius;
  }

  draw(ctx) {
    ctx.fillStyle = 'rgba(100, 100, 100, 0.7)';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Downward Arrow class
class DownArrow {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.opacity = 1;
    this.opacitySpeed = 0.02;
  }

  update(canvasHeight) {
    this.opacity += this.opacitySpeed;
    if (this.opacity > 1 || this.opacity < 0.3) {
      this.opacitySpeed = -this.opacitySpeed;
    }
    this.y += 1;
    if (this.y > canvasHeight) {
      this.y = 0;
      this.opacity = 1;
    }
  }

  draw(ctx) {
    ctx.strokeStyle = `rgba(100, 100, 100, ${this.opacity})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x, this.y + 40);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(this.x - 8, this.y + 32);
    ctx.lineTo(this.x, this.y + 40);
    ctx.lineTo(this.x + 8, this.y + 32);
    ctx.stroke();
  }
}

// Side Arrow class for floor arrows
class SideArrow {
  constructor(x, y, direction) {
    this.x = x;
    this.y = y;
    this.direction = direction; // 'left' or 'right'
    this.opacity = 1;
    this.opacitySpeed = 0.015;
  }

  update() {
    this.opacity += this.opacitySpeed;
    if (this.opacity > 1 || this.opacity < 0.3) {
      this.opacitySpeed = -this.opacitySpeed;
    }
  }

  draw(ctx) {
    ctx.strokeStyle = `rgba(100, 100, 100, ${this.opacity})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x + (this.direction === 'left' ? -40 : 40), this.y);
    ctx.stroke();

    ctx.beginPath();
    const tipX = this.x + (this.direction === 'left' ? -40 : 40);
    ctx.moveTo(tipX, this.y);
    ctx.lineTo(tipX + (this.direction === 'left' ? 8 : -8), this.y - 8);
    ctx.lineTo(tipX + (this.direction === 'left' ? 8 : -8), this.y + 8);
    ctx.stroke();
  }
}

const VentilationAnimation = () => {
  const canvasRef = useRef(null);
  const particles = [];
  const downArrows = [];
  const sideArrows = [];

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = 600;
    canvas.height = 400;

    // Initialize particles in circular clusters
    const vent1X = canvas.width / 3;
    const vent2X = (canvas.width / 3) * 2;
    const radius = 20;
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      particles.push(new Particle(vent1X, 10, angle, radius));
      particles.push(new Particle(vent2X, 10, angle, radius));
    }

    // Initialize downward arrows
    downArrows.push(new DownArrow(vent1X - 40, 0));
    downArrows.push(new DownArrow(vent1X, 0));
    downArrows.push(new DownArrow(vent1X + 40, 0));
    downArrows.push(new DownArrow(vent2X - 40, 0));
    downArrows.push(new DownArrow(vent2X, 0));
    downArrows.push(new DownArrow(vent2X + 40, 0));

    // Initialize side arrows on the floor
    sideArrows.push(new SideArrow(vent1X - 40, canvas.height - 20, 'left'));
    sideArrows.push(new SideArrow(vent1X, canvas.height - 20, 'left'));
    sideArrows.push(new SideArrow(vent1X + 40, canvas.height - 20, 'left'));
    sideArrows.push(new SideArrow(vent2X - 40, canvas.height - 20, 'right'));
    sideArrows.push(new SideArrow(vent2X, canvas.height - 20, 'right'));
    sideArrows.push(new SideArrow(vent2X + 40, canvas.height - 20, 'right'));

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw operating room
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(0, 0, canvas.width, 20); // Ceiling
      ctx.fillRect(0, 20, 10, canvas.height - 40); // Left wall
      ctx.fillRect(canvas.width - 10, 20, 10, canvas.height - 40); // Right wall
      ctx.fillRect(0, canvas.height - 20, canvas.width, 20); // Floor

      // Draw operating table
      ctx.fillStyle = '#a0aec0';
      ctx.fillRect(canvas.width / 2 - 60, canvas.height - 120, 120, 20); // Table top
      ctx.fillRect(canvas.width / 2 - 20, canvas.height - 140, 40, 20); // Headrest
      ctx.fillRect(canvas.width / 2 - 10, canvas.height - 100, 20, 80); // Table base

      // Draw vents
      ctx.fillStyle = '#718096';
      ctx.fillRect(vent1X - 25, 0, 50, 10);
      ctx.fillRect(vent2X - 25, 0, 50, 10);

      // Update and draw particles
      particles.forEach(particle => {
        particle.update(canvas.height);
        particle.draw(ctx);
      });

      // Update and draw downward arrows
      downArrows.forEach(arrow => {
        arrow.update(canvas.height);
        arrow.draw(ctx);
      });

      // Update and draw side arrows
      sideArrows.forEach(arrow => {
        arrow.update();
        arrow.draw(ctx);
      });

      requestAnimationFrame(animate);
    };

    animate();
  }, []);

  return (
    <div className="text-center">
      <h1 className="text-2xl font-bold mb-4 text-gray-800">
        Laminar Airflow Ventilation System in Operating Room
      </h1>
      <canvas ref={canvasRef}></canvas>
    </div>
  );
};

export default VentilationAnimation;