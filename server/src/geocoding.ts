import { setTimeout as delay } from 'node:timers/promises';

import { z } from 'zod';

import type { ApproximateLocation } from '../../src/types/domain';
import { config } from './config';
import { getCollections } from './database';

const knownCityLocations: Record<string, ApproximateLocation> = {
  berlin: { area: 'Berlin (approximate)', coordinates: [13.405, 52.52] },
  potsdam: { area: 'Potsdam (approximate)', coordinates: [13.0645, 52.3906] },
};

const geocodingResponseSchema = z.array(
  z.object({
    lat: z.string(),
    lon: z.string(),
    display_name: z.string(),
    address: z
      .object({
        city: z.string().optional(),
        town: z.string().optional(),
        village: z.string().optional(),
        country: z.string().optional(),
      })
      .optional(),
  }),
);

const normalizeCity = (city: string) => city.trim().toLocaleLowerCase();

let geocodingQueue: Promise<void> = Promise.resolve();
let lastGeocodingRequestAt = 0;

/**
 * Serializes public geocoder requests and keeps them at or below one per second.
 * Results (including misses) are persisted in MongoDB, so repeated cities do not
 * consume public capacity after a server restart.
 */
const scheduleGeocodingRequest = async <T>(operation: () => Promise<T>): Promise<T> => {
  const previous = geocodingQueue;
  let release: () => void = () => {};
  geocodingQueue = new Promise<void>((resolve) => {
    release = resolve;
  });

  await previous;
  const waitMs = Math.max(0, 1_000 - (Date.now() - lastGeocodingRequestAt));
  if (waitMs > 0) await delay(waitMs);

  try {
    lastGeocodingRequestAt = Date.now();
    return await operation();
  } finally {
    release();
  }
};

const queryCityCentre = async (city: string): Promise<ApproximateLocation | undefined> =>
  scheduleGeocodingRequest(async () => {
    const url = new URL('search', config.geocodingBaseUrl);
    // Structured city lookup prevents a street-like value from becoming an exact map point.
    url.searchParams.set('city', city);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('featuretype', 'city');
    url.searchParams.set('limit', '1');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'Accept-Language': 'en',
          'User-Agent': config.geocodingUserAgent,
        },
      });
      if (!response.ok) return undefined;
      const [result] = geocodingResponseSchema.parse(await response.json());
      if (!result) return undefined;

      const longitude = Number(result.lon);
      const latitude = Number(result.lat);
      if (
        !Number.isFinite(longitude) ||
        !Number.isFinite(latitude) ||
        longitude < -180 ||
        longitude > 180 ||
        latitude < -90 ||
        latitude > 90
      ) {
        return undefined;
      }

      const locality =
        result.address?.city ?? result.address?.town ?? result.address?.village ?? city.trim();
      const label = [locality, result.address?.country].filter(Boolean).join(', ');
      return {
        area: `${label || result.display_name.split(',').slice(0, 2).join(',')} (approximate)`,
        coordinates: [longitude, latitude],
      };
    } catch {
      return undefined;
    } finally {
      clearTimeout(timeout);
    }
  });

/** Resolves only the supplied city name, never a street address or live device location. */
export const approximateLocationForCity = async (
  city: string,
): Promise<ApproximateLocation | undefined> => {
  const normalized = normalizeCity(city);
  const known = knownCityLocations[normalized];
  if (known) return known;

  const { locationCache } = await getCollections();
  const cached = await locationCache.findOne({ _id: normalized });
  if (cached) return cached.location ?? undefined;

  const location = await queryCityCentre(city);
  await locationCache.updateOne(
    { _id: normalized },
    {
      $setOnInsert: {
        _id: normalized,
        location: location ?? null,
        resolvedAt: new Date().toISOString(),
      },
    },
    { upsert: true },
  );
  return location;
};
