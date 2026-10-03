import type {
  AppConfig,
  AuthTokens,
  CancelOrderRequest,
  Category,
  CreateOrderRequest,
  DeleteAccountRequest,
  FavoriteStore,
  ForgotPasswordRequest,
  GeoPoint,
  HomeFeed,
  ImpactSummary,
  InviteStaffRequest,
  LoginRequest,
  Me,
  MerchantApplicationRequest,
  MerchantBusiness,
  MerchantInsights,
  MerchantOffer,
  MerchantOfferInput,
  MerchantOrder,
  NotificationPreferences,
  OfferDetail,
  OfferSummary,
  OffersQuery,
  Order,
  OrdersScope,
  Page,
  PickupValidateRequest,
  PickupValidateResult,
  Quote,
  QuoteRequest,
  RegisterRequest,
  ResetPasswordRequest,
  ReviewRequest,
  SearchResults,
  StaffMember,
  StorePage,
  UpdateMeRequest,
  VerifyEmailRequest,
} from '@mazal/contracts';

export type AuthResult = { me: Me; tokens: AuthTokens };

/**
 * The only way screens talk to the backend. Two implementations:
 *  - `http`: the real REST client (docs/API_SPECIFICATION.md)
 *  - `demo`: an isolated in-memory adapter for development, refused in production
 */
export interface MazalApi {
  readonly mode: 'demo' | 'http';

  getAppConfig(): Promise<AppConfig>;

  // Auth & account
  restoreSession(): Promise<Me | null>;
  register(input: RegisterRequest): Promise<AuthResult>;
  login(input: LoginRequest): Promise<AuthResult>;
  logout(): Promise<void>;
  verifyEmail(input: VerifyEmailRequest): Promise<Me>;
  resendVerification(): Promise<void>;
  forgotPassword(input: ForgotPasswordRequest): Promise<void>;
  resetPassword(input: ResetPasswordRequest): Promise<void>;
  updateMe(input: UpdateMeRequest): Promise<Me>;
  deleteAccount(input: DeleteAccountRequest): Promise<void>;

  // Discovery
  getHomeFeed(near: GeoPoint): Promise<HomeFeed>;
  listOffers(query: OffersQuery): Promise<Page<OfferSummary>>;
  getOffer(id: string, near: GeoPoint | null): Promise<OfferDetail>;
  getStore(id: string, near: GeoPoint | null): Promise<StorePage>;
  search(text: string, near: GeoPoint): Promise<SearchResults>;
  listCategories(): Promise<Category[]>;

  // Favorites
  listFavorites(near: GeoPoint | null): Promise<FavoriteStore[]>;
  addFavorite(storeId: string): Promise<void>;
  removeFavorite(storeId: string): Promise<void>;

  // Orders & payments
  quote(input: QuoteRequest): Promise<Quote>;
  /** Reserve: confirmed immediately, paid at pickup (ADR-015). */
  createOrder(input: CreateOrderRequest, idempotencyKey: string): Promise<Order>;
  listOrders(scope: OrdersScope, cursor?: string): Promise<Page<Order>>;
  getOrder(id: string): Promise<Order>;
  cancelOrder(id: string, input: CancelOrderRequest, idempotencyKey: string): Promise<Order>;
  reviewOrder(id: string, input: ReviewRequest): Promise<void>;

  // Profile
  getNotificationPreferences(): Promise<NotificationPreferences>;
  updateNotificationPreferences(input: NotificationPreferences): Promise<NotificationPreferences>;
  getImpact(): Promise<ImpactSummary>;

  // Merchant
  submitMerchantApplication(input: MerchantApplicationRequest): Promise<void>;
  listMerchantBusinesses(): Promise<MerchantBusiness[]>;
  listMerchantOffers(businessId: string): Promise<MerchantOffer[]>;
  getMerchantOffer(id: string): Promise<MerchantOffer>;
  createMerchantOffer(input: MerchantOfferInput): Promise<MerchantOffer>;
  updateMerchantOffer(
    id: string,
    input: MerchantOfferInput,
    version: number,
  ): Promise<MerchantOffer>;
  setMerchantOfferPaused(id: string, paused: boolean): Promise<MerchantOffer>;
  endMerchantOffer(id: string): Promise<MerchantOffer>;
  listMerchantOrders(locationId: string): Promise<MerchantOrder[]>;
  validatePickup(
    input: PickupValidateRequest,
    idempotencyKey: string,
  ): Promise<PickupValidateResult>;
  getMerchantInsights(businessId: string): Promise<MerchantInsights>;
  listStaff(businessId: string): Promise<StaffMember[]>;
  inviteStaff(businessId: string, input: InviteStaffRequest): Promise<void>;
}
