import type {
  ClimateRecord,
  DatasetConfig,
} from "./types";

// Deterministic PRNG so the same seed always reproduces the same dataset.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Box-Muller transform for gaussian noise.
function gaussian(rand: () => number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// Regional baseline climate profiles. Each region gets distinct normals so
// multi-region comparisons look realistic.
const REGION_PROFILES: Record<
  string,
  {
    tempBase: number;
    tempAmplitude: number;
    rainfallBase: number;
    rainfallAmplitude: number;
    humidityBase: number;
    co2Base: number;
    seaBase: number;
  }
> = {
  Tropical: {
    tempBase: 27,
    tempAmplitude: 2.2,
    rainfallBase: 200,
    rainfallAmplitude: 120,
    humidityBase: 80,
    co2Base: 350,
    seaBase: 0,
  },
  "Northern Temperate": {
    tempBase: 10,
    tempAmplitude: 14,
    rainfallBase: 75,
    rainfallAmplitude: 35,
    humidityBase: 65,
    co2Base: 355,
    seaBase: 0,
  },
  "Southern Temperate": {
    tempBase: 14,
    tempAmplitude: 9,
    rainfallBase: 70,
    rainfallAmplitude: 30,
    humidityBase: 62,
    co2Base: 355,
    seaBase: 0,
  },
  Arid: {
    tempBase: 23,
    tempAmplitude: 11,
    rainfallBase: 18,
    rainfallAmplitude: 14,
    humidityBase: 32,
    co2Base: 358,
    seaBase: 0,
  },
  Polar: {
    tempBase: -8,
    tempAmplitude: 16,
    rainfallBase: 28,
    rainfallAmplitude: 18,
    humidityBase: 70,
    co2Base: 352,
    seaBase: 0,
  },
};

export const DEFAULT_REGIONS = Object.keys(REGION_PROFILES);

const SEASONAL_CO2_WIGGLE = 4; // ppm seasonal swing (plant uptake cycle)
const SEA_LEVEL_RISE_PER_YEAR = 3.3; // mm/year (long-term global mean)

/**
 * Generate a deterministic synthetic climate dataset. Models:
 *  - seasonal cycle (sinusoid, opposite phase for southern hemisphere)
 *  - long-term warming trend (configurable °C/decade)
 *  - CO2 growth (~2.4 ppm/year baseline + noise)
 *  - sea level rise (~3.3 mm/year)
 *  - gaussian monthly noise
 *  - random anomaly injection (heatwaves, cold snaps, droughts, floods)
 */
export function generateDataset(config: DatasetConfig): ClimateRecord[] {
  const rand = mulberry32(config.seed);
  const records: ClimateRecord[] = [];

  const years = config.endYear - config.startYear + 1;
  const totalMonths = years * 12;

  for (const region of config.regions) {
    const profile = REGION_PROFILES[region] ?? REGION_PROFILES["Northern Temperate"];
    const isSouthern = region.toLowerCase().includes("southern");
    // Temperature peak offset: northern hemisphere peaks in July (month 7),
    // southern in January (month 1).
    const phaseShift = isSouthern ? 0 : Math.PI;

    for (let i = 0; i < totalMonths; i++) {
      const year = config.startYear + Math.floor(i / 12);
      const month = (i % 12) + 1;
      const day = 15;
      const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

      const yearsSinceStart = i / 12;
      const warming = (config.warmingTrend / 10) * yearsSinceStart;
      const seasonal = profile.tempAmplitude * Math.sin(((month - 1) / 12) * 2 * Math.PI - phaseShift);
      let temperature =
        profile.tempBase + warming + seasonal + gaussian(rand) * 1.1;

      const rainfallSeasonal =
        profile.rainfallAmplitude *
        Math.sin(((month - 1) / 12) * 2 * Math.PI - phaseShift + 0.4);
      let rainfall = Math.max(
        0,
        profile.rainfallBase + rainfallSeasonal + gaussian(rand) * 18
      );

      const humidity =
        profile.humidityBase +
        6 * Math.sin(((month - 1) / 12) * 2 * Math.PI - phaseShift + 1.2) +
        gaussian(rand) * 5;
      const humidityClamped = Math.max(5, Math.min(100, humidity));

      const co2Seasonal = SEASONAL_CO2_WIGGLE * Math.sin(((month - 1) / 12) * 2 * Math.PI);
      const co2Trend = 2.4 * yearsSinceStart + 0.02 * yearsSinceStart * yearsSinceStart;
      const co2 =
        profile.co2Base + co2Trend + co2Seasonal + gaussian(rand) * 1.2;

      const seaLevel =
        profile.seaBase + SEA_LEVEL_RISE_PER_YEAR * yearsSinceStart + gaussian(rand) * 2.5;

      // Inject anomalies — unusual months that will show up in anomaly detection.
      if (rand() < config.anomalyRate) {
        const kind = rand();
        if (kind < 0.4) {
          // heatwave
          temperature += 3.5 + rand() * 3;
        } else if (kind < 0.6) {
          // cold snap
          temperature -= 3.5 + rand() * 3;
        } else if (kind < 0.85) {
          // extreme rainfall / flood
          rainfall *= 2.2 + rand() * 0.8;
        } else {
          // drought
          rainfall *= 0.15 + rand() * 0.2;
        }
      }

      records.push({
        date,
        year,
        month,
        region,
        temperature: Number(temperature.toFixed(2)),
        rainfall: Number(rainfall.toFixed(1)),
        humidity: Number(humidityClamped.toFixed(1)),
        co2: Number(co2.toFixed(2)),
        sea_level: Number(seaLevel.toFixed(2)),
      });
    }
  }

  // Sort by date then region for stable downstream processing.
  records.sort((a, b) => a.date.localeCompare(b.date) || a.region.localeCompare(b.region));
  return records;
}

export { REGION_PROFILES };
