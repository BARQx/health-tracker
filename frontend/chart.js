/**
 * Interactive Canvas Chart Engine
 * High-performance, touch-friendly, zero-dependency responsive charting for weight, body fat & BMI trends.
 */

import { getBmiCategory } from './formulas.js';

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
        const xDist = Math.abs(pt.x - x);
        if (xDist < minDistance && xDist < 45) {
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
    this.canvas.addEventListener('touchstart', handleMove, { passive: true });
    this.canvas.addEventListener('touchmove', handleMove, { passive: true });
    this.canvas.addEventListener('touchend', handleLeave);
  }

  getThemeColors() {
    const style = getComputedStyle(document.documentElement);
    let accentColor = style.getPropertyValue('--color-primary').trim() || '#3b82f6';
    let accentFade = style.getPropertyValue('--color-primary-fade').trim() || 'rgba(59, 130, 246, 0.15)';

    if (this.mode === 'fat') {
      accentColor = '#10b981'; // Emerald
      accentFade = 'rgba(16, 185, 129, 0.18)';
    } else if (this.mode === 'bmi') {
      accentColor = '#8b5cf6'; // Purple / Violet
      accentFade = 'rgba(139, 92, 246, 0.18)';
    }

    return {
      accent: accentColor,
      accentFade: accentFade,
      trend: style.getPropertyValue('--color-trend').trim() || '#10b981',
      target: style.getPropertyValue('--color-target').trim() || '#f59e0b',
      danger: style.getPropertyValue('--color-danger').trim() || '#ef4444',
      border: style.getPropertyValue('--color-border').trim() || '#334155',
      textMuted: style.getPropertyValue('--color-text-muted').trim() || '#94a3b8',
      textPrimary: style.getPropertyValue('--color-text-primary').trim() || '#f8fafc',
      cardBg: style.getPropertyValue('--color-card-bg').trim() || '#141417'
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
      ctx.fillText('No entries in this timeframe. Tap "+ Log Weight" to record a check-in.', width / 2, height / 2);
      return;
    }

    const padding = { top: 28, right: 35, bottom: 42, left: 45 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Extract values based on active mode
    const items = this.data.map(d => {
      let val = d.weight;
      let delta = d.deltaWeight !== undefined ? d.deltaWeight : null;
      let unit = 'kg';

      if (this.mode === 'fat') {
        val = d.bodyFat || 0;
        delta = d.deltaBodyFat !== undefined ? d.deltaBodyFat : null;
        unit = '%';
      } else if (this.mode === 'bmi') {
        val = d.bmi || 0;
        delta = d.deltaBmi !== undefined ? d.deltaBmi : null;
        unit = '';
      }

      return {
        ...d,
        plotValue: val,
        deltaValue: delta,
        unit
      };
    });

    let allValues = items.map(d => d.plotValue);
    if (this.mode === 'weight' && this.targetWeight) {
      allValues.push(this.targetWeight);
    }

    let minVal = Math.min(...allValues);
    let maxVal = Math.max(...allValues);

    // Provide breathing room
    const range = maxVal - minVal || 2;
    minVal = Math.max(0, Math.floor(minVal - range * 0.15));
    maxVal = Math.ceil(maxVal + range * 0.15);

    const getX = (index) => {
      if (items.length === 1) return padding.left + chartWidth / 2;
      return padding.left + (index / (items.length - 1)) * chartWidth;
    };

    const getY = (val) => {
      if (maxVal === minVal) return padding.top + chartHeight / 2;
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

      const unitLabel = this.mode === 'weight' ? 'kg' : (this.mode === 'fat' ? '%' : '');
      ctx.fillText(`${tickVal.toFixed(1)}${unitLabel}`, padding.left - 8, y);
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
      ctx.fillText(`Target: ${this.targetWeight}kg`, width - padding.right - 80, targetY - 8);
    }

    // Map screen coordinates
    const points = items.map((item, idx) => ({
      ...item,
      x: getX(idx),
      y: getY(item.plotValue)
    }));
    this.renderedPoints = points;

    // 3. Draw Single Clean Data Area and Line
    if (points.length > 1) {
      // Subtle gradient fill under curve
      const grad = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
      grad.addColorStop(0, colors.accentFade);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.beginPath();
      ctx.moveTo(points[0].x, height - padding.bottom);
      ctx.lineTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.lineTo(points[points.length - 1].x, height - padding.bottom);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      // Sharp primary stroke line
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.strokeStyle = colors.accent;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.stroke();
    } else if (points.length === 1) {
      // Single entry indicator guideline
      ctx.beginPath();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = colors.accentFade;
      ctx.moveTo(padding.left, points[0].y);
      ctx.lineTo(width - padding.right, points[0].y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 4. Draw Crisp Data Dots
    for (const pt of points) {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = colors.accent;
      ctx.fill();
      ctx.strokeStyle = colors.cardBg;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // 5. Draw X-Axis Date Labels (First, Middle, Last for mobile polish)
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

    // 6. Draw High-Precision Dynamic Tooltip
    if (this.activePoint) {
      const pt = this.activePoint;

      // Draw crosshair vertical dashed line
      ctx.strokeStyle = colors.accent;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(pt.x, padding.top);
      ctx.lineTo(pt.x, height - padding.bottom);
      ctx.stroke();
      ctx.setLineDash([]);

      // Highlight active point with halo
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = colors.accent;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Build structured tooltip lines
      const lines = [];

      // Line 1: Date
      lines.push({
        text: pt.date,
        color: colors.textMuted,
        font: '11px system-ui, -apple-system, sans-serif'
      });

      // Line 2: Main Metric Value
      if (this.mode === 'weight') {
        lines.push({
          text: `Weight: ${pt.plotValue.toFixed(2)} kg`,
          color: colors.textPrimary,
          font: 'bold 13px system-ui, -apple-system, sans-serif'
        });
      } else if (this.mode === 'fat') {
        lines.push({
          text: `Body Fat: ${pt.plotValue.toFixed(1)}%`,
          color: colors.textPrimary,
          font: 'bold 13px system-ui, -apple-system, sans-serif'
        });
      } else if (this.mode === 'bmi') {
        const cat = getBmiCategory(pt.plotValue);
        lines.push({
          text: `BMI: ${pt.plotValue.toFixed(1)} (${cat.category})`,
          color: colors.textPrimary,
          font: 'bold 13px system-ui, -apple-system, sans-serif'
        });
      }

      // Line 3: Delta Change since previous weigh-in
      if (pt.deltaValue !== null && pt.deltaValue !== undefined) {
        const isLoss = pt.deltaValue < 0;
        const sign = pt.deltaValue > 0 ? '+' : '';
        const decimals = this.mode === 'weight' ? 2 : 1;
        const unitSuffix = this.mode === 'weight' ? ' kg' : (this.mode === 'fat' ? '%' : '');
        const changeColor = isLoss ? colors.trend : (pt.deltaValue === 0 ? colors.textMuted : colors.danger);
        const daysText = pt.daysSincePrev ? ` (${pt.daysSincePrev}d)` : '';

        lines.push({
          text: `Change: ${sign}${pt.deltaValue.toFixed(decimals)}${unitSuffix}${daysText}`,
          color: changeColor,
          font: '11px system-ui, -apple-system, sans-serif'
        });
      } else {
        lines.push({
          text: 'Change: Initial check-in',
          color: colors.textMuted,
          font: '11px system-ui, -apple-system, sans-serif'
        });
      }

      // Line 4: Target Progress (Weight mode only, if target is set)
      if (this.mode === 'weight' && this.targetWeight) {
        const diffToTarget = pt.plotValue - this.targetWeight;
        if (diffToTarget > 0) {
          lines.push({
            text: `To Target: ${diffToTarget.toFixed(2)} kg`,
            color: colors.target,
            font: '11px system-ui, -apple-system, sans-serif'
          });
        } else {
          lines.push({
            text: `Goal Reached! 🎉`,
            color: colors.trend,
            font: '11px system-ui, -apple-system, sans-serif'
          });
        }
      }

      // Measure tooltip dimensions
      const lineHeight = 19;
      const padX = 12;
      const padY = 8;
      const ttHeight = padY * 2 + lines.length * lineHeight;

      let maxTextWidth = 0;
      for (const line of lines) {
        ctx.font = line.font;
        const w = ctx.measureText(line.text).width;
        if (w > maxTextWidth) maxTextWidth = w;
      }
      const ttWidth = Math.max(135, maxTextWidth + padX * 2);

      let ttX = pt.x - ttWidth / 2;
      let ttY = pt.y - ttHeight - 12;

      // Ensure tooltip remains inside canvas boundaries
      if (ttX < 10) ttX = 10;
      if (ttX + ttWidth > width - 10) ttX = width - ttWidth - 10;
      if (ttY < 10) ttY = pt.y + 12; // Flip below if too close to top

      // Draw Tooltip Container
      ctx.fillStyle = colors.cardBg;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 4;
      ctx.beginPath();
      ctx.roundRect(ttX, ttY, ttWidth, ttHeight, 8);
      ctx.fill();
      ctx.strokeStyle = colors.border;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.shadowColor = 'transparent';

      // Render Text Lines
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      lines.forEach((l, idx) => {
        ctx.fillStyle = l.color;
        ctx.font = l.font;
        const textY = ttY + padY + idx * lineHeight + lineHeight / 2;
        ctx.fillText(l.text, ttX + padX, textY);
      });
    }
  }
}
