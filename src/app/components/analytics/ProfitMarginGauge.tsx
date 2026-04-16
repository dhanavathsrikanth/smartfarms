import React from "react";

interface ProfitMarginGaugeProps {
  margin: number;
  size?: "sm" | "lg";
}

export function ProfitMarginGauge({ margin, size = "lg" }: ProfitMarginGaugeProps) {
  const isLarge = size === "lg";
  const width = isLarge ? 240 : 120;
  const height = width / 2;
  const radius = width / 2 - (isLarge ? 20 : 10);
  const strokeWidth = isLarge ? 24 : 12;

  // Render SVG ARC paths
  const createArc = (startPercent: number, endPercent: number) => {
    const startAngle = Math.PI - (startPercent / 100) * Math.PI;
    const endAngle = Math.PI - (endPercent / 100) * Math.PI;

    const x1 = width / 2 + radius * Math.cos(startAngle);
    const y1 = height - radius * Math.sin(startAngle);
    const x2 = width / 2 + radius * Math.cos(endAngle);
    const y2 = height - radius * Math.sin(endAngle);

    return `M ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2}`;
  };

  // Needle physics
  const clampedMargin = Math.min(Math.max(margin, 0), 100);
  const needleAngle = Math.PI - (clampedMargin / 100) * Math.PI;
  const needleValue = {
    x: width / 2 + (radius - 10) * Math.cos(needleAngle),
    y: height - (radius - 10) * Math.sin(needleAngle),
  };

  return (
    <div className="flex flex-col items-center justify-center relative pb-8">
      <svg width={width} height={height + 10} className="overflow-visible">
        {/* Background Arcs */}
        <path d={createArc(0, 20)} stroke="#E24B4A" strokeWidth={strokeWidth} fill="none" strokeLinecap="butt" />
        <path d={createArc(20, 40)} stroke="#D4840A" strokeWidth={strokeWidth} fill="none" strokeLinecap="butt" />
        <path d={createArc(40, 60)} stroke="#52A870" strokeWidth={strokeWidth} fill="none" strokeLinecap="butt" />
        <path d={createArc(60, 100)} stroke="#1C4E35" strokeWidth={strokeWidth} fill="none" strokeLinecap="butt" />

        {/* Needle */}
        <circle cx={width / 2} cy={height} r={isLarge ? 8 : 4} fill="#333" />
        <line
          x1={width / 2}
          y1={height}
          x2={needleValue.x}
          y2={needleValue.y}
          stroke="#333"
          strokeWidth={isLarge ? 4 : 2}
          strokeLinecap="round"
        />
      </svg>

      <div className={`absolute bottom-0 translate-y-2 flex flex-col items-center`}>
        <div className={`font-mono font-bold text-gray-800 ${isLarge ? "text-3xl" : "text-lg"}`}>
          {margin.toFixed(0)}%
        </div>
        <div className={`font-sans text-gray-500 font-medium ${isLarge ? "text-sm" : "text-[10px]"}`}>
          Profit Margin
        </div>
      </div>
    </div>
  );
}
