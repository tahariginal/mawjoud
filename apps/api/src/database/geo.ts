import type { GeoPoint } from '@mazal/contracts';
import { type Expression, type RawBuilder, sql } from 'kysely';

/** WGS84 point as a PostGIS geography. Coordinates are bound parameters, never interpolated. */
export function geographyPoint(p: GeoPoint): RawBuilder<string> {
  return sql<string>`ST_SetSRID(ST_MakePoint(${p.lng}, ${p.lat}), 4326)::geography`;
}

export function latitudeOf(column: Expression<unknown>): RawBuilder<number> {
  return sql<number>`ST_Y(${column}::geometry)`;
}

export function longitudeOf(column: Expression<unknown>): RawBuilder<number> {
  return sql<number>`ST_X(${column}::geometry)`;
}
