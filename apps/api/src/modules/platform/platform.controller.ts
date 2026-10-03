import { AppConfig, Category } from '@mazal/contracts';
import { Controller, Get, Inject } from '@nestjs/common';

import { DB, type Db } from '../../database/db.ts';
import { Public } from '../../shared/security/public.decorator.ts';

const asString = (value: unknown): string | null => (typeof value === 'string' ? value : null);

/** Public platform endpoints: app configuration (version gate, flags) and categories. */
@Public()
@Controller()
export class PlatformController {
  constructor(@Inject(DB) private readonly db: Db) {}

  @Get('app-config')
  async appConfig(): Promise<AppConfig> {
    const [rows, flags] = await Promise.all([
      this.db.selectFrom('app_config').select(['key', 'value']).execute(),
      this.db.selectFrom('feature_flags').select(['key', 'enabled']).execute(),
    ]);
    const values = new Map(rows.map((r) => [r.key, r.value]));
    return AppConfig.parse({
      minSupportedVersion: asString(values.get('min_supported_version')) ?? '0.0.0',
      flags: Object.fromEntries(flags.map((f) => [f.key, f.enabled])),
      supportEmail: asString(values.get('support_email')),
      legal: {
        termsUrl: asString(values.get('terms_url')),
        privacyUrl: asString(values.get('privacy_url')),
      },
    });
  }

  @Get('categories')
  async categories(): Promise<Category[]> {
    const rows = await this.db
      .selectFrom('categories')
      .select(['id', 'slug', 'name'])
      .where('active', '=', true)
      .orderBy('sort_order')
      .orderBy('name')
      .execute();
    return rows;
  }
}
