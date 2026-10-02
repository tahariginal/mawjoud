import { zodResolver } from '@hookform/resolvers/zod';
import {
  Allergen,
  DietaryTag,
  OFFER_DESCRIPTION_MAX,
  OFFER_TITLE_MAX,
  type MerchantOffer,
  type MerchantOfferInput,
} from '@mawjood/contracts';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { z } from 'zod';

import { useCategories } from '@/api/hooks';
import { formatTime, relativeDay } from '@/lib/format';
import { colors, spacing } from '@/design/tokens';
import { parseTimeOfDay, zonedDate, zonedTimeToUtc } from '@/lib/zonedTime';

import { FormField } from './FormField';
import { AppText } from './ui/AppText';
import { Banner } from './ui/Banner';
import { Button } from './ui/Button';
import { Chip } from './ui/Chip';
import { SegmentedControl } from './ui/SegmentedControl';

const money = z
  .string()
  .trim()
  .regex(/^\d+([.,]\d{1,2})?$/);
const toMinor = (value: string) => Math.round(Number(value.replace(',', '.')) * 100);

const FormSchema = z
  .object({
    title: z.string().trim().min(3).max(OFFER_TITLE_MAX),
    description: z.string().trim().max(OFFER_DESCRIPTION_MAX),
    categoryId: z.uuid(),
    quantity: z
      .string()
      .regex(/^\d{1,3}$/)
      .refine((v) => Number(v) >= 1 && Number(v) <= 500),
    price: money.refine((v) => toMinor(v) > 0),
    referenceValue: z.union([z.literal(''), money]),
    pickupDay: z.enum(['today', 'tomorrow']),
    startTime: z.string().refine((v) => parseTimeOfDay(v) !== null),
    endTime: z.string().refine((v) => parseTimeOfDay(v) !== null),
    maxPerOrder: z
      .string()
      .regex(/^\d{1,2}$/)
      .refine((v) => Number(v) >= 1 && Number(v) <= 20),
    allergens: z.array(Allergen),
    dietaryTags: z.array(DietaryTag),
  })
  .refine((f) => f.referenceValue === '' || toMinor(f.referenceValue) > toMinor(f.price), {
    path: ['referenceValue'],
  })
  .refine(
    (f) => {
      const s = parseTimeOfDay(f.startTime);
      const e = parseTimeOfDay(f.endTime);
      return !s || !e || e.hour * 60 + e.minute > s.hour * 60 + s.minute;
    },
    { path: ['endTime'] },
  );

type FormValues = z.infer<typeof FormSchema>;

function toggle<T>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

const minorToText = (minor: number) =>
  minor % 100 === 0 ? String(minor / 100) : (minor / 100).toFixed(2);

function defaults(offer: MerchantOffer | undefined, timezone: string): FormValues {
  if (!offer) {
    return {
      title: '',
      description: '',
      categoryId: '',
      quantity: '1',
      price: '',
      referenceValue: '',
      pickupDay: 'today',
      startTime: '18:00',
      endTime: '19:00',
      maxPerOrder: '2',
      allergens: [],
      dietaryTags: [],
    };
  }
  const start = new Date(offer.pickup.start);
  return {
    title: offer.title,
    description: offer.description,
    categoryId: offer.categoryId,
    quantity: String(offer.quantityTotal),
    price: minorToText(offer.price.amountMinor),
    referenceValue: offer.referenceValue ? minorToText(offer.referenceValue.amountMinor) : '',
    pickupDay: relativeDay(start, new Date(), timezone) === 'tomorrow' ? 'tomorrow' : 'today',
    startTime: formatTime(start, timezone, 'en'),
    endTime: formatTime(new Date(offer.pickup.end), timezone, 'en'),
    maxPerOrder: String(offer.maxPerOrder),
    allergens: offer.allergens,
    dietaryTags: offer.dietaryTags,
  };
}

type Props = {
  locationId: string;
  timezone: string;
  offer?: MerchantOffer;
  submitting: boolean;
  onSubmit: (input: MerchantOfferInput) => void;
};

export function OfferForm({ locationId, timezone, offer, submitting, onSubmit }: Props) {
  const { t } = useTranslation();
  const categories = useCategories();
  const locked = (offer?.quantityReservedOrSold ?? 0) > 0;
  const { control, handleSubmit } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: defaults(offer, timezone),
  });

  const submit = handleSubmit((f) => {
    const day = zonedDate(new Date(), timezone, f.pickupDay === 'tomorrow' ? 1 : 0);
    const start = parseTimeOfDay(f.startTime);
    const end = parseTimeOfDay(f.endTime);
    if (!start || !end) return;
    onSubmit({
      locationId,
      categoryId: f.categoryId,
      title: f.title.trim(),
      description: f.description.trim(),
      quantity: Number(f.quantity),
      priceMinor: toMinor(f.price),
      referenceValueMinor: f.referenceValue === '' ? null : toMinor(f.referenceValue),
      pickupStart:
        locked && offer ? offer.pickup.start : zonedTimeToUtc(day, start, timezone).toISOString(),
      pickupEnd:
        locked && offer ? offer.pickup.end : zonedTimeToUtc(day, end, timezone).toISOString(),
      maxPerOrder: Number(f.maxPerOrder),
      allergens: f.allergens,
      dietaryTags: f.dietaryTags,
    });
  });

  return (
    <View style={styles.form}>
      {locked ? <Banner tone="info" message={t('merchant.form.lockedHint')} /> : null}
      <FormField
        control={control}
        name="title"
        label={t('merchant.form.title')}
        placeholder={t('merchant.form.titlePlaceholder')}
        errorMessage={t('validation.required')}
        maxLength={OFFER_TITLE_MAX}
      />
      <FormField
        control={control}
        name="description"
        label={t('merchant.form.description')}
        errorMessage={t('validation.tooLong')}
        multiline
        maxLength={OFFER_DESCRIPTION_MAX}
      />

      <View style={styles.group}>
        <AppText variant="subhead" weight="medium">
          {t('merchant.form.category')}
        </AppText>
        <Controller
          control={control}
          name="categoryId"
          render={({ field, fieldState }) => (
            <>
              <View style={styles.chips}>
                {(categories.data ?? []).map((c) => (
                  <Chip
                    key={c.id}
                    label={c.name}
                    selected={field.value === c.id}
                    onPress={() => field.onChange(c.id)}
                  />
                ))}
              </View>
              {fieldState.error ? (
                <AppText variant="footnote" color={colors.errorFg}>
                  {t('validation.required')}
                </AppText>
              ) : null}
            </>
          )}
        />
      </View>

      <View style={styles.row}>
        <View style={styles.flex}>
          <FormField
            control={control}
            name="quantity"
            label={t('merchant.form.quantity')}
            errorMessage={t('validation.number')}
            keyboardType="number-pad"
          />
        </View>
        <View style={styles.flex}>
          <FormField
            control={control}
            name="maxPerOrder"
            label={t('merchant.form.maxPerOrder')}
            errorMessage={t('validation.number')}
            keyboardType="number-pad"
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.flex}>
          <FormField
            control={control}
            name="price"
            label={t('merchant.form.price')}
            errorMessage={t('validation.number')}
            keyboardType="decimal-pad"
            editable={!locked}
          />
        </View>
        <View style={styles.flex}>
          <FormField
            control={control}
            name="referenceValue"
            label={t('merchant.form.referenceValue')}
            helper={t('merchant.form.referenceHint')}
            errorMessage={t('validation.referenceAbovePrice')}
            keyboardType="decimal-pad"
          />
        </View>
      </View>

      <View style={styles.group}>
        <AppText variant="subhead" weight="medium">
          {t('merchant.form.pickupDay')}
        </AppText>
        <Controller
          control={control}
          name="pickupDay"
          render={({ field }) => (
            <SegmentedControl
              options={[
                { value: 'today', label: t('filters.today') },
                { value: 'tomorrow', label: t('filters.tomorrow') },
              ]}
              value={field.value}
              onChange={(v) => !locked && field.onChange(v)}
            />
          )}
        />
      </View>

      <View style={styles.row}>
        <View style={styles.flex}>
          <FormField
            control={control}
            name="startTime"
            label={t('merchant.form.startTime')}
            errorMessage={t('validation.time')}
            keyboardType="numbers-and-punctuation"
            maxLength={5}
            editable={!locked}
          />
        </View>
        <View style={styles.flex}>
          <FormField
            control={control}
            name="endTime"
            label={t('merchant.form.endTime')}
            errorMessage={t('validation.endAfterStart')}
            keyboardType="numbers-and-punctuation"
            maxLength={5}
            editable={!locked}
          />
        </View>
      </View>

      <View style={styles.group}>
        <AppText variant="subhead" weight="medium">
          {t('merchant.form.allergens')}
        </AppText>
        <Controller
          control={control}
          name="allergens"
          render={({ field }) => (
            <View style={styles.chips}>
              {Allergen.options.map((a) => (
                <Chip
                  key={a}
                  label={t(`allergen.${a}`)}
                  selected={field.value.includes(a)}
                  onPress={() => field.onChange(toggle(field.value, a))}
                />
              ))}
            </View>
          )}
        />
      </View>

      <View style={styles.group}>
        <AppText variant="subhead" weight="medium">
          {t('merchant.form.dietary')}
        </AppText>
        <Controller
          control={control}
          name="dietaryTags"
          render={({ field }) => (
            <View style={styles.chips}>
              {DietaryTag.options.map((d) => (
                <Chip
                  key={d}
                  label={t(`dietary.${d}`)}
                  selected={field.value.includes(d)}
                  onPress={() => field.onChange(toggle(field.value, d))}
                />
              ))}
            </View>
          )}
        />
      </View>

      <Button
        label={offer ? t('merchant.form.saveChanges') : t('merchant.form.publish')}
        loading={submitting}
        onPress={() => void submit()}
        fullWidth
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
  group: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
});
