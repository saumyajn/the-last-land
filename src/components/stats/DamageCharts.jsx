import React, { useMemo } from "react";
import { Box, Chip, Paper, Stack, Typography } from "@mui/material";
import { getNumber } from "../../utils/calcs";

const HISTOGRAM_WIDTH = 1120;
const HISTOGRAM_HEIGHT = 430;
const THRESHOLD_WIDTH = 1120;
const THRESHOLD_HEIGHT = 230;
const PADDING = { left: 64, right: 30, top: 44, bottom: 58 };
const POINT_COLORS = ["#2563eb", "#059669", "#dc2626", "#7c3aed", "#ea580c", "#0891b2"];

const formatDamage = (value) => Number(value || 0).toFixed(2);
const formatPercent = (value) => `${Number(value || 0).toFixed(1)}%`;

const buildChartRows = (data) =>
  Object.entries(data)
    .map(([name, row]) => {
      const rawValue = row?.["Average Damage"];
      if (rawValue === undefined || rawValue === null || rawValue === "") return null;
      return {
        name,
        averageDamage: getNumber(rawValue),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.averageDamage - b.averageDamage || a.name.localeCompare(b.name));

const buildThresholdBands = (min, max, count = 8) => {
  const span = max - min;
  return Array.from({ length: count }, (_, index) => {
    const start = min + (span * index) / count;
    const end = min + (span * (index + 1)) / count;
    return {
      label: `T${index + 1}`,
      start,
      end,
      midpoint: (start + end) / 2,
    };
  });
};

const buildPercentBins = (max) => {
  if (max === 0) {
    return [
      { label: "0-30%", minPercent: 0, maxPercent: 30, players: [] },
      ...Array.from({ length: 7 }, (_, index) => {
        const start = 30 + index * 10;
        return {
          label: `${start}-${start + 10}%`,
          minPercent: start,
          maxPercent: start + 10,
          players: [],
        };
      }),
    ];
  }

  return Array.from({ length: 10 }, (_, index) => ({
    label: `${index * 10}-${index === 9 ? 100 : (index + 1) * 10}%`,
    minPercent: index * 10,
    maxPercent: index === 9 ? 100 : (index + 1) * 10,
    players: [],
  }));
};

const getShortName = (name) => (name.length > 13 ? `${name.slice(0, 12)}...` : name);

export default function DamageCharts({ data = {} }) {
  const chart = useMemo(() => {
    const rows = buildChartRows(data);
    const values = rows.map((row) => row.averageDamage);
    const min = values.length ? Math.min(...values) : 0;
    const max = values.length ? Math.max(...values) : 0;
    const bands = buildThresholdBands(min, max);
    const bins = buildPercentBins(max);

    rows.forEach((row) => {
      const percentOfMax = max > 0 ? (row.averageDamage / max) * 100 : 0;
      const binIndex = bins.findIndex((bin, index) =>
        percentOfMax >= bin.minPercent &&
        (percentOfMax < bin.maxPercent || index === bins.length - 1)
      );
      const safeBinIndex = binIndex === -1 ? 0 : binIndex;
      bins[safeBinIndex].players.push({
        ...row,
        percentOfMax,
      });
    });

    const maxCount = Math.max(1, ...bins.map((bin) => bin.players.length));
    const plotWidth = HISTOGRAM_WIDTH - PADDING.left - PADDING.right;
    const plotHeight = HISTOGRAM_HEIGHT - PADDING.top - PADDING.bottom;
    const barSlot = plotWidth / bins.length;
    const barWidth = barSlot * 0.62;
    const baseline = HISTOGRAM_HEIGHT - PADDING.bottom;

    const plottedBins = bins.map((bin, index) => {
      const x = PADDING.left + index * barSlot + (barSlot - barWidth) / 2;
      const height = (bin.players.length / maxCount) * plotHeight;
      const y = baseline - height;
      const dotGap = height > 28 ? height / (bin.players.length + 1) : 18;
      const dots = bin.players.map((player, playerIndex) => {
        const dotX = x + Math.max(8, barWidth * 0.16);
        const dotY = Math.min(baseline - 16, baseline - dotGap * (playerIndex + 1));
        return {
          ...player,
          x: dotX,
          y: dotY,
          color: POINT_COLORS[playerIndex % POINT_COLORS.length],
        };
      });
      return {
        ...bin,
        x,
        y,
        height,
        barWidth,
        dots,
      };
    });

    const yTicks = Array.from({ length: Math.min(maxCount, 5) + 1 }, (_, index) =>
      Math.round((maxCount / Math.min(maxCount, 5)) * index)
    ).filter((tick, index, list) => list.indexOf(tick) === index);

    return {
      rows,
      bins: plottedBins,
      bands,
      min,
      max,
      maxCount,
      yTicks,
    };
  }, [data]);

  if (!chart.rows.length) return null;

  const minPlayer = chart.rows[0];
  const maxPlayer = chart.rows[chart.rows.length - 1];
  const histogramBaseline = HISTOGRAM_HEIGHT - PADDING.bottom;
  const histogramPlotHeight = HISTOGRAM_HEIGHT - PADDING.top - PADDING.bottom;

  return (
    <Stack spacing={2.5} sx={{ mb: 4 }}>
      <Paper
        elevation={0}
        sx={{
          width: "100%",
          p: { xs: 1.75, md: 2.5 },
          border: "1px solid rgba(15,23,42,0.08)",
          borderRadius: 2,
          background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
          boxShadow: "0 18px 42px rgba(15,23,42,0.06)",
        }}
      >
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={1.5} sx={{ mb: 1.5 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 900 }}>
              Average Damage Distribution
            </Typography>
            <Typography variant="body2" color="text.secondary">
              X-axis is percent of max Average Damage. Y-axis is number of players in each band.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip size="small" label={`Min ${minPlayer.name}: ${formatDamage(minPlayer.averageDamage)}`} />
            <Chip size="small" color="primary" label={`Max ${maxPlayer.name}: ${formatDamage(maxPlayer.averageDamage)}`} />
          </Stack>
        </Stack>

        <Box sx={{ width: "100%", overflowX: "auto" }}>
          <Box
            component="svg"
            viewBox={`0 0 ${HISTOGRAM_WIDTH} ${HISTOGRAM_HEIGHT}`}
            role="img"
            aria-label="Average damage percentage distribution bar chart"
            sx={{ display: "block", width: "100%", minWidth: 840, height: "auto" }}
          >
            <rect x="0" y="0" width={HISTOGRAM_WIDTH} height={HISTOGRAM_HEIGHT} rx="10" fill="#f8fafc" />
            {chart.yTicks.map((tick) => {
              const y = histogramBaseline - (tick / chart.maxCount) * histogramPlotHeight;
              return (
                <g key={tick}>
                  <line x1={PADDING.left} y1={y} x2={HISTOGRAM_WIDTH - PADDING.right} y2={y} stroke="#dbe3ef" strokeDasharray="4 5" />
                  <text x={PADDING.left - 14} y={y + 4} textAnchor="end" fontSize="12" fill="#64748b">
                    {tick}
                  </text>
                </g>
              );
            })}
            <line x1={PADDING.left} y1={histogramBaseline} x2={HISTOGRAM_WIDTH - PADDING.right} y2={histogramBaseline} stroke="#94a3b8" strokeWidth="1.5" />
            <line x1={PADDING.left} y1={PADDING.top} x2={PADDING.left} y2={histogramBaseline} stroke="#94a3b8" strokeWidth="1.5" />
            <text x={18} y={HISTOGRAM_HEIGHT / 2} textAnchor="middle" fontSize="12" fontWeight="700" fill="#334155" transform={`rotate(-90 18 ${HISTOGRAM_HEIGHT / 2})`}>
              Number of players
            </text>
            <text x={HISTOGRAM_WIDTH / 2} y={HISTOGRAM_HEIGHT - 12} textAnchor="middle" fontSize="12" fontWeight="700" fill="#334155">
              Average Damage as percent of current maximum
            </text>

            {chart.bins.map((bin) => (
              <g key={bin.label}>
                <rect
                  x={bin.x}
                  y={bin.y}
                  width={bin.barWidth}
                  height={Math.max(2, bin.height)}
                  rx="6"
                  fill={bin.players.length ? "#e1abe8" : "#e2e8f0"}
                  opacity={bin.players.length ? 0.78 : 0.8}
                >
                  <title>{`${bin.label}: ${bin.players.length} player${bin.players.length === 1 ? "" : "s"}`}</title>
                </rect>
                <text x={bin.x + bin.barWidth / 2} y={bin.y - 10} textAnchor="middle" fontSize="12" fontWeight="800" fill="#0f172a">
                  {bin.players.length}
                </text>
                <text x={bin.x + bin.barWidth / 2} y={HISTOGRAM_HEIGHT - 34} textAnchor="middle" fontSize="11" fill="#64748b">
                  {bin.label}
                </text>
                {bin.dots.map((dot) => (
                  <g key={`${bin.label}-${dot.name}`} opacity="0.78">
                    <title>{`${dot.name}: ${formatDamage(dot.averageDamage)} avg, ${formatPercent(dot.percentOfMax)} of max`}</title>
                    <rect
                      x={dot.x - 4.5}
                      y={dot.y - 4.5}
                      width="9"
                      height="9"
                      rx="2"
                      fill={dot.color}
                      stroke="#ffffff"
                      strokeWidth="1"
                    />
                    <text x={dot.x + 8} y={dot.y + 3.5} fontSize="9" fill="#334155">
                      {getShortName(dot.name)}
                    </text>
                  </g>
                ))}
              </g>
            ))}
          </Box>
        </Box>
      </Paper>

      <Paper
        elevation={0}
        sx={{
          width: "100%",
          p: { xs: 1.75, md: 2.5 },
          border: "1px solid rgba(15,23,42,0.08)",
          borderRadius: 2,
          backgroundColor: "#ffffff",
          boxShadow: "0 18px 42px rgba(15,23,42,0.06)",
        }}
      >
        <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={1.5} sx={{ mb: 1.5 }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 900 }}>
              8-Part Threshold Guide
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Equal Average Damage bands from current minimum to current maximum.
            </Typography>
          </Box>
          <Chip size="small" label={`${formatDamage(chart.min)} - ${formatDamage(chart.max)}`} />
        </Stack>

        <Box sx={{ width: "100%", overflowX: "auto" }}>
          <Box
            component="svg"
            viewBox={`0 0 ${THRESHOLD_WIDTH} ${THRESHOLD_HEIGHT}`}
            role="img"
            aria-label="Eight part average damage threshold chart"
            sx={{ display: "block", width: "100%", minWidth: 840, height: "auto" }}
          >
            <rect x="0" y="0" width={THRESHOLD_WIDTH} height={THRESHOLD_HEIGHT} rx="10" fill="#f8fafc" />
            {chart.bands.map((band, index) => {
              const bandWidth = (THRESHOLD_WIDTH - PADDING.left - PADDING.right) / chart.bands.length;
              const x = PADDING.left + index * bandWidth;
              return (
                <g key={band.label}>
                  <rect
                    x={x}
                    y={62}
                    width={bandWidth - 6}
                    height={78}
                    rx="8"
                    fill={`rgba(${37 + index * 12}, ${99 + index * 7}, ${235 - index * 14}, ${0.18 + index * 0.045})`}
                    stroke="rgba(15,23,42,0.08)"
                  >
                    <title>{`${band.label}: ${formatDamage(band.start)} to ${formatDamage(band.end)}. Mid ${formatDamage(band.midpoint)}`}</title>
                  </rect>
                  <text x={x + bandWidth / 2 - 3} y={90} textAnchor="middle" fontSize="15" fontWeight="900" fill="#0f172a">
                    {band.label}
                  </text>
                  <text x={x + bandWidth / 2 - 3} y={114} textAnchor="middle" fontSize="11" fill="#334155">
                    {formatDamage(band.start)}
                  </text>
                  <text x={x + bandWidth / 2 - 3} y={130} textAnchor="middle" fontSize="11" fill="#64748b">
                    to {formatDamage(band.end)}
                  </text>
                  <line x1={x} y1={154} x2={x} y2={166} stroke="#94a3b8" />
                  <text x={x} y={184} textAnchor="middle" fontSize="10" fill="#64748b">
                    {formatDamage(band.start)}
                  </text>
                </g>
              );
            })}
            <line x1={PADDING.left} y1={154} x2={THRESHOLD_WIDTH - PADDING.right} y2={154} stroke="#94a3b8" />
            <text x={THRESHOLD_WIDTH - PADDING.right} y={184} textAnchor="middle" fontSize="10" fill="#64748b">
              {formatDamage(chart.max)}
            </text>
          </Box>
        </Box>
      </Paper>
    </Stack>
  );
}
