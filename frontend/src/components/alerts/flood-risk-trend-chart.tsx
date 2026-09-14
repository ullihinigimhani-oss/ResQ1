import { useMemo, useState } from 'react';
import { ActivityIndicator, type LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';

import { BrandColors } from '@/constants/brand';
import type { AlertRiskLevel, AlertRiskHistoryPoint } from '@/types/alert';
import type { PreferredLanguage } from '@/types/auth';
import { floodRiskTrendUiText, translateRiskLevel } from '@/utils/language';

const riskLevels: AlertRiskLevel[] = ['Low', 'Moderate', 'High', 'Critical'];
const riskLevelsDescending: AlertRiskLevel[] = ['Critical', 'High', 'Moderate', 'Low'];
const chartHeight = 116;
const horizontalPadding = 10;

const riskValue: Record<AlertRiskLevel, number> = {
  Low: 0,
  Moderate: 1,
  High: 2,
  Critical: 3,
};

const riskTone: Record<AlertRiskLevel, { accent: string; backgroundColor: string; textColor: string }> = {
  Low: {
    accent: BrandColors.success,
    backgroundColor: BrandColors.successSoft,
    textColor: BrandColors.success,
  },
  Moderate: {
    accent: '#D69E2E',
    backgroundColor: BrandColors.warningSoft,
    textColor: '#7A4B00',
  },
  High: {
    accent: '#EA580C',
    backgroundColor: '#FFF1E6',
    textColor: '#9A3412',
  },
  Critical: {
    accent: BrandColors.red,
    backgroundColor: BrandColors.redSoft,
    textColor: BrandColors.red,
  },
};

type ChartPoint = {
  id: number;
  action: string;
  riskLevel: AlertRiskLevel;
  timestamp: string;
  time: number;
  x: number;
  y: number;
};

export function normalizeFloodRiskLevel(riskLevel: AlertRiskLevel | string | null | undefined) {
  const normalized = String(riskLevel ?? '').trim().toLowerCase();

  if (normalized === 'low') {
    return 'Low';
  }

  if (normalized === 'moderate' || normalized === 'medium') {
    return 'Moderate';
  }

  if (normalized === 'high') {
    return 'High';
  }

  if (normalized === 'critical') {
    return 'Critical';
  }

  return null;
}

function formatAxisTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function chartTime(value: string, fallback: number) {
  const time = new Date(value).getTime();

  return Number.isFinite(time) ? time : fallback;
}

function currentRiskLabel(riskLevel: AlertRiskLevel | string, language: PreferredLanguage) {
  const normalized = normalizeFloodRiskLevel(riskLevel);

  return normalized ? translateRiskLevel(normalized, language) : String(riskLevel).toUpperCase();
}

function buildChartPoints(history: AlertRiskHistoryPoint[], width: number) {
  const normalizedHistory = history
    .map((point, index) => {
      const normalizedRisk = normalizeFloodRiskLevel(point.riskLevel);

      if (!normalizedRisk) {
        return null;
      }

      return {
        action: String(point.action),
        id: point.id,
        riskLevel: normalizedRisk,
        timestamp: point.timestamp,
        time: chartTime(point.timestamp, index),
      };
    })
    .filter((point): point is Omit<ChartPoint, 'x' | 'y'> => Boolean(point))
    .sort((left, right) => left.time - right.time || left.id - right.id);

  if (width <= 0) {
    return normalizedHistory.map((point) => ({ ...point, x: 0, y: 0 }));
  }

  const drawableWidth = Math.max(1, width - horizontalPadding * 2);
  const minTime = Math.min(...normalizedHistory.map((point) => point.time));
  const maxTime = Math.max(...normalizedHistory.map((point) => point.time));
  const timeSpan = maxTime - minTime;

  return normalizedHistory.map((point, index) => {
    const xRatio = timeSpan > 0
      ? (point.time - minTime) / timeSpan
      : normalizedHistory.length > 1
        ? index / (normalizedHistory.length - 1)
        : 0.5;
    const yRatio = (3 - riskValue[point.riskLevel]) / 3;

    return {
      ...point,
      x: horizontalPadding + xRatio * drawableWidth,
      y: 8 + yRatio * (chartHeight - 16),
    };
  });
}

function LineSegment({
  end,
  start,
}: {
  end: ChartPoint;
  start: ChartPoint;
}) {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const length = Math.sqrt(deltaX ** 2 + deltaY ** 2);
  const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
  const tone = riskTone[end.riskLevel];

  return (
    <View
      style={[
        styles.lineSegment,
        {
          backgroundColor: tone.accent,
          left: start.x + deltaX / 2 - length / 2,
          top: start.y + deltaY / 2 - 1.5,
          transform: [{ rotate: `${angle}deg` }],
          width: length,
        },
      ]}
    />
  );
}

export function FloodRiskTrendChart({
  error,
  history,
  language,
  loading,
  riskLevel,
}: {
  error?: boolean;
  history: AlertRiskHistoryPoint[];
  language: PreferredLanguage;
  loading?: boolean;
  riskLevel: AlertRiskLevel | string;
}) {
  const [plotWidth, setPlotWidth] = useState(0);
  const copy = floodRiskTrendUiText[language];
  const currentLevel = normalizeFloodRiskLevel(riskLevel);
  const currentTone = currentLevel ? riskTone[currentLevel] : riskTone.Low;
  const currentLabel = currentRiskLabel(riskLevel, language);
  const chartPoints = useMemo(() => buildChartPoints(history, plotWidth), [history, plotWidth]);
  const firstPoint = chartPoints[0] ?? null;
  const latestPoint = chartPoints[chartPoints.length - 1] ?? null;
  const hasChartData = chartPoints.length > 0;

  const handlePlotLayout = (event: LayoutChangeEvent) => {
    setPlotWidth(event.nativeEvent.layout.width);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.headerTextBlock}>
          <Text style={styles.title}>{copy.floodRiskTrend}</Text>
          <Text style={styles.subtitle}>{copy.riskChangeHistory}</Text>
        </View>
        <Text style={[styles.currentBadge, { backgroundColor: currentTone.backgroundColor, color: currentTone.textColor }]}>
          {currentLabel}
        </Text>
      </View>

      <View style={styles.currentRiskRow}>
        <Text style={styles.axisTitle}>{copy.yAxisRiskLevel}</Text>
        <Text style={[styles.currentRiskText, { color: currentTone.textColor }]}>
          {copy.currentRisk}: {currentLabel}
        </Text>
      </View>

      {loading ? (
        <View style={styles.stateBox}>
          <ActivityIndicator color={BrandColors.red} />
        </View>
      ) : null}

      {!loading && error ? (
        <View style={styles.stateBox}>
          <Text style={styles.stateTitle}>{copy.trendUnavailable}</Text>
          <Text style={styles.stateText}>{copy.noTrendDataBody}</Text>
        </View>
      ) : null}

      {!loading && !error && !hasChartData ? (
        <View style={styles.stateBox}>
          <Text style={styles.stateTitle}>{copy.noTrendData}</Text>
          <Text style={styles.stateText}>{copy.noTrendDataBody}</Text>
        </View>
      ) : null}

      {!loading && !error && hasChartData ? (
        <>
          <View style={styles.chartBody}>
            <View style={styles.yAxisLabels}>
              {riskLevelsDescending.map((level) => (
                <Text
                  adjustsFontSizeToFit
                  key={level}
                  minimumFontScale={0.75}
                  numberOfLines={1}
                  style={styles.yAxisLabel}>
                  {translateRiskLevel(level, language)}
                </Text>
              ))}
            </View>
            <View style={styles.plotColumn}>
              <View onLayout={handlePlotLayout} style={styles.plotArea}>
                {riskLevels.map((level) => (
                  <View
                    key={level}
                    style={[
                      styles.gridLine,
                      { top: 8 + (3 - riskValue[level]) / 3 * (chartHeight - 16) },
                    ]}
                  />
                ))}

                {chartPoints.slice(1).map((point, index) => (
                  <LineSegment
                    end={point}
                    key={`${chartPoints[index].id}-${point.id}`}
                    start={chartPoints[index]}
                  />
                ))}

                {chartPoints.map((point) => {
                  const latest = point.id === latestPoint?.id;
                  const tone = riskTone[point.riskLevel];

                  return (
                    <View
                      key={point.id}
                      style={[
                        styles.point,
                        {
                          backgroundColor: tone.accent,
                          borderColor: BrandColors.white,
                          left: point.x - (latest ? 7 : 5),
                          top: point.y - (latest ? 7 : 5),
                        },
                        latest && styles.latestPoint,
                      ]}
                    />
                  );
                })}
              </View>
              <View style={styles.xAxisLabels}>
                <Text numberOfLines={1} style={styles.xAxisText}>
                  {firstPoint ? formatAxisTime(firstPoint.timestamp) : ''}
                </Text>
                <Text style={styles.xAxisTitle}>{copy.time}</Text>
                <Text numberOfLines={1} style={styles.xAxisText}>
                  {latestPoint ? formatAxisTime(latestPoint.timestamp) : ''}
                </Text>
              </View>
            </View>
          </View>

          {chartPoints.length === 1 ? (
            <Text style={styles.stateText}>{copy.noTrendDataBody}</Text>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 12,
  },
  headerRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  headerTextBlock: {
    flex: 1,
    gap: 2,
    minWidth: 160,
  },
  title: {
    color: BrandColors.navy,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 20,
  },
  subtitle: {
    color: BrandColors.muted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  currentBadge: {
    borderRadius: 6,
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 15,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  currentRiskRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  axisTitle: {
    color: BrandColors.muted,
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 15,
    textTransform: 'uppercase',
  },
  currentRiskText: {
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 17,
  },
  chartBody: {
    flexDirection: 'row',
    gap: 8,
  },
  yAxisLabels: {
    height: chartHeight,
    justifyContent: 'space-between',
    paddingVertical: 2,
    width: 66,
  },
  yAxisLabel: {
    color: BrandColors.muted,
    fontSize: 9,
    fontWeight: '900',
    lineHeight: 12,
    textAlign: 'right',
  },
  plotColumn: {
    flex: 1,
    gap: 6,
    minWidth: 0,
  },
  plotArea: {
    backgroundColor: '#FAFCFF',
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    height: chartHeight,
    overflow: 'hidden',
    position: 'relative',
  },
  gridLine: {
    backgroundColor: BrandColors.border,
    height: 1,
    left: 0,
    opacity: 0.72,
    position: 'absolute',
    right: 0,
  },
  lineSegment: {
    borderRadius: 2,
    height: 3,
    position: 'absolute',
  },
  point: {
    borderRadius: 6,
    borderWidth: 2,
    height: 10,
    position: 'absolute',
    width: 10,
  },
  latestPoint: {
    borderRadius: 8,
    height: 14,
    width: 14,
  },
  xAxisLabels: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'space-between',
  },
  xAxisText: {
    color: BrandColors.muted,
    flex: 1,
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 13,
  },
  xAxisTitle: {
    color: BrandColors.navy,
    fontSize: 10,
    fontWeight: '900',
    lineHeight: 13,
    textAlign: 'center',
  },
  stateBox: {
    alignItems: 'center',
    backgroundColor: BrandColors.lightBlue,
    borderColor: BrandColors.sky,
    borderRadius: 8,
    borderWidth: 1,
    gap: 5,
    justifyContent: 'center',
    minHeight: 96,
    padding: 12,
  },
  stateTitle: {
    color: BrandColors.navy,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 18,
    textAlign: 'center',
  },
  stateText: {
    color: BrandColors.muted,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 16,
    textAlign: 'center',
  },
});
