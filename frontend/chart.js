/**
 * Interactive Canvas Chart Engine
 * High-performance, touch-friendly, zero-dependency responsive charting for weight & health trends.
 */

export class HealthChart {
  constructor(canvasElement, options = {}) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.options = options;
    this.data = [];
    this.targetWeight = null;
    this.mode = 'weight'; // 'weight' | 'fat' | 'bmi'
    this.activePoint = null;
    this.pixelRatio = window.devicePixelRatio || 1;

    this.initEvents();
    this.resize();

    window.addEventListener('resize', () => {
      this.resize();
      this.render();
    });
  }

  setData(data, targetWeight = null, mode = 'weight') {
    this.data = data;
    this.targetWeight = targetWeight;
    this.mode = mode;
    this.activePoint = null;
    this.render();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width || 600;
    const height = rect.height || 280;

    this.pixelRatio = window.devicePixelRatio || 1;
    this.canvas.width = width * this.pixelRatio;
    this.canvas.height = height * this.pixelRatio;
    this.ctx.scale(this.pixelRatio, this.pixelRatio);

    this.width = width;
    this.height = height;
  }

  initEvents() {
    const handleMove = (e) => {
      if (!this.data || this.data.length === 0) return;
      const rect = this.canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      // Find closest data point by X coordinate
      let closest = null;
      let minDistance = Infinity;

      for (const pt of this.renderedPoints || []) {
        const dist = Math.hypot(pt.x - x, pt.y - y);
        const xDist = Math.abs(pt.x - x);
        if (xDist < minDistance && xDist < 40) {
          minDistance = xDist;
          closest = pt;
        }
      }

      if (closest !== this.activePoint) {
        this.activePoint = closest;
        this.render();
      }
    };

    const handleLeave = () => {
      if (this.activePoint) {
        this.activePoint = null;
        this.render();
      }
    };

    this.canvas.addEventListener('mousemove', handleMove);
    this.canvas.addEventListener('mouseleave', handleLeave);
    this.canvas.addEventListener('touchmove', handleMove, { passive: true });
    this.canvas.addEventListener('touchend', handleLeave);
  }

  getThemeColors() {
    const style = getComputedStyle(document.documentElement);
    return {
      primary: style.getPropertyValue('--color-primary').trim() || '#3b82f6',
      primaryFade: style.getPropertyValue('--color-primary-fade').trim() || 'rgba(59, 130, 246, 0.12)',
      trend: style.getPropertyValue('--color-trend').trim() || '#10b981',
      target: style.getPropertyValue('--color-target').trim() || '#f59e0b',
      border: style.getPropertyValue('--color-border').trim() || '#334155',
      textMuted: style.getPropertyValue('--color-text-muted').trim() || '#94a3b8',
      textPrimary: style.getPropertyValue('--color-text-primary').trim() || '#f8fafc',
      cardBg: style.getPropertyValue('--color-card-bg').trim() || '#1e293b'
    };
  }

  render() {
    const ctx = this.ctx;
    const width = this.width;
    const height = this.height;
    const colors = this.getThemeColors();

    ctx.clearRect(0, 0, width, height);

    if (!this.data || this.data.length === 0) {
      ctx.fillStyle = colors.textMuted;
      ctx.font = '14px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('No weight entries in this timeframe. Tap "+ Log Weight" to start.', width / 2, height / 2);
      return;
    }

    const padding = { top: 25, right: 35, bottom: 40, left: 45 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Extract values based on active mode
    const items = this.data.map(d => {
      let val = d.weight;
      let trendVal = d.trendWeight;
      if (this.mode === 'fat') {
        val = d.bodyFat || 0;
        trendVal = d.bodyFatTrend || val;
      } else if (this.mode === 'bmi') {
        val = d.bmi || 0;
        trendVal = d.bmiTrend || val;
      }
      return { ...d, plotValue: val, plotTrend: trendVal };
    });

    let allValues = items.map(d => d.plotValue).concat(items.map(d => d.plotTrend));
    if (this.mode === 'weight' && this.targetWeight) {
      allValues.push(this.targetWeight);
    }

    let minVal = Math.min(...allValues);
    let maxVal = Math.max(...allValues);

    // Provide breathing room
    const range = maxVal - minVal || 2;
    minVal = Math.floor(minVal - range * 0.15);
    maxVal = Math.ceil(maxVal + range * 0.15);

    const getX = (index) => {
      if (items.length === 1) return padding.left + chartWidth / 2;
      return padding.left + (index / (items.length - 1)) * chartWidth;
    };

    const getY = (val) => {
      return padding.top + chartHeight - ((val - minVal) / (maxVal - minVal)) * chartHeight;
    };

    // 1. Draw Grid Lines & Y-Axis Labels
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 1;
    ctx.fillStyle = colors.textMuted;
    ctx.font = '11px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    const yTicks = 4;
    for (let i = 0; i <= yTicks; i++) {
      const tickVal = minVal + (i / yTicks) * (maxVal - minVal);
      const y = getY(tickVal);

      ctx.beginPath();
      ctx.setLineDash([4, 4]);
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      const unit = this.mode === 'weight' ? 'kg' : (this.mode === 'fat' ? '%' : '');
      ctx.fillText(`${tickVal.toFixed(1)}${unit}`, padding.left - 8, y);
    }
    ctx.setLineDash([]); // Reset line dash

    // 2. Draw Target Line if set and in weight mode
    if (this.mode === 'weight' && this.targetWeight && this.targetWeight >= minVal && this.targetWeight <= maxVal) {
      const targetY = getY(this.targetWeight);
      ctx.strokeStyle = colors.target;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(padding.left, targetY);
      ctx.lineTo(width - padding.right, targetY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = colors.target;
      ctx.textAlign = 'left';
      ctx.fillText(`Target: ${this.targetWeight}kg`, width - padding.right - 70, targetY - 8);
    }

    // Map screen coordinates
    const points = items.map((item, idx) => ({
      ...item,
      x: getX(idx),
      y: getY(item.plotValue),
      trendY: getY(item.plotTrend)
    }));
    this.renderedPoints = points;

    // 3. Draw Trend Line (Smoothed Spline)
    if (points.length > 1) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].trendY);

      for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i];
        const p1 = points[i + 1];
        const cpX = (p0.x + p1.x) / 2;
        ctx.bezierCurveTo(cpX, p0.trendY, cpX, p1.trendY, p1.x, p1.trendY);
      }

      ctx.strokeStyle = colors.trend;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    // 4. Draw Raw Entries Line and Dots
    if (points.length > 1) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.strokeStyle = colors.primaryFade;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    for (const pt of points) {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = colors.primary;
      ctx.fill();
      ctx.strokeStyle = colors.cardBg;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // 5. Draw X-Axis Date Labels (first, middle, last to avoid clutter on mobile)
    ctx.fillStyle = colors.textMuted;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const formatDateLabel = (dateStr) => {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return `${parts[1]}/${parts[2]}`;
      }
      return dateStr;
    };

    if (points.length > 0) {
      ctx.fillText(formatDateLabel(points[0].date), points[0].x, height - padding.bottom + 10);
      if (points.length > 2) {
        const midIdx = Math.floor(points.length / 2);
        ctx.fillText(formatDateLabel(points[midIdx].date), points[midIdx].x, height - padding.bottom + 10);
      }
      if (points.length > 1) {
        ctx.fillText(formatDateLabel(points[points.length - 1].date), points[points.length - 1].x, height - padding.bottom + 10);
      }
    }

    // 6. Draw Tooltip for Active Hover/Touch Point
    if (this.activePoint) {
      const pt = this.activePoint;

      // Draw crosshair vertical line
      ctx.strokeStyle = colors.primary;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(pt.x, padding.top);
      ctx.lineTo(pt.x, height - padding.bottom);
      ctx.stroke();
      ctx.setLineDash([]);

      // Highlight active point
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = colors.primary;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Tooltip Card
      const tooltipText1 = `${pt.date}`;
      const unit = this.mode === 'weight' ? 'kg' : (this.mode === 'fat' ? '%' : '');
      const tooltipText2 = `Actual: ${pt.plotValue.toFixed(2)} ${unit}`;
      const tooltipText3 = `Trend: ${pt.plotTrend.toFixed(2)} ${unit}`;

      ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
      const textWidth = Math.max(
        ctx.measureText(tooltipText1).width,
        ctx.measureText(tooltipText2).width,
        ctx.measureText(tooltipText3).width
      ) + 20;

      const ttWidth = Math.max(120, textWidth);
      const ttHeight = 62;
      let ttX = pt.x - ttWidth / 2;
      let ttY = pt.y - ttHeight - 12;

      // Bounds checking
      if (ttX < 10) ttX = 10;
      if (ttX + ttWidth > width - 10) ttX = width - ttWidth - 10;
      if (ttY < 10) ttY = pt.y + 12;

      // Background
      ctx.fillStyle = colors.cardBg;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 3;
      ctx.beginPath();
      ctx.roundRect(ttX, ttY, ttWidth, ttHeight, 6);
      ctx.fill();
      ctx.strokeStyle = colors.border;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.shadowColor = 'transparent';

      // Text
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle = colors.textMuted;
      ctx.font = '11px system-ui, -apple-system, sans-serif';
      ctx.fillText(tooltipText1, ttX + 10, ttY + 8);

      ctx.fillStyle = colors.textPrimary;
      ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
      ctx.fillText(tooltipText2, ttX + 10, ttY + 24);

      ctx.fillStyle = colors.trend;
      ctx.font = '11px system-ui, -apple-system, sans-serif';
      ctx.fillText(tooltipText3, ttX + 10, ttY + 42);
    }
  }
}
